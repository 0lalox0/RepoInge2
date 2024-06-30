import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useUser from '../hooks/useUser';
import { Mantenimiento } from './Mantenimiento';
import * as d3 from 'd3';

export const EstadisticasSucursales = () => {
    const { role } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const d3Container = useRef(null);
    const d3GananciasContainer = useRef(null);
    const [sucursales, setSucursales] = useState([]);
    const [intercambios, setIntercambios] = useState({});
    const [ganancias, setGanancias] = useState({});

    const redirectAdminEstadisticas = () => navigate('/admin/estadisticas');

    useEffect(() => {
        const fetchSucursales = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/sucursales');
                const data = await response.json();
                setSucursales(data);
                fetchIntercambios(data);
                fetchGanancias(data);
            } catch (error) {
                console.error("Error fetching sucursales:", error);
                setLoading(false);
            }
        };

        const fetchIntercambios = async (sucursales) => {
            let intercambiosTemp = {};
            try {
                for (let sucursal of sucursales) {
                    const response = await fetch(`http://localhost:8000/api/filtrarPropuestaIntercambios?nombreSucursal=${encodeURIComponent(sucursal.nombre + " ")}`);
                    const data = await response.json();

                    const realizados = data.filter(intercambio => intercambio.estado === 'realizado').length;
                    intercambiosTemp[sucursal.nombre] = {
                        total: data.length, // cantidad total de intercambios por sucursal
                        realizados: realizados // cantidad de intercambios realizados por sucursal
                    };
                }
                setIntercambios(intercambiosTemp);

            } catch (error) {
                console.error("Error fetching intercambios:", error);
            }
            setLoading(false);
        };

        const fetchGanancias = async (sucursales) => {
            try {
                const response = await fetch('http://localhost:8000/api/productoCompra');
                const productos = await response.json();
                let gananciasTemp = {};

                for (let sucursal of sucursales) {
                    gananciasTemp[sucursal.nombre] = 0;
                }

                productos.forEach(producto => {
                    const { nombreSucursal, precio } = producto;
                    gananciasTemp[nombreSucursal] += precio;
                });

                setGanancias(gananciasTemp);
            } catch (error) {
                console.error("Error fetching ganancias:", error);
            }
        };

        fetchSucursales();
    }, []);

    useEffect(() => {
        if (!loading && d3Container.current) {
            // Ajustes de margen, ancho y alto
            const margin = { top: 60, right: 30, bottom: 190, left: 50 },
                width = 460 - margin.left - margin.right,
                height = 350 - margin.top - margin.bottom;

            // Añade el SVG al contenedor
            const svg = d3.select(d3Container.current)
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top + 100})`);

            // Datos de la base de datos
            const data = Object.keys(intercambios).map(key => ({
                sucursal: key,
                total: intercambios[key].total,
                realizados: intercambios[key].realizados
            }));

            // Colores para las barras
            const colorScale = d3.scaleOrdinal()
                .domain(["total", "realizados"])
                .range(["#1f77b4", "#ff7f0e"]);

            // Escala para el eje X (sucursales)
            const x0 = d3.scaleBand()
                .rangeRound([0, width])
                .paddingInner(0.1)
                .domain(data.map(d => d.sucursal));

            const x1 = d3.scaleBand()
                .padding(0.05)
                .domain(["total", "realizados"])
                .rangeRound([0, x0.bandwidth()]);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x0))
                .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");

            // Escala para el eje Y (valores)
            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => Math.max(d.total, d.realizados))])
                .range([height, 0]);

            svg.append("g")
                .call(d3.axisLeft(y).ticks(7)); //Limita el eje y a 7 elementos

            // Barras para total de intercambios y realizados
            const sucursal = svg.selectAll(".sucursal")
                .data(data)
                .enter().append("g")
                .attr("class", "sucursal")
                .attr("transform", d => `translate(${x0(d.sucursal)},0)`);

            sucursal.selectAll("rect")
                .data(d => [{ key: "total", value: d.total }, { key: "realizados", value: d.realizados }])
                .enter().append("rect")
                .attr("x", d => x1(d.key))
                .attr("y", d => y(d.value))
                .attr("width", x1.bandwidth())
                .attr("height", d => height - y(d.value))
                .attr("fill", d => colorScale(d.key));

            // Datos de la leyenda
            const leyendaDatos = [
                { color: colorScale("total"), nombre: "Total" },
                { color: colorScale("realizados"), nombre: "Concretados" }
            ];

            // Agregar grupo para la leyenda
            const leyenda = svg.append("g")
                .attr("class", "leyenda")
                .attr("transform", "translate(" + (width - 100) + ",0)"); // Ajusta la posición

            // Rectángulos y texto para leyendas con colores
            leyendaDatos.forEach((d, i) => {
                leyenda.append("rect")
                    .attr("x", 0)
                    .attr("y", i * 20) // Ajusta la separación entre elementos
                    .attr("width", 18)
                    .attr("height", 18)
                    .style("fill", d.color);

                leyenda.append("text")
                    .attr("x", 24)
                    .attr("y", i * 20 + 9) // Ajusta para alinear con el centro del rectángulo
                    .attr("dy", ".35em") // Centrado vertical
                    .text(d.nombre)
                    .style("text-anchor", "start")
                    .style("font-size", "12px");
            });
        }
    }, [loading, intercambios]);

    useEffect(() => {
        if (!loading && d3GananciasContainer.current) {
            const margin = { top: 60, right: 30, bottom: 190, left: 50 },
                width = 460 - margin.left - margin.right,
                height = 350 - margin.top - margin.bottom;

            const svg = d3.select(d3GananciasContainer.current)
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const data = Object.keys(ganancias).map(key => ({
                sucursal: key,
                ganancia: ganancias[key]
            }));

            const x = d3.scaleBand()
                .range([0, width])
                .domain(data.map(d => d.sucursal))
                .padding(0.2);

            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");

            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.ganancia)])
                .range([height, 0]);

            svg.append("g")
                .call(d3.axisLeft(y).ticks(7));//Limita el eje y a 7 elementos

            svg.selectAll("bars")
                .data(data)
                .enter()
                .append("rect")
                .attr("x", d => x(d.sucursal))
                .attr("y", d => y(d.ganancia))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d.ganancia))
                .attr("fill", "#d04a35");
        }
    }, [loading, ganancias]);

    return (
        <>
            {role === 'admin' ?
                <div className='clase-propuestas'>
                    <div className='titulos titulo-propuestas' style={{ marginTop: '0px' }}>
                        <h1>Estadísticas - Sucursales</h1>
                        <h2>Intercambios realizados por sucursal</h2>
                        <p className='textoRedireccion' onClick={redirectAdminEstadisticas}> Volver a estadísticas</p>
                    </div>
                    <div style={{ marginTop: '150px' }}>
                        {loading ? <p>Cargando...</p> : <svg ref={d3Container}></svg>}
                    </div>
                    <div className='titulos titulo-propuestas' style={{ marginTop: '400px' }}>
                        <h2>Ganancias por sucursal</h2>
                    </div>
                    <div style={{ marginTop: '0px' }}>
                        {loading ? <p>Cargando...</p> : <svg ref={d3GananciasContainer}></svg>}
                    </div>
                </div>
                : <> <Mantenimiento> </Mantenimiento></>}
        </>
    );
};
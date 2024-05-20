import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { getAuth, updateEmail } from "firebase/auth";
import useUser from '../hooks/useUser';
import { Mantenimiento } from './Mantenimiento';



export const EditarPerfil = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [date, setDate] = useState('');
    const [message, setMessage] = useState("");
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingSurname, setIsEditingSurname] = useState(false);
    const emailLocal = localStorage.getItem("email");
    const [error, setError] = useState('');
    const { role } = useUser();

    const redirectMiPerfil = () => navigate('/perfilusuario');

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            if (isEditingName) {
                validateAndSave(name, setIsEditingName);
            } else if (isEditingSurname) {
                validateAndSave(surname, setIsEditingSurname);
            } else if (isEditingEmail) {
                validateAndSave(email, setIsEditingEmail, true);
            } else if (isEditingDate) {
                if (validateDate(date)) {
                    updateAccount();
                    setIsEditingDate(false);
                }
            }
        }
    };

    const validateEmail = (email) => {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    const validateDate = (date) => {
        const birthDate = new Date(date);
        const currentDate = new Date();
        const eighteenYearsAgo = new Date(currentDate.getFullYear() - 18, currentDate.getMonth(), currentDate.getDate());
        if (birthDate > eighteenYearsAgo) {
            setMessage('Debes tener al menos 18 años.');
            return false;
        }
        return true;
    };

    const validateAndSave = async (field, setIsEditing, isEmail = false) => {
        if (!field.trim()) {
            setMessage('El campo no puede estar vacío.');
            return;
        }

        if (isEmail && !validateEmail(field)) {
            setMessage('El correo electrónico no es válido.');
            return;
        }

        if (isEmail) {
            const wasSuccessful = await updateEmailInFirebase(field);
            if (wasSuccessful) {
                setIsEditing(false);
            }
        } else {
            const wasSuccessful = await updateAccount();
            if (wasSuccessful) {
                setIsEditing(false);
            }
        }
    };

    const updateEmailInFirebase = async (newEmail) => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
            try {
                await updateEmail(user, newEmail);
                console.log('Email actualizado con éxito en Firebase!');
                localStorage.setItem("email", newEmail); // Actualizar el email en localStorage

                // Actualizar el email en mongo
                const response = await fetch(`http://localhost:8000/api/users/${emailLocal}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: newEmail
                    })
                });

                if (!response.ok) {
                    throw new Error('Error al actualizar el email en la base de datos');
                }

                setMessage('Email actualizado con éxito!');
                return true;
            } catch (e) {
                console.log(e.message);
                if (e.message.includes("(auth/email-already-in-use)")) {
                    setMessage("El email ingresado ya se encuentra registrado");
                } else {
                    setMessage("Error al actualizar el email");
                }
                return false;
            }
        }
        return false;
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/users/${emailLocal}`);
                const data = await response.json();

                setName(data.name);
                setSurname(data.lastname);
                setEmail(data.email);

                //Convertir fecha
                const dateObj = new Date(data.date);
                const year = dateObj.getUTCFullYear();
                const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getUTCDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;

                setDate(formattedDate);
            } catch (error) {
                console.error("Error fetching user data: ", error);
            }
        }

        fetchUserData();
    }, []);

    const updateAccount = async () => {
        if (!date) {
            setMessage('El campo fecha de nacimiento no puede estar vacío.');
            return false;
        }

        if (!validateDate(date)) {
            return false;
        }

        try {
            const response = await fetch(`http://localhost:8000/api/users/${emailLocal}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    lastname: surname,
                    email: email,
                    date: date
                })
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el usuario');
            }

            setMessage('Usuario actualizado con éxito!');
            return true;
        } catch (error) {
            setMessage('Error al actualizar el usuario');
            return false;
        }
    };

    return (
        <>
            {role === 'cliente' ?
                <div className='formularioSucursal' onKeyDown={handleKeyDown}>
                    <h2>Editar perfil </h2>

                    <div className="mb-3">
                        <label htmlFor="nombreUsuario" style={{ color: error === 'Se debe ingresar un nombre.' ? 'red' : 'black' }}> Nombre </label>
                        {isEditingName ? (
                            <>
                                <input className="form-control"
                                    style={{ backgroundColor: 'white', border: '1px solid black' }}
                                    type="text" id='nombreUsuario'
                                    value={name} onChange={e => { setName(e.target.value); setMessage(''); }}
                                    placeholder='Nombre' onKeyDown={handleKeyDown} />
                                <button style={{ marginTop: '8px' }} onClick={() => { validateAndSave(name, setIsEditingName); }}>Guardar</button>
                            </>
                        ) : (
                            <>
                                <input className="form-control"
                                    style={{ backgroundColor: '#b2b2b2', border: '1px solid black' }}
                                    type="text" id='nombreUsuario'
                                    value={name} disabled />
                                <button style={{ marginTop: '8px' }} onClick={() => { setIsEditingName(true); setMessage(''); }}>Modificar</button>
                            </>
                        )}
                    </div>

                    <div className="mb-3">
                        <label htmlFor="apellidoUsuario"> Apellido: </label>
                        {isEditingSurname ? (
                            <>
                                <input className="form-control"
                                    style={{ backgroundColor: 'white', border: '1px solid black' }}
                                    type="text" id='apellidoUsuario'
                                    value={surname} onChange={e => { setSurname(e.target.value); setMessage(''); }}
                                    placeholder='Apellido' onKeyDown={handleKeyDown} />
                                <button style={{ marginTop: '8px' }} onClick={() => { validateAndSave(surname, setIsEditingSurname); }}>Guardar</button>
                            </>
                        ) : (
                            <>
                                <input className="form-control"
                                    style={{ backgroundColor: '#b2b2b2', border: '1px solid black' }}
                                    type="text" id='apellidoUsuario'
                                    value={surname} disabled />
                                <button style={{ marginTop: '8px' }} onClick={() => { setIsEditingSurname(true); setMessage(''); }}>Modificar</button>
                            </>
                        )}
                    </div>

                    <div className="mb-3">
                        <label htmlFor="emailUsuario"> Email: </label>
                        {isEditingEmail ? (
                            <>
                                <input className="form-control"
                                    style={{ backgroundColor: 'white', border: '1px solid black' }}
                                    type="email" id='emailUsuario'
                                    value={email} onChange={e => { setEmail(e.target.value); setMessage(''); }}
                                    placeholder='Email' onKeyDown={handleKeyDown} />
                                <button style={{ marginTop: '8px' }} onClick={() => { validateAndSave(email, setIsEditingEmail, true); }}>Guardar</button>
                            </>
                        ) : (
                            <>
                                <input className="form-control"
                                    style={{ backgroundColor: '#b2b2b2', border: '1px solid black' }}
                                    type="email" id='emailUsuario'
                                    value={email} disabled />
                                <button style={{ marginTop: '8px' }} onClick={() => { setIsEditingEmail(true); setMessage(''); }}>Modificar</button>
                            </>
                        )}
                    </div>

                    <div className="mb-3">
                        <label htmlFor="fechaNacimientoUsuario"> Fecha de nacimiento: </label>
                        {isEditingDate ? (
                            <>
                                <input className="form-control"
                                    style={{ backgroundColor: 'white', border: '1px solid black' }}
                                    type="date" id='fechaNacimientoUsuario'
                                    value={date} onChange={e => { setDate(e.target.value); setMessage(''); }}
                                    onKeyDown={handleKeyDown} />
                                <button style={{ marginTop: '8px' }} onClick={() => { if (validateDate(date)) { updateAccount(); setIsEditingDate(false); } }}>Guardar</button>
                            </>
                        ) : (
                            <>
                                <input className="form-control"
                                    style={{ backgroundColor: '#b2b2b2', border: '1px solid black' }}
                                    type="date" id='fechaNacimientoUsuario'
                                    value={date} disabled />
                                <button style={{ marginTop: '8px' }} onClick={() => { setIsEditingDate(true); setMessage(''); }}>Modificar</button>
                            </>
                        )}
                    </div>

                    <p style={{  color: message === 'Email actualizado con éxito!' || message === 'Usuario actualizado con éxito!' ? 'green' : 'red' }}> {message} </p>
                    <p className='textoRedireccion' onClick={redirectMiPerfil}> Volver a Mi Perfil </p>
                </div>
                : <Mantenimiento></Mantenimiento>}
        </>
    )
}
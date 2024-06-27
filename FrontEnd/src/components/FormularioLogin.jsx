import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import Footer from './Footer';

export const FormularioLogin = () => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            logIn();
        }
    };

    const chequeo = () => {
        if (!email) {
            setError('Se debe ingresar un mail.')
            return false;
        }
        if (!password) {
            setError('Se debe ingresar la contraseña de ' + email);
            return false;
        }
        return true;
    }

    const logIn = async () => {

        if (chequeo()) {
            try {
                if (email.endsWith('@ferreplus.com')) {
                    try {
                        const response = await fetch('http://localhost:8000/api/empleados');
                        const empleados = await response.json();
                        const empleado = empleados.find(emp => emp.email === email);
                        if (empleado && empleado.activo) {
                            await signInWithEmailAndPassword(getAuth(), email, password);
                            localStorage.setItem("email", email);
                            navigate('/intercambios');
                        } else {
                            setError('El empleado no está activo.');
                            return;
                        }
                    } catch (error) {
                        setError('Error al verificar el estado del empleado.');
                        return;
                    }
                } else {
                    await signInWithEmailAndPassword(getAuth(), email, password);
                    localStorage.setItem("email", email);
                    navigate('/intercambios');
                }
            } catch (e) {
                if (e.message.includes("auth/wrong-password"))
                    setError('Mail o contraseña incorrectos.');
                else
                    setError("Error al iniciar sesión.");
            }
        }
    }

    const redirectRegistro = () => navigate('/registrarse');

    const redirectCambio = () => navigate('/cambioContra');

    return (
        <div className='formularioLogin' onKeyDown={handleKeyDown}>

            <h3 style={{ color: "#242465" }}>
                ¡Iniciá sesión en Ferreplus Intercambios!
            </h3>

            <div className="mb-3">
                <label htmlFor="exampleInputEmail1" className="form-label" style={{ color: error === 'Se debe ingresar un mail.' ? 'red' : 'black' }}>Mail:</label>
                <input
                    type="email"
                    className="form-control"
                    id="exampleInputEmail1"
                    aria-describedby="emailHelp"
                    placeholder='ejemplo123@gmail.com'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown} />
            </div>

            <div className="mb-3">
                <label htmlFor="exampleInputPassword1" className="form-label" style={{ color: error === 'Se debe ingresar la contraseña de ' + email ? 'red' : 'black' }}>Contraseña:</label>
                <input
                    className="form-control"
                    id="exampleInputPassword1"
                    type="password"
                    placeholder='Contraseña'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown} />
            </div>
            <button className="btn btn-primary" onClick={logIn}>Iniciar sesión</button>

            <p className='textoRedireccion' onClick={redirectCambio}> Olvidé mi contraseña </p>

            {error && <p className='errorContainer'>{error}</p>}

            <p onClick={redirectRegistro} className='textoRedireccion'>
                ¿No tenés cuenta? Registrarse
            </p>
            <Footer />
        </div>
    );
}
// routes/auth.js — Registro, login y perfil.
// Reglas tomadas del prototipo (app.js, handleRegister y handleLogin):
//   - Registro: las dos contraseñas deben coincidir, mínimo 6 caracteres,
//     el correo no debe estar registrado y el nuevo usuario nace como "cliente".
//   - Login: se busca por correo (en minúsculas) y se compara la contraseña.
// Diferencia importante (mejora de la Fase 3): la contraseña ya NO se guarda
// en texto plano como en app.js; se guarda su hash bcrypt en password_hash
// y el login compara con bcrypt.compare.
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, crearToken } = require('../middleware/auth');

const router = express.Router();

// Busca el id de un rol por su nombre ("cliente" o "admin").
async function idDelRol(nombreRol) {
    const [filas] = await pool.query('SELECT id_rol FROM roles WHERE nombre = ?', [nombreRol]);
    return filas.length ? filas[0].id_rol : null;
}

// Datos públicos de un usuario (nunca se devuelve el password_hash).
function usuarioPublico(u) {
    return {
        id: u.id_usuario,
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        fecha_registro: u.fecha_registro
    };
}

// POST /api/auth/register — Crear cuenta (rol cliente).
router.post('/register', async (req, res, next) => {
    try {
        const nombre = (req.body.nombre || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const password = req.body.password || '';
        const password2 = req.body.password2 || '';

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
        }
        // v3: el correo debe tener formato válido (nombre@dominio.com).
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            return res.status(400).json({ error: 'Escribe un correo válido, por ejemplo nombre@correo.com.' });
        }
        if (password !== password2) {
            return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener mínimo 6 caracteres.' });
        }

        const [existentes] = await pool.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
        if (existentes.length > 0) {
            return res.status(409).json({ error: 'Ese correo ya está registrado.' });
        }

        const idRolCliente = await idDelRol('cliente');
        const hash = await bcrypt.hash(password, 10);
        const [resultado] = await pool.query(
            'INSERT INTO usuarios (nombre, email, password_hash, id_rol) VALUES (?, ?, ?, ?)',
            [nombre, email, hash, idRolCliente]
        );
        const [filas] = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.email, u.fecha_registro, r.nombre AS rol
             FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = ?`,
            [resultado.insertId]
        );
        const usuario = filas[0];
        res.status(201).json({ usuario: usuarioPublico(usuario), token: crearToken(usuario) });
    } catch (err) { next(err); }
});

// POST /api/auth/login — Iniciar sesión.
router.post('/login', async (req, res, next) => {
    try {
        const email = (req.body.email || '').trim().toLowerCase();
        const password = req.body.password || '';
        if (!email || !password) {
            return res.status(400).json({ error: 'Escribe tu correo y tu contraseña.' });
        }
        const [filas] = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.email, u.password_hash, u.fecha_registro, r.nombre AS rol
             FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.email = ?`,
            [email]
        );
        if (filas.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }
        const usuario = filas[0];
        const correcta = await bcrypt.compare(password, usuario.password_hash);
        if (!correcta) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }
        res.json({ usuario: usuarioPublico(usuario), token: crearToken(usuario) });
    } catch (err) { next(err); }
});

// GET /api/auth/me — Datos del usuario que inició sesión (requiere token).
router.get('/me', requireAuth, (req, res) => {
    res.json({ usuario: usuarioPublico(req.usuario) });
});

// POST /api/auth/cambiar-password — Cambiar contraseña (Mi Perfil > Seguridad).
// Reglas del prototipo (changePassword en app.js): la contraseña actual debe
// coincidir, la nueva mínimo 6 caracteres y debe coincidir con la confirmación.
router.post('/cambiar-password', requireAuth, async (req, res, next) => {
    try {
        const actual = req.body.actual || '';
        const nueva = req.body.nueva || '';
        const confirmacion = req.body.confirmacion || '';
        const [filas] = await pool.query(
            'SELECT password_hash FROM usuarios WHERE id_usuario = ?',
            [req.usuario.id_usuario]
        );
        // v3: si el usuario ya no existe en la base, error 404 en vez de 500.
        if (filas.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado. Inicia sesión de nuevo.' });
        }
        const correcta = await bcrypt.compare(actual, filas[0].password_hash);
        if (!correcta) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
        }
        if (nueva.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 6 caracteres.' });
        }
        if (nueva !== confirmacion) {
            return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
        }
        const hash = await bcrypt.hash(nueva, 10);
        await pool.query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?', [hash, req.usuario.id_usuario]);
        res.json({ mensaje: 'Contraseña actualizada.' });
    } catch (err) { next(err); }
});

module.exports = router;

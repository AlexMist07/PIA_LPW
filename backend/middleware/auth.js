// middleware/auth.js — Seguridad con JWT.
// El login entrega un token; el front-end lo guarda y lo manda en cada
// petición protegida como:  Authorization: Bearer <token>
// La contraseña NUNCA viaja ni se guarda en texto plano: en la base de datos
// solo vive el hash bcrypt (columna password_hash de la tabla usuarios).
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// Secreto para firmar los tokens. En producción debe venir del .env.
// Si no hay .env, se usa uno de desarrollo y se avisa en consola.
const JWT_SECRET = process.env.JWT_SECRET || 'coredesk-dev-secret';
if (!process.env.JWT_SECRET) {
    console.warn('AVISO: JWT_SECRET no está en el .env, se usa un secreto de desarrollo. Cámbialo antes de la presentación.');
}

// Verifica el token y carga el usuario desde la base de datos.
async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) {
            return res.status(401).json({ error: 'No has iniciado sesión.' });
        }
        const datos = jwt.verify(token, JWT_SECRET);
        const [filas] = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.email, u.id_rol, u.fecha_registro, r.nombre AS rol
             FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = ?`,
            [datos.id_usuario]
        );
        if (filas.length === 0) {
            return res.status(401).json({ error: 'El usuario ya no existe.' });
        }
        req.usuario = filas[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Sesión inválida o vencida. Inicia sesión de nuevo.' });
    }
}

// Solo administradores (rol "admin"). Se usa después de requireAuth.
function requireAdmin(req, res, next) {
    if (!req.usuario || req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso restringido: solo administradores.' });
    }
    next();
}

// Crea el token de sesión (válido 8 horas, como una jornada de trabajo).
function crearToken(usuario) {
    return jwt.sign(
        { id_usuario: usuario.id_usuario, rol: usuario.rol },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
}

module.exports = { requireAuth, requireAdmin, crearToken };

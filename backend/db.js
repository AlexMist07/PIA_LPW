// db.js — Conexión a MySQL con mysql2 (promesas).
// Toda la aplicación usa este pool; las consultas siempre usan
// placeholders (?) para que nunca se concatene texto del usuario en el SQL.
const mysql = require('mysql2/promise');

// Leemos la configuración de las variables de entorno (.env).
// Si falta alguna, se usan estos valores por defecto para desarrollo local.
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'coredesk_tech',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Los DECIMAL (precios) llegan como número y no como texto.
    decimalNumbers: true,
    // Las fechas llegan como texto (YYYY-MM-DD), igual que en el prototipo.
    dateStrings: true
});

// Prueba la conexión sin tumbar el servidor: devuelve true/false.
async function probarConexion() {
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        return true;
    } catch (err) {
        console.error('No se pudo conectar a MySQL:', err.code || '', err.message || err);
        return false;
    }
}

// ¿El error es de conexión con la base de datos? (para responder 503)
function esErrorDeConexion(err) {
    if (!err) return false;
    return [
        'ECONNREFUSED',   // MySQL apagado o puerto cerrado
        'ENOTFOUND',      // Host no existe
        'ETIMEDOUT',
        'EHOSTUNREACH',
        'ER_ACCESS_DENIED_ERROR', // Usuario o contraseña incorrectos
        'PROTOCOL_CONNECTION_LOST',
        'ER_BAD_DB_ERROR' // La base de datos no existe
    ].includes(err.code);
}

module.exports = { pool, probarConexion, esErrorDeConexion };

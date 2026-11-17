const mysql = require('mysql2/promise');
function configurarSSL() {
    if (process.env.DB_SSL !== 'true') return undefined;
    if (process.env.DB_CA) {
        return { ca: process.env.DB_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true };
    }
    return { rejectUnauthorized: false };
}
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'coredesk_tech',
    ssl: configurarSSL(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: true
});


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


function esErrorDeConexion(err) {
    if (!err) return false;
    return [
        'ECONNREFUSED',   
        'ENOTFOUND',      
        'ETIMEDOUT',
        'EHOSTUNREACH',
        'ER_ACCESS_DENIED_ERROR', 
        'PROTOCOL_CONNECTION_LOST',
        'ER_BAD_DB_ERROR' 
    ].includes(err.code);
}

module.exports = { pool, probarConexion, esErrorDeConexion };
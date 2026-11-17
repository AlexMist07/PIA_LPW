// server.js — Punto de entrada del back-end de CoreDesk Tech (Fase 3).
// Proyecto final de Programación Web — Grupo 416
//   Manuel Alexander Fuentes Contreras (2134970)
//   Jaime Sebastián Esparza Leyva (2097304)
//   Ing. Luis Daniel Lepe Rodríguez
//
// Qué hace este servidor:
//   1. Sirve la página del prototipo (index.html, app.js, styles.css) que está
//      en la carpeta del repositorio, un nivel arriba de "backend/".
//      Solo esos archivos (lista blanca) y las fotos subidas en /uploads:
//      nunca se sirven backend/*.js, los .sql ni el .env (P1-3).
//   2. Expone la API REST en /api/*, conectada a MySQL (base coredesk_tech).
//   3. Si MySQL está apagado o con la contraseña mal, el servidor NO se cae:
//      /api/health sigue respondiendo {"status":"ok"} y las rutas de la API
//      responden un error 503 en JSON, sin mostrar detalles internos.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { probarConexion, esErrorDeConexion } = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Permite que el front-end llame a la API (mismo origen o, durante el
// desarrollo, desde otro puerto).
app.use(cors());
// Lee los cuerpos JSON de las peticiones (login, registro, checkout...).
app.use(express.json());

// ---------- Salud del servidor ----------
// Siempre responde {"status":"ok"}, aunque la base de datos esté caída.
// Sirve para comprobar que el servidor está prendido sin depender de MySQL.
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ---------- Rutas de la API ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/carrito', require('./routes/carrito'));
app.use('/api/ordenes', require('./routes/ordenes'));
app.use('/api/resenas', require('./routes/resenas'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/config', require('./routes/config'));

// ---------- Archivos subidos ----------
// Las fotos de productos viven en backend/uploads/ y se sirven en /uploads/*.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Front-end (prototipo) ----------
// La carpeta del repositorio está un nivel arriba de "backend/".
// Así, http://localhost:3000/ abre el index.html del prototipo.
// P1-3: antes se servía TODA la carpeta del repositorio con
// express.static('..'), así que cualquiera podía descargar backend/*.js o
// los .sql desde el navegador. Ahora hay una lista blanca explícita con
// los únicos archivos del front-end; cualquier otro archivo da 404.
const frontendPath = path.join(__dirname, '..');
const ARCHIVOS_FRONTEND = new Set([
    'index.html',
    'app.js',
    'styles.css',
    'PC-Gamer-4070-Tank-Pro-Black-02.jpg'
]);
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    const nombre = decodeURIComponent(req.path).replace(/^\/+/, '');
    if (!ARCHIVOS_FRONTEND.has(nombre)) return next();
    return express.static(frontendPath)(req, res, next);
});

// Si la ruta no es de la API ni un archivo del front-end, error 404 en JSON.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta de la API no encontrada.' });
});

// Cualquier otra ruta que no sea API ni archivo del front: 404.
app.use((req, res) => res.status(404).send('Página no encontrada.'));

// ---------- Manejo central de errores ----------
// Ningún error tumba el servidor. Si es un problema de conexión con MySQL
// se responde 503 ("base de datos no disponible"); cualquier otro error
// interno responde 500 con un mensaje genérico (sin mostrar el stack).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Error:', err.code || '', err.message || err);
    if (esErrorDeConexion(err)) {
        return res.status(503).json({ error: 'Base de datos no disponible. Revisa que MySQL esté prendido y los datos del .env.' });
    }
    if (err && err.errno === 1451) {
        return res.status(409).json({ error: 'No se puede eliminar: el registro ya está relacionado con otros datos.' });
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
});

// ---------- Arranque ----------
app.listen(PORT, async () => {
    console.log(`CoreDesk Tech API escuchando en http://localhost:${PORT}`);
    console.log(`Front-end en http://localhost:${PORT}/`);
    const conectado = await probarConexion();
    if (conectado) {
        console.log('Conectado a MySQL (base coredesk_tech).');
    } else {
        console.log('AVISO: no se pudo conectar a MySQL. El servidor sigue prendido, pero la API responderá 503 hasta que MySQL esté disponible.');
    }
});

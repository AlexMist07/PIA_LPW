// routes/resenas.js — Reseñas de productos.
// Reglas del prototipo (app.js, submitReview):
//   - Solo usuarios con sesión iniciada.
//   - Calificación de 1 a 5 estrellas y comentario obligatorio.
// Regla de la base de datos (tabla resenas): un usuario solo puede dejar
// UNA reseña por producto (UNIQUE id_usuario + id_producto). El prototipo
// en localStorage no lo impedía, pero la base de datos sí; aquí se respeta
// la base de datos y se responde 409 si ya existe una reseña de ese usuario.
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/resenas/producto/:id_producto — Reseñas de un producto.
router.get('/producto/:id_producto', async (req, res, next) => {
    try {
        const [filas] = await pool.query(
            `SELECT r.id_resena, r.calificacion, r.comentario, r.fecha,
                    u.nombre AS usuario
             FROM resenas r JOIN usuarios u ON u.id_usuario = r.id_usuario
             WHERE r.id_producto = ? ORDER BY r.fecha DESC`,
            [Number(req.params.id_producto)]
        );
        res.json(filas);
    } catch (err) { next(err); }
});

// GET /api/resenas/mis — Mis reseñas (Mi Perfil > Mis Reseñas).
router.get('/mis', requireAuth, async (req, res, next) => {
    try {
        const [filas] = await pool.query(
            `SELECT r.id_resena, r.id_producto, r.calificacion, r.comentario, r.fecha,
                    p.nombre AS producto
             FROM resenas r JOIN productos p ON p.id_producto = r.id_producto
             WHERE r.id_usuario = ? ORDER BY r.fecha DESC`,
            [req.usuario.id_usuario]
        );
        res.json(filas);
    } catch (err) { next(err); }
});

// POST /api/resenas — Publicar una reseña.
// Body: { id_producto, calificacion (1-5), comentario }
router.post('/', requireAuth, async (req, res, next) => {
    try {
        const idProducto = Number(req.body.id_producto);
        const calificacion = Number(req.body.calificacion);
        const comentario = (req.body.comentario || '').trim();
        if (!idProducto) return res.status(400).json({ error: 'Falta el producto.' });
        if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
            return res.status(400).json({ error: 'La calificación debe ser de 1 a 5 estrellas.' });
        }
        if (!comentario) return res.status(400).json({ error: 'Escribe un comentario.' });

        const [productos] = await pool.query('SELECT id_producto FROM productos WHERE id_producto = ?', [idProducto]);
        if (productos.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

        const [existentes] = await pool.query(
            'SELECT id_resena FROM resenas WHERE id_usuario = ? AND id_producto = ?',
            [req.usuario.id_usuario, idProducto]
        );
        if (existentes.length > 0) {
            return res.status(409).json({ error: 'Ya dejaste una reseña en este producto.' });
        }
        const [resultado] = await pool.query(
            'INSERT INTO resenas (id_usuario, id_producto, calificacion, comentario) VALUES (?, ?, ?, ?)',
            [req.usuario.id_usuario, idProducto, calificacion, comentario]
        );
        res.status(201).json({ mensaje: 'Reseña publicada.', id_resena: resultado.insertId });
    } catch (err) { next(err); }
});

// DELETE /api/resenas/:id — Borrar mi reseña (o borrarla como admin).
router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [filas] = await pool.query('SELECT id_usuario FROM resenas WHERE id_resena = ?', [id]);
        if (filas.length === 0) return res.status(404).json({ error: 'Reseña no encontrada.' });
        if (req.usuario.rol !== 'admin' && filas[0].id_usuario !== req.usuario.id_usuario) {
            return res.status(403).json({ error: 'Esa reseña no es tuya.' });
        }
        await pool.query('DELETE FROM resenas WHERE id_resena = ?', [id]);
        res.json({ mensaje: 'Reseña eliminada.' });
    } catch (err) { next(err); }
});

module.exports = router;

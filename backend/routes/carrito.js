// routes/carrito.js — Carrito de compras del usuario que inició sesión.
// En el prototipo el carrito vivía en localStorage y era el mismo para todos;
// aquí cada usuario tiene su propio carrito en las tablas carritos y
// carrito_items (relación 1 a 1 con usuarios).
// Reglas tomadas de app.js (addToCart / addToCartFromDetail / updateCartModal):
//   - No se puede agregar un producto con stock 0 ("Producto agotado").
//   - La cantidad en el carrito nunca puede pasar el stock ("Stock insuficiente").
//   - El subtotal usa el precio CON descuento de la oferta (getEffectivePrice).
//   - Envío: subtotal >= 1000 -> gratis; si no, $150 (ver utils.js).
const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { calcularEnvio, precioConDescuento } = require('../utils');

const router = express.Router();

// Todas las rutas del carrito requieren haber iniciado sesión.
router.use(requireAuth);

// Devuelve el id del carrito del usuario; si no tiene, lo crea.
async function obtenerCarrito(idUsuario) {
    const [filas] = await pool.query('SELECT id_carrito FROM carritos WHERE id_usuario = ?', [idUsuario]);
    if (filas.length) return filas[0].id_carrito;
    const [r] = await pool.query('INSERT INTO carritos (id_usuario) VALUES (?)', [idUsuario]);
    return r.insertId;
}

// Arma la respuesta del carrito: artículos con su precio final y los totales.
async function leerCarrito(idCarrito) {
    const [items] = await pool.query(
        `SELECT ci.id_producto, ci.cantidad, p.nombre, p.precio, p.stock, p.imagen_url,
                CASE WHEN o.id_oferta IS NOT NULL AND o.activa = 1
                     THEN o.porcentaje_descuento ELSE 0 END AS descuento
         FROM carrito_items ci
         JOIN productos p ON p.id_producto = ci.id_producto
         LEFT JOIN ofertas o ON o.id_producto = p.id_producto
         WHERE ci.id_carrito = ? ORDER BY ci.id_producto`,
        [idCarrito]
    );
    const articulos = items.map((i) => {
        const precioFinal = precioConDescuento(i.precio, i.descuento);
        return {
            id_producto: i.id_producto,
            nombre: i.nombre,
            precio: Number(i.precio),
            precio_final: precioFinal,
            descuento: Number(i.descuento),
            cantidad: i.cantidad,
            stock: i.stock,
            imagen_url: i.imagen_url,
            subtotal: precioFinal * i.cantidad
        };
    });
    const subtotal = articulos.reduce((suma, a) => suma + a.subtotal, 0);
    const envio = articulos.length === 0 ? 0 : calcularEnvio(subtotal);
    return { articulos, subtotal, envio, total: subtotal + envio };
}

// GET /api/carrito — Ver mi carrito con subtotal, envío y total.
router.get('/', async (req, res, next) => {
    try {
        const idCarrito = await obtenerCarrito(req.usuario.id_usuario);
        res.json(await leerCarrito(idCarrito));
    } catch (err) { next(err); }
});

// POST /api/carrito — Agregar un producto. Body: { id_producto, cantidad }
// Si el producto ya está en el carrito, se suma la cantidad (sin pasar el stock).
router.post('/', async (req, res, next) => {
    try {
        const idProducto = Number(req.body.id_producto);
        const cantidad = Number(req.body.cantidad || 1);
        if (!idProducto || cantidad < 1 || !Number.isInteger(cantidad)) {
            return res.status(400).json({ error: 'Cantidad inválida.' });
        }
        const [productos] = await pool.query('SELECT stock FROM productos WHERE id_producto = ?', [idProducto]);
        if (productos.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
        if (productos[0].stock === 0) return res.status(400).json({ error: 'Producto agotado.' });

        const idCarrito = await obtenerCarrito(req.usuario.id_usuario);
        const [actual] = await pool.query(
            'SELECT cantidad FROM carrito_items WHERE id_carrito = ? AND id_producto = ?',
            [idCarrito, idProducto]
        );
        const cantidadActual = actual.length ? actual[0].cantidad : 0;
        if (cantidadActual + cantidad > productos[0].stock) {
            return res.status(400).json({ error: 'Stock insuficiente.' });
        }
        await pool.query(
            `INSERT INTO carrito_items (id_carrito, id_producto, cantidad) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)`,
            [idCarrito, idProducto, cantidad]
        );
        res.status(201).json(await leerCarrito(idCarrito));
    } catch (err) { next(err); }
});

// PUT /api/carrito/:id_producto — Cambiar la cantidad de un artículo.
router.put('/:id_producto', async (req, res, next) => {
    try {
        const idProducto = Number(req.params.id_producto);
        const cantidad = Number(req.body.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1) {
            return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor que 0.' });
        }
        const [productos] = await pool.query('SELECT stock FROM productos WHERE id_producto = ?', [idProducto]);
        if (productos.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });
        if (cantidad > productos[0].stock) {
            return res.status(400).json({ error: 'Stock insuficiente.' });
        }
        const idCarrito = await obtenerCarrito(req.usuario.id_usuario);
        const [r] = await pool.query(
            'UPDATE carrito_items SET cantidad = ? WHERE id_carrito = ? AND id_producto = ?',
            [cantidad, idCarrito, idProducto]
        );
        if (r.affectedRows === 0) return res.status(404).json({ error: 'Ese producto no está en tu carrito.' });
        res.json(await leerCarrito(idCarrito));
    } catch (err) { next(err); }
});

// DELETE /api/carrito/:id_producto — Quitar un artículo del carrito.
router.delete('/:id_producto', async (req, res, next) => {
    try {
        const idCarrito = await obtenerCarrito(req.usuario.id_usuario);
        await pool.query(
            'DELETE FROM carrito_items WHERE id_carrito = ? AND id_producto = ?',
            [idCarrito, Number(req.params.id_producto)]
        );
        res.json(await leerCarrito(idCarrito));
    } catch (err) { next(err); }
});

// DELETE /api/carrito — Vaciar todo el carrito.
router.delete('/', async (req, res, next) => {
    try {
        const idCarrito = await obtenerCarrito(req.usuario.id_usuario);
        await pool.query('DELETE FROM carrito_items WHERE id_carrito = ?', [idCarrito]);
        res.json(await leerCarrito(idCarrito));
    } catch (err) { next(err); }
});

module.exports = router;

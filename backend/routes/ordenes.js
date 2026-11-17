// routes/ordenes.js — Checkout y consulta de órdenes.
// Reglas tomadas del prototipo (app.js, checkout):
//   - Solo con sesión iniciada y carrito con artículos.
//   - Se valida el stock de CADA artículo antes de confirmar; si falta stock,
//     la compra se rechaza completa (no se descuenta nada).
//   - Cada artículo se guarda con el precio CON descuento de la oferta
//     (precio_unitario en orden_detalle) y la orden nace con estado "pagada".
//   - Envío: subtotal >= 1000 -> gratis; si no, $150. Total = subtotal + envío.
//   - Al confirmar: stock -= cantidad, unidades_vendidas += cantidad
//     y el carrito queda vacío.
// Todo eso se hace dentro de UNA transacción, para que nunca quede la orden
// creada pero el stock sin descontar (o al revés).
// Las ventas del admin (renderOrdersTable) se filtran por fecha (desde/hasta),
// por estado y por cliente o número de orden.
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { calcularEnvio, precioConDescuento } = require('../utils');

const router = express.Router();

// Trae una orden con sus artículos (nombre y precio guardado al comprar).
async function ordenConArticulos(idOrden) {
    const [ordenes] = await pool.query(
        `SELECT o.id_orden, o.id_usuario, o.fecha, o.envio, o.total, o.estado,
                u.nombre AS cliente, u.email AS cliente_email
         FROM ordenes o JOIN usuarios u ON u.id_usuario = o.id_usuario
         WHERE o.id_orden = ?`,
        [idOrden]
    );
    if (ordenes.length === 0) return null;
    const orden = ordenes[0];
    const [items] = await pool.query(
        `SELECT d.id_producto, d.cantidad, d.precio_unitario, p.nombre
         FROM orden_detalle d JOIN productos p ON p.id_producto = d.id_producto
         WHERE d.id_orden = ?`,
        [idOrden]
    );
    orden.articulos = items.map((i) => ({
        id_producto: i.id_producto,
        nombre: i.nombre,
        precio_unitario: Number(i.precio_unitario),
        cantidad: i.cantidad,
        subtotal: Number(i.precio_unitario) * i.cantidad
    }));
    orden.envio = Number(orden.envio);
    orden.total = Number(orden.total);
    return orden;
}

// Resumen del período, igual que renderPeriodSummary en app.js:
//   ingresos = suma de órdenes NO canceladas
//   ordenes = todas las filtradas (incluidas las canceladas)
//   ticket promedio = ingresos / órdenes válidas (redondeado)
//   producto top = el más vendido en las órdenes válidas
function resumenPeriodo(ordenes) {
    const validas = ordenes.filter((o) => o.estado !== 'cancelada');
    const ingresos = validas.reduce((s, o) => s + o.total, 0);
    const porProducto = {};
    validas.forEach((o) => {
        o.articulos.forEach((a) => {
            porProducto[a.nombre] = (porProducto[a.nombre] || 0) + a.cantidad;
        });
    });
    const top = Object.entries(porProducto).sort((a, b) => b[1] - a[1])[0];
    return {
        ingresos,
        ordenes: ordenes.length,
        ticket_promedio: validas.length ? Math.round(ingresos / validas.length) : 0,
        producto_top: top ? { nombre: top[0], unidades: top[1] } : null
    };
}

// POST /api/ordenes — Checkout: convierte el carrito en una orden.
router.post('/', requireAuth, async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [carritos] = await conn.query(
            'SELECT id_carrito FROM carritos WHERE id_usuario = ?',
            [req.usuario.id_usuario]
        );
        if (carritos.length === 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Tu carrito está vacío.' });
        }
        const idCarrito = carritos[0].id_carrito;
        const [items] = await conn.query(
            `SELECT ci.id_producto, ci.cantidad, p.nombre, p.precio, p.stock,
                    CASE WHEN o.id_oferta IS NOT NULL AND o.activa = 1
                         THEN o.porcentaje_descuento ELSE 0 END AS descuento
             FROM carrito_items ci
             JOIN productos p ON p.id_producto = ci.id_producto
             LEFT JOIN ofertas o ON o.id_producto = p.id_producto
             WHERE ci.id_carrito = ? FOR UPDATE`,
            [idCarrito]
        );
        if (items.length === 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Tu carrito está vacío.' });
        }
        // Validar stock de todos los artículos ANTES de crear la orden.
        for (const item of items) {
            if (item.cantidad > item.stock) {
                await conn.rollback();
                return res.status(400).json({ error: `Stock insuficiente para ${item.nombre}.` });
            }
        }
        const articulos = items.map((item) => ({
            id_producto: item.id_producto,
            nombre: item.nombre,
            precio_unitario: precioConDescuento(item.precio, item.descuento),
            cantidad: item.cantidad
        }));
        const subtotal = articulos.reduce((s, a) => s + a.precio_unitario * a.cantidad, 0);
        const envio = calcularEnvio(subtotal);
        const total = subtotal + envio;

        const [orden] = await conn.query(
            'INSERT INTO ordenes (id_usuario, envio, total, estado) VALUES (?, ?, ?, "pagada")',
            [req.usuario.id_usuario, envio, total]
        );
        const idOrden = orden.insertId;
        for (const a of articulos) {
            await conn.query(
                'INSERT INTO orden_detalle (id_orden, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [idOrden, a.id_producto, a.cantidad, a.precio_unitario]
            );
            // Descontar stock y sumar unidades vendidas, como en el prototipo.
            await conn.query(
                'UPDATE productos SET stock = stock - ?, unidades_vendidas = unidades_vendidas + ? WHERE id_producto = ?',
                [a.cantidad, a.cantidad, a.id_producto]
            );
        }
        await conn.query('DELETE FROM carrito_items WHERE id_carrito = ?', [idCarrito]);
        await conn.commit();

        const creada = await ordenConArticulos(idOrden);
        res.status(201).json(creada);
    } catch (err) {
        try { await conn.rollback(); } catch (e) { /* ya estaba cerrada */ }
        next(err);
    } finally {
        conn.release();
    }
});

// GET /api/ordenes/mis — Mis pedidos (Mi Perfil > Mis Pedidos).
router.get('/mis', requireAuth, async (req, res, next) => {
    try {
        const [filas] = await pool.query(
            'SELECT id_orden FROM ordenes WHERE id_usuario = ? ORDER BY fecha DESC',
            [req.usuario.id_usuario]
        );
        const ordenes = [];
        for (const f of filas) ordenes.push(await ordenConArticulos(f.id_orden));
        res.json(ordenes);
    } catch (err) { next(err); }
});

// GET /api/ordenes — Todas las ventas (solo admin), con filtros.
//   ?desde=2026-11-01&hasta=2026-11-30   (fechas incluidas, como en el prototipo)
//   ?estado=pagada | enviada | entregada | cancelada
//   ?buscar=texto   (cliente, correo o número de orden)
// Responde { ordenes, resumen } con el resumen del período.
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const condiciones = [];
        const valores = [];
        if (req.query.desde) {
            condiciones.push('DATE(o.fecha) >= ?');
            valores.push(req.query.desde);
        }
        if (req.query.hasta) {
            condiciones.push('DATE(o.fecha) <= ?');
            valores.push(req.query.hasta);
        }
        if (req.query.estado) {
            condiciones.push('o.estado = ?');
            valores.push(req.query.estado);
        }
        if (req.query.buscar) {
            const texto = `%${req.query.buscar.trim()}%`;
            condiciones.push('(u.nombre LIKE ? OR u.email LIKE ? OR o.id_orden LIKE ?)');
            valores.push(texto, texto, texto);
        }
        const [filas] = await pool.query(
            `SELECT o.id_orden FROM ordenes o
             JOIN usuarios u ON u.id_usuario = o.id_usuario
             ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
             ORDER BY o.fecha DESC`,
            valores
        );
        const ordenes = [];
        for (const f of filas) ordenes.push(await ordenConArticulos(f.id_orden));
        res.json({ ordenes, resumen: resumenPeriodo(ordenes) });
    } catch (err) { next(err); }
});

// GET /api/ordenes/:id — Detalle de una orden (el dueño o un admin).
router.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const orden = await ordenConArticulos(Number(req.params.id));
        if (!orden) return res.status(404).json({ error: 'Orden no encontrada.' });
        if (req.usuario.rol !== 'admin' && orden.id_usuario !== req.usuario.id_usuario) {
            return res.status(403).json({ error: 'Esa orden no es tuya.' });
        }
        res.json(orden);
    } catch (err) { next(err); }
});

module.exports = router;

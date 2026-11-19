// routes/admin.js — Panel de administración.
// Reglas tomadas del prototipo (app.js):
//   - Dashboard (renderAdminDashboard):
//       ingresos = suma de órdenes NO canceladas
//       órdenes = total de órdenes | productos = con stock > 0
//       usuarios = total de usuarios
//       ventas recientes = 5 más recientes | stock bajo = stock < 10 (top 5)
//       top productos = 5 más vendidos
//   - Usuarios (renderUsersTable, toggleUserRole, deleteUser):
//       buscar por nombre o correo, filtrar por rol, cambiar el rol
//       (admin <-> cliente) y eliminar usuarios. El admin no puede
//       cambiarse su propio rol ni eliminarse a sí mismo.
//   - Ofertas (toggleOffer, updateDiscount):
//       activar/desactivar la oferta de un producto y su % de descuento
//       (entre 1 y 90; si se activa sin descuento, el prototipo ponía 15).
//   - Destacados (setFeaturedMode, addFeatured, autoFillFeatured):
//       modo automático = 8 más vendidos con stock > 0; modo manual = lista
//       elegida por el admin, máximo 8 productos, con orden (posicion).
//       El prototipo guardaba el modo en localStorage y la base de datos no
//       tiene columna para el modo: aquí, si la tabla destacados tiene filas
//       se usa el modo manual; si está vacía, el modo automático.
//       Por eso la lista manual se guarda completa con PUT (se reemplaza).
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todo el panel requiere sesión de administrador.
router.use(requireAuth, requireAdmin);

// ---------- Dashboard ----------

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res, next) => {
    try {
        const [[ingresos]] = await pool.query(
            "SELECT COALESCE(SUM(total), 0) AS ingresos FROM ordenes WHERE estado <> 'cancelada'"
        );
        const [[conteoOrdenes]] = await pool.query('SELECT COUNT(*) AS total FROM ordenes');
        const [[productosActivos]] = await pool.query('SELECT COUNT(*) AS total FROM productos WHERE stock > 0');
        const [[totalUsuarios]] = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
        const [ventasRecientes] = await pool.query(
            `SELECT o.id_orden, o.fecha, o.total, o.estado, u.nombre AS cliente
             FROM ordenes o JOIN usuarios u ON u.id_usuario = o.id_usuario
             ORDER BY o.fecha DESC LIMIT 5`
        );
        const [stockBajo] = await pool.query(
            'SELECT id_producto, nombre, stock FROM productos WHERE stock < 10 ORDER BY stock ASC LIMIT 5'
        );
        // v3: contador total de productos con stock bajo (para la 5a tarjeta).
        const [[conteoStockBajo]] = await pool.query('SELECT COUNT(*) AS total FROM productos WHERE stock < 10');
        const [topProductos] = await pool.query(
            `SELECT id_producto, nombre, unidades_vendidas, stock
             FROM productos ORDER BY unidades_vendidas DESC LIMIT 5`
        );
        res.json({
            ingresos: Number(ingresos.ingresos),
            total_ordenes: conteoOrdenes.total,
            productos_activos: productosActivos.total,
            total_usuarios: totalUsuarios.total,
            stock_bajo_total: conteoStockBajo.total,
            ventas_recientes: ventasRecientes,
            stock_bajo: stockBajo,
            top_productos: topProductos
        });
    } catch (err) { next(err); }
});

// ---------- Usuarios ----------

// GET /api/admin/usuarios?buscar=texto&rol=admin|cliente
// Incluye cuántas órdenes tiene cada usuario (como en la tabla del prototipo).
router.get('/usuarios', async (req, res, next) => {
    try {
        const condiciones = [];
        const valores = [];
        if (req.query.buscar) {
            const texto = `%${req.query.buscar.trim()}%`;
            condiciones.push('(u.nombre LIKE ? OR u.email LIKE ?)');
            valores.push(texto, texto);
        }
        if (req.query.rol) {
            condiciones.push('r.nombre = ?');
            valores.push(req.query.rol);
        }
        const [filas] = await pool.query(
            `SELECT u.id_usuario, u.nombre, u.email, u.fecha_registro, r.nombre AS rol,
                    (SELECT COUNT(*) FROM ordenes o WHERE o.id_usuario = u.id_usuario) AS total_ordenes
             FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
             ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
             ORDER BY u.nombre`,
            valores
        );
        res.json(filas);
    } catch (err) { next(err); }
});

// PUT /api/admin/usuarios/:id/rol — Cambiar el rol. Body: { rol: "admin" | "cliente" }
// Dar el rol admin exige además la contraseña del administrador que hace el
// cambio (body.password): se compara con bcrypt contra su propio hash en la
// base de datos. Quitar el rol admin no pide contraseña, solo la
// confirmación de la página.
router.put('/usuarios/:id/rol', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const rol = req.body.rol;
        if (rol !== 'admin' && rol !== 'cliente') {
            return res.status(400).json({ error: 'El rol debe ser "admin" o "cliente".' });
        }
        if (id === req.usuario.id_usuario) {
            return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
        }
        if (rol === 'admin') {
            const password = req.body.password || '';
            if (!password) {
                return res.status(400).json({ error: 'Escribe tu contraseña de administrador para dar el rol admin.' });
            }
            const [[admin]] = await pool.query('SELECT password_hash FROM usuarios WHERE id_usuario = ?', [req.usuario.id_usuario]);
            const correcta = admin && admin.password_hash && await bcrypt.compare(password, admin.password_hash);
            if (!correcta) {
                return res.status(403).json({ error: 'Contraseña de administrador incorrecta.' });
            }
        }
        const [filas] = await pool.query('SELECT id_rol FROM roles WHERE nombre = ?', [rol]);
        const [r] = await pool.query('UPDATE usuarios SET id_rol = ? WHERE id_usuario = ?', [filas[0].id_rol, id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        res.json({ mensaje: 'Rol actualizado.' });
    } catch (err) { next(err); }
});

// DELETE /api/admin/usuarios/:id — Eliminar un usuario.
router.delete('/usuarios/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (id === req.usuario.id_usuario) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });
        }
        const [r] = await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
        if (r.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        res.json({ mensaje: 'Usuario eliminado.' });
    } catch (err) { next(err); }
});

// ---------- Ofertas ----------

// GET /api/admin/ofertas — Todos los productos con su estado de oferta
// (para la tabla de "Gestión de Ofertas" del panel).
router.get('/ofertas', async (req, res, next) => {
    try {
        const [filas] = await pool.query(
            `SELECT p.id_producto, p.nombre, p.precio, m.nombre AS marca, c.nombre AS categoria,
                    CASE WHEN o.id_oferta IS NOT NULL AND o.activa = 1 THEN 1 ELSE 0 END AS en_oferta,
                    o.porcentaje_descuento
             FROM productos p
             JOIN marcas m ON m.id_marca = p.id_marca
             JOIN categorias c ON c.id_categoria = p.id_categoria
             LEFT JOIN ofertas o ON o.id_producto = p.id_producto
             ORDER BY p.nombre`
        );
        res.json(filas.map((f) => ({
            id_producto: f.id_producto,
            nombre: f.nombre,
            precio: Number(f.precio),
            marca: f.marca,
            categoria: f.categoria,
            en_oferta: Boolean(f.en_oferta),
            descuento: f.porcentaje_descuento ? Number(f.porcentaje_descuento) : 0
        })));
    } catch (err) { next(err); }
});

// PUT /api/admin/ofertas/:id_producto — Activar/desactivar y cambiar el %.
// Body: { activa: true/false, porcentaje_descuento: 15 }
router.put('/ofertas/:id_producto', async (req, res, next) => {
    try {
        const idProducto = Number(req.params.id_producto);
        const [existe] = await pool.query('SELECT id_producto FROM productos WHERE id_producto = ?', [idProducto]);
        if (existe.length === 0) return res.status(404).json({ error: 'Producto no encontrado.' });

        if (!req.body.activa) {
            await pool.query('DELETE FROM ofertas WHERE id_producto = ?', [idProducto]);
            return res.json({ mensaje: 'Oferta desactivada.' });
        }
        let descuento = Number(req.body.porcentaje_descuento || req.body.descuento || 15);
        descuento = Math.max(1, Math.min(90, descuento));
        await pool.query(
            `INSERT INTO ofertas (id_producto, porcentaje_descuento, activa)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE porcentaje_descuento = VALUES(porcentaje_descuento), activa = 1`,
            [idProducto, descuento]
        );
        res.json({ mensaje: 'Oferta actualizada.', descuento });
    } catch (err) { next(err); }
});

// ---------- Destacados ----------

// GET /api/admin/destacados — La lista manual guardada (vacía = modo automático).
router.get('/destacados', async (req, res, next) => {
    try {
        const [filas] = await pool.query(
            `SELECT d.id_producto, d.posicion, p.nombre, p.precio
             FROM destacados d JOIN productos p ON p.id_producto = d.id_producto
             ORDER BY d.posicion`
        );
        res.json({ modo: filas.length ? 'manual' : 'auto', destacados: filas });
    } catch (err) { next(err); }
});

// PUT /api/admin/destacados — Guardar la lista manual completa.
// Body: { ids: [4, 10, 2, ...] } — máximo 8, en el orden en que se muestran.
router.put('/destacados', async (req, res, next) => {
    try {
        const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
        if (ids.length > 8) {
            return res.status(400).json({ error: 'Máximo 8 productos destacados.' });
        }
        if (new Set(ids).size !== ids.length) {
            return res.status(400).json({ error: 'No se puede repetir un producto.' });
        }
        if (ids.length > 0) {
            const [productos] = await pool.query(
                `SELECT id_producto FROM productos WHERE id_producto IN (${ids.map(() => '?').join(',')})`,
                ids
            );
            if (productos.length !== ids.length) {
                return res.status(404).json({ error: 'Uno de los productos no existe.' });
            }
        }
        await pool.query('DELETE FROM destacados');
        for (let i = 0; i < ids.length; i++) {
            await pool.query('INSERT INTO destacados (id_producto, posicion) VALUES (?, ?)', [ids[i], i + 1]);
        }
        res.json({ mensaje: 'Destacados guardados.', modo: ids.length ? 'manual' : 'auto' });
    } catch (err) { next(err); }
});

// POST /api/admin/destacados/auto — Llenar la lista manual con los 8 más
// vendidos con stock > 0 ("Autocompletar con más vendidos" del prototipo).
router.post('/destacados/auto', async (req, res, next) => {
    try {
        const [top] = await pool.query(
            'SELECT id_producto FROM productos WHERE stock > 0 ORDER BY unidades_vendidas DESC LIMIT 8'
        );
        await pool.query('DELETE FROM destacados');
        for (let i = 0; i < top.length; i++) {
            await pool.query('INSERT INTO destacados (id_producto, posicion) VALUES (?, ?)', [top[i].id_producto, i + 1]);
        }
        res.json({ mensaje: 'Se seleccionaron los 8 más vendidos.', destacados: top.map((t) => t.id_producto) });
    } catch (err) { next(err); }
});

module.exports = router;

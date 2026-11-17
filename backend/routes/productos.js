// routes/productos.js — Catálogo, detalle, ofertas, destacados y CRUD (admin).
// Reglas tomadas del prototipo (app.js):
//   - Filtros del catálogo (applyAllFilters): buscar por nombre/marca/categoría,
//     solo con existencia, marcas seleccionadas, precio mínimo y máximo (sobre
//     el precio BASE, sin descuento) y orden: relevancia, precio menor a mayor,
//     precio mayor a menor o disponibilidad (más stock primero).
//   - Ofertas (renderOffers): solo productos en oferta, con stock > 0 y
//     descuento mayor que 0. El precio de oferta se redondea (ver utils.js).
//   - Destacados automáticos (renderFeaturedProducts): con stock > 0,
//     ordenados por más vendidos, los primeros 8.
//   - Crear/editar (saveProduct): marca y categoría se escriben por nombre,
//     descripción breve de máximo 80 caracteres, especificaciones en líneas
//     "Clave:Valor", "Marcar como Nuevo", oferta con descuento de 1 a 90
//     (al activar una oferta sin descuento, el prototipo pone 15 por defecto).
//   - Eliminar: el prototipo borra el producto; aquí la base de datos impide
//     borrar un producto que ya tenga órdenes (llave foránea sin CASCADE en
//     orden_detalle) y la API responde 409 explicándolo.
// Nota: el prototipo guardaba rating y número de reseñas en el producto; en la
// base de datos no existen esas columnas: la calificación se calcula con el
// promedio de la tabla resenas (AVG) y el conteo con COUNT.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { formatearProducto, SELECT_PRODUCTOS } = require('../utils');

const router = express.Router();

// ---------- Listas auxiliares para los filtros y el formulario ----------

// GET /api/productos/marcas — Todas las marcas (para los checkboxes del catálogo).
router.get('/marcas', async (req, res, next) => {
    try {
        const [filas] = await pool.query('SELECT id_marca AS id, nombre FROM marcas ORDER BY nombre');
        res.json(filas);
    } catch (err) { next(err); }
});

// GET /api/productos/categorias — Todas las categorías.
router.get('/categorias', async (req, res, next) => {
    try {
        const [filas] = await pool.query('SELECT id_categoria AS id, nombre FROM categorias ORDER BY nombre');
        res.json(filas);
    } catch (err) { next(err); }
});

// GET /api/productos/ofertas — Productos en oferta (vista "Ofertas" del inicio).
router.get('/ofertas', async (req, res, next) => {
    try {
        const [filas] = await pool.query(
            `${SELECT_PRODUCTOS}
             WHERE o.id_oferta IS NOT NULL AND o.activa = 1
               AND o.porcentaje_descuento > 0 AND p.stock > 0
             GROUP BY p.id_producto ORDER BY p.nombre`
        );
        res.json(filas.map(formatearProducto));
    } catch (err) { next(err); }
});

// GET /api/productos/destacados — Productos de la página de inicio.
// Si el admin guardó una lista manual en la tabla destacados, se usa esa
// (en el orden de "posicion"); si la tabla está vacía, se calculan
// automáticamente los 8 más vendidos con stock > 0, como en el prototipo.
router.get('/destacados', async (req, res, next) => {
    try {
        const [manuales] = await pool.query(
            `${SELECT_PRODUCTOS}
             JOIN destacados d ON d.id_producto = p.id_producto
             WHERE p.stock > 0
             GROUP BY p.id_producto ORDER BY d.posicion LIMIT 8`
        );
        if (manuales.length > 0) {
            return res.json({ modo: 'manual', productos: manuales.map(formatearProducto) });
        }
        const [automaticos] = await pool.query(
            `${SELECT_PRODUCTOS}
             WHERE p.stock > 0
             GROUP BY p.id_producto ORDER BY p.unidades_vendidas DESC LIMIT 8`
        );
        res.json({ modo: 'auto', productos: automaticos.map(formatearProducto) });
    } catch (err) { next(err); }
});

// ---------- Catálogo ----------

// GET /api/productos — Lista con filtros.
// Parámetros (todos opcionales):
//   ?buscar=rtx        texto en nombre, marca o categoría
//   ?marca=AMD         una marca, o varias separadas por coma: ?marca=AMD,Intel
//   ?categoria=Monitores
//   ?min=1000&max=10000
//   ?stock=1           solo con existencia
//   ?ofertas=1         solo productos en oferta
//   ?orden=default | precio-asc | precio-desc | disponibilidad
router.get('/', async (req, res, next) => {
    try {
        const condiciones = [];
        const valores = [];

        if (req.query.buscar) {
            const texto = `%${req.query.buscar.trim()}%`;
            condiciones.push('(p.nombre LIKE ? OR m.nombre LIKE ? OR c.nombre LIKE ?)');
            valores.push(texto, texto, texto);
        }
        if (req.query.marca) {
            const marcas = String(req.query.marca).split(',').map((m) => m.trim()).filter(Boolean);
            if (marcas.length > 0) {
                condiciones.push(`m.nombre IN (${marcas.map(() => '?').join(',')})`);
                valores.push(...marcas);
            }
        }
        if (req.query.categoria) {
            condiciones.push('c.nombre = ?');
            valores.push(req.query.categoria);
        }
        if (req.query.min !== undefined && req.query.min !== '') {
            condiciones.push('p.precio >= ?');
            valores.push(Number(req.query.min));
        }
        if (req.query.max !== undefined && req.query.max !== '') {
            condiciones.push('p.precio <= ?');
            valores.push(Number(req.query.max));
        }
        if (req.query.stock === '1') {
            condiciones.push('p.stock > 0');
        }
        if (req.query.ofertas === '1') {
            condiciones.push('o.id_oferta IS NOT NULL AND o.activa = 1 AND o.porcentaje_descuento > 0');
        }

        let orden = 'p.id_producto';
        if (req.query.orden === 'precio-asc') orden = 'p.precio ASC';
        else if (req.query.orden === 'precio-desc') orden = 'p.precio DESC';
        else if (req.query.orden === 'disponibilidad') orden = 'p.stock DESC';

        const sql = `${SELECT_PRODUCTOS}
            ${condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : ''}
            GROUP BY p.id_producto ORDER BY ${orden}`;
        const [filas] = await pool.query(sql, valores);
        res.json(filas.map(formatearProducto));
    } catch (err) { next(err); }
});

// ---------- Detalle ----------

// GET /api/productos/:id — Un producto con especificaciones y reseñas.
router.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [filas] = await pool.query(
            `${SELECT_PRODUCTOS} WHERE p.id_producto = ? GROUP BY p.id_producto`,
            [id]
        );
        if (filas.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        const producto = formatearProducto(filas[0]);
        const [specs] = await pool.query(
            'SELECT clave, valor FROM especificaciones WHERE id_producto = ? ORDER BY id_especificacion',
            [id]
        );
        const [resenas] = await pool.query(
            `SELECT r.id_resena, r.calificacion, r.comentario, r.fecha, u.nombre AS usuario
             FROM resenas r JOIN usuarios u ON u.id_usuario = r.id_usuario
             WHERE r.id_producto = ? ORDER BY r.fecha DESC`,
            [id]
        );
        // v3.1: fotos extra de la galería. Si la tabla aún no existe
        // (falta correr migracion_galeria.sql), el detalle igual funciona.
        let imagenes = [];
        try {
            const [fotos] = await pool.query(
                'SELECT id_imagen, url, posicion FROM producto_imagenes WHERE id_producto = ? ORDER BY posicion, id_imagen',
                [id]
            );
            imagenes = fotos;
        } catch (e) {
            if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
        }
        producto.especificaciones = specs;
        producto.resenas = resenas;
        producto.imagenes = imagenes;
        res.json(producto);
    } catch (err) { next(err); }
});

// ---------- CRUD (solo administradores) ----------

// Busca una marca por nombre y, si no existe, la crea. Devuelve su id.
// "db" es el pool o la conexión de la transacción: así estas consultas
// participan en la transacción del POST/PUT (P1-1).
async function idMarca(db, nombre) {
    const [filas] = await db.query('SELECT id_marca FROM marcas WHERE nombre = ?', [nombre]);
    if (filas.length) return filas[0].id_marca;
    const [r] = await db.query('INSERT INTO marcas (nombre) VALUES (?)', [nombre]);
    return r.insertId;
}

// Igual para la categoría.
async function idCategoria(db, nombre) {
    const [filas] = await db.query('SELECT id_categoria FROM categorias WHERE nombre = ?', [nombre]);
    if (filas.length) return filas[0].id_categoria;
    const [r] = await db.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
    return r.insertId;
}

// Las especificaciones pueden llegar como lista [{clave, valor}] o como texto
// "Clave:Valor" una por línea, igual que el textarea del formulario (app.js).
function normalizarSpecs(especificaciones) {
    if (Array.isArray(especificaciones)) {
        return especificaciones
            .filter((e) => e && e.clave && e.valor)
            .map((e) => ({ clave: String(e.clave).trim(), valor: String(e.valor).trim() }));
    }
    if (typeof especificaciones === 'string' && especificaciones.trim()) {
        return especificaciones.split('\n').map((linea) => {
            const i = linea.indexOf(':');
            if (i <= 0) return null;
            return { clave: linea.slice(0, i).trim(), valor: linea.slice(i + 1).trim() };
        }).filter((e) => e && e.clave && e.valor);
    }
    return [];
}

function validarProducto(body) {
    if (!body.nombre || !String(body.nombre).trim()) return 'El nombre del producto es obligatorio.';
    if (!body.marca || !String(body.marca).trim()) return 'La marca es obligatoria.';
    if (!body.categoria || !String(body.categoria).trim()) return 'La categoría es obligatoria.';
    if (body.precio === undefined || Number(body.precio) < 0 || Number.isNaN(Number(body.precio))) {
        return 'El precio debe ser un número mayor o igual a 0.';
    }
    if (body.stock === undefined || Number(body.stock) < 0 || !Number.isInteger(Number(body.stock))) {
        return 'El stock debe ser un número entero mayor o igual a 0.';
    }
    if (body.descripcion_breve && String(body.descripcion_breve).length > 80) {
        return 'La descripción breve tiene máximo 80 caracteres.';
    }
    return null;
}

// Guarda (crea o actualiza) la oferta de un producto.
// Si "activa" es falso, la oferta se borra; si es verdadero y no trae
// descuento, el prototipo usaba 15 por defecto.
async function guardarOferta(db, idProducto, oferta) {
    if (!oferta || !oferta.activa) {
        await db.query('DELETE FROM ofertas WHERE id_producto = ?', [idProducto]);
        return;
    }
    let descuento = Number(oferta.porcentaje_descuento || oferta.descuento || 15);
    descuento = Math.max(1, Math.min(90, descuento)); // la tabla solo acepta 1-90
    await db.query(
        `INSERT INTO ofertas (id_producto, porcentaje_descuento, activa)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE porcentaje_descuento = VALUES(porcentaje_descuento), activa = 1`,
        [idProducto, descuento]
    );
}

// POST /api/productos — Crear producto (admin).
// Todo en una transacción: si falla un INSERT de especificaciones o la
// oferta, el producto NO queda creado a medias (P1-1, mismo patrón que el
// checkout de ordenes.js).
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
    const error = validarProducto(req.body);
    if (error) return res.status(400).json({ error });
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const idM = await idMarca(conn, String(req.body.marca).trim());
        const idC = await idCategoria(conn, String(req.body.categoria).trim());
        const [resultado] = await conn.query(
            `INSERT INTO productos
             (nombre, descripcion_breve, precio, stock, imagen_url, es_nuevo, id_marca, id_categoria)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(req.body.nombre).trim(),
                String(req.body.descripcion_breve || '').trim(),
                Number(req.body.precio),
                Number(req.body.stock),
                // La columna imagen_url solo admite 500 caracteres: las imágenes
                // en base64 del prototipo no caben; se guarda la URL o NULL.
                // Un archivo subido se guarda después con POST /:id/imagen.
                req.body.imagen_url ? String(req.body.imagen_url).slice(0, 500) : null,
                req.body.es_nuevo ? 1 : 0,
                idM, idC
            ]
        );
        const idProducto = resultado.insertId;
        const specs = normalizarSpecs(req.body.especificaciones);
        for (const s of specs) {
            await conn.query(
                'INSERT INTO especificaciones (clave, valor, id_producto) VALUES (?, ?, ?)',
                [s.clave, s.valor, idProducto]
            );
        }
        await guardarOferta(conn, idProducto, req.body.oferta);
        await conn.commit();
        res.status(201).json({ mensaje: 'Producto agregado.', id_producto: idProducto });
    } catch (err) {
        try { await conn.rollback(); } catch (e) { /* ya estaba cerrada */ }
        next(err);
    } finally {
        conn.release();
    }
});

// PUT /api/productos/:id — Editar producto (admin).
// Todo en una transacción (P1-1): antes se borraban las especificaciones
// y luego se reinsertaban sin transacción, así que si un INSERT fallaba el
// producto quedaba sin especificaciones.
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
    const id = Number(req.params.id);
    const error = validarProducto(req.body);
    if (error) return res.status(400).json({ error });
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [existe] = await conn.query('SELECT id_producto FROM productos WHERE id_producto = ?', [id]);
        if (existe.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        const idM = await idMarca(conn, String(req.body.marca).trim());
        const idC = await idCategoria(conn, String(req.body.categoria).trim());
        await conn.query(
            `UPDATE productos SET nombre = ?, descripcion_breve = ?, precio = ?, stock = ?,
             imagen_url = ?, es_nuevo = ?, id_marca = ?, id_categoria = ? WHERE id_producto = ?`,
            [
                String(req.body.nombre).trim(),
                String(req.body.descripcion_breve || '').trim(),
                Number(req.body.precio),
                Number(req.body.stock),
                req.body.imagen_url ? String(req.body.imagen_url).slice(0, 500) : null,
                req.body.es_nuevo ? 1 : 0,
                idM, idC, id
            ]
        );
        // Las especificaciones se reemplazan por completo con las nuevas.
        await conn.query('DELETE FROM especificaciones WHERE id_producto = ?', [id]);
        const specs = normalizarSpecs(req.body.especificaciones);
        for (const s of specs) {
            await conn.query(
                'INSERT INTO especificaciones (clave, valor, id_producto) VALUES (?, ?, ?)',
                [s.clave, s.valor, id]
            );
        }
        await guardarOferta(conn, id, req.body.oferta);
        await conn.commit();
        res.json({ mensaje: 'Producto actualizado.' });
    } catch (err) {
        try { await conn.rollback(); } catch (e) { /* ya estaba cerrada */ }
        next(err);
    } finally {
        conn.release();
    }
});

// ---------- Subida de imagen por archivo (P1-2) ----------
// POST /api/productos/:id/imagen — Subir la foto de un producto desde la web.
// Solo administradores. Acepta solo archivos de imagen de hasta 2 MB (el
// mismo límite que valida el formulario) y guarda el archivo en
// backend/uploads/ con nombre único; en la base de datos solo se guarda
// la ruta relativa (/uploads/...) en imagen_url, que sí cabe en el
// VARCHAR(500) de la columna.
const carpetaUploads = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(carpetaUploads)) fs.mkdirSync(carpetaUploads, { recursive: true });

const almacenamientoImagenes = multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpetaUploads),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `producto-${req.params.id}-${Date.now()}${ext}`);
    }
});

function filtroSoloImagen(req, file, cb) {
    const extensiones = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (file.mimetype && file.mimetype.startsWith('image/') &&
        extensiones.includes(path.extname(file.originalname).toLowerCase())) {
        return cb(null, true);
    }
    cb(new Error('SOLO_IMAGEN'));
}

const subirImagen = multer({
    storage: almacenamientoImagenes,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: filtroSoloImagen
});

router.post('/:id/imagen', requireAuth, requireAdmin, (req, res, next) => {
    subirImagen.single('imagen')(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen debe ser menor a 2 MB.' });
            }
            if (err.message === 'SOLO_IMAGEN') {
                return res.status(400).json({ error: 'Solo se permiten archivos de imagen (JPG, PNG, GIF o WEBP).' });
            }
            return next(err);
        }
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Elige una imagen para subir.' });
            }
            const id = Number(req.params.id);
            const [filas] = await pool.query('SELECT imagen_url FROM productos WHERE id_producto = ?', [id]);
            if (filas.length === 0) {
                fs.unlink(req.file.path, () => {});
                return res.status(404).json({ error: 'Producto no encontrado.' });
            }
            // Si la foto anterior era un archivo subido, se borra para no
            // acumular archivos huérfanos en uploads/.
            const anterior = filas[0].imagen_url;
            if (anterior && anterior.startsWith('/uploads/')) {
                fs.unlink(path.join(carpetaUploads, path.basename(anterior)), () => {});
            }
            const ruta = '/uploads/' + req.file.filename;
            await pool.query('UPDATE productos SET imagen_url = ? WHERE id_producto = ?', [ruta, id]);
            res.json({ mensaje: 'Imagen subida.', imagen_url: ruta });
        } catch (e) { next(e); }
    });
});


// ---------- Galería de fotos (v3.1) ----------
// GET /api/productos/:id/imagenes — Fotos adicionales (público).
router.get('/:id/imagenes', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [filas] = await pool.query(
            'SELECT id_imagen, url, posicion FROM producto_imagenes WHERE id_producto = ? ORDER BY posicion, id_imagen',
            [id]
        );
        res.json(filas);
    } catch (err) {
        // Si la tabla aún no existe, se devuelve lista vacía en vez de 500.
        if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        next(err);
    }
});

// POST /api/productos/:id/imagenes — Agregar foto (admin): archivo o URL.
router.post('/:id/imagenes', requireAuth, requireAdmin, (req, res, next) => {
    subirImagen.single('imagen')(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen debe ser menor a 2 MB.' });
            }
            if (err.message === 'SOLO_IMAGEN') {
                return res.status(400).json({ error: 'Solo se permiten archivos de imagen (JPG, PNG, GIF o WEBP).' });
            }
            return next(err);
        }
        try {
            const id = Number(req.params.id);
            let url = null;
            if (req.file) url = '/uploads/' + req.file.filename;
            else if (req.body && typeof req.body.url === 'string') url = req.body.url.trim();
            if (!url) {
                if (req.file) fs.unlink(req.file.path, () => {});
                return res.status(400).json({ error: 'Sube un archivo o pega una URL de imagen.' });
            }
            if (url.length > 500) {
                if (req.file) fs.unlink(req.file.path, () => {});
                return res.status(400).json({ error: 'La URL de la imagen es demasiado larga.' });
            }
            const [existe] = await pool.query('SELECT id_producto FROM productos WHERE id_producto = ?', [id]);
            if (existe.length === 0) {
                if (req.file) fs.unlink(req.file.path, () => {});
                return res.status(404).json({ error: 'Producto no encontrado.' });
            }
            const [max] = await pool.query('SELECT COALESCE(MAX(posicion), -1) AS maxPos FROM producto_imagenes WHERE id_producto = ?', [id]);
            const posicion = (max[0].maxPos ?? -1) + 1;
            const [resultado] = await pool.query(
                'INSERT INTO producto_imagenes (id_producto, url, posicion) VALUES (?, ?, ?)',
                [id, url, posicion]
            );
            res.status(201).json({ id_imagen: resultado.insertId, url, posicion });
        } catch (e) {
            if (e.code === 'ER_NO_SUCH_TABLE') {
                return res.status(400).json({ error: 'Falta correr migracion_galeria.sql en Workbench (crea la tabla producto_imagenes).' });
            }
            next(e);
        }
    });
});

// DELETE /api/productos/:id/imagenes/:idImagen — Quitar foto (admin).
router.delete('/:id/imagenes/:idImagen', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const idImagen = Number(req.params.idImagen);
        const [filas] = await pool.query(
            'SELECT url FROM producto_imagenes WHERE id_imagen = ? AND id_producto = ?',
            [idImagen, id]
        );
        if (filas.length === 0) {
            return res.status(404).json({ error: 'Foto no encontrada.' });
        }
        await pool.query('DELETE FROM producto_imagenes WHERE id_imagen = ?', [idImagen]);
        const url = filas[0].url;
        if (url && url.startsWith('/uploads/')) {
            fs.unlink(path.join(carpetaUploads, path.basename(url)), () => {});
        }
        res.json({ mensaje: 'Foto eliminada.' });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(400).json({ error: 'Falta correr migracion_galeria.sql en Workbench (crea la tabla producto_imagenes).' });
        }
        next(err);
    }
});

// DELETE /api/productos/:id — Eliminar producto (admin).
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const [resultado] = await pool.query('DELETE FROM productos WHERE id_producto = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.json({ mensaje: 'Producto eliminado.' });
    } catch (err) {
        // Error 1451: el producto ya tiene órdenes y la llave foránea lo protege.
        if (err && err.errno === 1451) {
            return res.status(409).json({
                error: 'No se puede eliminar: este producto ya tiene órdenes registradas.'
            });
        }
        next(err);
    }
});

module.exports = router;

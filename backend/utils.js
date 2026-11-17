// utils.js — Reglas de negocio tomadas tal cual del prototipo (app.js).
// Si una regla cambia aquí, cambia en toda la API, igual que en el prototipo.

// Envío: en app.js (updateCartModal y checkout) es:
//   subtotal >= 1000  ->  envío gratis (0)
//   subtotal < 1000   ->  $150 de envío
function calcularEnvio(subtotal) {
    return subtotal >= 1000 ? 0 : 150;
}

// Precio con oferta: en app.js (getEffectivePrice) es:
//   Math.round(precio * (1 - descuento / 100))
// Si no hay oferta activa, el precio queda igual.
// "descuento" es el porcentaje (15 = 15%), igual que en la tabla ofertas.
function precioConDescuento(precio, descuento) {
    if (!descuento || descuento <= 0) return Math.round(Number(precio));
    return Math.round(Number(precio) * (1 - descuento / 100));
}

// Convierte una fila de productos (con JOIN a marcas, categorias y ofertas)
// al objeto que usa el front-end, con los mismos nombres del prototipo.
function formatearProducto(fila) {
    const descuento = fila.en_oferta ? Number(fila.porcentaje_descuento) : 0;
    const precio = Number(fila.precio);
    return {
        id: fila.id_producto,
        id_producto: fila.id_producto,
        nombre: fila.nombre,
        descripcion_breve: fila.descripcion_breve,
        // Precio base (sin descuento), como en la tabla productos.
        precio: precio,
        // Precio que realmente paga el cliente (con descuento si hay oferta).
        precio_final: precioConDescuento(precio, descuento),
        stock: fila.stock,
        unidades_vendidas: fila.unidades_vendidas,
        vendido: fila.unidades_vendidas, // alias, igual que "sold" del prototipo
        imagen_url: fila.imagen_url,
        es_nuevo: Boolean(fila.es_nuevo),
        marca: fila.marca,
        categoria: fila.categoria,
        id_marca: fila.id_marca,
        id_categoria: fila.id_categoria,
        en_oferta: Boolean(fila.en_oferta),
        isOffer: Boolean(fila.en_oferta), // mismo nombre que usa app.js
        descuento: descuento,
        // Promedio de estrellas y número de reseñas (de la tabla resenas).
        calificacion: fila.calificacion_promedio ? Number(fila.calificacion_promedio) : null,
        total_resenas: Number(fila.total_resenas || 0),
        fecha_creacion: fila.fecha_creacion
    };
}

// Consulta base de productos: trae marca, categoría, oferta activa y
// el promedio de reseñas. Se reutiliza en la lista y en el detalle.
const SELECT_PRODUCTOS = `
    SELECT p.*, m.nombre AS marca, c.nombre AS categoria,
           CASE WHEN o.id_oferta IS NOT NULL AND o.activa = 1
                THEN 1 ELSE 0 END AS en_oferta,
           o.porcentaje_descuento,
           AVG(r.calificacion) AS calificacion_promedio,
           COUNT(r.id_resena) AS total_resenas
    FROM productos p
    JOIN marcas m ON m.id_marca = p.id_marca
    JOIN categorias c ON c.id_categoria = p.id_categoria
    LEFT JOIN ofertas o ON o.id_producto = p.id_producto
    LEFT JOIN resenas r ON r.id_producto = p.id_producto
`;

module.exports = { calcularEnvio, precioConDescuento, formatearProducto, SELECT_PRODUCTOS };

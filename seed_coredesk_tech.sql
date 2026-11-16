-- ============================================================
-- CoreDesk Tech — Datos iniciales (seed)
-- Proyecto final Programación Web, Fase 3
-- Equipo: Manuel Alexander Fuentes Contreras (2134970)
--         Jaime Sebastián Esparza Leyva (2097304)
-- Grupo 416, Ing. Luis Daniel Lepe Rodríguez
--
-- Cómo se usa:
--   1. Importar primero coredesk_tech.sql (estructura).
--   2. En MySQL Workbench: File > Open SQL Script > este archivo
--      y ejecutarlo, o en PowerShell:
--      mysql -u root -p coredesk_tech < seed_coredesk_tech.sql
--   Los datos salen de los 12 productos del prototipo (app.js).
--   Las contraseñas son hashes bcrypt, NO texto plano:
--     admin@coredesk.com   -> admin123   (rol admin)
--     cliente@demo.com     -> cliente123 (rol cliente)
-- ============================================================

USE `coredesk_tech`;

-- ---------- Marcas (9) ----------
INSERT INTO `marcas` (`id_marca`, `nombre`) VALUES
(1, 'AMD'),
(2, 'ASUS'),
(3, 'MSI'),
(4, 'Corsair'),
(5, 'Samsung'),
(6, 'NZXT'),
(7, 'Logitech'),
(8, 'Cooler Master'),
(9, 'Intel');

-- ---------- Categorías (10) ----------
INSERT INTO `categorias` (`id_categoria`, `nombre`) VALUES
(1, 'Procesadores'),
(2, 'Tarjetas de Video'),
(3, 'Tarjetas Madre'),
(4, 'Memoria RAM'),
(5, 'Almacenamiento'),
(6, 'Fuentes de Poder'),
(7, 'Gabinetes'),
(8, 'Monitores'),
(9, 'Periféricos'),
(10, 'Enfriamiento');

-- ---------- Productos (12, los del prototipo) ----------
-- imagen_url queda en NULL: el prototipo usaba imágenes SVG
-- incrustadas, no URLs reales. El back-end pondrá una imagen
-- por defecto cuando imagen_url sea NULL.
INSERT INTO `productos` (`id_producto`, `nombre`, `descripcion_breve`, `precio`, `stock`, `unidades_vendidas`, `imagen_url`, `es_nuevo`, `id_marca`, `id_categoria`) VALUES
(1, 'AMD Ryzen 7 7800X3D', '8 núcleos / 16 hilos, 3D V-Cache', 8999.00, 25, 18, NULL, 0, 1, 1),
(2, 'NVIDIA RTX 4070 SUPER', '12GB GDDR6X, DLSS 3.5', 14999.00, 12, 25, NULL, 1, 2, 2),
(3, 'MSI MAG B650 TOMAHAWK WIFI', 'Socket AM5, ATX, Wi-Fi 6E', 4999.00, 18, 12, NULL, 0, 3, 3),
(4, 'Corsair Vengeance DDR5 32GB', '2x16GB, 6000MHz, CL36 RGB', 2899.00, 40, 30, NULL, 0, 4, 4),
(5, 'Samsung 990 PRO 2TB NVMe', '7,450 MB/s lectura', 3499.00, 33, 22, NULL, 0, 5, 5),
(6, 'Corsair RM850x 850W', 'Fully Modular, 80+ Gold', 2799.00, 22, 15, NULL, 0, 4, 6),
(7, 'NZXT H7 Flow RGB', 'Mid Tower, vidrio templado', 2499.00, 15, 8, NULL, 1, 6, 7),
(8, 'ASUS ROG Swift PG279QM 27"', '1440p, 240Hz, G-Sync', 18999.00, 8, 5, NULL, 0, 2, 8),
(9, 'Corsair K95 RGB Platinum XT', 'Switches Cherry MX Blue', 3499.00, 20, 20, NULL, 0, 4, 9),
(10, 'Logitech G Pro X Superlight 2', '63g, 32K DPI, inalámbrico', 2799.00, 30, 28, NULL, 1, 7, 9),
(11, 'Cooler Master ML360L V2', 'Radiador 360mm, ARGB', 1999.00, 14, 6, NULL, 0, 8, 10),
(12, 'Intel Core i7-14700K', '20 núcleos, 28 hilos', 9499.00, 0, 4, NULL, 0, 9, 1);

-- ---------- Especificaciones (clave-valor por producto) ----------
INSERT INTO `especificaciones` (`clave`, `valor`, `id_producto`) VALUES
('Socket', 'AM5', 1),
('Frecuencia', '4.2 - 5.0 GHz', 1),
('Cache', '96MB L3', 1),
('TDP', '120W', 1),
('VRAM', '12GB GDDR6X', 2),
('Bus', '192-bit', 2),
('TDP', '220W', 2),
('Socket', 'AM5', 3),
('Formato', 'ATX', 3),
('RAM', 'DDR5 6600+', 3),
('Capacidad', '32GB', 4),
('Frecuencia', '6000MHz', 4),
('Capacidad', '2TB', 5),
('Lectura', '7,450 MB/s', 5),
('Potencia', '850W', 6),
('Certificación', '80+ Gold', 6),
('Formato', 'Mid Tower', 7),
('Paneles', 'Vidrio templado', 7),
('Tamaño', '27"', 8),
('Frecuencia', '240Hz', 8),
('Switches', 'Cherry MX Blue', 9),
('Layout', 'Español', 9),
('DPI', '32,000', 10),
('Peso', '63g', 10),
('Tipo', 'Líquido AIO', 11),
('Radiador', '360mm', 11),
('Socket', 'LGA1700', 12),
('Núcleos', '20', 12);

-- ---------- Ofertas (3, las del prototipo) ----------
INSERT INTO `ofertas` (`id_producto`, `porcentaje_descuento`, `activa`) VALUES
(4, 15, 1),
(6, 20, 1),
(9, 25, 1);

-- ---------- Destacados (8, los más vendidos del prototipo) ----------
INSERT INTO `destacados` (`id_producto`, `posicion`) VALUES
(4, 1),
(10, 2),
(2, 3),
(5, 4),
(9, 5),
(1, 6),
(6, 7),
(3, 8);

-- ---------- Usuarios ----------
-- id_rol: 2 = admin, 1 = cliente (así quedaron en coredesk_tech.sql).
-- password_hash es bcrypt de la contraseña indicada en el encabezado.
INSERT INTO `usuarios` (`id_usuario`, `nombre`, `email`, `password_hash`, `id_rol`) VALUES
(1, 'Administrador CoreDesk', 'admin@coredesk.com', '$2b$10$6r/6UHbz1PiDgdPb1c23iOiSoC5nFlp567ulrP8CsvQzx6X20TXv.', 2),
(2, 'Cliente Demo', 'cliente@demo.com', '$2b$10$Xi/264uPzuiRV2vQ17rsb.mFb.i06gssqcgZmCFff8AY6XcGnx.G2', 1);

-- ---------- Reseñas de ejemplo (3) ----------
INSERT INTO `resenas` (`id_usuario`, `id_producto`, `calificacion`, `comentario`) VALUES
(2, 1, 5, 'Excelente procesador para gaming, muy buen rendimiento.'),
(2, 2, 5, 'La tarjeta corre todo en alto, muy recomendada.'),
(2, 4, 4, 'Buena memoria RAM, rápida y estable.');

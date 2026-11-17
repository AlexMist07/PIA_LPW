-- migracion_galeria.sql — CoreDesk Tech, correcciones v3.1 (Fase 3)
-- Ejecutar UNA VEZ en MySQL Workbench, con la base coredesk_tech seleccionada.
-- Crea la tabla de fotos adicionales (galería) de cada producto.
-- La foto principal sigue siendo productos.imagen_url; estas son las extra.
USE coredesk_tech;

CREATE TABLE IF NOT EXISTS producto_imagenes (
  id_imagen INT AUTO_INCREMENT PRIMARY KEY,
  id_producto INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  posicion INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_imagen_producto FOREIGN KEY (id_producto)
    REFERENCES productos (id_producto) ON DELETE CASCADE
);

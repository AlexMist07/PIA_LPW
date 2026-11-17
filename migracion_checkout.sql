-- migracion_checkout.sql — CoreDesk Tech, correcciones v3 (Fase 3)
-- Ejecutar UNA VEZ en MySQL Workbench, con la base coredesk_tech seleccionada.
-- Agrega a la tabla ordenes los datos del checkout en pasos: la dirección de
-- envío, el método de pago y SOLO los últimos 4 dígitos de la tarjeta.
-- La tarjeta completa y el CVV NUNCA se guardan (ni se envían al servidor).
USE coredesk_tech;

ALTER TABLE ordenes
  ADD COLUMN direccion_envio TEXT NULL AFTER total,
  ADD COLUMN metodo_pago VARCHAR(20) NULL AFTER direccion_envio,
  ADD COLUMN ultimos4_tarjeta CHAR(4) NULL AFTER metodo_pago;

# CoreDesk Tech — Back-end (Fase 3)

API REST con **Node.js + Express + MySQL** para el proyecto final de Programación Web.

- **Equipo:** Manuel Alexander Fuentes Contreras (**2134970**) y Jaime Sebastián Esparza Leyva (2097304)
- **Grupo:** 416 — **Ing. Luis Daniel Lepe Rodríguez**
- **Base de datos:** `coredesk_tech` (MySQL 8.0.46, 13 tablas, ver `coredesk_tech.sql` + `seed_coredesk_tech.sql` en la raíz del repo)

## Qué hace este back-end

Reemplaza el `localStorage` del prototipo por la base de datos real, con las mismas reglas del prototipo (`app.js`):

- **Login y registro** con contraseñas cifradas con **bcrypt** (antes estaban en texto plano en `app.js`) y sesión con **JWT**.
- **Catálogo** con los filtros del prototipo: buscar por nombre/marca/categoría, solo con existencia, marcas, precio mínimo y máximo, y orden por precio o disponibilidad.
- **Ofertas**: precio con descuento redondeado (`Math.round(precio * (1 - descuento/100))`), solo productos en oferta con stock > 0.
- **Destacados**: automáticos (8 más vendidos con stock > 0) o manuales (lista del admin, máximo 8).
- **Carrito** por usuario (tablas `carritos` + `carrito_items`), con validación de stock.
- **Checkout**: en una sola transacción — valida stock, crea la orden (estado `pagada`) con su detalle al precio con descuento, descuenta stock, suma unidades vendidas y vacía el carrito.
- **Envío**: subtotal >= $1,000 MXN → gratis; si no, **$150**. Total = subtotal + envío.
- **Reseñas**: 1 a 5 estrellas, comentario obligatorio, una por usuario y producto (lo exige la base de datos).
- **Panel admin**: Dashboard (ingresos sin canceladas, órdenes, productos con stock, usuarios, ventas recientes, stock < 10, top 5), inventario (CRUD), ofertas, destacados, ventas con filtro de fecha, usuarios (cambiar rol / eliminar).

## Archivos

| Archivo | Qué contiene |
|---|---|
| `server.js` | Arranque: Express, CORS, JSON, sirve el front-end y monta `/api/*` |
| `db.js` | Pool de MySQL (mysql2/promise) y prueba de conexión |
| `utils.js` | Reglas de negocio: envío, precio con descuento, formato de producto |
| `middleware/auth.js` | Verificación de JWT (`requireAuth`, `requireAdmin`) |
| `routes/auth.js` | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/cambiar-password` |
| `routes/productos.js` | `GET /api/productos` (filtros), `GET /api/productos/:id`, `GET /api/productos/ofertas`, `GET /api/productos/destacados`, `GET /api/productos/marcas`, `GET /api/productos/categorias`, `POST/PUT/DELETE /api/productos` (admin) |
| `routes/carrito.js` | `GET/POST/PUT/DELETE /api/carrito` |
| `routes/ordenes.js` | `POST /api/ordenes` (checkout), `GET /api/ordenes/mis`, `GET /api/ordenes` (admin, `?desde&hasta&estado&buscar`), `GET /api/ordenes/:id` |
| `routes/resenas.js` | `GET /api/resenas/producto/:id`, `GET /api/resenas/mis`, `POST /api/resenas`, `DELETE /api/resenas/:id` |
| `routes/admin.js` | `GET /api/admin/dashboard`, `GET/PUT/DELETE /api/admin/usuarios`, `GET/PUT /api/admin/ofertas`, `GET/PUT/POST /api/admin/destacados` |
| `.env.example` | Plantilla de variables (sin contraseñas reales) |
| `.gitignore` | Ignora `node_modules/` y `.env` |

## Instalación (Windows, PowerShell)

> La carpeta `backend/` debe estar dentro del repositorio, junto a `index.html`, `app.js` y `styles.css` (así el servidor sirve el front-end en `http://localhost:3000/`).

**1. Instalar Node.js** (si no lo tienes): descarga el instalador LTS de https://nodejs.org y verifica con:

```powershell
node --version
npm --version
```

**2. Entrar a la carpeta del back-end e instalar dependencias:**

```powershell
cd C:\ruta\a\PIA_LPW\backend
npm install
```

**3. Crear el archivo `.env`** (copia la plantilla y pon TU contraseña de MySQL):

```powershell
Copy-Item .env.example .env
notepad .env
```

En el archivo cambia solo estas dos líneas:

```
DB_PASSWORD=TU_CONTRASEÑA_DE_MYSQL
JWT_SECRET=CAMBIA_ESTE_SECRETO_POR_UNO_LARGO_Y_ALEATORIO
```

El resto ya viene listo (`DB_HOST=localhost`, `DB_PORT=3306`, `DB_USER=root`, `DB_NAME=coredesk_tech`, `PORT=3000`).

**4. Arrancar el servidor:**

```powershell
npm start
```

Debes ver algo así:

```
CoreDesk Tech API escuchando en http://localhost:3000
Front-end en http://localhost:3000/
Conectado a MySQL (base coredesk_tech).
```

**5. Abrir en el navegador:** http://localhost:3000/

## Probar que funciona

**Salud del servidor** (debe responder aunque MySQL esté apagado):

```powershell
curl http://localhost:3000/api/health
```

Respuesta: `{"status":"ok"}`

**Catálogo** (necesita MySQL prendido):

```powershell
curl http://localhost:3000/api/productos
```

**Login de administrador** (usuario del seed):

```powershell
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@coredesk.com\",\"password\":\"admin123\"}"
```

Respuesta: los datos del usuario y un `token`. Ese token se manda en las rutas protegidas así:

```
Authorization: Bearer <token>
```

**Cliente demo:** `cliente@demo.com` / `cliente123`.

## Decisiones y diferencias con el prototipo (para la defensa)

1. **Contraseñas**: en `app.js` el admin era `admin123` en texto plano. Aquí solo se guarda el hash bcrypt en `password_hash`; el login compara con `bcrypt.compare`.
2. **Carrito por usuario**: en el prototipo el carrito era un solo `localStorage` compartido; aquí cada usuario tiene su carrito (`carritos` + `carrito_items`).
3. **Reseñas**: el prototipo permitía varias reseñas del mismo usuario en un producto; la base de datos tiene `UNIQUE(id_usuario, id_producto)`, así que la API responde **409** si ya existe una.
4. **Calificación del producto**: el prototipo guardaba `rating` y `reviews` en el producto; esas columnas no existen en la base de datos, así que la calificación se calcula con el promedio de `resenas` (`AVG`) y el conteo con `COUNT`.
5. **Destacados**: el prototipo guardaba el modo (auto/manual) en `localStorage` y la base de datos no tiene columna para el modo. Regla adoptada: si la tabla `destacados` tiene filas se usa el modo **manual**; si está vacía, el modo **automático** (8 más vendidos con stock > 0).
6. **Imágenes**: la columna `imagen_url` solo admite 500 caracteres; las imágenes en base64 del prototipo no caben, así que se guarda la URL o `NULL`. La imagen `PC-Gamer-4070-Tank-Pro-Black-02.jpg` del repo se puede usar como `imagen_url` de un producto.
7. **Estado `pendiente`**: el filtro de ventas del prototipo incluye el estado `pendiente`, pero el `ENUM` de la tabla `ordenes` solo admite `pagada`, `enviada`, `entregada` y `cancelada`, y el checkout siempre crea la orden como `pagada`. Filtrar por `pendiente` devuelve lista vacía.
8. **Eliminar producto**: si el producto ya tiene órdenes, la llave foránea lo protege y la API responde **409** (en el prototipo se borraba sin más).
9. **Semana**: como en el prototipo, la semana empieza el **lunes** (el filtro `semana` en Ventas debe calcularse en el front-end con esa regla; la API recibe `?desde&hasta` ya calculados).

## Qué falta: conectar el front-end (app.js) a la API

> El front-end todavía NO está cambiado: sigue leyendo `localStorage`. Lo que sigue es reemplazar, en `app.js`, estas funciones por llamadas `fetch` a la API (guardando el token del login en `localStorage` como `coredesk_token` y mandándolo en el header `Authorization: Bearer <token>`):

| Función en `app.js` | Reemplazar por |
|---|---|
| `handleLogin` | `POST /api/auth/login` |
| `handleRegister` | `POST /api/auth/register` |
| `logout` | Borrar `coredesk_token` y `coredesk_currentUser` |
| `renderCatalog` / `applyAllFilters` | `GET /api/productos?buscar=&marca=&min=&max=&stock=&orden=` |
| `renderFeaturedProducts` | `GET /api/productos/destacados` |
| `renderOffers` | `GET /api/productos/ofertas` |
| `showProductDetail` | `GET /api/productos/:id` |
| `addToCart`, `addToCartFromDetail`, `removeFromCart`, `updateCartModal` | `GET/POST/PUT/DELETE /api/carrito` |
| `checkout` | `POST /api/ordenes` (sin el `confirm()` de stock: el servidor valida) |
| `submitReview` | `POST /api/resenas` |
| `renderAdminDashboard` | `GET /api/admin/dashboard` |
| `renderAdminTable`, `saveProduct`, `deleteProduct` | `GET/POST/PUT/DELETE /api/productos` |
| `renderFeaturedAdmin`, `addFeatured`, `removeFeatured`, `moveFeatured`, `autoFillFeatured` | `GET/PUT /api/admin/destacados`, `POST /api/admin/destacados/auto` |
| `renderOffersAdminTable`, `toggleOffer`, `updateDiscount` | `GET/PUT /api/admin/ofertas/:id_producto` |
| `renderOrdersTable`, `getFilteredOrdersByDate` | `GET /api/ordenes?desde=&hasta=&estado=&buscar=` |
| `renderUsersTable`, `toggleUserRole`, `deleteUser` | `GET /api/admin/usuarios`, `PUT /api/admin/usuarios/:id/rol`, `DELETE /api/admin/usuarios/:id` |
| `renderProfile` (pedidos y reseñas) | `GET /api/ordenes/mis`, `GET /api/resenas/mis` |
| `changePassword` | `POST /api/auth/cambiar-password` |

Y borrar del `app.js` los datos de ejemplo (`defaultProducts`, `generateDefaultOrders`, `defaultUsers`) y las funciones `saveToStorage` / `loadFromStorage` cuando ya todo venga de la API.

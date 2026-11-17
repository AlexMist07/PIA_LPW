// ============================================================================
// CoreDesk Tech — app.js CONECTADO a la API (Fase 3)
// Programación Web, Grupo 416 — Ing. Luis Daniel Lepe Rodríguez
//   Manuel Alexander Fuentes Contreras (2134970)
//   Jaime Sebastián Esparza Leyva (2097304)
//
// Esta versión es la misma página del prototipo (mismos ids, mismas vistas,
// mismos textos), pero los datos ya NO viven en localStorage: vienen de la
// API REST del back-end (Node.js + Express + MySQL, carpeta "backend/").
//
// Qué cambió respecto al prototipo (app.localstorage.js, respaldo del original):
//   - Se borraron defaultProducts, generateDefaultOrders, defaultUsers,
//     saveToStorage / loadFromStorage y todos los datos de ejemplo.
//   - En localStorage solo quedan DOS cosas: el token JWT ('coredesk_token')
//     y los datos públicos del usuario ('coredesk_currentUser'). NUNCA se
//     guardan contraseñas ni el catálogo en localStorage.
//   - Catálogo, ofertas, destacados, carrito, órdenes, reseñas y panel admin
//     se leen y se escriben con fetch() a /api/*, con el token en el header
//     "Authorization: Bearer <token>".
//   - Las imágenes de los productos en la base de datos son NULL (el
//     prototipo usaba SVG incrustados), así que cuando imagen_url es null se
//     muestra la imagen SVG original de ese producto (IMAGENES_FALLBACK).
//   - Si la API no responde, la página muestra el mensaje en español
//     "No se pudo conectar con el servidor..." en lugar de romperse.
// ============================================================================

// ========== API ==========
const API_BASE = ''; // mismo origen: el back-end sirve esta página en http://localhost:3000/

function getToken() {
    try { return localStorage.getItem('coredesk_token'); } catch (e) { return null; }
}
function setToken(token) {
    try {
        if (token) localStorage.setItem('coredesk_token', token);
        else localStorage.removeItem('coredesk_token');
    } catch (e) { /* localStorage no disponible */ }
}

// Llamada a la API. Añade el token si existe, lee el error que manda el
// servidor y lo convierte en un Error con ese mensaje en español.
// Un 401 (sesión vencida o inválida) cierra la sesión local.
async function apiFetch(path, options = {}) {
    // Si el cuerpo es FormData (subida de imagen), NO se fija Content-Type:
    // el navegador pone "multipart/form-data" con su propio boundary.
    const esFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = { ...(esFormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let respuesta;
    try {
        respuesta = await fetch(API_BASE + path, { ...options, headers });
    } catch (e) {
        throw new Error('No se pudo conectar con el servidor. Revisa que el back-end esté prendido (npm start) e inténtalo de nuevo.');
    }
    let datos = null;
    try { datos = await respuesta.json(); } catch (e) { datos = null; }

    if (!respuesta.ok) {
        if (respuesta.status === 401) {
            cerrarSesionLocal();
            throw new Error('Tu sesión venció. Inicia sesión de nuevo.');
        }
        throw new Error((datos && datos.error) || ('Error del servidor (' + respuesta.status + ').'));
    }
    return datos;
}

function mostrarError(e) {
    alert(e && e.message ? e.message : 'Ocurrió un error. Inténtalo de nuevo.');
}

// --- v3: avisos con toasts de Bootstrap (jQuery) ---
// Si Bootstrap/jQuery no cargaron (sin internet), cae a alert().
function mostrarToast(mensaje, tipo) {
    tipo = tipo || 'success';
    if (typeof window !== 'undefined' && window.jQuery && window.bootstrap) {
        const id = 'toast-' + Date.now();
        const color = tipo === 'error' ? 'text-bg-danger' : (tipo === 'warn' ? 'text-bg-warning' : 'text-bg-success');
        const html = '<div id="' + id + '" class="toast align-items-center ' + color + ' border-0" role="alert">'
            + '<div class="d-flex"><div class="toast-body">' + mensaje + '</div>'
            + '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>';
        window.jQuery('#toast-container').append(html);
        const el = document.getElementById(id);
        const toast = new window.bootstrap.Toast(el, { delay: 3500 });
        toast.show();
        el.addEventListener('hidden.bs.toast', () => el.remove());
    } else {
        alert(mensaje);
    }
}

// --- v3: confirmación con el modal de Bootstrap (devuelve Promise<boolean>) ---
let _confirmResolver = null;
function confirmarAccion(titulo, mensaje) {
    if (typeof window !== 'undefined' && window.bootstrap) {
        return new Promise((resolve) => {
            _confirmResolver = resolve;
            document.getElementById('confirm-modal-title').textContent = titulo;
            document.getElementById('confirm-modal-body').textContent = mensaje;
            const modalEl = document.getElementById('confirm-modal');
            const modal = new window.bootstrap.Modal(modalEl);
            const okBtn = document.getElementById('confirm-modal-ok');
            const done = (valor) => {
                okBtn.onclick = null;
                modalEl.removeEventListener('hidden.bs.modal', onHide);
                if (_confirmResolver) { const r = _confirmResolver; _confirmResolver = null; r(valor); }
            };
            const onHide = () => done(false);
            okBtn.onclick = () => { done(true); modal.hide(); };
            modalEl.addEventListener('hidden.bs.modal', onHide);
            modal.show();
        });
    }
    return Promise.resolve(window.confirm(mensaje));
}

// --- v3: validación Luhn para el número de tarjeta (solo formato, la tarjeta nunca se guarda) ---
function luhnValido(numero) {
    const digitos = String(numero).replace(/\D/g, '');
    if (digitos.length !== 16) return false;
    let suma = 0;
    let doble = false;
    for (let i = digitos.length - 1; i >= 0; i--) {
        let d = parseInt(digitos[i], 10);
        if (doble) { d *= 2; if (d > 9) d -= 9; }
        suma += d;
        doble = !doble;
    }
    return suma % 10 === 0;
}
function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}

// Cierra la sesión solo en este navegador (borra token y usuario).
function cerrarSesionLocal() {
    currentUser = null;
    setToken(null);
    try { localStorage.removeItem('coredesk_currentUser'); } catch (e) { /* nada */ }
    cartData = { articulos: [], subtotal: 0, envio: 0, total: 0 };
    renderUserArea();
    updateCartBadge();
}

// Limpieza por única vez: las llaves del prototipo ya no se usan. Si el
// navegador las tenía guardadas de la versión anterior, se borran para que
// ningún dato viejo en localStorage se mezcle con los de la base de datos.
['coredesk_products', 'coredesk_users', 'coredesk_orders', 'coredesk_reviews',
 'coredesk_featured', 'coredesk_dateFilter', 'coredesk_cart'].forEach((k) => {
    try { localStorage.removeItem(k); } catch (e) { /* nada */ }
});

// ========== IMÁGENES DE RESPALDO ==========
// La columna imagen_url de la base de datos es NULL en los 12 productos del
// seed (el prototipo usaba estos SVG incrustados). Cuando la API devuelve
// imagen_url en null, se muestra el SVG original de ese producto.
const IMAGENES_FALLBACK = {
    1: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3ERY%3C/text%3E%3C/svg%3E",
    2: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3ERT%3C/text%3E%3C/svg%3E",
    3: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3EMB%3C/text%3E%3C/svg%3E",
    4: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3ERM%3C/text%3E%3C/svg%3E",
    5: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3ENV%3C/text%3E%3C/svg%3E",
    6: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3EPS%3C/text%3E%3C/svg%3E",
    7: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3EGB%3C/text%3E%3C/svg%3E",
    8: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3EMN%3C/text%3E%3C/svg%3E",
    9: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3EKB%3C/text%3E%3C/svg%3E",
    10: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3EMO%3C/text%3E%3C/svg%3E",
    11: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3EEN%3C/text%3E%3C/svg%3E",
    12: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3ECP%3C/text%3E%3C/svg%3E",
};

// Imagen genérica para productos nuevos creados desde el panel admin.
const IMAGEN_GENERICA = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='44' fill='%231f3864' font-family='sans-serif' font-weight='bold'%3ECD%3C/text%3E%3C/svg%3E";

function imagenDeProducto(id, imagenUrl) {
    if (imagenUrl) return imagenUrl;
    return IMAGENES_FALLBACK[id] || IMAGEN_GENERICA;
}

// ========== ESTADO ==========
// products: catálogo completo traído de GET /api/productos (en memoria, no
// en localStorage). orders: órdenes del admin (GET /api/ordenes).
// registeredUsers: usuarios del admin (GET /api/admin/usuarios).
// cartData: carrito del usuario (GET /api/carrito): { articulos, subtotal, envio, total }.
// featuredConfig: { mode: 'auto'|'manual', ids: [...] } (GET /api/admin/destacados).
// dateFilter: filtro de fechas de Ventas, solo en memoria (ya no se guarda).
let products = [];
let orders = [];
let registeredUsers = [];
let cartData = { articulos: [], subtotal: 0, envio: 0, total: 0 };
let featuredConfig = { mode: 'auto', ids: [] };
let dateFilter = { type: 'todo', from: null, to: null };
let productosCargados = false;
let adminStats = null;

let currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem('coredesk_currentUser') || 'null');
    if (currentUser) currentUser = normalizarUsuarioGuardado(currentUser);
} catch (e) { currentUser = null; }

let currentView = 'inicio';
let editingProductId = null;
let currentImageData = null;
let imagenEsArchivoSubido = false;
let archivoImagen = null; // File elegido en el formulario (se sube con FormData).

// El usuario guardado en localStorage ya viene con forma { id, name, email,
// role, registeredAt }; si viene con la forma de la API, también se acepta.
function normalizarUsuarioGuardado(u) {
    return {
        id: u.id ?? u.id_usuario,
        name: u.name ?? u.nombre,
        email: u.email,
        role: u.role ?? u.rol,
        registeredAt: u.registeredAt ?? (u.fecha_registro ? String(u.fecha_registro).slice(0, 10) : 'N/A')
    };
}

// ========== NORMALIZADORES (API -> forma del prototipo) ==========
// La API devuelve los campos en español (nombre, marca, precio...); el resto
// de la página usa los nombres del prototipo (name, brand, price...). Estas
// funciones traducen un objeto de la API a la forma que ya usaba app.js,
// así ningún HTML ni ninguna función de renderizado tuvo que cambiar.

function normalizarProducto(p) {
    const id = p.id_producto || p.id;
    let specs = {};
    if (Array.isArray(p.especificaciones)) {
        p.especificaciones.forEach((s) => { if (s.clave) specs[s.clave] = s.valor; });
    } else if (p.specs) {
        specs = p.specs;
    }
    const precio = Number(p.precio);
    return {
        id: id,
        id_producto: id,
        name: p.nombre,
        nombre: p.nombre,
        brand: p.marca,
        marca: p.marca,
        category: p.categoria,
        categoria: p.categoria,
        price: precio,
        precio: precio,
        // Precio con descuento que ya calcula la API (null si no hay oferta).
        precio_final: (p.precio_final !== undefined && p.precio_final !== null) ? Number(p.precio_final) : null,
        stock: Number(p.stock),
        unidades_vendidas: Number(p.unidades_vendidas || 0),
        sold: Number(p.unidades_vendidas ?? p.vendido ?? 0),
        vendido: Number(p.unidades_vendidas ?? p.vendido ?? 0),
        shortDesc: p.descripcion_breve || '',
        descripcion_breve: p.descripcion_breve || '',
        image: imagenDeProducto(id, p.imagen_url),
        imagen_url: p.imagen_url || null,
        imagenes: Array.isArray(p.imagenes) ? p.imagenes.map((im) => ({ id_imagen: im.id_imagen, url: im.url, posicion: Number(im.posicion || 0) })) : [],
        specs: specs,
        // La calificación es el promedio de la tabla resenas (null si no hay).
        rating: (p.calificacion !== null && p.calificacion !== undefined) ? Number(p.calificacion) : 0,
        reviews: Number(p.total_resenas || 0),
        total_resenas: Number(p.total_resenas || 0),
        isNew: Boolean(p.es_nuevo),
        es_nuevo: Boolean(p.es_nuevo),
        isOffer: Boolean(p.isOffer ?? p.en_oferta),
        en_oferta: Boolean(p.en_oferta ?? p.isOffer),
        discount: Number(p.descuento || 0),
        descuento: Number(p.descuento || 0),
        fecha_creacion: p.fecha_creacion
    };
}

function normalizarOrden(o) {
    return {
        id: o.id_orden,
        id_orden: o.id_orden,
        userId: o.id_usuario,
        userName: o.cliente,
        userEmail: o.cliente_email,
        items: (o.articulos || []).map((a) => ({
            productId: a.id_producto,
            name: a.nombre,
            price: Number(a.precio_unitario),
            qty: a.cantidad
        })),
        total: Number(o.total),
        status: o.estado,
        date: o.fecha ? String(o.fecha).slice(0, 10) : '',
        shipping: Number(o.envio),
        direccion_envio: o.direccion_envio || '',
        metodo_pago: o.metodo_pago || '',
        ultimos4: o.ultimos4_tarjeta || ''
    };
}

function normalizarUsuario(u) {
    return {
        id: u.id_usuario,
        id_usuario: u.id_usuario,
        name: u.nombre,
        nombre: u.nombre,
        email: u.email,
        role: u.rol,
        rol: u.rol,
        registeredAt: u.fecha_registro ? String(u.fecha_registro).slice(0, 10) : 'N/A',
        total_ordenes: u.total_ordenes
    };
}

// ========== CARGA DE DATOS ==========
async function cargarProductos() {
    try {
        const datos = await apiFetch('/api/productos');
        products = (Array.isArray(datos) ? datos : []).map(normalizarProducto);
        productosCargados = true;
    } catch (e) {
        productosCargados = false;
        console.warn('No se pudieron cargar los productos:', e);
    }
    return products;
}

async function cargarCarrito() {
    if (!currentUser) {
        cartData = { articulos: [], subtotal: 0, envio: 0, total: 0 };
        return cartData;
    }
    try {
        const datos = await apiFetch('/api/carrito');
        cartData = {
            articulos: Array.isArray(datos.articulos) ? datos.articulos : [],
            subtotal: Number(datos.subtotal || 0),
            envio: Number(datos.envio || 0),
            total: Number(datos.total || 0)
        };
    } catch (e) {
        console.warn('No se pudo cargar el carrito:', e);
        cartData = { articulos: [], subtotal: 0, envio: 0, total: 0 };
    }
    return cartData;
}

// Valida el token guardado contra la API. Si ya no es válido, se borra la
// sesión; si solo no hay internet/servidor, se conserva el usuario guardado.
async function restaurarSesion() {
    if (!getToken() || !currentUser) return;
    try {
        const datos = await apiFetch('/api/auth/me');
        if (datos && datos.usuario) {
            currentUser = normalizarUsuario(datos.usuario);
            guardarUsuarioLocal();
        }
    } catch (e) {
        console.warn('No se pudo validar la sesión:', e);
    }
}

function guardarUsuarioLocal() {
    try { localStorage.setItem('coredesk_currentUser', JSON.stringify(currentUser)); } catch (e) { /* nada */ }
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('CoreDesk Tech iniciado (conectado a la API)');
    renderUserArea();
    await restaurarSesion();
    renderUserArea();
    await cargarProductos();
    renderCatalog();
    renderFeaturedProducts();
    renderOffers();
    await cargarHero();
    await cargarCarrito();
    updateCartBadge();
    updateCartModal();

    // v3: búsqueda en vivo con jQuery (debounce de 400 ms para no
    // llamar a la API con cada tecla). Sin jQuery, usa el listener normal.
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        if (typeof window !== 'undefined' && window.jQuery) {
            let temporizadorBusqueda = null;
            window.jQuery(globalSearch).on('input', () => {
                clearTimeout(temporizadorBusqueda);
                temporizadorBusqueda = setTimeout(() => {
                    if (currentView !== 'catalogo') navigateTo('catalogo');
                    else renderCatalog();
                }, 400);
            });
        } else {
            globalSearch.addEventListener('input', () => {
                if (currentView !== 'catalogo') navigateTo('catalogo');
                else renderCatalog();
            });
        }
    }

    // v3.1: botón ✕ para limpiar la búsqueda.
    const btnLimpiarBusqueda = document.getElementById('clear-search');
    if (globalSearch && btnLimpiarBusqueda) {
        globalSearch.addEventListener('input', actualizarBotonLimpiarBusqueda);
        actualizarBotonLimpiarBusqueda();
    }
});

// ========== USUARIOS ==========
function renderUserArea() {
    const userArea = document.getElementById('user-area');
    if (!userArea) return;

    if (!currentUser) {
        userArea.innerHTML = `<button class="login-btn" onclick="openAuthModal()">Iniciar Sesión</button>`;
    } else {
        const initial = currentUser.name.charAt(0).toUpperCase();
        const avatarClass = currentUser.role === 'admin' ? 'user-avatar admin' : 'user-avatar';
        const roleBadge = currentUser.role === 'admin' ? '<span class="badge-role admin">Admin</span>' : '<span class="badge-role">Cliente</span>';

        userArea.innerHTML = `
            <div class="user-menu">
                <button class="user-menu-btn" onclick="toggleUserDropdown(event)">
                    <span class="${avatarClass}">${initial}</span>
                    <span>${currentUser.name.split(' ')[0]}</span>
                    <span style="font-size:0.7rem;">▼</span>
                </button>
                <div class="user-dropdown" id="user-dropdown">
                    <div class="user-dropdown-header">
                        <strong>${currentUser.name}</strong>
                        <small>${currentUser.email}</small>
                        <div style="margin-top:6px;">${roleBadge}</div>
                    </div>
                    ${currentUser.role === 'admin' ? `<button onclick="navigateTo('admin-panel'); closeUserDropdown();">Panel Admin</button>` : ''}
                    <button onclick="navigateTo('mi-perfil'); closeUserDropdown();">Mi Perfil</button>
                    <button onclick="logout()">Cerrar Sesión</button>
                </div>
            </div>
        `;
    }

    const navAdminItem = document.getElementById('nav-admin-item');
    if (navAdminItem) navAdminItem.style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';
}

function toggleUserDropdown(event) {
    event.stopPropagation();
    document.getElementById('user-dropdown')?.classList.toggle('open');
}
function closeUserDropdown() {
    document.getElementById('user-dropdown')?.classList.remove('open');
}
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !e.target.closest('.user-menu')) dropdown.classList.remove('open');
});

// ========== AUTENTICACIÓN ==========
function openAuthModal() {
    document.getElementById('auth-modal').classList.add('open');
    switchAuthTab('login');
}
function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('open');
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
}
function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const title = document.getElementById('auth-title');

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        title.textContent = 'Iniciar Sesión';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
        title.textContent = 'Crear Cuenta';
    }
}

// Guarda la sesión que devuelve la API: solo el token y los datos públicos
// del usuario. La contraseña nunca se guarda.
function guardarSesion(datos) {
    setToken(datos.token);
    currentUser = normalizarUsuario(datos.usuario);
    guardarUsuarioLocal();
    renderUserArea();
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    try {
        const datos = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        guardarSesion(datos);
        closeAuthModal();
        await cargarCarrito();
        updateCartBadge();
        updateCartModal();
        navigateTo(currentUser.role === 'admin' ? 'admin-panel' : 'inicio');
    } catch (e) {
        mostrarError(e);
    }
}
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;

    if (!esEmailValido(email)) return alert('Escribe un correo válido, por ejemplo nombre@correo.com.');
    if (password !== password2) return alert('Las contraseñas no coinciden.');
    if (password.length < 6) return alert('Mínimo 6 caracteres.');

    try {
        const datos = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ nombre: name, email, password, password2 })
        });
        guardarSesion(datos);
        closeAuthModal();
        await cargarCarrito();
        updateCartBadge();
        updateCartModal();
        navigateTo('inicio');
        alert(`¡Bienvenido, ${name}!`);
    } catch (e) {
        mostrarError(e);
    }
}
async function logout() {
    if (!(await confirmarAccion('Cerrar sesión', '¿Seguro que quieres cerrar sesión?'))) return;
    cerrarSesionLocal();
    updateCartModal();
    navigateTo('inicio');
}

// ========== NAVEGACIÓN ==========
function navigateTo(viewId, ancla) {
    if (viewId === 'admin-panel' && (!currentUser || currentUser.role !== 'admin')) {
        alert('Acceso restringido.');
        return;
    }
    if (viewId === 'mi-perfil' && !currentUser) {
        alert('Inicia sesión primero.');
        openAuthModal();
        return;
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');

    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.nav-menu a[data-view="${viewId}"]`)?.classList.add('active');

    currentView = viewId;

    if (viewId === 'inicio') renderFeaturedProducts();
    if (viewId === 'catalogo') renderCatalog();
    if (viewId === 'ofertas') renderOffers();
    if (viewId === 'admin-panel') {
        const sidebarName = document.getElementById('admin-sidebar-name');
        if (sidebarName) sidebarName.textContent = currentUser.name;
        switchAdminTab('dashboard');
    }
    if (viewId === 'mi-perfil') renderProfile('datos');
    // Vistas estáticas (Nosotros / Contacto): no cargan datos de la API.
    if (ancla) {
        const seccion = document.getElementById(ancla);
        if (seccion && typeof seccion.scrollIntoView === 'function') {
            seccion.scrollIntoView({ behavior: 'smooth' });
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('nav-menu').classList.remove('mobile-open');
}

// v3.1 — Catálogo limpio.
// Causa del reporte "el catálogo no funciona": renderCatalog() mandaba a
// la API lo que hubiera escrito en #global-search en cada render. Si ahí
// quedaba cualquier texto viejo (escrito, autocompletado por el navegador
// o restaurado al recargar, p. ej. "Cliente 1 Prueba"), la API buscaba ese
// texto como producto y devolvía 0 filas: "No se encontraron productos."
// Ahora abrir el catálogo desde el menú/hero/pie SIEMPRE limpia la
// búsqueda y los filtros, y el estado vacío ofrece limpiarla.
function abrirCatalogo() {
    const buscador = document.getElementById('global-search');
    if (buscador) buscador.value = '';
    document.querySelectorAll('.brand-filter').forEach((c) => { c.checked = false; });
    const soloStock = document.getElementById('filter-instock');
    if (soloStock) soloStock.checked = false;
    const min = document.getElementById('min-price'); if (min) min.value = '';
    const max = document.getElementById('max-price'); if (max) max.value = '';
    const orden = document.getElementById('sort-select'); if (orden) orden.value = 'default';
    actualizarBotonLimpiarBusqueda();
    navigateTo('catalogo');
}
function limpiarBusqueda() {
    const buscador = document.getElementById('global-search');
    if (buscador) buscador.value = '';
    actualizarBotonLimpiarBusqueda();
    if (currentView === 'catalogo') renderCatalog();
    else navigateTo('catalogo');
}
function actualizarBotonLimpiarBusqueda() {
    const buscador = document.getElementById('global-search');
    const btn = document.getElementById('clear-search');
    if (buscador && btn) btn.style.display = buscador.value.trim() ? 'block' : 'none';
}

// Formulario de contacto (vista estática): no hay back-end para mensajes,
// solo se muestra la confirmación en la página.
function enviarContacto(event) {
    event.preventDefault();
    const nombre = (document.getElementById('contacto-nombre')?.value || '').trim();
    const confirmacion = document.getElementById('contacto-confirmacion');
    confirmacion.style.display = 'block';
    confirmacion.textContent = '¡Gracias' + (nombre ? ' ' + nombre : '') + '! Recibimos tu mensaje. Te responderemos al correo que nos dejaste.';
    document.getElementById('form-contacto')?.reset();
}

// ========== PRODUCTOS ==========
// Los destacados y las ofertas se piden a la API en cada vista; el catálogo
// usa el caché de "products" (cargado al inicio) y filtra en el navegador,
// igual que el prototipo.
async function renderFeaturedProducts() {
    const container = document.getElementById('featured-products');
    if (!container) return;

    let featured = [];
    try {
        const datos = await apiFetch('/api/productos/destacados');
        const lista = Array.isArray(datos.productos) ? datos.productos : [];
        featured = lista.map(normalizarProducto);
        // La API ya decide el modo: si la tabla destacados tiene filas es
        // manual; si está vacía, automático (8 más vendidos con stock > 0).
        if (datos.modo) {
            featuredConfig.mode = datos.modo;
            featuredConfig.ids = datos.modo === 'manual' ? featured.map((p) => p.id) : [];
        }
    } catch (e) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">No se pudieron cargar los productos destacados. Revisa que el servidor esté prendido.</p>';
        return;
    }

    if (featured.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">No hay productos destacados.</p>';
        return;
    }
    container.innerHTML = featured.map(p => createProductCardHTML(p)).join('');
}

async function renderOffers() {
    const container = document.getElementById('offers-products');
    const noOffers = document.getElementById('no-offers');
    if (!container) return;

    let offers = [];
    try {
        const datos = await apiFetch('/api/productos/ofertas');
        offers = (Array.isArray(datos) ? datos : []).map(normalizarProducto);
    } catch (e) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">No se pudieron cargar las ofertas. Revisa que el servidor esté prendido.</p>';
        if (noOffers) noOffers.style.display = 'none';
        return;
    }

    if (offers.length === 0) {
        container.innerHTML = '';
        if (noOffers) noOffers.style.display = 'block';
        return;
    }
    if (noOffers) noOffers.style.display = 'none';
    container.innerHTML = offers.map(p => createProductCardHTML(p, true)).join('');
}

// v3: el catálogo usa los parámetros de filtro de la API
// (?buscar, ?marca, ?min, ?max, ?stock, ?orden). Si la API no responde,
// se usa el filtro local de siempre (applyAllFilters).
async function renderCatalog() {
    const container = document.getElementById('catalog-products');
    const noResults = document.getElementById('no-results');
    if (!container || !noResults) return;

    if (!productosCargados) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        noResults.textContent = 'No se pudo conectar con el servidor. Revisa que el back-end esté prendido (npm start) y recarga la página.';
        return;
    }
    const textoVacio = document.getElementById('no-results-text');
    if (textoVacio) textoVacio.textContent = 'No se encontraron productos.';

    let results = null;
    try {
        const params = new URLSearchParams();
        const termino = document.getElementById('global-search')?.value.trim() || '';
        if (termino) params.set('buscar', termino);
        const marcas = Array.from(document.querySelectorAll('.brand-filter:checked')).map(c => c.value);
        if (marcas.length > 0) params.set('marca', marcas.join(','));
        if (document.getElementById('filter-instock')?.checked) params.set('stock', '1');
        const min = document.getElementById('min-price')?.value;
        const max = document.getElementById('max-price')?.value;
        if (min) params.set('min', min);
        if (max) params.set('max', max);
        const orden = document.getElementById('sort-select')?.value;
        if (orden && orden !== 'default') params.set('orden', orden);
        const datos = await apiFetch('/api/productos?' + params.toString());
        results = (Array.isArray(datos) ? datos : []).map(normalizarProducto);
    } catch (e) {
        console.warn('Filtro por API no disponible, se usa el filtro local:', e);
        results = applyAllFilters();
    }

    if (results.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    noResults.style.display = 'none';
    container.innerHTML = results.map(p => createProductCardHTML(p)).join('');
    actualizarBotonLimpiarBusqueda();
}

function createProductCardHTML(product, showOfferBadge = false) {
    const badges = [];
    if (showOfferBadge || product.isOffer) badges.push('<span class="product-badge oferta">Oferta</span>');
    if (product.isNew) badges.push('<span class="product-badge nuevo">Nuevo</span>');
    // v3: la insignia de envío gratis depende de la regla de negocio
    // (compra desde $1,000 MXN), no de que haya stock.
    if (getEffectivePrice(product) >= 1000) badges.push('<span class="product-badge envio">Envío Gratis</span>');

    let priceHTML = '';
    if (product.isOffer && product.discount > 0) {
        const originalPrice = product.price;
        const finalPrice = getEffectivePrice(product);
        priceHTML = `
            <div class="product-price-wrapper">
                <span class="price-label">Antes:</span>
                <span class="product-price-original">$${originalPrice.toLocaleString('es-MX')} MXN</span>
                <span class="price-label">Ahora:</span>
                <span class="product-price-new">$${finalPrice.toLocaleString('es-MX')} MXN</span>
            </div>
        `;
    } else {
        priceHTML = `<p class="product-price">$${product.price.toLocaleString('es-MX')} MXN</p>`;
    }

    const discountBadge = (product.isOffer && product.discount > 0)
        ? `<span class="discount-badge">-${product.discount}%</span>` : '';

    return `
        <div class="product-card" onclick="showProductDetail(${product.id})">
            ${discountBadge}
            ${badges.slice(0, 2).join('')}
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-shortdesc">${product.shortDesc}</p>
            ${priceHTML}
            <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart(${product.id}, event)" ${product.stock === 0 ? 'disabled' : ''}>
                ${product.stock > 0 ? 'Añadir al Carrito' : 'Agotado'}
            </button>
        </div>
    `;
}

// ========== FILTROS ==========
// Igual que en el prototipo, pero sobre el catálogo traído de la API.
// El precio mínimo/máximo se aplica sobre el precio BASE, sin descuento.
function applyAllFilters() {
    let filtered = [...products];
    const searchTerm = document.getElementById('global-search')?.value.toLowerCase().trim() || '';

    if (searchTerm) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.brand.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm));
    }
    if (document.getElementById('filter-instock')?.checked) {
        filtered = filtered.filter(p => p.stock > 0);
    }
    const selectedBrands = Array.from(document.querySelectorAll('.brand-filter:checked')).map(c => c.value);
    if (selectedBrands.length > 0) filtered = filtered.filter(p => selectedBrands.includes(p.brand));

    const min = parseFloat(document.getElementById('min-price')?.value) || 0;
    const max = parseFloat(document.getElementById('max-price')?.value) || Infinity;
    filtered = filtered.filter(p => p.price >= min && p.price <= max);

    const sortBy = document.getElementById('sort-select')?.value || 'default';
    switch(sortBy) {
        case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
        case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
        case 'availability': filtered.sort((a, b) => b.stock - a.stock); break;
    }
    return filtered;
}
function applyFilters() { if (currentView === 'catalogo') renderCatalog(); }

// ========== DETALLE PRODUCTO ==========
async function showProductDetail(productId) {
    let product = products.find(p => p.id === productId);
    try {
        const detalle = await apiFetch('/api/productos/' + productId);
        product = normalizarProducto(detalle);
        product.resenasApi = detalle.resenas || [];
    } catch (e) {
        if (!product) { mostrarError(e); return; }
        // Si falla el detalle, se muestra lo del catálogo (sin reseñas nuevas).
        console.warn('No se pudo cargar el detalle, se usa el catálogo:', e);
    }

    navigateTo('detalle-producto');
    const container = document.getElementById('product-detail-content');
    const stockClass = product.stock > 0 ? 'stock-in' : 'stock-out';
    const stockText = product.stock > 0 ? `En existencia (${product.stock} disponibles)` : 'Agotado';

    let specsHTML = '';
    for (const [key, value] of Object.entries(product.specs)) {
        specsHTML += `<tr><th>${key}</th><td>${value}</td></tr>`;
    }

    // Las reseñas vienen del detalle de la API. Si el producto aún no tiene
    // reseñas reales, se muestra un mensaje invitándote a ser el primero en
    // opinar: nunca se inventan reseñas con nombres falsos.
    const resenasApi = (product.resenasApi || []).map((r) => ({
        user: r.usuario || r.user,
        rating: r.calificacion || r.rating,
        comment: r.comentario || r.comment
    }));
    const allReviews = resenasApi;

    let reviewsHTML = allReviews.length > 0
        ? allReviews.map(r => `
        <div class="review">
            <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            <strong>${r.user}</strong>
            <p>${r.comment}</p>
        </div>
    `).join('')
        : '<p style="color:#666;">Aún no hay reseñas. ¡Sé el primero en opinar!</p>';

    let reviewFormHTML = currentUser
        ? `<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-top:15px;">
            <h4 style="margin-bottom:10px;">Escribe tu reseña</h4>
            <div class="form-group">
                <label>Calificación</label>
                <select id="review-rating">
                    <option value="5">★★★★★ Excelente</option>
                    <option value="4">★★★★☆ Muy bueno</option>
                    <option value="3">★★★☆☆ Regular</option>
                    <option value="2">★★☆☆☆ Malo</option>
                    <option value="1">★☆☆☆☆ Muy malo</option>
                </select>
            </div>
            <div class="form-group">
                <label>Comentario</label>
                <textarea id="review-comment" rows="3"></textarea>
            </div>
            <button class="btn-primary" onclick="submitReview(${product.id})">Publicar Reseña</button>
        </div>`
        : `<div style="background:#fff3cd;padding:15px;border-radius:8px;margin-top:15px;border-left:4px solid #ffc107;">
            <strong>¿Quieres dejar tu opinión?</strong>
            <p style="margin-top:5px;">Inicia sesión o <a href="#" onclick="openAuthModal(); return false;" style="color:#0056B3;font-weight:600;">crea una cuenta</a>.</p>
        </div>`;

    let priceBlock = product.isOffer && product.discount > 0
        ? `<div style="display:flex;align-items:center;gap:12px;margin-bottom:15px;flex-wrap:wrap;">
            <span class="product-price-original">Antes: $${product.price.toLocaleString('es-MX')} MXN</span>
            <span class="product-price-new" style="margin:0;">Ahora: $${getEffectivePrice(product).toLocaleString('es-MX')} MXN</span>
            <span style="background:#dc3545;color:white;padding:4px 10px;border-radius:6px;font-size:0.75rem;font-weight:800;">-${product.discount}%</span>
           </div>`
        : `<p class="detail-price">$${product.price.toLocaleString('es-MX')} MXN</p>`;

    // v3.1: galería — la foto principal y las fotos extra del producto.
    const fotosDetalle = [product.image, ...(product.imagenes || []).map((im) => im.url)];
    const miniaturasHTML = fotosDetalle.map((url, i) => `
        <div class="thumbnail${i === 0 ? ' active' : ''}" onclick="cambiarFotoDetalle('${String(url).replace(/'/g, "%27")}', this)">
            <img src="${url}" alt="Foto ${i + 1} de ${product.name}" onerror="this.parentElement.style.display='none'">
        </div>`).join('');

    container.innerHTML = `
        <div class="detail-container">
            <div class="detail-gallery">
                <div class="main-image"><img id="detail-main-img" src="${product.image}" alt="${product.name}"></div>
                <div class="thumbnails">${miniaturasHTML}</div>
            </div>
            <div class="detail-info">
                <h2>${product.name}</h2>
                <p class="detail-brand"><strong>Marca:</strong> ${product.brand} | <strong>Categoría:</strong> ${product.category}</p>
                <p class="detail-stock ${stockClass}">${stockText}</p>
                ${priceBlock}
                <div class="quantity-selector">
                    <label>Cantidad:</label>
                    <input type="number" id="detail-qty" value="1" min="1" max="${product.stock || 1}" ${product.stock === 0 ? 'disabled' : ''}>
                </div>
                <button class="btn-primary" onclick="addToCartFromDetail(${product.id})" ${product.stock === 0 ? 'disabled style="background:#ccc;cursor:not-allowed;"' : ''}>
                    ${product.stock > 0 ? 'Añadir al Carrito' : 'Agotado'}
                </button>
                <h3 style="margin-top:25px;">Especificaciones Técnicas</h3>
                <table class="specs-table">${specsHTML}</table>
                <div class="rating-section">
                    <h3>Valoraciones</h3>
                    <div class="stars">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5-Math.floor(product.rating))}
                        <span style="font-size:0.9rem;color:#333;">(${product.rating} / 5 - ${product.reviews} reseñas)</span>
                    </div>
                    ${reviewsHTML}
                    ${reviewFormHTML}
                </div>
            </div>
        </div>
    `;
}

async function submitReview(productId) {
    if (!currentUser) return alert('Debes iniciar sesión.');
    const rating = parseInt(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value.trim();
    if (!comment) return alert('Escribe un comentario.');

    try {
        await apiFetch('/api/resenas', {
            method: 'POST',
            body: JSON.stringify({ id_producto: productId, calificacion: rating, comentario: comment })
        });
        alert(`¡Gracias ${currentUser.name}! Tu reseña ha sido publicada.`);
        await cargarProductos();
        showProductDetail(productId);
    } catch (e) {
        mostrarError(e);
    }
}

// v3.1: cambiar la foto grande del detalle al hacer clic en una miniatura.
function cambiarFotoDetalle(url, el) {
    const img = document.getElementById('detail-main-img');
    if (img) img.src = url;
    document.querySelectorAll('.detail-gallery .thumbnail').forEach((t) => t.classList.remove('active'));
    if (el) el.classList.add('active');
}

// ========== CARRITO ==========
// El carrito vive en la base de datos (tablas carritos + carrito_items) y es
// por usuario, así que agregar al carrito requiere haber iniciado sesión.
// La API valida el stock y calcula subtotal, envío y total con las mismas
// reglas del prototipo: envío gratis desde $1,000, si no $150.
function getEffectivePrice(product) {
    if (product.precio_final !== null && product.precio_final !== undefined) {
        return product.precio_final;
    }
    return (product.isOffer && product.discount > 0)
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;
}

async function addToCart(productId, event) {
    if (!currentUser) {
        alert('Debes iniciar sesión para agregar productos al carrito.');
        openAuthModal();
        return;
    }
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) { mostrarToast('Producto agotado.', 'error'); return; }
    // v3: no se puede pedir más de lo que hay en stock.
    const enCarrito = (cartData.articulos || []).find(i => Number(i.id_producto) === productId);
    const cantidadActual = enCarrito ? Number(enCarrito.cantidad || 0) : 0;
    if (cantidadActual + 1 > product.stock) {
        mostrarToast('Solo quedan ' + product.stock + ' unidades de ' + product.name + ' en stock.', 'warn');
        return;
    }

    try {
        const datos = await apiFetch('/api/carrito', {
            method: 'POST',
            body: JSON.stringify({ id_producto: productId, cantidad: 1 })
        });
        cartData = {
            articulos: datos.articulos || [],
            subtotal: Number(datos.subtotal || 0),
            envio: Number(datos.envio || 0),
            total: Number(datos.total || 0)
        };
    } catch (e) {
        mostrarError(e);
        return;
    }
    updateCartBadge();
    updateCartModal();

    if (event?.target) {
        const btn = event.target;
        const original = btn.textContent;
        btn.textContent = '✓ Añadido';
        btn.style.background = '#28a745';
        setTimeout(() => { btn.textContent = original; btn.style.background = ''; }, 1000);
    }
}

async function addToCartFromDetail(productId) {
    if (!currentUser) {
        alert('Debes iniciar sesión para agregar productos al carrito.');
        openAuthModal();
        return;
    }
    const qty = parseInt(document.getElementById('detail-qty').value) || 1;
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) return;
    if (qty > product.stock) return alert('Stock insuficiente.');

    try {
        const datos = await apiFetch('/api/carrito', {
            method: 'POST',
            body: JSON.stringify({ id_producto: productId, cantidad: qty })
        });
        cartData = {
            articulos: datos.articulos || [],
            subtotal: Number(datos.subtotal || 0),
            envio: Number(datos.envio || 0),
            total: Number(datos.total || 0)
        };
    } catch (e) {
        mostrarError(e);
        return;
    }
    updateCartBadge();
    updateCartModal();
    mostrarToast('Producto añadido al carrito.');
}

async function removeFromCart(productId) {
    try {
        const datos = await apiFetch('/api/carrito/' + productId, { method: 'DELETE' });
        cartData = {
            articulos: datos.articulos || [],
            subtotal: Number(datos.subtotal || 0),
            envio: Number(datos.envio || 0),
            total: Number(datos.total || 0)
        };
    } catch (e) {
        mostrarError(e);
        return;
    }
    updateCartBadge();
    updateCartModal();
}
function updateCartBadge() {
    const cantidad = cartData.articulos.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
    // v3: el contador se actualiza con jQuery (con un pequeño "pop" visual).
    if (typeof window !== 'undefined' && window.jQuery) {
        const badge = window.jQuery('#cart-badge');
        badge.text(cantidad).removeClass('badge-pop');
        void badge[0]?.offsetWidth;
        badge.addClass('badge-pop');
    } else {
        const badge = document.getElementById('cart-badge');
        if (badge) badge.textContent = cantidad;
    }
}
async function toggleCartModal() {
    const modal = document.getElementById('cart-modal');
    modal.classList.toggle('open');
    if (modal.classList.contains('open')) {
        await cargarCarrito();
        updateCartModal();
    }
}
function closeCartModalOutside(event) {
    if (event.target === event.currentTarget) toggleCartModal();
}
function updateCartModal() {
    const container = document.getElementById('cart-items-list');
    if (!container) return;

    if (cartData.articulos.length === 0) {
        container.innerHTML = '<p class="empty-cart">Tu carrito está vacío.</p>';
        document.getElementById('cart-subtotal').textContent = '$0.00';
        document.getElementById('cart-shipping').textContent = '$0.00';
        document.getElementById('cart-total').textContent = '$0.00';
        return;
    }

    container.innerHTML = cartData.articulos.map(item => {
        const unitPrice = Number(item.precio_final);
        const itemTotal = unitPrice * item.cantidad;
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <p>$${unitPrice.toLocaleString('es-MX')} x ${item.cantidad} = $${itemTotal.toLocaleString('es-MX')}</p>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id_producto})">✕</button>
            </div>
        `;
    }).join('');

    const subtotal = cartData.subtotal;
    const shipping = cartData.envio;
    const total = cartData.total;
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toLocaleString('es-MX')}`;
    document.getElementById('cart-shipping').textContent = shipping === 0 ? 'Gratis' : `$${shipping.toLocaleString('es-MX')}`;
    document.getElementById('cart-total').textContent = `$${total.toLocaleString('es-MX')}`;
}

// ========== CHECKOUT EN PASOS (v3) ==========
// Pasos: 1 revisar carrito, 2 dirección, 3 pago, 4 confirmar, éxito.
// La tarjeta SOLO se valida en el navegador (formato + Luhn + vencimiento
// futuro): nunca se guarda ni se envía completa. Al servidor solo llegan
// direccion_envio, metodo_pago='tarjeta' y los últimos 4 dígitos.
let checkoutPaso = 1;
let checkoutDireccion = null;
let checkoutPago = null;

function mostrarErrorCheckout(paso, mensaje) {
    const el = document.getElementById('co-error-' + paso);
    if (!el) return;
    if (mensaje) { el.textContent = mensaje; el.style.display = 'block'; }
    else el.style.display = 'none';
}

async function iniciarCheckout() {
    await cargarCarrito();
    if (cartData.articulos.length === 0) { mostrarToast('Tu carrito está vacío.', 'warn'); return; }
    if (!currentUser) {
        mostrarToast('Debes iniciar sesión para completar tu compra.', 'warn');
        document.getElementById('cart-modal').classList.remove('open');
        openAuthModal();
        return;
    }
    document.getElementById('cart-modal').classList.remove('open');
    checkoutPaso = 1;
    checkoutDireccion = null;
    checkoutPago = null;
    document.getElementById('co-panel-exito').style.display = 'none';
    navigateTo('checkout');
    renderPasoCheckout1();
    mostrarPasoCheckout(1, true);
}

function renderPasoCheckout1() {
    const cont = document.getElementById('checkout-items');
    if (!cont) return;
    cont.innerHTML = cartData.articulos.map(item => {
        const unit = Number(item.precio_final);
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <p>$${unit.toLocaleString('es-MX')} x ${item.cantidad} = $${(unit * item.cantidad).toLocaleString('es-MX')}</p>
                </div>
            </div>`;
    }).join('');
    document.getElementById('co-subtotal').textContent = '$' + cartData.subtotal.toLocaleString('es-MX');
    document.getElementById('co-envio').textContent = cartData.envio === 0 ? 'Gratis' : '$' + cartData.envio.toLocaleString('es-MX');
    document.getElementById('co-total').textContent = '$' + cartData.total.toLocaleString('es-MX');
}

function validarDireccion() {
    const nombre = document.getElementById('co-nombre').value.trim();
    const calle = document.getElementById('co-calle').value.trim();
    const colonia = document.getElementById('co-colonia').value.trim();
    const ciudad = document.getElementById('co-ciudad').value.trim();
    const cp = document.getElementById('co-cp').value.trim();
    const telefono = document.getElementById('co-telefono').value.replace(/\D/g, '');
    if (!nombre || !calle || !colonia || !ciudad) return 'Completa todos los campos de la dirección.';
    if (!/^\d{5}$/.test(cp)) return 'El código postal debe tener 5 dígitos.';
    if (telefono.length < 10) return 'El teléfono debe tener al menos 10 dígitos.';
    checkoutDireccion = { nombre, calle, colonia, ciudad, cp, telefono };
    return null;
}

function validarPago() {
    const titular = document.getElementById('co-titular').value.trim();
    const tarjeta = document.getElementById('co-tarjeta').value.replace(/\D/g, '');
    const venc = document.getElementById('co-vencimiento').value.trim();
    const cvv = document.getElementById('co-cvv').value.trim();
    if (!titular) return 'Escribe el nombre del titular de la tarjeta.';
    if (!luhnValido(tarjeta)) return 'El número de tarjeta no es válido. Revisa los 16 dígitos.';
    const m = venc.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return 'El vencimiento debe ser MM/AA, por ejemplo 12/28.';
    const mes = parseInt(m[1], 10);
    const anio = 2000 + parseInt(m[2], 10);
    if (mes < 1 || mes > 12) return 'El mes de vencimiento debe ser del 01 al 12.';
    const finMes = new Date(anio, mes, 1);
    if (finMes <= new Date()) return 'La tarjeta está vencida. Revisa la fecha.';
    if (!/^\d{3}$/.test(cvv)) return 'El CVV debe tener 3 dígitos.';
    // Solo se conservan los últimos 4 dígitos; el número completo y el CVV
    // nunca salen del navegador.
    checkoutPago = { titular, ultimos4: tarjeta.slice(-4) };
    return null;
}

function formatearTarjeta(input) {
    const digitos = input.value.replace(/\D/g, '').slice(0, 16);
    input.value = digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
}
function formatearVencimiento(input) {
    let d = input.value.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
    input.value = d;
}

function mostrarPasoCheckout(paso, forzar) {
    if (!forzar) {
        if (paso === 3) {
            const error = validarDireccion();
            mostrarErrorCheckout(2, error);
            if (error) return;
        }
        if (paso === 4) {
            const error = validarPago();
            mostrarErrorCheckout(3, error);
            if (error) return;
            renderResumenCheckout();
        }
    }
    checkoutPaso = paso;
    [1, 2, 3, 4].forEach((n) => {
        const panel = document.getElementById('co-panel-' + n);
        if (panel) panel.style.display = n === paso ? 'block' : 'none';
        const ind = document.getElementById('co-paso-' + n);
        if (ind) {
            ind.classList.toggle('active', n === paso);
            ind.classList.toggle('done', n < paso);
        }
    });
}

function renderResumenCheckout() {
    const d = checkoutDireccion;
    const p = checkoutPago;
    const items = cartData.articulos.map((item) => {
        const unit = Number(item.precio_final);
        return `<div class="order-detail-row"><span>${item.nombre} x${item.cantidad}</span><span>$${(unit * item.cantidad).toLocaleString('es-MX')}</span></div>`;
    }).join('');
    document.getElementById('checkout-resumen').innerHTML = `
        <div class="checkout-resumen-bloque"><h4>Productos</h4>${items}</div>
        <div class="checkout-resumen-bloque"><h4>Envío a</h4>
            <p>${d.nombre} — ${d.calle}, ${d.colonia}, ${d.ciudad}, C.P. ${d.cp}</p>
            <p>Teléfono: ${d.telefono}</p></div>
        <div class="checkout-resumen-bloque"><h4>Pago</h4>
            <p>Tarjeta a nombre de ${p.titular}, terminada en ${p.ultimos4}</p></div>
        <div class="checkout-resumen-bloque">
            <div class="order-detail-row"><span>Subtotal</span><strong>$${cartData.subtotal.toLocaleString('es-MX')}</strong></div>
            <div class="order-detail-row"><span>Envío</span><strong>${cartData.envio === 0 ? 'Gratis' : '$' + cartData.envio.toLocaleString('es-MX')}</strong></div>
            <div class="order-detail-row" style="font-size:1.1rem;"><strong>Total</strong><strong style="color:#0056B3;">$${cartData.total.toLocaleString('es-MX')}</strong></div>
        </div>`;
}

async function confirmarCompra() {
    if (!checkoutDireccion || !checkoutPago) { mostrarErrorCheckout(4, 'Completa la dirección y el pago antes de confirmar.'); return; }
    const btn = document.getElementById('co-confirmar-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }
    const direccionTexto = `${checkoutDireccion.nombre}, ${checkoutDireccion.calle}, ${checkoutDireccion.colonia}, ${checkoutDireccion.ciudad}, C.P. ${checkoutDireccion.cp}, Tel. ${checkoutDireccion.telefono}`;
    const total = cartData.total;
    let orden;
    try {
        const creada = await apiFetch('/api/ordenes', {
            method: 'POST',
            body: JSON.stringify({
                direccion_envio: direccionTexto,
                metodo_pago: 'tarjeta',
                ultimos4: checkoutPago.ultimos4
            })
        });
        orden = normalizarOrden(creada);
    } catch (e) {
        mostrarErrorCheckout(4, e.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Compra'; }
        return;
    }
    orders.push(orden);
    await cargarProductos();
    await cargarCarrito();
    updateCartBadge();
    updateCartModal();
    [1, 2, 3, 4].forEach((n) => { document.getElementById('co-panel-' + n).style.display = 'none'; });
    document.getElementById('checkout-orden-numero').textContent = '#' + orden.id;
    document.getElementById('checkout-exito-detalle').textContent =
        'Orden #' + orden.id + ' por $' + total.toLocaleString('es-MX') + ' MXN. Llega a ' + checkoutDireccion.ciudad + ', C.P. ' + checkoutDireccion.cp + '.';
    document.getElementById('co-panel-exito').style.display = 'block';
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Compra'; }
    if (currentView === 'catalogo') renderCatalog();
    if (currentView === 'inicio') renderFeaturedProducts();
}

// --- v3: cancelar un pedido (el servidor devuelve el stock) ---
async function cancelarOrden(orderId) {
    if (!(await confirmarAccion('Cancelar pedido', '¿Seguro que quieres cancelar la orden #' + orderId + '? El stock de sus productos se devuelve al inventario.'))) return;
    try {
        await apiFetch('/api/ordenes/' + orderId + '/cancelar', { method: 'PATCH' });
    } catch (e) {
        mostrarError(e);
        return;
    }
    mostrarToast('Orden #' + orderId + ' cancelada. El stock fue devuelto.');
    document.getElementById('order-modal')?.classList.remove('open');
    if (currentView === 'mi-perfil') renderProfile('pedidos');
    if (currentView === 'admin-panel') renderOrdersTable();
    await cargarProductos();
}

// ========== PANEL ADMIN ==========
function switchAdminTab(tab, event) {
    document.querySelectorAll('.admin-nav-item').forEach(t => t.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');
    else document.querySelector(`.admin-nav-item[data-tab="${tab}"]`)?.classList.add('active');

    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`admin-${tab}`)?.classList.add('active');

    const titles = {
        dashboard: { title: 'Dashboard', sub: 'Resumen general de CoreDesk Tech' },
        inventario: { title: 'Inventario', sub: 'Gestión completa del catálogo de productos' },
        destacados: { title: 'Productos Destacados', sub: 'Elige qué productos se muestran en la página de inicio' },
        'ofertas-admin': { title: 'Gestión de Ofertas', sub: 'Activa descuentos en productos específicos' },
        ventas: { title: 'Ventas', sub: 'Historial y seguimiento de órdenes' },
        usuarios: { title: 'Usuarios', sub: 'Administración de cuentas registradas' },
        apariencia: { title: 'Apariencia', sub: 'Imagen y textos de la página de inicio' }
    };

    const titleEl = document.getElementById('admin-page-title');
    const subEl = document.getElementById('admin-page-subtitle');
    if (titleEl && titles[tab]) {
        titleEl.textContent = titles[tab].title;
        subEl.textContent = titles[tab].sub;
    }

    if (tab === 'dashboard') renderAdminDashboard();
    if (tab === 'inventario') renderAdminTable();
    if (tab === 'destacados') renderFeaturedAdmin();
    if (tab === 'ofertas-admin') renderOffersAdminTable();
    if (tab === 'ventas') {
        syncDateFilterUI();
        renderOrdersTable();
    }
    if (tab === 'usuarios') renderUsersTable();
    if (tab === 'apariencia') cargarApariencia();
}

function updateAdminCounters() {
    const cp = document.getElementById('count-products');
    const co = document.getElementById('count-orders');
    const cu = document.getElementById('count-users');
    if (cp) cp.textContent = products.length;
    if (co) co.textContent = adminStats ? adminStats.total_ordenes : orders.length;
    if (cu) cu.textContent = adminStats ? adminStats.total_usuarios : registeredUsers.length;
}

async function renderAdminDashboard() {
    updateAdminCounters();
    try {
        adminStats = await apiFetch('/api/admin/dashboard');
    } catch (e) {
        mostrarError(e);
        return;
    }
    updateAdminCounters();

    const ingEl = document.getElementById('stat-ingresos');
    const ordEl = document.getElementById('stat-ordenes');
    const prodEl = document.getElementById('stat-productos');
    const usrEl = document.getElementById('stat-usuarios');
    if (ingEl) ingEl.textContent = `$${Number(adminStats.ingresos).toLocaleString('es-MX')}`;
    if (ordEl) ordEl.textContent = adminStats.total_ordenes;
    if (prodEl) prodEl.textContent = adminStats.productos_activos;
    if (usrEl) usrEl.textContent = adminStats.total_usuarios;
    const sbEl = document.getElementById('stat-stockbajo');
    if (sbEl) sbEl.textContent = adminStats.stock_bajo_total ?? (adminStats.stock_bajo || []).length;

    const recentEl = document.getElementById('recent-sales');
    if (recentEl) {
        const ventas = adminStats.ventas_recientes || [];
        recentEl.innerHTML = ventas.length === 0
            ? '<div class="empty-state-mini">Sin ventas registradas</div>'
            : ventas.map(o => {
                const nombre = o.cliente || 'Cliente';
                const initial = nombre.charAt(0).toUpperCase();
                const fecha = o.fecha ? String(o.fecha).slice(0, 10) : '';
                return `
                    <div class="dash-item">
                        <div class="dash-item-avatar">${initial}</div>
                        <div class="dash-item-info">
                            <strong>Orden #${o.id_orden} · ${nombre}</strong>
                            <small>${fecha} · ${o.estado}</small>
                        </div>
                        <span class="dash-item-amount">$${Number(o.total).toLocaleString('es-MX')}</span>
                    </div>
                `;
            }).join('');
    }

    const lowEl = document.getElementById('low-stock-list');
    if (lowEl) {
        const bajos = adminStats.stock_bajo || [];
        lowEl.innerHTML = bajos.length === 0
            ? '<div class="empty-state-mini">Todo el inventario tiene stock suficiente</div>'
            : bajos.slice(0, 5).map(p => `
                <div class="dash-item">
                    <div class="dash-item-info">
                        <strong>${p.nombre}</strong>
                        <small>ID #${p.id_producto}</small>
                    </div>
                    <span class="stock-pill ${p.stock === 0 ? 'danger' : ''}">${p.stock} uds</span>
                </div>
            `).join('');
    }

    const topEl = document.getElementById('top-products');
    if (topEl) {
        const top = adminStats.top_productos || [];
        topEl.innerHTML = top.map((p, i) => `
            <div class="top-product-row">
                <span class="top-rank-badge rank-${i + 1}">${i + 1}</span>
                <div class="top-product-info">
                    <strong>${p.nombre}</strong>
                    <small>${p.stock} en stock</small>
                </div>
                <div class="top-product-sales">
                    <strong>${p.unidades_vendidas || 0}</strong>
                    <small>vendidos</small>
                </div>
            </div>
        `).join('');
    }
}

async function renderAdminTable() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;
    if (!productosCargados) await cargarProductos();
    updateAdminCounters();

    const searchTerm = document.getElementById('admin-search')?.value.toLowerCase().trim() || '';
    const categoryFilter = document.getElementById('admin-filter-category')?.value || '';

    let filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm));
    if (categoryFilter) filtered = filtered.filter(p => p.category === categoryFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#888;">No se encontraron productos.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        let stockClass = 'high';
        if (p.stock === 0) stockClass = 'low';
        else if (p.stock < 10) stockClass = 'medium';
        return `
            <tr>
                <td><strong style="color:#888;font-size:0.75rem;">#${p.id}</strong></td>
                <td>
                    <div class="product-cell">
                        <img src="${p.image}" alt="" class="product-thumb">
                        <div class="product-cell-info">
                            <strong>${p.name}</strong>
                            <small>${p.brand}</small>
                        </div>
                    </div>
                </td>
                <td><span style="font-size:0.8rem;color:#555;">${p.category}</span></td>
                <td><strong>$${p.price.toLocaleString('es-MX')}</strong></td>
                <td><span class="stock-indicator ${stockClass}"><span class="stock-dot"></span>${p.stock === 0 ? 'Agotado (0 uds)' : (p.stock < 10 ? 'Bajo: ' + p.stock + ' uds' : p.stock + ' uds')}</span></td>
                <td><strong style="color:#0056B3;">${p.sold || 0}</strong></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" onclick="openEditProductModal(${p.id})" title="Editar">✎</button>
                        <button class="btn-icon danger" onclick="deleteProduct(${p.id})" title="Eliminar">✕</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ========== ADMIN DESTACADOS ==========
// La API decide el modo con la tabla destacados: si tiene filas es manual,
// si está vacía es automático. Por eso guardar la lista es un PUT con la
// lista completa, y el modo automático es un PUT con la lista vacía.
async function guardarDestacados() {
    await apiFetch('/api/admin/destacados', {
        method: 'PUT',
        body: JSON.stringify({ ids: featuredConfig.ids || [] })
    });
}

async function setFeaturedMode(mode) {
    try {
        if (mode === 'auto') {
            featuredConfig = { mode: 'auto', ids: [] };
            await guardarDestacados();
        } else {
            featuredConfig.mode = 'manual';
            if (featuredConfig.ids.length > 0) await guardarDestacados();
        }
    } catch (e) {
        mostrarError(e);
        return;
    }
    renderFeaturedAdmin();
    renderFeaturedProducts();
}

async function renderFeaturedAdmin() {
    try {
        const datos = await apiFetch('/api/admin/destacados');
        featuredConfig = {
            mode: datos.modo || 'auto',
            ids: (datos.destacados || []).map((d) => d.id_producto)
        };
    } catch (e) {
        mostrarError(e);
        return;
    }

    document.querySelectorAll('input[name="featured-mode"]').forEach(r => {
        r.checked = (r.value === featuredConfig.mode);
    });

    const manualSection = document.getElementById('featured-manual-section');
    if (manualSection) {
        manualSection.style.display = featuredConfig.mode === 'manual' ? 'block' : 'none';
    }
    renderFeaturedActiveList();
    renderFeaturedCandidates();
}

function renderFeaturedActiveList() {
    const container = document.getElementById('featured-active-list');
    const countEl = document.getElementById('featured-count');
    if (!container) return;

    const activeIds = featuredConfig.ids || [];
    if (countEl) countEl.textContent = activeIds.length;

    if (activeIds.length === 0) {
        container.innerHTML = '<div class="empty-state-mini">Aún no has seleccionado productos.</div>';
        return;
    }

    container.innerHTML = activeIds.map((id, index) => {
        const p = products.find(prod => prod.id === id);
        if (!p) return '';
        return `
            <div class="featured-item active-item">
                <span class="featured-order">${index + 1}</span>
                <img src="${p.image}" alt="">
                <div class="featured-item-info">
                    <strong>${p.name}</strong>
                    <small>${p.category} · $${p.price.toLocaleString('es-MX')}</small>
                </div>
                <div class="featured-arrows">
                    <button class="featured-arrow-btn" onclick="moveFeatured(${index}, -1)" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="featured-arrow-btn" onclick="moveFeatured(${index}, 1)" ${index === activeIds.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <button class="featured-item-btn remove" onclick="removeFeatured(${id})" title="Quitar">✕</button>
            </div>
        `;
    }).join('');
}

function renderFeaturedCandidates() {
    const container = document.getElementById('featured-candidates-list');
    if (!container) return;

    const searchTerm = document.getElementById('featured-search')?.value.toLowerCase().trim() || '';
    const activeIds = featuredConfig.ids || [];
    let candidates = products.filter(p => !activeIds.includes(p.id));

    if (searchTerm) {
        candidates = candidates.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.brand.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm));
    }
    candidates.sort((a, b) => (b.sold || 0) - (a.sold || 0));

    if (candidates.length === 0) {
        container.innerHTML = '<div class="empty-state-mini">No hay productos disponibles.</div>';
        return;
    }

    container.innerHTML = candidates.map(p => `
        <div class="featured-item">
            <img src="${p.image}" alt="">
            <div class="featured-item-info">
                <strong>${p.name}</strong>
                <small>${p.sold || 0} vendidos · ${p.stock} en stock</small>
            </div>
            <button class="featured-item-btn add" onclick="addFeatured(${p.id})" title="Agregar" ${activeIds.length >= 8 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>+</button>
        </div>
    `).join('');
}

async function addFeatured(productId) {
    if (!featuredConfig.ids) featuredConfig.ids = [];
    if (featuredConfig.ids.length >= 8) return alert('Máximo 8 productos destacados.');
    if (featuredConfig.ids.includes(productId)) return;
    featuredConfig.ids.push(productId);
    featuredConfig.mode = 'manual';
    try {
        await guardarDestacados();
    } catch (e) {
        featuredConfig.ids = featuredConfig.ids.filter((id) => id !== productId);
        mostrarError(e);
        return;
    }
    renderFeaturedActiveList();
    renderFeaturedCandidates();
    renderFeaturedProducts();
}

async function removeFeatured(productId) {
    featuredConfig.ids = (featuredConfig.ids || []).filter(id => id !== productId);
    try {
        await guardarDestacados();
    } catch (e) {
        mostrarError(e);
        return;
    }
    renderFeaturedActiveList();
    renderFeaturedCandidates();
    renderFeaturedProducts();
}

async function moveFeatured(index, direction) {
    const ids = featuredConfig.ids || [];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ids.length) return;
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    try {
        await guardarDestacados();
    } catch (e) {
        [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
        mostrarError(e);
        return;
    }
    renderFeaturedActiveList();
    renderFeaturedProducts();
}

async function autoFillFeatured() {
    try {
        const datos = await apiFetch('/api/admin/destacados/auto', { method: 'POST', body: JSON.stringify({}) });
        featuredConfig = { mode: 'manual', ids: datos.destacados || [] };
    } catch (e) {
        mostrarError(e);
        return;
    }
    renderFeaturedActiveList();
    renderFeaturedCandidates();
    renderFeaturedProducts();
    alert('Se seleccionaron automáticamente los 8 más vendidos.');
}

// ========== ADMIN OFERTAS ==========
async function renderOffersAdminTable() {
    const tbody = document.getElementById('offers-table-body');
    if (!tbody) return;

    let filas;
    try {
        filas = await apiFetch('/api/admin/ofertas');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#888;">No se pudieron cargar las ofertas. Revisa que el servidor esté prendido.</td></tr>';
        return;
    }

    const searchTerm = document.getElementById('offers-search')?.value.toLowerCase().trim() || '';
    const filter = document.getElementById('offers-filter')?.value || 'all';

    let lista = (Array.isArray(filas) ? filas : []).map((f) => {
        const delCatalogo = products.find((p) => p.id === f.id_producto);
        return {
            id: f.id_producto,
            name: f.nombre,
            price: Number(f.precio),
            brand: f.marca,
            category: f.categoria,
            image: delCatalogo ? delCatalogo.image : IMAGEN_GENERICA,
            isOffer: Boolean(f.en_oferta),
            discount: Number(f.descuento || 0)
        };
    });

    let filtered = lista.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm));

    if (filter === 'offer') filtered = filtered.filter(p => p.isOffer);
    if (filter === 'no-offer') filtered = filtered.filter(p => !p.isOffer);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#888;">No hay productos que coincidan.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const hasDiscount = p.isOffer && p.discount > 0;
        const finalPrice = hasDiscount ? Math.round(p.price * (1 - p.discount / 100)) : null;

        return `
            <tr>
                <td>
                    <div class="product-cell">
                        <img src="${p.image}" alt="" class="product-thumb">
                        <div class="product-cell-info">
                            <strong>${p.name}</strong>
                            <small>${p.brand} · ${p.category}</small>
                        </div>
                    </div>
                </td>
                <td>${hasDiscount
                    ? `<div class="offer-price-cell">
                        <span class="original">$${p.price.toLocaleString('es-MX')}</span>
                        <span class="new">$${finalPrice.toLocaleString('es-MX')}</span>
                       </div>`
                    : `<strong>$${p.price.toLocaleString('es-MX')}</strong>`}
                </td>
                <td>
                    <label class="checkbox-label" style="margin:0;">
                        <input type="checkbox" ${p.isOffer ? 'checked' : ''} onchange="toggleOffer(${p.id}, this.checked)">
                        ${p.isOffer ? 'Activa' : 'Inactiva'}
                    </label>
                </td>
                <td>
                    <input type="number" min="1" max="90" value="${p.discount || 15}"
                        onchange="updateDiscount(${p.id}, this.value)"
                        style="width:80px;padding:6px;border:1px solid #E0E0E0;border-radius:6px;text-align:center;">
                    <span style="margin-left:4px;">%</span>
                </td>
                <td>${hasDiscount
                    ? `<strong style="color:#dc3545;font-size:1rem;">$${finalPrice.toLocaleString('es-MX')}</strong>`
                    : '<span style="color:#999;">—</span>'}
                </td>
                <td>
                    <button class="btn-icon" onclick="openEditProductModal(${p.id})" title="Editar">✎</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function toggleOffer(productId, isActive) {
    const product = products.find(p => p.id === productId);
    const descuento = (product && product.discount > 0) ? product.discount : 15;
    try {
        await apiFetch('/api/admin/ofertas/' + productId, {
            method: 'PUT',
            body: JSON.stringify({ activa: isActive, porcentaje_descuento: descuento })
        });
    } catch (e) {
        mostrarError(e);
        renderOffersAdminTable();
        return;
    }
    await cargarProductos();
    renderOffersAdminTable();
    renderOffers();
    renderCatalog();
    renderFeaturedProducts();
}

async function updateDiscount(productId, value) {
    const discount = Math.max(1, Math.min(90, parseInt(value) || 15));
    try {
        await apiFetch('/api/admin/ofertas/' + productId, {
            method: 'PUT',
            body: JSON.stringify({ activa: true, porcentaje_descuento: discount })
        });
    } catch (e) {
        mostrarError(e);
        renderOffersAdminTable();
        return;
    }
    await cargarProductos();
    renderOffersAdminTable();
    renderOffers();
    renderCatalog();
    renderFeaturedProducts();
}

// ========== VENTAS CON FILTRO DE FECHAS ==========
// La semana empieza el lunes, como en el prototipo. Las fechas se mandan
// a la API (?desde&hasta) y la API devuelve solo las órdenes de ese rango;
// la búsqueda por cliente y el filtro por estado se aplican en el navegador.
function getDateRange(type) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toISO = (d) => d.toISOString().split('T')[0];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));

    switch (type) {
        case 'hoy':
            return { from: toISO(today), to: toISO(today) };
        case 'semana':
            return { from: toISO(startOfWeek), to: toISO(today) };
        case 'mes': {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            return { from: toISO(firstDay), to: toISO(today) };
        }
        case 'mes-anterior': {
            const firstPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastPrev = new Date(today.getFullYear(), today.getMonth(), 0);
            return { from: toISO(firstPrev), to: toISO(lastPrev) };
        }
        case 'todo':
            return { from: null, to: null };
        default:
            return { from: null, to: null };
    }
}

function setDateFilter(type, event) {
    if (type === 'custom') {
        const from = document.getElementById('date-from')?.value || null;
        const to = document.getElementById('date-to')?.value || null;
        dateFilter = { type: 'custom', from, to };
    } else {
        const range = getDateRange(type);
        dateFilter = { type, from: range.from, to: range.to };
    }

    document.querySelectorAll('.date-preset').forEach(btn => btn.classList.remove('active'));
    if (type !== 'custom') {
        const textMap = { 'hoy': 'hoy', 'semana': 'esta semana', 'mes': 'este mes', 'mes-anterior': 'mes anterior', 'todo': 'todo' };
        const text = textMap[type] || '';
        const btn = Array.from(document.querySelectorAll('.date-preset')).find(b =>
            b.textContent.toLowerCase().trim() === text);
        if (btn) btn.classList.add('active');
    }

    if (type !== 'custom' && type !== 'todo') {
        const fromEl = document.getElementById('date-from');
        const toEl = document.getElementById('date-to');
        if (fromEl && toEl) {
            fromEl.value = dateFilter.from || '';
            toEl.value = dateFilter.to || '';
        }
    }

    renderOrdersTable();
}

function clearDateFilter(event) {
    if (event) event.stopPropagation();
    dateFilter = { type: 'todo', from: null, to: null };

    const fromEl = document.getElementById('date-from');
    const toEl = document.getElementById('date-to');
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';

    document.querySelectorAll('.date-preset').forEach(btn => btn.classList.remove('active'));
    const todoBtn = Array.from(document.querySelectorAll('.date-preset')).find(b => b.textContent.toLowerCase().includes('todo'));
    if (todoBtn) todoBtn.classList.add('active');

    renderOrdersTable();
}

// Las órdenes ya vienen filtradas por fecha desde la API.
function getFilteredOrdersByDate() {
    return [...orders];
}

function formatDateRangeLabel() {
    if (!dateFilter.from && !dateFilter.to) {
        return { label: 'Mostrando todas las ventas', detail: 'Sin filtro de fecha aplicado', filtering: false };
    }

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const typeLabels = {
        'hoy': 'Hoy',
        'semana': 'Esta semana',
        'mes': 'Este mes',
        'mes-anterior': 'Mes anterior',
        'custom': 'Rango personalizado'
    };

    const label = typeLabels[dateFilter.type] || 'Rango personalizado';
    const detail = `${formatDate(dateFilter.from)} → ${formatDate(dateFilter.to)}`;

    return { label, detail, filtering: true };
}

function renderPeriodSummary(filteredOrders) {
    const validOrders = filteredOrders.filter(o => o.status !== 'cancelada');
    const revenue = validOrders.reduce((sum, o) => sum + o.total, 0);
    const revenueEl = document.getElementById('period-revenue');
    if (revenueEl) revenueEl.textContent = `$${revenue.toLocaleString('es-MX')}`;

    const ordersEl = document.getElementById('period-orders');
    if (ordersEl) ordersEl.textContent = filteredOrders.length;

    const avg = validOrders.length > 0 ? Math.round(revenue / validOrders.length) : 0;
    const avgEl = document.getElementById('period-avg');
    if (avgEl) avgEl.textContent = `$${avg.toLocaleString('es-MX')}`;

    const productCount = {};
    validOrders.forEach(o => {
        o.items.forEach(item => {
            productCount[item.name] = (productCount[item.name] || 0) + item.qty;
        });
    });
    const topEntry = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];
    const topEl = document.getElementById('period-top');
    if (topEl) {
        topEl.textContent = topEntry ? topEntry[0] : '—';
        topEl.title = topEntry ? `${topEntry[1]} unidades vendidas` : '';
    }
}

function renderSalesChart(filteredOrders) {
    const container = document.getElementById('sales-chart');
    const periodLabel = document.getElementById('chart-period-label');
    const totalLabel = document.getElementById('chart-total-orders');
    if (!container) return;

    if (totalLabel) totalLabel.textContent = `${filteredOrders.length} órdenes`;

    if (filteredOrders.length === 0) {
        container.innerHTML = '<div class="chart-empty">Sin datos para este período</div>';
        if (periodLabel) periodLabel.textContent = 'día';
        return;
    }

    let groupBy = 'day';
    if (dateFilter.type === 'todo') {
        groupBy = 'month';
        if (periodLabel) periodLabel.textContent = 'mes';
    } else {
        groupBy = 'day';
        if (periodLabel) periodLabel.textContent = 'día';
    }

    const groups = {};
    filteredOrders.filter(o => o.status !== 'cancelada').forEach(o => {
        let key = groupBy === 'month' ? o.date.substring(0, 7) : o.date;
        if (!groups[key]) groups[key] = { total: 0, count: 0 };
        groups[key].total += o.total;
        groups[key].count++;
    });

    let allKeys = [];
    if (groupBy === 'day' && dateFilter.from && dateFilter.to) {
        const start = new Date(dateFilter.from + 'T00:00:00');
        const end = new Date(dateFilter.to + 'T00:00:00');
        const current = new Date(start);
        while (current <= end) {
            allKeys.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
    } else if (groupBy === 'month') {
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            allKeys.push(d.toISOString().substring(0, 7));
        }
    } else {
        allKeys = Object.keys(groups).sort();
    }

    const maxBars = 15;
    if (allKeys.length > maxBars && groupBy === 'day') {
        const weekGroups = {};
        allKeys.forEach(day => {
            const d = new Date(day + 'T00:00:00');
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!weekGroups[weekKey]) weekGroups[weekKey] = { total: 0, count: 0 };
            if (groups[day]) {
                weekGroups[weekKey].total += groups[day].total;
                weekGroups[weekKey].count += groups[day].count;
            }
        });
        allKeys = Object.keys(weekGroups).sort();
        Object.keys(weekGroups).forEach(k => { groups[k] = weekGroups[k]; });
        if (periodLabel) periodLabel.textContent = 'semana';
    }

    const maxValue = Math.max(...allKeys.map(k => groups[k]?.total || 0), 1);
    const todayISO = new Date().toISOString().split('T')[0];

    const barsHTML = allKeys.map(key => {
        const value = groups[key]?.total || 0;
        const count = groups[key]?.count || 0;
        const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

        let label = '';
        if (groupBy === 'month') {
            const d = new Date(key + '-01T00:00:00');
            label = d.toLocaleDateString('es-MX', { month: 'short' });
        } else {
            const d = new Date(key + 'T00:00:00');
            label = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        }

        const isToday = key === todayISO;
        const formattedValue = value > 0 ? `$${(value / 1000).toFixed(1)}k (${count})` : 'Sin ventas';

        return `
            <div class="chart-bar ${isToday ? 'today' : ''}">
                <div class="chart-bar-fill"
                     style="height: ${Math.max(heightPercent, 2)}%"
                     data-value="${formattedValue}"
                     title="${label}: ${formattedValue}">
                </div>
                <span class="chart-bar-label">${label}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = barsHTML;
}

async function renderOrdersTable() {
    const container = document.getElementById('orders-table-container');
    if (!container) return;
    updateAdminCounters();

    try {
        const params = new URLSearchParams();
        if (dateFilter.from) params.set('desde', dateFilter.from);
        if (dateFilter.to) params.set('hasta', dateFilter.to);
        const datos = await apiFetch('/api/ordenes?' + params.toString());
        orders = (datos.ordenes || []).map(normalizarOrden);
    } catch (e) {
        container.innerHTML = '<div class="empty-state-mini" style="padding:60px;background:white;border:1px solid #E0E0E0;border-radius:16px;">No se pudieron cargar las ventas. Revisa que el servidor esté prendido.</div>';
        return;
    }

    let dateFiltered = getFilteredOrdersByDate();

    const banner = document.getElementById('date-range-banner');
    const labelEl = document.getElementById('date-range-label');
    const detailEl = document.getElementById('date-range-detail');
    const rangeInfo = formatDateRangeLabel();
    if (labelEl) labelEl.textContent = rangeInfo.label;
    if (detailEl) detailEl.textContent = rangeInfo.detail;
    if (banner) banner.classList.toggle('filtering', rangeInfo.filtering);

    const searchTerm = document.getElementById('orders-search')?.value.toLowerCase().trim() || '';
    const statusFilter = document.getElementById('orders-filter-status')?.value || '';

    let filtered = dateFiltered.filter(o =>
        o.userName.toLowerCase().includes(searchTerm) ||
        o.userEmail.toLowerCase().includes(searchTerm) ||
        o.id.toString().includes(searchTerm));
    if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);

    renderPeriodSummary(dateFiltered);
    renderSalesChart(dateFiltered);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state-mini" style="padding:60px;background:white;border:1px solid #E0E0E0;border-radius:16px;">No hay órdenes que coincidan con los filtros.</div>';
        return;
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Orden</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(o => {
                        const initial = o.userName.charAt(0).toUpperCase();
                        return `
                            <tr class="fila-venta" onclick="showOrderDetail(${o.id})" title="Clic para ver el detalle">
                                <td><strong style="color:#0056B3;">#${o.id}</strong></td>
                                <td>
                                    <div class="user-cell">
                                        <div class="user-avatar-sm cliente">${initial}</div>
                                        <div class="product-cell-info">
                                            <strong>${o.userName}</strong>
                                            <small>${o.userEmail}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>${o.date}</td>
                                <td><strong>${o.items.length}</strong> artículo(s)</td>
                                <td><strong style="color:#28a745;">$${o.total.toLocaleString('es-MX')}</strong></td>
                                <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                                <td><button class="btn-icon" onclick="event.stopPropagation(); showOrderDetail(${o.id})">Ver</button></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function syncDateFilterUI() {
    const fromEl = document.getElementById('date-from');
    const toEl = document.getElementById('date-to');
    if (fromEl && dateFilter.from) fromEl.value = dateFilter.from;
    if (toEl && dateFilter.to) toEl.value = dateFilter.to;

    document.querySelectorAll('.date-preset').forEach(btn => btn.classList.remove('active'));
    const textMap = {
        'hoy': 'hoy',
        'semana': 'esta semana',
        'mes': 'este mes',
        'mes-anterior': 'mes anterior',
        'todo': 'todo'
    };
    const targetText = textMap[dateFilter.type];
    if (targetText) {
        const btn = Array.from(document.querySelectorAll('.date-preset')).find(b =>
            b.textContent.toLowerCase().trim() === targetText);
        if (btn) btn.classList.add('active');
    }
}

// ========== HISTORIAL DE VENTAS ==========
async function showOrderDetail(orderId) {
    let order = orders.find(o => o.id === orderId);
    if (!order) {
        try {
            const datos = await apiFetch('/api/ordenes/' + orderId);
            order = normalizarOrden(datos);
        } catch (e) {
            mostrarError(e);
            return;
        }
    }

    const itemsHTML = order.items.map(item => `
        <div class="order-detail-row">
            <span>${item.name} x${item.qty}</span>
            <span>$${(item.price * item.qty).toLocaleString('es-MX')}</span>
        </div>
    `).join('');

    document.getElementById('order-modal-title').textContent = `Orden #${order.id}`;
    document.getElementById('order-detail-content').innerHTML = `
        <div class="order-detail-section">
            <h4>Cliente</h4>
            <div class="order-detail-row"><span>Nombre</span><strong>${order.userName}</strong></div>
            <div class="order-detail-row"><span>Email</span><strong>${order.userEmail}</strong></div>
            <div class="order-detail-row"><span>Fecha</span><strong>${order.date}</strong></div>
            <div class="order-detail-row"><span>Estado</span><span class="status-badge status-${order.status}">${order.status}</span></div>
        </div>
        <div class="order-detail-section">
            <h4>Productos</h4>
            ${itemsHTML}
        </div>
        <div class="order-detail-section">
            <h4>Totales</h4>
            <div class="order-detail-row"><span>Envío</span><strong>${order.shipping === 0 ? 'Gratis' : '$' + order.shipping.toLocaleString('es-MX')}</strong></div>
            <div class="order-detail-row" style="font-size:1rem;border-top:2px solid #1A1A1A;margin-top:8px;padding-top:8px;">
                <strong>Total</strong><strong style="color:#0056B3;">$${order.total.toLocaleString('es-MX')}</strong></div>
        </div>
        ${(order.direccion_envio || order.metodo_pago) ? `
        <div class="order-detail-section">
            <h4>Envío y Pago</h4>
            ${order.direccion_envio ? `<div class="order-detail-row"><span>Dirección</span><strong>${order.direccion_envio}</strong></div>` : ''}
            ${order.metodo_pago ? `<div class="order-detail-row"><span>Pago</span><strong>${order.metodo_pago === 'tarjeta' ? 'Tarjeta terminada en ' + (order.ultimos4 || '••••') : order.metodo_pago}</strong></div>` : ''}
        </div>` : ''}
        ${order.status === 'pagada' ? `
        <div style="margin-top:16px;text-align:right;">
            <button class="btn btn-danger" onclick="cancelarOrden(${order.id})">Cancelar Pedido</button>
        </div>` : ''}
    `;
    document.getElementById('order-modal').classList.add('open');
}
function closeOrderModal() {
    document.getElementById('order-modal').classList.remove('open');
}

// ========== USUARIOS ADMIN ==========
async function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    updateAdminCounters();

    try {
        const params = new URLSearchParams();
        const buscar = document.getElementById('users-search')?.value.trim() || '';
        const rol = document.getElementById('users-filter-role')?.value || '';
        if (buscar) params.set('buscar', buscar);
        if (rol) params.set('rol', rol);
        const datos = await apiFetch('/api/admin/usuarios?' + params.toString());
        registeredUsers = (Array.isArray(datos) ? datos : []).map(normalizarUsuario);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#888;">No se pudieron cargar los usuarios. Revisa que el servidor esté prendido.</td></tr>';
        return;
    }

    const searchTerm = document.getElementById('users-search')?.value.toLowerCase().trim() || '';
    const roleFilter = document.getElementById('users-filter-role')?.value || '';

    let filtered = registeredUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm));
    if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#888;">No hay usuarios que coincidan.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const initial = u.name.charAt(0).toUpperCase();
        const avatarClass = u.role === 'admin' ? 'user-avatar-sm' : 'user-avatar-sm cliente';
        const userOrders = (u.total_ordenes !== undefined && u.total_ordenes !== null)
            ? u.total_ordenes
            : orders.filter(o => o.userEmail === u.email || o.userId === u.id).length;
        return `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="${avatarClass}">${initial}</div>
                        <div class="product-cell-info">
                            <strong>${u.name}</strong>
                            <small>ID: ${u.id}</small>
                        </div>
                    </div>
                </td>
                <td>${u.email}</td>
                <td><span class="role-badge ${u.role}">${u.role}</span></td>
                <td>${u.registeredAt || 'N/A'}</td>
                <td><strong style="color:#0056B3;">${userOrders}</strong></td>
                <td>
                    ${u.id === currentUser.id
                        ? '<small style="color:#888;font-style:italic;">Tú</small>'
                        : `<div class="action-btns">
                            <button class="btn-icon" onclick="toggleUserRole(${u.id})" title="Cambiar rol">⇄</button>
                            <button class="btn-icon danger" onclick="deleteUser(${u.id})" title="Eliminar">✕</button>
                           </div>`}
                </td>
            </tr>
        `;
    }).join('');
}

async function toggleUserRole(userId) {
    const user = registeredUsers.find(u => u.id === userId);
    if (!user) return;
    const newRole = user.role === 'admin' ? 'cliente' : 'admin';
    if (!confirm(`¿Cambiar a ${user.name} al rol "${newRole}"?`)) return;
    try {
        await apiFetch('/api/admin/usuarios/' + userId + '/rol', {
            method: 'PUT',
            body: JSON.stringify({ rol: newRole })
        });
    } catch (e) {
        mostrarError(e);
        return;
    }
    renderUsersTable();
    alert('Rol actualizado.');
}

async function deleteUser(userId) {
    if (userId === currentUser.id) return alert('No puedes eliminarte a ti mismo.');
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
        await apiFetch('/api/admin/usuarios/' + userId, { method: 'DELETE' });
    } catch (e) {
        mostrarError(e);
        return;
    }
    renderUsersTable();
    renderAdminDashboard();
    alert('Usuario eliminado.');
}

// ========== IMAGEN ==========
// La imagen de un producto se puede pegar como URL o subir como archivo
// desde la web. El archivo se guarda en backend/uploads/ con el endpoint
// POST /api/productos/:id/imagen y en la base de datos solo queda su ruta
// (/uploads/...), que sí cabe en imagen_url (500 caracteres).
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('La imagen debe ser menor a 2MB.');
    archivoImagen = file; // se sube con FormData al guardar (ver saveProduct)

    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageData = e.target.result;
        imagenEsArchivoSubido = true;
        document.getElementById('image-preview').innerHTML = `<img src="${currentImageData}" alt="Preview">`;
        document.getElementById('form-image-url').value = '';
    };
    reader.readAsDataURL(file);
}
function handleImageUrl(url) {
    if (!url) return;
    archivoImagen = null; // si se pega una URL, ya no se sube ningún archivo
    currentImageData = url;
    imagenEsArchivoSubido = false;
    const preview = document.getElementById('image-preview');
    preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span style=\'color:#dc3545;font-size:0.8rem;\'>URL inválida</span>'">`;
}
function clearImage() {
    archivoImagen = null;
    currentImageData = null;
    imagenEsArchivoSubido = false;
    document.getElementById('image-preview').innerHTML = '<span style="color:#999;font-size:0.85rem;">Sin imagen</span>';
    document.getElementById('form-image-file').value = '';
    document.getElementById('form-image-url').value = '';
}

function toggleDiscountField() {
    const isOffer = document.getElementById('form-isoffer').checked;
    const discountField = document.getElementById('discount-field');
    discountField.style.display = isOffer ? 'block' : 'none';
    if (isOffer) updateDiscountPreview();
}
function updateDiscountPreview() {
    const discount = parseFloat(document.getElementById('form-discount').value) || 0;
    const price = parseFloat(document.getElementById('form-price').value) || 0;
    const finalPrice = Math.round(price * (1 - discount / 100));
    const preview = document.getElementById('discount-preview');
    if (preview) preview.textContent = `→ $${finalPrice.toLocaleString('es-MX')} MXN`;
}


// ========== GALERÍA (v3.1) ==========
// Fotos extra de un producto. La foto principal sigue siendo imagen_url;
// las extra viven en la tabla producto_imagenes.
async function renderGalleryEditor() {
    const contenedor = document.getElementById('gallery-editor');
    if (!contenedor) return;
    if (!editingProductId) {
        contenedor.innerHTML = '<p style="color:#888;font-size:0.85rem;">Guarda el producto primero para agregar fotos extra.</p>';
        return;
    }
    try {
        const fotos = await apiFetch('/api/productos/' + editingProductId + '/imagenes');
        if (!Array.isArray(fotos) || fotos.length === 0) {
            contenedor.innerHTML = '<p style="color:#888;font-size:0.85rem;">Sin fotos adicionales todavía.</p>';
            return;
        }
        contenedor.innerHTML = '<div class="gallery-list">' + fotos.map((f) => `
            <div class="gallery-item">
                <img src="${f.url}" alt="Foto adicional">
                <button type="button" onclick="eliminarFotoGaleria(${f.id_imagen})" title="Quitar foto">✕</button>
            </div>`).join('') + '</div>';
    } catch (e) {
        contenedor.innerHTML = '<p style="color:#888;font-size:0.85rem;">No se pudieron cargar las fotos adicionales.</p>';
    }
}
async function agregarFotoGaleriaUrl() {
    if (!editingProductId) return alert('Guarda el producto primero.');
    const input = document.getElementById('gallery-image-url');
    const url = (input.value || '').trim();
    if (!url) return alert('Pega una URL de imagen o sube un archivo.');
    try {
        await apiFetch('/api/productos/' + editingProductId + '/imagenes', { method: 'POST', body: JSON.stringify({ url }) });
        input.value = '';
        await renderGalleryEditor();
    } catch (e) { mostrarError(e); }
}
async function agregarFotoGaleriaArchivo(event) {
    if (!editingProductId) { event.target.value = ''; return alert('Guarda el producto primero.'); }
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { event.target.value = ''; return alert('La imagen debe ser menor a 2MB.'); }
    try {
        const formData = new FormData();
        formData.append('imagen', file);
        await apiFetch('/api/productos/' + editingProductId + '/imagenes', { method: 'POST', body: formData });
        event.target.value = '';
        await renderGalleryEditor();
    } catch (e) { mostrarError(e); }
}
async function eliminarFotoGaleria(idImagen) {
    if (!editingProductId) return;
    if (!(await confirmarAccion('Quitar foto', '¿Quitar esta foto de la galería?'))) return;
    try {
        await apiFetch('/api/productos/' + editingProductId + '/imagenes/' + idImagen, { method: 'DELETE' });
        await renderGalleryEditor();
    } catch (e) { mostrarError(e); }
}

// ========== HERO EDITABLE (v3.1) ==========
// El hero de Inicio se guarda en el servidor (backend/config/hero.json)
// y lo ven todos los visitantes; el admin lo edita en Panel Admin > Apariencia.
let heroConfig = null;
let heroArchivo = null;
const HERO_DEFAULT = {
    titulo: 'Arma tu PC ideal con hardware original',
    subtitulo: 'Procesadores, tarjetas de video, RAM y más, con garantía oficial y precios en pesos.',
    imagen: ''
};
async function cargarHero() {
    try {
        heroConfig = await apiFetch('/api/config/hero');
    } catch (e) {
        heroConfig = { ...HERO_DEFAULT };
    }
    const titulo = document.getElementById('hero-titulo');
    const subtitulo = document.getElementById('hero-subtitulo');
    const imagen = document.getElementById('hero-imagen');
    if (titulo) titulo.textContent = heroConfig.titulo || HERO_DEFAULT.titulo;
    if (subtitulo) subtitulo.textContent = heroConfig.subtitulo || HERO_DEFAULT.subtitulo;
    if (imagen && heroConfig.imagen) imagen.src = heroConfig.imagen;
}
function cargarApariencia() {
    const cfg = heroConfig || HERO_DEFAULT;
    document.getElementById('hero-form-titulo').value = cfg.titulo || '';
    document.getElementById('hero-form-subtitulo').value = cfg.subtitulo || '';
    document.getElementById('hero-form-image-url').value = cfg.imagen || '';
    document.getElementById('hero-image-preview').innerHTML = cfg.imagen
        ? `<img src="${cfg.imagen}" alt="Hero">`
        : '<span style="color:#999;font-size:0.85rem;">Sin imagen (se muestra el recuadro PC Build)</span>';
    heroArchivo = null;
    document.getElementById('hero-form-image-file').value = '';
}
function handleHeroImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { event.target.value = ''; return alert('La imagen debe ser menor a 2MB.'); }
    heroArchivo = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('hero-image-preview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        document.getElementById('hero-form-image-url').value = '';
    };
    reader.readAsDataURL(file);
}
function handleHeroImageUrl(url) {
    if (!url) return;
    heroArchivo = null;
    document.getElementById('hero-image-preview').innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span style=\'color:#dc3545;font-size:0.8rem;\'>URL inválida</span>'">`;
}
async function guardarHero(event) {
    event.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;
    let imagen = (document.getElementById('hero-form-image-url').value || '').trim();
    if (heroArchivo) {
        try {
            const formData = new FormData();
            formData.append('imagen', heroArchivo);
            const resp = await apiFetch('/api/config/hero/imagen', { method: 'POST', body: formData });
            imagen = resp.url || resp.imagen_url || imagen;
        } catch (e) { mostrarError(e); return; }
    }
    const datos = {
        titulo: document.getElementById('hero-form-titulo').value.trim(),
        subtitulo: document.getElementById('hero-form-subtitulo').value.trim(),
        imagen
    };
    try {
        heroConfig = await apiFetch('/api/config/hero', { method: 'PUT', body: JSON.stringify(datos) });
        heroArchivo = null;
        await cargarHero();
        alert('Apariencia guardada. El inicio ya muestra el nuevo hero.');
    } catch (e) { mostrarError(e); }
}

// ========== CRUD PRODUCTOS ==========
function openAddProductModal() {
    if (!currentUser || currentUser.role !== 'admin') return;
    editingProductId = null;
    document.getElementById('product-modal-title').textContent = 'Agregar Producto';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('discount-field').style.display = 'none';
    document.getElementById('discount-preview').textContent = '';
    clearImage();
    renderGalleryEditor();
    document.getElementById('product-modal').classList.add('open');
}

async function openEditProductModal(productId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    let product = products.find(p => p.id === productId);
    // El detalle trae las especificaciones reales de la base de datos.
    try {
        const detalle = await apiFetch('/api/productos/' + productId);
        product = normalizarProducto(detalle);
    } catch (e) {
        if (!product) { mostrarError(e); return; }
    }

    editingProductId = productId;
    document.getElementById('product-modal-title').textContent = 'Editar Producto';
    document.getElementById('product-id').value = product.id;
    document.getElementById('form-name').value = product.name;
    document.getElementById('form-category').value = product.category;
    document.getElementById('form-price').value = product.price;
    document.getElementById('form-stock').value = product.stock;
    document.getElementById('form-brand').value = product.brand;
    document.getElementById('form-shortdesc').value = product.shortDesc;
    document.getElementById('form-isnew').checked = product.isNew || false;
    document.getElementById('form-isoffer').checked = product.isOffer || false;
    document.getElementById('form-discount').value = product.discount || 15;

    document.getElementById('discount-field').style.display = product.isOffer ? 'block' : 'none';
    updateDiscountPreview();

    const specsText = Object.entries(product.specs).map(([k, v]) => `${k}:${v}`).join('\n');
    document.getElementById('form-specs').value = specsText;

    // Solo se muestra la URL real si el producto tiene una; el SVG de
    // respaldo no es una URL y no se manda de vuelta a la API.
    currentImageData = product.imagen_url || null;
    imagenEsArchivoSubido = false;
    document.getElementById('form-image-url').value = product.imagen_url || '';
    document.getElementById('image-preview').innerHTML = `<img src="${product.image}" alt="Preview">`;

    document.getElementById('product-modal').classList.add('open');
    renderGalleryEditor();
}

async function saveProduct(event) {
    event.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;

    const specsText = document.getElementById('form-specs').value.trim();

    const isOffer = document.getElementById('form-isoffer').checked;
    const discount = isOffer ? (parseInt(document.getElementById('form-discount').value) || 15) : 0;

    // Imagen: se puede pegar una URL o subir un archivo desde la web.
    // El archivo NO se manda en el JSON (como data-URI no cabe en
    // imagen_url): después de crear/editar el producto se sube con
    // FormData a POST /api/productos/:id/imagen (ver abajo).
    const urlImagen = (document.getElementById('form-image-url').value || '').trim();
    let imagenUrl = null;
    if (urlImagen) {
        imagenUrl = urlImagen;
    } else if (currentImageData && currentImageData.startsWith('http')) {
        imagenUrl = currentImageData;
    }

    const productData = {
        nombre: document.getElementById('form-name').value,
        categoria: document.getElementById('form-category').value,
        precio: parseFloat(document.getElementById('form-price').value),
        stock: parseInt(document.getElementById('form-stock').value),
        marca: document.getElementById('form-brand').value,
        descripcion_breve: document.getElementById('form-shortdesc').value,
        imagen_url: imagenUrl,
        especificaciones: specsText,
        es_nuevo: document.getElementById('form-isnew').checked,
        oferta: { activa: isOffer, porcentaje_descuento: discount }
    };

    let idProducto = editingProductId;
    try {
        if (editingProductId) {
            await apiFetch('/api/productos/' + editingProductId, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
        } else {
            const respuesta = await apiFetch('/api/productos', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            idProducto = respuesta.id_producto;
        }
    } catch (e) {
        mostrarError(e);
        return;
    }

    // Si el admin subió un archivo, se manda ahora al endpoint de imagen.
    // Si la subida falla, el producto ya quedó guardado: solo se avisa.
    let imagenOk = true;
    if (archivoImagen && idProducto) {
        try {
            const formData = new FormData();
            formData.append('imagen', archivoImagen);
            await apiFetch('/api/productos/' + idProducto + '/imagen', {
                method: 'POST',
                body: formData
            });
        } catch (e) {
            imagenOk = false;
            console.warn('No se pudo subir la imagen:', e);
        }
    }
    archivoImagen = null;
    alert(imagenOk ? 'Producto guardado.' : 'Producto guardado, pero la imagen no se pudo subir. Inténtalo de nuevo editando el producto.');

    closeProductModal();
    await cargarProductos();
    renderAdminTable();
    renderAdminDashboard();
    renderFeaturedProducts();
    renderCatalog();
    renderOffers();
    if (currentView === 'admin-panel') {
        renderOffersAdminTable();
        renderFeaturedAdmin();
    }
}

async function deleteProduct(productId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!(await confirmarAccion('Eliminar producto', '¿Eliminar este producto? Esta acción no se puede deshacer.'))) return;
    try {
        await apiFetch('/api/productos/' + productId, { method: 'DELETE' });
    } catch (e) {
        // 409: el producto ya tiene órdenes y la llave foránea lo protege.
        mostrarError(e);
        return;
    }
    await cargarProductos();
    renderAdminTable();
    renderAdminDashboard();
    renderFeaturedProducts();
    renderCatalog();
    renderOffers();
    mostrarToast('Producto eliminado.');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('open');
}

// ========== MI PERFIL ==========
function switchProfileTab(tab, event) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    // El prototipo usaba el "event" global del onclick; aquí se acepta el
    // evento como parámetro y, si no viene, se busca la pestaña por su texto.
    const target = (event && event.target)
        || (typeof window !== 'undefined' && window.event && window.event.target)
        || document.querySelector(`.profile-tab[onclick*="'${tab}'"]`);
    if (target) target.classList.add('active');
    renderProfile(tab);
}

async function renderProfile(tab) {
    const container = document.getElementById('profile-content');
    if (!container || !currentUser) return;

    if (tab === 'datos') {
        container.innerHTML = `
            <h3>Mis Datos</h3>
            <div class="profile-info-row"><strong>Nombre:</strong> <span>${currentUser.name}</span></div>
            <div class="profile-info-row"><strong>Email:</strong> <span>${currentUser.email}</span></div>
            <div class="profile-info-row"><strong>Rol:</strong> <span class="badge-role ${currentUser.role === 'admin' ? 'admin' : ''}">${currentUser.role}</span></div>
            <div class="profile-info-row"><strong>Miembro desde:</strong> <span>${currentUser.registeredAt || 'N/A'}</span></div>
        `;
    }
    else if (tab === 'pedidos') {
        let myOrders = [];
        try {
            const datos = await apiFetch('/api/ordenes/mis');
            myOrders = (Array.isArray(datos) ? datos : []).map(normalizarOrden);
        } catch (e) {
            container.innerHTML = `
                <h3>Mis Pedidos</h3>
                <p style="color:#888;">No se pudieron cargar tus pedidos. Revisa que el servidor esté prendido.</p>
            `;
            return;
        }
        if (myOrders.length === 0) {
            container.innerHTML = `
                <h3>Mis Pedidos</h3>
                <div class="profile-empty">
                    <p>Aún no has realizado ninguna compra.</p>
                    <button class="btn-primary" style="margin-top:15px;" onclick="navigateTo('catalogo')">Explorar Catálogo</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <h3>Mis Pedidos (${myOrders.length})</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Orden</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th><th></th></tr></thead>
                        <tbody>
                            ${myOrders.map(o => `
                                <tr>
                                    <td><strong>#${o.id}</strong></td>
                                    <td>${o.date}</td>
                                    <td>${o.items.length} artículo(s)</td>
                                    <td><strong>$${o.total.toLocaleString('es-MX')}</strong></td>
                                    <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                                    <td><button class="btn-icon" onclick="showOrderDetail(${o.id})">Ver</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
    else if (tab === 'resenas') {
        let myReviews = [];
        try {
            const datos = await apiFetch('/api/resenas/mis');
            myReviews = (Array.isArray(datos) ? datos : []).map((r) => ({
                productId: r.id_producto,
                productName: r.producto,
                rating: r.calificacion,
                comment: r.comentario,
                date: r.fecha ? String(r.fecha).slice(0, 10) : ''
            }));
        } catch (e) {
            container.innerHTML = `
                <h3>Mis Reseñas</h3>
                <p style="color:#888;">No se pudieron cargar tus reseñas. Revisa que el servidor esté prendido.</p>
            `;
            return;
        }
        if (myReviews.length === 0) {
            container.innerHTML = `
                <h3>Mis Reseñas</h3>
                <div class="profile-empty">
                    <p>Aún no has escrito ninguna reseña.</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <h3>Mis Reseñas (${myReviews.length})</h3>
                ${myReviews.map(r => {
                    const product = products.find(p => p.id === r.productId);
                    const nombre = r.productName || product?.name || 'Producto eliminado';
                    return `
                        <div style="border:1px solid #E0E0E0;border-radius:8px;padding:15px;margin-bottom:12px;">
                            <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                            <strong style="font-size:0.9rem;">${nombre}</strong>
                            <p style="font-size:0.85rem;margin-top:5px;color:#444;">${r.comment}</p>
                            <small style="color:#888;font-size:0.75rem;">Publicada: ${r.date}</small>
                        </div>
                    `;
                }).join('')}
            `;
        }
    }
    else if (tab === 'seguridad') {
        container.innerHTML = `
            <h3>Seguridad</h3>
            <p style="color:#666;font-size:0.9rem;margin-bottom:20px;">Cambia tu contraseña periódicamente.</p>
            <div class="form-group">
                <label>Contraseña Actual</label>
                <input type="password" id="current-pass">
            </div>
            <div class="form-group">
                <label>Nueva Contraseña</label>
                <input type="password" id="new-pass">
            </div>
            <div class="form-group">
                <label>Confirmar Nueva Contraseña</label>
                <input type="password" id="confirm-pass">
            </div>
            <button class="btn-primary" onclick="changePassword()">Actualizar Contraseña</button>
        `;
    }
}

async function changePassword() {
    const current = document.getElementById('current-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirm = document.getElementById('confirm-pass').value;

    if (newPass.length < 6) return alert('Mínimo 6 caracteres.');
    if (newPass !== confirm) return alert('Las contraseñas no coinciden.');

    try {
        await apiFetch('/api/auth/cambiar-password', {
            method: 'POST',
            body: JSON.stringify({ actual: current, nueva: newPass, confirmacion: confirm })
        });
    } catch (e) {
        mostrarError(e);
        return;
    }
    alert('Contraseña actualizada.');
    renderProfile('seguridad');
}

// ========== MÓVIL Y MODALES ==========
function toggleMobileNav() {
    document.getElementById('nav-menu').classList.toggle('mobile-open');
}
function closeModalOutside(event, modalId) {
    if (event.target === event.currentTarget) {
        document.getElementById(modalId).classList.remove('open');
    }
}

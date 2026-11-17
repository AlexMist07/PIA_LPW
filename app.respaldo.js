// ========== PERSISTENCIA ==========
function saveToStorage(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (e) { console.warn('Error guardando:', e); }
}
function loadFromStorage(key, defaultValue) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) { return defaultValue; }
}

// ========== USUARIOS ==========
const defaultUsers = [
    { id: 1, name: "Administrador CoreDesk", email: "admin@coredesk.com", password: "admin123", role: "admin", registeredAt: "2025-01-15" }
];
let registeredUsers = loadFromStorage('coredesk_users', defaultUsers);
let currentUser = loadFromStorage('coredesk_currentUser', null);

// ========== PRODUCTOS ==========
const defaultProducts = [
    { id: 1, name: "AMD Ryzen 7 7800X3D", brand: "AMD", category: "Procesadores", price: 8999, stock: 25, shortDesc: "8 núcleos / 16 hilos, 3D V-Cache", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🔲%3C/text%3E%3C/svg%3E", specs: { Socket: "AM5", Frecuencia: "4.2 - 5.0 GHz", Cache: "96MB L3", TDP: "120W" }, rating: 4.8, reviews: 124, isNew: false, isOffer: false, discount: 0, sold: 18 },
    { id: 2, name: "NVIDIA RTX 4070 SUPER", brand: "ASUS", category: "Tarjetas de Video", price: 14999, stock: 12, shortDesc: "12GB GDDR6X, DLSS 3.5", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🎮%3C/text%3E%3C/svg%3E", specs: { VRAM: "12GB GDDR6X", Bus: "192-bit", TDP: "220W" }, rating: 4.9, reviews: 89, isNew: true, isOffer: false, discount: 0, sold: 25 },
    { id: 3, name: "MSI MAG B650 TOMAHAWK WIFI", brand: "MSI", category: "Tarjetas Madre", price: 4999, stock: 18, shortDesc: "Socket AM5, ATX, Wi-Fi 6E", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🔧%3C/text%3E%3C/svg%3E", specs: { Socket: "AM5", Formato: "ATX", RAM: "DDR5 6600+" }, rating: 4.7, reviews: 56, isNew: false, isOffer: false, discount: 0, sold: 12 },
    { id: 4, name: "Corsair Vengeance DDR5 32GB", brand: "Corsair", category: "Memoria RAM", price: 2899, stock: 40, shortDesc: "2x16GB, 6000MHz, CL36 RGB", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🧠%3C/text%3E%3C/svg%3E", specs: { Capacidad: "32GB", Frecuencia: "6000MHz" }, rating: 4.6, reviews: 210, isNew: false, isOffer: true, discount: 15, sold: 30 },
    { id: 5, name: "Samsung 990 PRO 2TB NVMe", brand: "Samsung", category: "Almacenamiento", price: 3499, stock: 33, shortDesc: "7,450 MB/s lectura", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E💾%3C/text%3E%3C/svg%3E", specs: { Capacidad: "2TB", Lectura: "7,450 MB/s" }, rating: 4.9, reviews: 178, isNew: false, isOffer: false, discount: 0, sold: 22 },
    { id: 6, name: "Corsair RM850x 850W", brand: "Corsair", category: "Fuentes de Poder", price: 2799, stock: 22, shortDesc: "Fully Modular, 80+ Gold", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E⚡%3C/text%3E%3C/svg%3E", specs: { Potencia: "850W", Certificación: "80+ Gold" }, rating: 4.5, reviews: 67, isNew: false, isOffer: true, discount: 20, sold: 15 },
    { id: 7, name: "NZXT H7 Flow RGB", brand: "NZXT", category: "Gabinetes", price: 2499, stock: 15, shortDesc: "Mid Tower, vidrio templado", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🖥️%3C/text%3E%3C/svg%3E", specs: { Formato: "Mid Tower", Paneles: "Vidrio templado" }, rating: 4.7, reviews: 94, isNew: true, isOffer: false, discount: 0, sold: 8 },
    { id: 8, name: "ASUS ROG Swift PG279QM 27\"", brand: "ASUS", category: "Monitores", price: 18999, stock: 8, shortDesc: "1440p, 240Hz, G-Sync", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E📺%3C/text%3E%3C/svg%3E", specs: { Tamaño: "27\"", Frecuencia: "240Hz" }, rating: 4.8, reviews: 45, isNew: false, isOffer: false, discount: 0, sold: 5 },
    { id: 9, name: "Corsair K95 RGB Platinum XT", brand: "Corsair", category: "Periféricos", price: 3499, stock: 20, shortDesc: "Switches Cherry MX Blue", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E⌨️%3C/text%3E%3C/svg%3E", specs: { Switches: "Cherry MX Blue", Layout: "Español" }, rating: 4.6, reviews: 112, isNew: false, isOffer: true, discount: 25, sold: 20 },
    { id: 10, name: "Logitech G Pro X Superlight 2", brand: "Logitech", category: "Periféricos", price: 2799, stock: 30, shortDesc: "63g, 32K DPI, inalámbrico", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🖱️%3C/text%3E%3C/svg%3E", specs: { DPI: "32,000", Peso: "63g" }, rating: 4.9, reviews: 201, isNew: true, isOffer: false, discount: 0, sold: 28 },
    { id: 11, name: "Cooler Master ML360L V2", brand: "Cooler Master", category: "Enfriamiento", price: 1999, stock: 14, shortDesc: "Radiador 360mm, ARGB", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E❄️%3C/text%3E%3C/svg%3E", specs: { Tipo: "Líquido AIO", Radiador: "360mm" }, rating: 4.4, reviews: 38, isNew: false, isOffer: false, discount: 0, sold: 6 },
    { id: 12, name: "Intel Core i7-14700K", brand: "Intel", category: "Procesadores", price: 9499, stock: 0, shortDesc: "20 núcleos, 28 hilos", image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E🔲%3C/text%3E%3C/svg%3E", specs: { Socket: "LGA1700", Núcleos: "20" }, rating: 4.7, reviews: 78, isNew: false, isOffer: false, discount: 0, sold: 4 }
];

let products = loadFromStorage('coredesk_products', defaultProducts);

// ========== ÓRDENES ==========
// Generamos órdenes de ejemplo con fechas relativas para que los filtros funcionen
function generateDefaultOrders() {
    const today = new Date();
    const daysAgo = (n) => {
        const d = new Date(today);
        d.setDate(d.getDate() - n);
        return d.toISOString().split('T')[0];
    };
    
    return [
        { id: 1001, userId: 2, userName: "Cliente Demo 1", userEmail: "cliente1@demo.com", items: [{ productId: 2, name: "NVIDIA RTX 4070 SUPER", price: 14999, qty: 1 }], total: 14999, status: "entregada", date: daysAgo(20), shipping: 0 },
        { id: 1002, userId: 3, userName: "Cliente Demo 2", userEmail: "cliente2@demo.com", items: [{ productId: 1, name: "AMD Ryzen 7 7800X3D", price: 8999, qty: 1 }, { productId: 4, name: "Corsair Vengeance DDR5 32GB", price: 2464, qty: 2 }], total: 13927, status: "enviada", date: daysAgo(10), shipping: 0 },
        { id: 1003, userId: 4, userName: "Cliente Demo 3", userEmail: "cliente3@demo.com", items: [{ productId: 5, name: "Samsung 990 PRO 2TB", price: 3499, qty: 1 }], total: 3649, status: "pagada", date: daysAgo(5), shipping: 150 },
        { id: 1004, userId: 5, userName: "Cliente Demo 4", userEmail: "cliente4@demo.com", items: [{ productId: 10, name: "Logitech G Pro X Superlight 2", price: 2799, qty: 1 }], total: 2799, status: "entregada", date: daysAgo(3), shipping: 150 },
        { id: 1005, userId: 6, userName: "Cliente Demo 5", userEmail: "cliente5@demo.com", items: [{ productId: 2, name: "NVIDIA RTX 4070 SUPER", price: 14999, qty: 1 }, { productId: 6, name: "Corsair RM850x 850W", price: 2239, qty: 1 }], total: 17238, status: "pagada", date: daysAgo(2), shipping: 0 },
        { id: 1006, userId: 7, userName: "Cliente Demo 6", userEmail: "cliente6@demo.com", items: [{ productId: 9, name: "Corsair K95 RGB Platinum XT", price: 2624, qty: 2 }], total: 5248, status: "entregada", date: daysAgo(1), shipping: 0 },
        { id: 1007, userId: 8, userName: "Cliente Demo 7", userEmail: "cliente7@demo.com", items: [{ productId: 1, name: "AMD Ryzen 7 7800X3D", price: 8999, qty: 1 }], total: 8999, status: "pagada", date: daysAgo(0), shipping: 0 }
    ];
}
let orders = loadFromStorage('coredesk_orders', generateDefaultOrders());

// ========== RESEÑAS ==========
let reviews = loadFromStorage('coredesk_reviews', []);

// ========== CONFIGURACIÓN DESTACADOS ==========
let featuredConfig = loadFromStorage('coredesk_featured', { mode: 'auto', ids: [] });

// ========== FILTRO DE FECHAS ==========
let dateFilter = loadFromStorage('coredesk_dateFilter', { type: 'todo', from: null, to: null });

// ========== ESTADO ==========
let cart = loadFromStorage('coredesk_cart', []);
let currentView = 'inicio';
let editingProductId = null;
let currentImageData = null;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ CoreDesk Tech iniciado');
    renderUserArea();
    renderFeaturedProducts();
    renderCatalog();
    renderOffers();
    updateCartBadge();
    
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
        globalSearch.addEventListener('input', () => {
            if (currentView !== 'catalogo') navigateTo('catalogo');
            else renderCatalog();
        });
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
                    ${currentUser.role === 'admin' ? `<button onclick="navigateTo('admin-panel'); closeUserDropdown();">📊 Panel Admin</button>` : ''}
                    <button onclick="navigateTo('mi-perfil'); closeUserDropdown();">👤 Mi Perfil</button>
                    <button onclick="logout()">🚪 Cerrar Sesión</button>
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
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const user = registeredUsers.find(u => u.email.toLowerCase() === email && u.password === password);
    if (!user) return alert('❌ Credenciales incorrectas.');
    
    currentUser = user;
    saveToStorage('coredesk_currentUser', currentUser);
    renderUserArea();
    closeAuthModal();
    navigateTo(user.role === 'admin' ? 'admin-panel' : 'inicio');
}
function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    
    if (password !== password2) return alert('❌ Las contraseñas no coinciden.');
    if (password.length < 6) return alert('❌ Mínimo 6 caracteres.');
    if (registeredUsers.some(u => u.email.toLowerCase() === email)) return alert('❌ Correo ya registrado.');
    
    const newUser = {
        id: registeredUsers.length + 1, name, email, password,
        role: 'cliente', registeredAt: new Date().toISOString().split('T')[0]
    };
    registeredUsers.push(newUser);
    saveToStorage('coredesk_users', registeredUsers);
    
    currentUser = newUser;
    saveToStorage('coredesk_currentUser', currentUser);
    renderUserArea();
    closeAuthModal();
    navigateTo('inicio');
    alert(`🎉 ¡Bienvenido, ${name}!`);
}
function logout() {
    if (!confirm('¿Cerrar sesión?')) return;
    currentUser = null;
    saveToStorage('coredesk_currentUser', null);
    renderUserArea();
    closeUserDropdown();
    navigateTo('inicio');
}

// ========== NAVEGACIÓN ==========
function navigateTo(viewId) {
    if (viewId === 'admin-panel' && (!currentUser || currentUser.role !== 'admin')) {
        alert('⚠️ Acceso restringido.');
        return;
    }
    if (viewId === 'mi-perfil' && !currentUser) {
        alert('⚠️ Inicia sesión primero.');
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
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('nav-menu').classList.remove('mobile-open');
}

// ========== PRODUCTOS ==========
function renderFeaturedProducts() {
    const container = document.getElementById('featured-products');
    if (!container) return;
    
    let featured = [];
    if (featuredConfig.mode === 'manual' && featuredConfig.ids.length > 0) {
        featured = featuredConfig.ids
            .map(id => products.find(p => p.id === id))
            .filter(p => p && p.stock > 0);
    } else {
        featured = [...products].filter(p => p.stock > 0).sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 8);
    }
    
    if (featured.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">No hay productos destacados.</p>';
        return;
    }
    container.innerHTML = featured.map(p => createProductCardHTML(p)).join('');
}

function renderOffers() {
    const container = document.getElementById('offers-products');
    const noOffers = document.getElementById('no-offers');
    if (!container) return;
    
    const offers = products.filter(p => p.isOffer && p.stock > 0 && p.discount > 0);
    if (offers.length === 0) {
        container.innerHTML = '';
        if (noOffers) noOffers.style.display = 'block';
        return;
    }
    if (noOffers) noOffers.style.display = 'none';
    container.innerHTML = offers.map(p => createProductCardHTML(p, true)).join('');
}

function renderCatalog() {
    const container = document.getElementById('catalog-products');
    const noResults = document.getElementById('no-results');
    if (!container || !noResults) return;
    
    const results = applyAllFilters();
    if (results.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    noResults.style.display = 'none';
    container.innerHTML = results.map(p => createProductCardHTML(p)).join('');
}

function createProductCardHTML(product, showOfferBadge = false) {
    const badges = [];
    if (showOfferBadge || product.isOffer) badges.push('<span class="product-badge oferta">Oferta</span>');
    if (product.isNew) badges.push('<span class="product-badge nuevo">Nuevo</span>');
    if (product.stock > 0) badges.push('<span class="product-badge envio">Envío Gratis</span>');
    
    let priceHTML = '';
    if (product.isOffer && product.discount > 0) {
        const originalPrice = product.price;
        const finalPrice = Math.round(originalPrice * (1 - product.discount / 100));
        priceHTML = `
            <div class="product-price-wrapper">
                <span class="product-price-original">$${originalPrice.toLocaleString('es-MX')}</span>
                <span class="product-price-new">$${finalPrice.toLocaleString('es-MX')}</span>
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
            <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart(${product.id}, event)">
                ${product.stock > 0 ? 'Añadir al Carrito' : 'Agotado'}
            </button>
        </div>
    `;
}

// ========== FILTROS ==========
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
function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    navigateTo('detalle-producto');
    const container = document.getElementById('product-detail-content');
    const stockClass = product.stock > 0 ? 'stock-in' : 'stock-out';
    const stockText = product.stock > 0 ? `✅ En existencia (${product.stock} disponibles)` : '❌ Agotado';
    
    let specsHTML = '';
    for (const [key, value] of Object.entries(product.specs)) {
        specsHTML += `<tr><th>${key}</th><td>${value}</td></tr>`;
    }
    
    const productReviews = reviews.filter(r => r.productId === productId);
    const allReviews = productReviews.length > 0 ? productReviews : [
        { user: "Juan Pérez", rating: 5, comment: "Excelente componente, funciona perfecto." },
        { user: "María García", rating: 4, comment: "Muy buena relación calidad-precio." }
    ];
    
    let reviewsHTML = allReviews.map(r => `
        <div class="review">
            <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            <strong>${r.user}</strong>
            <p>${r.comment}</p>
        </div>
    `).join('');
    
    let reviewFormHTML = currentUser 
        ? `<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-top:15px;">
            <h4 style="margin-bottom:10px;">✍️ Escribe tu reseña</h4>
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
            <strong>💡 ¿Quieres dejar tu opinión?</strong>
            <p style="margin-top:5px;">Inicia sesión o <a href="#" onclick="openAuthModal(); return false;" style="color:#0056B3;font-weight:600;">crea una cuenta</a>.</p>
        </div>`;
    
    let priceBlock = product.isOffer && product.discount > 0
        ? `<div style="display:flex;align-items:center;gap:12px;margin-bottom:15px;">
            <span style="text-decoration:line-through;color:#999;font-size:1.1rem;">$${product.price.toLocaleString('es-MX')}</span>
            <span class="detail-price" style="margin:0;">$${Math.round(product.price * (1 - product.discount / 100)).toLocaleString('es-MX')} MXN</span>
            <span style="background:#dc3545;color:white;padding:4px 10px;border-radius:6px;font-size:0.75rem;font-weight:800;">-${product.discount}%</span>
           </div>`
        : `<p class="detail-price">$${product.price.toLocaleString('es-MX')} MXN</p>`;
    
    container.innerHTML = `
        <div class="detail-container">
            <div class="detail-gallery">
                <div class="main-image"><img src="${product.image}" alt="${product.name}"></div>
                <div class="thumbnails">
                    <div class="thumbnail">📷</div>
                    <div class="thumbnail">📷</div>
                    <div class="thumbnail">📷</div>
                </div>
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
                    ${product.stock > 0 ? '🛒 Añadir al Carrito' : 'Agotado'}
                </button>
                <h3 style="margin-top:25px;">📋 Especificaciones Técnicas</h3>
                <table class="specs-table">${specsHTML}</table>
                <div class="rating-section">
                    <h3>⭐ Valoraciones</h3>
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

function submitReview(productId) {
    if (!currentUser) return alert('Debes iniciar sesión.');
    const rating = parseInt(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value.trim();
    if (!comment) return alert('Escribe un comentario.');
    
    reviews.push({
        productId, userId: currentUser.id, user: currentUser.name,
        rating, comment, date: new Date().toISOString().split('T')[0]
    });
    saveToStorage('coredesk_reviews', reviews);
    alert(`✅ ¡Gracias ${currentUser.name}! Tu reseña ha sido publicada.`);
    showProductDetail(productId);
}

// ========== CARRITO ==========
function getEffectivePrice(product) {
    return (product.isOffer && product.discount > 0)
        ? Math.round(product.price * (1 - product.discount / 100))
        : product.price;
}

function addToCart(productId, event) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) return alert('❌ Producto agotado.');
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.qty < product.stock) existing.qty++;
        else return alert('⚠️ Stock insuficiente.');
    } else {
        cart.push({ id: productId, qty: 1 });
    }
    saveToStorage('coredesk_cart', cart);
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

function addToCartFromDetail(productId) {
    const qty = parseInt(document.getElementById('detail-qty').value) || 1;
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) return;
    if (qty > product.stock) return alert('⚠️ Stock insuficiente.');
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.qty + qty <= product.stock) existing.qty += qty;
        else return alert('⚠️ Stock insuficiente.');
    } else {
        cart.push({ id: productId, qty });
    }
    saveToStorage('coredesk_cart', cart);
    updateCartBadge();
    updateCartModal();
    alert('✅ Producto añadido.');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveToStorage('coredesk_cart', cart);
    updateCartBadge();
    updateCartModal();
}
function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) badge.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
}
function toggleCartModal() {
    const modal = document.getElementById('cart-modal');
    modal.classList.toggle('open');
    if (modal.classList.contains('open')) updateCartModal();
}
function closeCartModalOutside(event) {
    if (event.target === event.currentTarget) toggleCartModal();
}
function updateCartModal() {
    const container = document.getElementById('cart-items-list');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart">Tu carrito está vacío.</p>';
        document.getElementById('cart-subtotal').textContent = '$0.00';
        document.getElementById('cart-shipping').textContent = '$0.00';
        document.getElementById('cart-total').textContent = '$0.00';
        return;
    }
    
    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';
        const unitPrice = getEffectivePrice(product);
        const itemTotal = unitPrice * item.qty;
        subtotal += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${product.name}</h4>
                    <p>$${unitPrice.toLocaleString('es-MX')} x ${item.qty} = $${itemTotal.toLocaleString('es-MX')}</p>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${product.id})">✕</button>
            </div>
        `;
    }).join('');
    
    const shipping = subtotal >= 1000 ? 0 : 150;
    const total = subtotal + shipping;
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toLocaleString('es-MX')}`;
    document.getElementById('cart-shipping').textContent = shipping === 0 ? 'Gratis' : `$${shipping.toLocaleString('es-MX')}`;
    document.getElementById('cart-total').textContent = `$${total.toLocaleString('es-MX')}`;
}

function checkout() {
    if (cart.length === 0) return alert('Tu carrito está vacío.');
    if (!currentUser) {
        alert('Debes iniciar sesión para completar tu compra.');
        document.getElementById('cart-modal').classList.remove('open');
        openAuthModal();
        return;
    }
    for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        if (!product || item.qty > product.stock) {
            return alert(`❌ Stock insuficiente para ${product?.name || 'un producto'}.`);
        }
    }
    
    const items = cart.map(item => {
        const p = products.find(prod => prod.id === item.id);
        return { productId: p.id, name: p.name, price: getEffectivePrice(p), qty: item.qty };
    });
    
    const subtotal = items.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const shipping = subtotal >= 1000 ? 0 : 150;
    const total = subtotal + shipping;
    
    if (!confirm(`¿Confirmar compra por $${total.toLocaleString('es-MX')} MXN?`)) return;
    
    const newOrder = {
        id: 1000 + orders.length + 1,
        userId: currentUser.id, userName: currentUser.name, userEmail: currentUser.email,
        items, total, status: 'pagada',
        date: new Date().toISOString().split('T')[0], shipping
    };
    orders.push(newOrder);
    saveToStorage('coredesk_orders', orders);
    
    cart.forEach(item => {
        const p = products.find(prod => prod.id === item.id);
        if (p) {
            p.stock -= item.qty;
            p.sold = (p.sold || 0) + item.qty;
        }
    });
    saveToStorage('coredesk_products', products);
    
    cart = [];
    saveToStorage('coredesk_cart', cart);
    updateCartBadge();
    updateCartModal();
    document.getElementById('cart-modal').classList.remove('open');
    alert(`🎉 ¡Gracias por tu compra!\n\nOrden #${newOrder.id} por $${total.toLocaleString('es-MX')} MXN`);
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
        usuarios: { title: 'Usuarios', sub: 'Administración de cuentas registradas' }
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
}

function updateAdminCounters() {
    const cp = document.getElementById('count-products');
    const co = document.getElementById('count-orders');
    const cu = document.getElementById('count-users');
    if (cp) cp.textContent = products.length;
    if (co) co.textContent = orders.length;
    if (cu) cu.textContent = registeredUsers.length;
}

function renderAdminDashboard() {
    updateAdminCounters();
    const totalRevenue = orders.filter(o => o.status !== 'cancelada').reduce((sum, o) => sum + o.total, 0);
    const activeProducts = products.filter(p => p.stock > 0).length;
    
    const ingEl = document.getElementById('stat-ingresos');
    const ordEl = document.getElementById('stat-ordenes');
    const prodEl = document.getElementById('stat-productos');
    const usrEl = document.getElementById('stat-usuarios');
    if (ingEl) ingEl.textContent = `$${totalRevenue.toLocaleString('es-MX')}`;
    if (ordEl) ordEl.textContent = orders.length;
    if (prodEl) prodEl.textContent = activeProducts;
    if (usrEl) usrEl.textContent = registeredUsers.length;
    
    const recentSales = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const recentEl = document.getElementById('recent-sales');
    if (recentEl) {
        recentEl.innerHTML = recentSales.length === 0
            ? '<div class="empty-state-mini">📭 Sin ventas registradas</div>'
            : recentSales.map(o => {
                const initial = o.userName.charAt(0).toUpperCase();
                return `
                    <div class="dash-item">
                        <div class="dash-item-avatar">${initial}</div>
                        <div class="dash-item-info">
                            <strong>Orden #${o.id} · ${o.userName}</strong>
                            <small>${o.date} · ${o.items.length} producto(s)</small>
                        </div>
                        <span class="dash-item-amount">$${o.total.toLocaleString('es-MX')}</span>
                    </div>
                `;
            }).join('');
    }
    
    const lowStock = products.filter(p => p.stock < 10).sort((a, b) => a.stock - b.stock);
    const lowEl = document.getElementById('low-stock-list');
    if (lowEl) {
        lowEl.innerHTML = lowStock.length === 0
            ? '<div class="empty-state-mini">✅ Todo el inventario tiene stock suficiente</div>'
            : lowStock.slice(0, 5).map(p => `
                <div class="dash-item">
                    <div class="dash-item-info">
                        <strong>${p.name}</strong>
                        <small>${p.category} · ${p.brand}</small>
                    </div>
                    <span class="stock-pill ${p.stock === 0 ? 'danger' : ''}">${p.stock} uds</span>
                </div>
            `).join('');
    }
    
    const topProducts = [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 5);
    const topEl = document.getElementById('top-products');
    if (topEl) {
        topEl.innerHTML = topProducts.map((p, i) => `
            <div class="top-product-row">
                <span class="top-rank-badge rank-${i + 1}">${i + 1}</span>
                <div class="top-product-info">
                    <strong>${p.name}</strong>
                    <small>${p.category} · ${p.brand}</small>
                </div>
                <div class="top-product-sales">
                    <strong>${p.sold || 0}</strong>
                    <small>vendidos</small>
                </div>
            </div>
        `).join('');
    }
}

function renderAdminTable() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;
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
                <td><span class="stock-indicator ${stockClass}"><span class="stock-dot"></span>${p.stock} uds</span></td>
                <td><strong style="color:#0056B3;">${p.sold || 0}</strong></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon" onclick="openEditProductModal(${p.id})" title="Editar">✏️</button>
                        <button class="btn-icon danger" onclick="deleteProduct(${p.id})" title="Eliminar">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ========== ADMIN DESTACADOS ==========
function setFeaturedMode(mode) {
    featuredConfig.mode = mode;
    saveToStorage('coredesk_featured', featuredConfig);
    renderFeaturedAdmin();
    renderFeaturedProducts();
}

function renderFeaturedAdmin() {
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

function addFeatured(productId) {
    if (!featuredConfig.ids) featuredConfig.ids = [];
    if (featuredConfig.ids.length >= 8) return alert('⚠️ Máximo 8 productos destacados.');
    if (featuredConfig.ids.includes(productId)) return;
    featuredConfig.ids.push(productId);
    saveToStorage('coredesk_featured', featuredConfig);
    renderFeaturedActiveList();
    renderFeaturedCandidates();
    renderFeaturedProducts();
}

function removeFeatured(productId) {
    featuredConfig.ids = (featuredConfig.ids || []).filter(id => id !== productId);
    saveToStorage('coredesk_featured', featuredConfig);
    renderFeaturedActiveList();
    renderFeaturedCandidates();
    renderFeaturedProducts();
}

function moveFeatured(index, direction) {
    const ids = featuredConfig.ids || [];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ids.length) return;
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    saveToStorage('coredesk_featured', featuredConfig);
    renderFeaturedActiveList();
    renderFeaturedProducts();
}

function autoFillFeatured() {
    const top8 = [...products].filter(p => p.stock > 0).sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 8);
    featuredConfig.ids = top8.map(p => p.id);
    saveToStorage('coredesk_featured', featuredConfig);
    renderFeaturedActiveList();
    renderFeaturedCandidates();
    renderFeaturedProducts();
    alert('✅ Se seleccionaron automáticamente los 8 más vendidos.');
}

// ========== ADMIN OFERTAS ==========
function renderOffersAdminTable() {
    const tbody = document.getElementById('offers-table-body');
    if (!tbody) return;
    
    const searchTerm = document.getElementById('offers-search')?.value.toLowerCase().trim() || '';
    const filter = document.getElementById('offers-filter')?.value || 'all';
    
    let filtered = products.filter(p => 
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
                    <button class="btn-icon" onclick="openEditProductModal(${p.id})" title="Editar">✏️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleOffer(productId, isActive) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    product.isOffer = isActive;
    if (isActive && (!product.discount || product.discount === 0)) {
        product.discount = 15;
    }
    saveToStorage('coredesk_products', products);
    renderOffersAdminTable();
    renderOffers();
    renderCatalog();
    renderFeaturedProducts();
}

function updateDiscount(productId, value) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const discount = Math.max(1, Math.min(90, parseInt(value) || 15));
    product.discount = discount;
    product.isOffer = true;
    saveToStorage('coredesk_products', products);
    renderOffersAdminTable();
    renderOffers();
    renderCatalog();
    renderFeaturedProducts();
}

// ========== VENTAS CON FILTRO DE FECHAS ==========
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
    
    saveToStorage('coredesk_dateFilter', dateFilter);
    
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
    saveToStorage('coredesk_dateFilter', dateFilter);
    
    const fromEl = document.getElementById('date-from');
    const toEl = document.getElementById('date-to');
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    
    document.querySelectorAll('.date-preset').forEach(btn => btn.classList.remove('active'));
    const todoBtn = Array.from(document.querySelectorAll('.date-preset')).find(b => b.textContent.toLowerCase().includes('todo'));
    if (todoBtn) todoBtn.classList.add('active');
    
    renderOrdersTable();
}

function getFilteredOrdersByDate() {
    let filtered = [...orders];
    
    if (dateFilter.from) {
        const fromDate = new Date(dateFilter.from + 'T00:00:00');
        filtered = filtered.filter(o => new Date(o.date + 'T00:00:00') >= fromDate);
    }
    if (dateFilter.to) {
        const toDate = new Date(dateFilter.to + 'T23:59:59');
        filtered = filtered.filter(o => new Date(o.date + 'T00:00:00') <= toDate);
    }
    
    return filtered;
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
        container.innerHTML = '<div class="chart-empty">📊 Sin datos para este período</div>';
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

function renderOrdersTable() {
    const container = document.getElementById('orders-table-container');
    if (!container) return;
    updateAdminCounters();
    
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
        container.innerHTML = '<div class="empty-state-mini" style="padding:60px;background:white;border:1px solid #E0E0E0;border-radius:16px;">📭 No hay órdenes que coincidan con los filtros.</div>';
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
                            <tr>
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
                                <td><button class="btn-icon" onclick="showOrderDetail(${o.id})">👁️</button></td>
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
function showOrderDetail(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const itemsHTML = order.items.map(item => `
        <div class="order-detail-row">
            <span>${item.name} x${item.qty}</span>
            <span>$${(item.price * item.qty).toLocaleString('es-MX')}</span>
        </div>
    `).join('');
    
    document.getElementById('order-modal-title').textContent = `Orden #${order.id}`;
    document.getElementById('order-detail-content').innerHTML = `
        <div class="order-detail-section">
            <h4>👤 Cliente</h4>
            <div class="order-detail-row"><span>Nombre</span><strong>${order.userName}</strong></div>
            <div class="order-detail-row"><span>Email</span><strong>${order.userEmail}</strong></div>
            <div class="order-detail-row"><span>Fecha</span><strong>${order.date}</strong></div>
            <div class="order-detail-row"><span>Estado</span><span class="status-badge status-${order.status}">${order.status}</span></div>
        </div>
        <div class="order-detail-section">
            <h4>📦 Productos</h4>
            ${itemsHTML}
        </div>
        <div class="order-detail-section">
            <h4>💰 Totales</h4>
            <div class="order-detail-row"><span>Envío</span><strong>${order.shipping === 0 ? 'Gratis' : '$' + order.shipping.toLocaleString('es-MX')}</strong></div>
            <div class="order-detail-row" style="font-size:1rem;border-top:2px solid #1A1A1A;margin-top:8px;padding-top:8px;">
                <strong>Total</strong><strong style="color:#0056B3;">$${order.total.toLocaleString('es-MX')}</strong>
            </div>
        </div>
    `;
    document.getElementById('order-modal').classList.add('open');
}
function closeOrderModal() {
    document.getElementById('order-modal').classList.remove('open');
}

// ========== USUARIOS ADMIN ==========
function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    updateAdminCounters();
    
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
        const userOrders = orders.filter(o => o.userEmail === u.email || o.userId === u.id).length;
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
                            <button class="btn-icon" onclick="toggleUserRole(${u.id})" title="Cambiar rol">🔄</button>
                            <button class="btn-icon danger" onclick="deleteUser(${u.id})" title="Eliminar">🗑️</button>
                           </div>`}
                </td>
            </tr>
        `;
    }).join('');
}

function toggleUserRole(userId) {
    const user = registeredUsers.find(u => u.id === userId);
    if (!user) return;
    const newRole = user.role === 'admin' ? 'cliente' : 'admin';
    if (!confirm(`¿Cambiar a ${user.name} al rol "${newRole}"?`)) return;
    user.role = newRole;
    saveToStorage('coredesk_users', registeredUsers);
    renderUsersTable();
    alert('✅ Rol actualizado.');
}

function deleteUser(userId) {
    if (userId === currentUser.id) return alert('No puedes eliminarte a ti mismo.');
    if (!confirm('¿Eliminar este usuario?')) return;
    registeredUsers = registeredUsers.filter(u => u.id !== userId);
    saveToStorage('coredesk_users', registeredUsers);
    renderUsersTable();
    renderAdminDashboard();
    alert('🗑️ Usuario eliminado.');
}

// ========== IMAGEN ==========
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert('⚠️ La imagen debe ser menor a 2MB.');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageData = e.target.result;
        document.getElementById('image-preview').innerHTML = `<img src="${currentImageData}" alt="Preview">`;
        document.getElementById('form-image-url').value = '';
    };
    reader.readAsDataURL(file);
}
function handleImageUrl(url) {
    if (!url) return;
    currentImageData = url;
    const preview = document.getElementById('image-preview');
    preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span style=\\'color:#dc3545;font-size:0.8rem;\\'>URL inválida</span>'">`;
}
function clearImage() {
    currentImageData = null;
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
    document.getElementById('product-modal').classList.add('open');
}

function openEditProductModal(productId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
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
    
    currentImageData = product.image;
    document.getElementById('image-preview').innerHTML = `<img src="${product.image}" alt="Preview">`;
    
    document.getElementById('product-modal').classList.add('open');
}

function saveProduct(event) {
    event.preventDefault();
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const specsText = document.getElementById('form-specs').value.trim();
    let specs = {};
    if (specsText) {
        specsText.split('\n').forEach(line => {
            const [key, ...rest] = line.split(':');
            if (key && rest.length) specs[key.trim()] = rest.join(':').trim();
        });
    }
    if (Object.keys(specs).length === 0) specs = { General: "Consultar" };
    
    const image = currentImageData || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23e8eef5'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='60'%3E📦%3C/text%3E%3C/svg%3E";
    
    const isOffer = document.getElementById('form-isoffer').checked;
    const discount = isOffer ? (parseInt(document.getElementById('form-discount').value) || 15) : 0;
    
    const productData = {
        name: document.getElementById('form-name').value,
        category: document.getElementById('form-category').value,
        price: parseFloat(document.getElementById('form-price').value),
        stock: parseInt(document.getElementById('form-stock').value),
        brand: document.getElementById('form-brand').value,
        shortDesc: document.getElementById('form-shortdesc').value,
        image, specs,
        isNew: document.getElementById('form-isnew').checked,
        isOffer, discount
    };
    
    if (editingProductId) {
        const index = products.findIndex(p => p.id === editingProductId);
        if (index !== -1) products[index] = { ...products[index], ...productData };
        alert('✅ Producto actualizado.');
    } else {
        const newId = Math.max(...products.map(p => p.id), 0) + 1;
        products.push({ id: newId, ...productData, rating: 4.5, reviews: 0, sold: 0 });
        alert('✅ Producto agregado.');
    }
    
    saveToStorage('coredesk_products', products);
    closeProductModal();
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

function deleteProduct(productId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!confirm('¿Eliminar este producto?')) return;
    products = products.filter(p => p.id !== productId);
    saveToStorage('coredesk_products', products);
    renderAdminTable();
    renderAdminDashboard();
    renderFeaturedProducts();
    renderCatalog();
    renderOffers();
    alert('🗑️ Producto eliminado.');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('open');
}

// ========== MI PERFIL ==========
function switchProfileTab(tab) {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderProfile(tab);
}

function renderProfile(tab) {
    const container = document.getElementById('profile-content');
    if (!container || !currentUser) return;
    
    if (tab === 'datos') {
        container.innerHTML = `
            <h3>📝 Mis Datos</h3>
            <div class="profile-info-row"><strong>Nombre:</strong> <span>${currentUser.name}</span></div>
            <div class="profile-info-row"><strong>Email:</strong> <span>${currentUser.email}</span></div>
            <div class="profile-info-row"><strong>Rol:</strong> <span class="badge-role ${currentUser.role === 'admin' ? 'admin' : ''}">${currentUser.role}</span></div>
            <div class="profile-info-row"><strong>Miembro desde:</strong> <span>${currentUser.registeredAt || 'N/A'}</span></div>
        `;
    }
    else if (tab === 'pedidos') {
        const myOrders = orders.filter(o => o.userId === currentUser.id || o.userEmail === currentUser.email);
        if (myOrders.length === 0) {
            container.innerHTML = `
                <h3>📦 Mis Pedidos</h3>
                <div class="profile-empty">
                    <p>📭</p>
                    <p>Aún no has realizado ninguna compra.</p>
                    <button class="btn-primary" style="margin-top:15px;" onclick="navigateTo('catalogo')">Explorar Catálogo</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <h3>📦 Mis Pedidos (${myOrders.length})</h3>
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
                                    <td><button class="btn-icon" onclick="showOrderDetail(${o.id})">👁️</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
    else if (tab === 'resenas') {
        const myReviews = reviews.filter(r => r.userId === currentUser.id);
        if (myReviews.length === 0) {
            container.innerHTML = `
                <h3>⭐ Mis Reseñas</h3>
                <div class="profile-empty">
                    <p>✍️</p>
                    <p>Aún no has escrito ninguna reseña.</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <h3>⭐ Mis Reseñas (${myReviews.length})</h3>
                ${myReviews.map(r => {
                    const product = products.find(p => p.id === r.productId);
                    return `
                        <div style="border:1px solid #E0E0E0;border-radius:8px;padding:15px;margin-bottom:12px;">
                            <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                            <strong style="font-size:0.9rem;">${product?.name || 'Producto eliminado'}</strong>
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
            <h3>🔒 Seguridad</h3>
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

function changePassword() {
    const current = document.getElementById('current-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirm = document.getElementById('confirm-pass').value;
    
    if (current !== currentUser.password) return alert('❌ Contraseña actual incorrecta.');
    if (newPass.length < 6) return alert('❌ Mínimo 6 caracteres.');
    if (newPass !== confirm) return alert('❌ Las contraseñas no coinciden.');
    
    const userInDb = registeredUsers.find(u => u.id === currentUser.id);
    if (userInDb) {
        userInDb.password = newPass;
        currentUser.password = newPass;
        saveToStorage('coredesk_users', registeredUsers);
        saveToStorage('coredesk_currentUser', currentUser);
    }
    alert('✅ Contraseña actualizada.');
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
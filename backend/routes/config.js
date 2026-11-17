// routes/config.js — Configuración pública de la tienda (v3.1).
// El hero de Inicio (título, subtítulo e imagen) se guarda en el servidor
// en backend/config/hero.json y lo ven todos los visitantes. Solo el admin
// puede cambiarlo (PUT /api/config/hero, POST /api/config/hero/imagen).
// No hay secretos aquí: es solo texto e imagen de la página.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const carpetaConfig = path.join(__dirname, '..', 'config');
const archivoHero = path.join(carpetaConfig, 'hero.json');
const carpetaUploads = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(carpetaUploads)) fs.mkdirSync(carpetaUploads, { recursive: true });

const HERO_DEFAULT = {
    titulo: 'Arma tu PC ideal con hardware original',
    subtitulo: 'Procesadores, tarjetas de video, RAM y más, con garantía oficial y precios en pesos.',
    imagen: ''
};

function leerHero() {
    try {
        const datos = JSON.parse(fs.readFileSync(archivoHero, 'utf-8'));
        return { ...HERO_DEFAULT, ...datos };
    } catch (e) {
        return { ...HERO_DEFAULT };
    }
}

function guardarHeroEnDisco(cfg) {
    fs.mkdirSync(carpetaConfig, { recursive: true });
    fs.writeFileSync(archivoHero, JSON.stringify(cfg, null, 2), 'utf-8');
    return cfg;
}

function validarHero(body) {
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
    const subtitulo = typeof body.subtitulo === 'string' ? body.subtitulo.trim() : '';
    const imagen = typeof body.imagen === 'string' ? body.imagen.trim() : '';
    if (!titulo || titulo.length > 120) return { error: 'El título es obligatorio (máximo 120 caracteres).' };
    if (!subtitulo || subtitulo.length > 200) return { error: 'El subtítulo es obligatorio (máximo 200 caracteres).' };
    if (imagen.length > 500) return { error: 'La URL de la imagen es demasiado larga.' };
    return { titulo, subtitulo, imagen };
}

// GET /api/config/hero — Hero actual (público, lo lee la página de inicio).
router.get('/hero', (req, res) => {
    res.json(leerHero());
});

// PUT /api/config/hero — Cambiar título, subtítulo e imagen (solo admin).
router.put('/hero', requireAuth, requireAdmin, (req, res) => {
    const validado = validarHero(req.body || {});
    if (validado.error) return res.status(400).json({ error: validado.error });
    res.json(guardarHeroEnDisco(validado));
});

// Subida de la imagen del hero (solo admin, igual que las fotos de producto).
const almacenamientoHero = multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpetaUploads),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `hero-${Date.now()}${ext}`);
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
const subirHero = multer({
    storage: almacenamientoHero,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: filtroSoloImagen
});

// POST /api/config/hero/imagen — Subir la foto del hero (solo admin).
// Guarda el archivo en /uploads/ y actualiza hero.json con su ruta.
router.post('/hero/imagen', requireAuth, requireAdmin, (req, res, next) => {
    subirHero.single('imagen')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'La imagen debe ser menor a 2 MB.' });
            }
            if (err.message === 'SOLO_IMAGEN') {
                return res.status(400).json({ error: 'Solo se permiten archivos de imagen (JPG, PNG, GIF o WEBP).' });
            }
            return next(err);
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Elige una imagen para subir.' });
        }
        const url = '/uploads/' + req.file.filename;
        const hero = leerHero();
        hero.imagen = url;
        guardarHeroEnDisco(hero);
        res.json({ mensaje: 'Imagen del hero subida.', url });
    });
});

module.exports = router;

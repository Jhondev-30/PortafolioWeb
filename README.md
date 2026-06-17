# Portafolio — Jhon Alex Cordero Perozo

Portafolio web profesional con estilo **Apple-inspired dark**, basado 100% en el CV
adjunto y los repos públicos de GitHub (`Jhondev-30`).

## Contenido

```
portafolio/
├── index.html      # Estructura completa del sitio
├── styles.css      # Estilos (Apple dark, animaciones, glassmorphism)
├── script.js       # Interactividad (cursor, partículas, reveal, tilt 3D)
├── assets/         # Carpeta para imágenes (vacía por ahora)
└── README.md
```

## Cómo abrirlo

**Opción 1 — Doble click (lo más rápido)**
1. Abre `index.html` con tu navegador (Chrome, Edge, Firefox, Safari).

**Opción 2 — Servidor local (recomendado, evita bloqueos de CORS en algunos navegadores)**
```bash
# Desde la carpeta portafolio/ con Python 3
python -m http.server 8000
# Luego abre http://localhost:8000
```

```bash
# O con Node.js (si tienes npx)
npx serve .
```

## Cómo desplegarlo en internet (gratis)

### Vercel (recomendado, 2 minutos)
1. Sube la carpeta `portafolio/` a un repo nuevo en GitHub.
2. Entra a [vercel.com](https://vercel.com) → "New Project" → importa el repo.
3. Listo. Te da una URL tipo `jhon-portafolio.vercel.app`.

### Netlify (drag & drop)
1. Entra a [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastra la carpeta `portafolio/`.
3. Listo, te da una URL pública al instante.

### GitHub Pages
1. Sube los archivos al branch `gh-pages` o a la raíz del repo.
2. Settings → Pages → Source: `gh-pages` → Save.
3. URL: `https://<tu-usuario>.github.io/<repo>/`.

## Características del portafolio

- **Loader animado** con barra de progreso y mensajes secuenciales
- **Cursor personalizado** con efecto magnético en links/botones
- **Hero con partículas** conectadas (canvas) + glow flotante
- **Parallax 3D** del hero según movimiento del mouse
- **Mockup interactivo de Swagger/OpenAPI** para SmartGym
- **Marquee infinito** con el stack técnico
- **Reveal on scroll** con IntersectionObserver
- **Barras de skills animadas** al entrar en viewport
- **Tilt 3D** en cards de proyectos y certificaciones
- **Contadores animados** en estadísticas del hero
- **Glassmorphism** en navbar y badges
- **100% responsive** (móvil, tablet, desktop)

## Personalización rápida

- **Tu foto**: reemplaza el ícono del avatar en la sección `about` o agrega una
  imagen en `assets/` y edita `.floating-card` con la primera card.
- **Colores**: variables CSS en `:root` dentro de `styles.css`
  (`--accent`, `--accent-2`, etc).
- **Estadísticas**: cambia los `data-count` en `.stat-num` del HTML.
- **Más proyectos**: duplica un `.project-card` en `index.html` dentro de
  `.projects-grid`.

## Stack del portafolio

- HTML5 semántico
- CSS3 (custom properties, grid, flexbox, backdrop-filter, animations)
- Vanilla JavaScript (sin dependencias)
- Canvas API (partículas)
- IntersectionObserver (reveal animations)
- Google Fonts (Inter + JetBrains Mono)

---

**Hecho con disciplina, café y mucho código.** ☕

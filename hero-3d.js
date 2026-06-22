/* ========================================================================
   HERO 3D — Optimizado
   - InstancedMesh para teclas
   - Sombras selectivas
   - Code canvas: render throttled (no cada frame)
   - Pixel ratio adaptativo
   - Pausa cuando offscreen / tab oculto
   - Respeto a prefers-reduced-motion
   ======================================================================== */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  function start() {
    if (typeof THREE === 'undefined') {
      console.error('[hero-3d] THREE no está cargado.');
      return;
    }

    const canvas = document.getElementById('hero-3d');
    if (!canvas) return;

    // Pixel ratio adaptativo: cap agresivo en mobile
    const targetPR = isMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5);

    // ====================================================================
    // SCENE / CAMERA / RENDERER
    // ====================================================================
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 2.2, 6.5);
    camera.lookAt(0, 1.0, 0);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas, antialias: !isMobile, alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      console.error('[hero-3d] WebGL error:', err);
      return;
    }
    renderer.setPixelRatio(targetPR);
    renderer.shadowMap.enabled = !isMobile; // sombras solo en desktop
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // ====================================================================
    // LUCES — solo lo necesario
    // ====================================================================
    scene.add(new THREE.HemisphereLight(0xfff3d0, 0x4a3a26, 0.55));
    scene.add(new THREE.AmbientLight(0xfff5e0, 0.4));

    const key = new THREE.DirectionalLight(0xfff0d0, 1.2);
    key.position.set(5, 7, 4);
    if (!isMobile) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024); // reducido de 2048 a 1024
      key.shadow.camera.left = -4;
      key.shadow.camera.right = 4;
      key.shadow.camera.top = 4;
      key.shadow.camera.bottom = -4;
      key.shadow.bias = -0.0005;
      key.shadow.radius = 3;
    }
    scene.add(key);

    scene.add(new THREE.DirectionalLight(0xb8d0e0, 0.35).translateX(-4).translateY(4).translateZ(2));
    scene.add(new THREE.DirectionalLight(0xfff5d0, 0.5).translateY(3).translateZ(-5));

    const lampLight = new THREE.PointLight(0xfff3c0, 1.2, 5, 1.5);
    lampLight.position.set(2.0, 2.0, 0.6);
    scene.add(lampLight);

    const screenLight = new THREE.PointLight(0x5ac8fa, 0.5, 3, 2);
    screenLight.position.set(0, 1.6, -0.3);
    scene.add(screenLight);

    // ====================================================================
    // MATERIALES (cache simple)
    // ====================================================================
    const matCache = new Map();
    const mat = (color, opts) => {
      opts = opts || {};
      const key = color + '|' + (opts.roughness || 0.75) + '|' + (opts.metalness || 0) + '|' + (opts.emissive || 0);
      if (matCache.has(key)) return matCache.get(key);
      const m = new THREE.MeshStandardMaterial({
        color, roughness: opts.roughness != null ? opts.roughness : 0.75,
        metalness: opts.metalness != null ? opts.metalness : 0,
        emissive: opts.emissive || 0x000000,
        emissiveIntensity: opts.emissiveIntensity || 0,
      });
      matCache.set(key, m);
      return m;
    };

    // Helper: leer color del tema actual
    const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const hexToNum = (h) => parseInt(h.replace('#', ''), 16);
    const themeCol = (varName, fallback) => {
      const v = cssVar(varName);
      if (v && v.startsWith('#')) return hexToNum(v);
      return fallback;
    };
    let ACCENT = themeCol('--accent', 0x1b6e4a);
    let ACCENT_2 = themeCol('--accent-2', 0x0d4d31);
    let ACCENT_3 = themeCol('--accent-3', 0xb8442c);

    // Re-leer colores del tema cuando el usuario cambia red↔dark.
    // Los meshes ya creados conservan sus materiales (la escena 3D es estática);
    // esto mantiene los fallbacks sincronizados si la escena se reinicia.
    document.documentElement.addEventListener('themechange', function () {
      ACCENT = themeCol('--accent', 0x1b6e4a);
      ACCENT_2 = themeCol('--accent-2', 0x0d4d31);
      ACCENT_3 = themeCol('--accent-3', 0xb8442c);
    });

    const M = {
      wood: mat(0x8b5a3c, { roughness: 0.7 }),
      desk: mat(0xc99674, { roughness: 0.6 }),
      deskTop: mat(0xd9a98a, { roughness: 0.55 }),
      wall: mat(0xe8dcc8, { roughness: 0.95 }),
      floor: mat(0xb89372, { roughness: 0.9 }),
      chairFabric: mat(0x34495e, { roughness: 0.85 }),
      chair: mat(0x2c3e50, { roughness: 0.5, metalness: 0.2 }),
      skin: mat(0xe8b89a, { roughness: 0.65 }),
      skinShade: mat(0xc99578, { roughness: 0.7 }),
      hair: mat(0x2a1810, { roughness: 0.9 }),
      shirt: mat(0x4a3a2e, { roughness: 0.75 }),
      shirtLight: mat(0x6b5340, { roughness: 0.7 }),
      monitor: mat(0x1d1d1f, { roughness: 0.4, metalness: 0.6 }),
      screenBg: mat(0x0a0a0a, { roughness: 0.3 }),
      keyboard: mat(0xe8e0d0, { roughness: 0.5 }),
      keyDark: mat(0x3a3a3c, { roughness: 0.6 }),
      plantPot: mat(ACCENT, { roughness: 0.65 }),
      plantLeaf: mat(0x4a7a4f, { roughness: 0.8 }),
      plantLeafLight: mat(0x6b9b6f, { roughness: 0.8 }),
      coffee: mat(0xffffff, { roughness: 0.4, metalness: 0.1 }),
      coffeeInner: mat(0x3a2418, { roughness: 0.3 }),
      pants: mat(0x2a2a2e, { roughness: 0.85 }),
      book: mat(ACCENT, { roughness: 0.7 }),
      book2: mat(ACCENT_2, { roughness: 0.7 }),
      book3: mat(ACCENT_3, { roughness: 0.7 }),
    };

    // ====================================================================
    // GEOMETRÍAS COMPARTIDAS (caja, plano, cilindro, etc.) — reuso
    // ====================================================================
    const GEO = {
      box: new THREE.BoxGeometry(1, 1, 1),
      plane: new THREE.PlaneGeometry(1, 1),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
      cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
      cyl16: new THREE.CylinderGeometry(1, 1, 1, 16),
      sphere: new THREE.SphereGeometry(1, 10, 8),
      cone: new THREE.ConeGeometry(1, 1, 12, 1, true),
      torus: new THREE.TorusGeometry(0.2, 0.02, 8, 16, Math.PI),
    };

    // Helper para crear mesh desde geo compartida (ahorra memoria)
    const mesh = (geo, mat, sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = !isMobile;
      m.receiveShadow = !isMobile;
      if (sx != null) m.scale.set(sx, sy || sx, sz || sx);
      if (x != null) m.position.set(x, y || 0, z || 0);
      return m;
    };

    // ====================================================================
    // ESCENA
    // ====================================================================
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), M.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = !isMobile;
    scene.add(floor);

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), M.wall);
    wall.position.set(0, 4, -3.5);
    scene.add(wall);

    // ---- Escritorio
    const deskGroup = new THREE.Group();
    scene.add(deskGroup);

    deskGroup.add(mesh(GEO.box, M.deskTop, 3.2, 0.08, 1.4, 0, 1.0, 0));
    [[-1.5, -0.65], [1.5, -0.65], [-1.5, 0.65], [1.5, 0.65]].forEach(function (p) {
      deskGroup.add(mesh(GEO.box, M.wood, 0.08, 1.0, 0.08, p[0], 0.5, p[1]));
    });
    deskGroup.add(mesh(GEO.box, M.wood, 0.5, 0.35, 1.2, 1.6, 0.85, 0));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), mat(0xb8a080, { metalness: 0.5, roughness: 0.3 }));
    handle.rotation.z = Math.PI / 2;
    handle.position.set(1.85, 0.85, 0);
    deskGroup.add(handle);

    // ---- Monitor
    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(-0.3, 1.04, -0.35);
    deskGroup.add(monitorGroup);

    monitorGroup.add(mesh(GEO.box, M.monitor, 1.8, 1.1, 0.06, 0, 0.85, 0));
    monitorGroup.add(mesh(GEO.box, M.screenBg, 1.65, 0.96, 0.005, 0, 0.85, 0.035));

    // Pantalla con código (textura)
    const codeSnippets = [
      'const api = express();', 'app.use(cors());', 'app.use(express.json());',
      '', '// routes',
      'app.post("/auth", async (req, res) => {',
      '  const { user, pass } = req.body;',
      '  const token = jwt.sign({ id }, SECRET);',
      '  res.json({ token, user });', '});',
      '',
      'app.get("/users", auth, async (req, res) => {',
      '  const users = await db.query(`',
      '    SELECT id, name, role FROM users',
      '    WHERE active = true', '  `);',
      '  res.json(users);', '});',
      '',
      'app.listen(3000, () => {', '  console.log("api ready");', '});',
    ];

    // Canvas más chico en mobile (1280x720 → 960x540)
    const codeCanvas = document.createElement('canvas');
    codeCanvas.width = isMobile ? 960 : 1280;
    codeCanvas.height = isMobile ? 540 : 720;
    const cctx = codeCanvas.getContext('2d', { alpha: false });
    const codeTexture = new THREE.CanvasTexture(codeCanvas);
    codeTexture.minFilter = THREE.LinearFilter;
    codeTexture.magFilter = THREE.LinearFilter;
    codeTexture.generateMipmaps = false;

    const codeScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.9),
      new THREE.MeshBasicMaterial({ map: codeTexture })
    );
    codeScreen.position.set(0, 0.85, 0.04);
    monitorGroup.add(codeScreen);

    // ---- Code rendering: solo se actualiza cuando hay cambios
    const COLORS = { bg: '#0d0d10', fg: '#e8e0d0', k: '#5ac8fa', s: '#30d158', n: '#ff9f0a', c: '#86868b' };
    const keywords = ['const','let','var','function','return','async','await','true','false','if','else','import','from','export','new','class','app','console','log','SELECT','FROM','WHERE','use'];

    function tokenize(line) {
      if (line.trim().indexOf('//') === 0) return [[line, COLORS.c]];
      if (line.trim() === '') return [['', COLORS.fg]];
      const tokens = [];
      const re = /(\/\/.*|"[^"]*"|'[^']*'|`[^`]*`|\b\d+\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|[(){}\[\];:,.<>=+\-*/!?&|])/g;
      let last = 0, m;
      while ((m = re.exec(line)) !== null) {
        if (m.index > last) tokens.push([line.slice(last, m.index), COLORS.fg]);
        const t = m[0];
        if (t.indexOf('//') === 0) tokens.push([t, COLORS.c]);
        else if (t[0] === '"' || t[0] === "'" || t[0] === '`') tokens.push([t, COLORS.s]);
        else if (/^\d+$/.test(t)) tokens.push([t, COLORS.n]);
        else if (keywords.indexOf(t) >= 0) tokens.push([t, COLORS.k]);
        else tokens.push([t, COLORS.fg]);
        last = m.index + t.length;
      }
      if (last < line.length) tokens.push([line.slice(last), COLORS.fg]);
      return tokens;
    }

    let codeReveal = 0;
    let codeFrame = 0;
    let codeDirty = true; // solo re-renderizar si hay cambio
    const totalChars = codeSnippets.reduce(function (s, l) { return s + l.length + 1; }, 0);
    const lineHeight = isMobile ? 24 : 32;
    const fontSize = isMobile ? 16 : 22;
    const startY = 38 + (isMobile ? 22 : 30);
    const headerHeight = 38;

    function renderCode() {
      cctx.fillStyle = COLORS.bg;
      cctx.fillRect(0, 0, codeCanvas.width, codeCanvas.height);
      cctx.fillStyle = '#1a1a1d';
      cctx.fillRect(0, 0, codeCanvas.width, headerHeight);
      // window dots
      cctx.beginPath(); cctx.arc(20, 19, 6, 0, Math.PI * 2); cctx.fillStyle = '#ff5f57'; cctx.fill();
      cctx.beginPath(); cctx.arc(40, 19, 6, 0, Math.PI * 2); cctx.fillStyle = '#febc2e'; cctx.fill();
      cctx.beginPath(); cctx.arc(60, 19, 6, 0, Math.PI * 2); cctx.fillStyle = '#28c840'; cctx.fill();
      cctx.fillStyle = '#666';
      cctx.font = '14px monospace';
      cctx.fillText('smartgym-api · server.js', 100, 25);

      cctx.fillStyle = '#1a1a1d';
      cctx.fillRect(0, headerHeight, 70, codeCanvas.height - headerHeight);

      cctx.font = fontSize + 'px monospace';
      let charsLeft = Math.floor(codeReveal);
      let y = startY;
      for (let i = 0; i < codeSnippets.length; i++) {
        const line = codeSnippets[i];
        cctx.fillStyle = '#4a4a4d';
        cctx.fillText(String(i + 1).padStart(2, '0'), 18, y);
        if (charsLeft <= 0) break;
        const tokens = tokenize(line);
        let x = 90;
        for (let j = 0; j < tokens.length; j++) {
          if (charsLeft <= 0) break;
          const text = tokens[j][0];
          const color = tokens[j][1];
          const visible = text.slice(0, charsLeft);
          cctx.fillStyle = color;
          cctx.fillText(visible, x, y);
          x += cctx.measureText(visible).width;
          charsLeft -= visible.length;
        }
        y += lineHeight;
      }
      if (Math.floor(codeFrame / 30) % 2 === 0) {
        cctx.fillStyle = '#f5f5f7';
        cctx.fillRect(90, y - fontSize + 6, 10, fontSize - 4);
      }
      codeTexture.needsUpdate = true;
    }
    renderCode();

    // Stand
    monitorGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 12), M.monitor).translateY(0.3));
    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.04, 16), M.monitor);
    standBase.position.set(0, 0.1, 0);
    if (!isMobile) standBase.castShadow = true;
    monitorGroup.add(standBase);

    // ---- Teclado: 48 teclas con InstancedMesh → 1 draw call
    const kbGroup = new THREE.Group();
    kbGroup.position.set(0, 1.05, 0.35);
    deskGroup.add(kbGroup);
    kbGroup.add(mesh(GEO.box, M.keyboard, 1.2, 0.05, 0.4));

    const keyGeom = new THREE.BoxGeometry(0.08, 0.025, 0.08);
    const keyCount = isMobile ? 24 : 48; // menos teclas en mobile
    const keyRows = isMobile ? 2 : 4;
    const keyCols = isMobile ? 12 : 12;
    const instancedKeys = new THREE.InstancedMesh(keyGeom, M.keyDark, keyCount);
    if (!isMobile) instancedKeys.castShadow = true;
    const dummy = new THREE.Object3D();
    let ki = 0;
    for (let row = 0; row < keyRows; row++) {
      for (let col = 0; col < keyCols; col++) {
        if (ki >= keyCount) break;
        dummy.position.set(-0.5 + col * 0.09, 0.04, -0.13 + row * 0.09);
        dummy.updateMatrix();
        instancedKeys.setMatrixAt(ki++, dummy.matrix);
      }
    }
    instancedKeys.instanceMatrix.needsUpdate = true;
    kbGroup.add(instancedKeys);

    // Ratón
    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.13), M.keyboard);
    mouse.position.set(0.75, 1.06, 0.32);
    if (!isMobile) mouse.castShadow = true;
    deskGroup.add(mouse);

    // ---- Persona
    const personGroup = new THREE.Group();
    personGroup.position.set(0, 0, 0.95);
    personGroup.rotation.y = -0.1;
    scene.add(personGroup);

    // Silla
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, 1.4);
    personGroup.add(chairGroup);
    chairGroup.add(mesh(GEO.box, M.chairFabric, 0.7, 0.1, 0.7, 0, 0.55, 0));
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.1), M.chairFabric);
    backrest.position.set(0, 1.05, 0.32);
    backrest.rotation.x = -0.08;
    if (!isMobile) backrest.castShadow = true;
    chairGroup.add(backrest);
    chairGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), M.chair).translateY(0.35));
    const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), M.chair);
    baseDisc.position.set(0, 0.1, 0);
    if (!isMobile) baseDisc.castShadow = true;
    chairGroup.add(baseDisc);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), M.keyDark);
      wheel.position.set(Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3);
      chairGroup.add(wheel);
    }

    // Cuerpo
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), M.shirt);
    torso.position.set(0, 1.15, 1.0);
    torso.rotation.x = 0.1;
    if (!isMobile) torso.castShadow = true;
    personGroup.add(torso);
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), M.shirtLight);
    shoulders.position.set(0, 1.55, 0.96);
    personGroup.add(shoulders);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), M.skinShade);
    neck.position.set(0, 1.65, 0.85);
    personGroup.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.32), M.skin);
    head.position.set(0, 1.9, 0.78);
    if (!isMobile) head.castShadow = true;
    personGroup.add(head);
    personGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.34), M.hair).translateY(2.05).translateZ(0.78));
    personGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.18), M.keyDark).translateX(-0.18).translateY(1.92).translateZ(0.8));
    personGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.18), M.keyDark).translateX(0.18).translateY(1.92).translateZ(0.8));
    const hpArc = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 12, Math.PI), M.keyDark);
    hpArc.position.set(0, 2.08, 0.78);
    hpArc.rotation.x = -Math.PI / 2;
    hpArc.rotation.z = Math.PI;
    personGroup.add(hpArc);

    // Brazo izquierdo: jerarquía padre-hijo
    // - upperArm pivota en el hombro (origen en proximal tras geometry.translate)
    // - forearm es hijo de upperArm, pivota en el codo
    // - hand es hija de forearm, pivota en la muñeca
    // Esto hace que la mano SIEMPRE siga al antebrazo — imposible que se despegue.

    const leftUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), M.shirt);
    leftUpperArm.geometry.translate(0, -0.2, 0); // pivote en hombro (proximal)
    leftUpperArm.position.set(-0.3, 1.55, 0.75);
    leftUpperArm.rotation.z = 0.45;
    leftUpperArm.rotation.x = -0.55;
    personGroup.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), M.skin);
    leftForearm.geometry.translate(0, -0.2, 0); // pivote en codo
    leftForearm.position.set(0, -0.4, 0); // hijo del upperArm: al final del upperArm (local)
    leftForearm.rotation.x = -0.5; // dobla el codo hacia adelante (relativo al upperArm)
    leftUpperArm.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.12), M.skin);
    leftHand.geometry.translate(0, -0.025, 0); // pivote en muñeca
    leftHand.position.set(0, -0.4, 0); // al final del forearm (local)
    leftForearm.add(leftHand);

    // Brazo derecho (espejo del izquierdo)
    const rightUpperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), M.shirt);
    rightUpperArm.geometry.translate(0, -0.2, 0);
    rightUpperArm.position.set(0.3, 1.55, 0.75);
    rightUpperArm.rotation.z = -0.45;
    rightUpperArm.rotation.x = -0.55;
    personGroup.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), M.skin);
    rightForearm.geometry.translate(0, -0.2, 0);
    rightForearm.position.set(0, -0.4, 0);
    rightForearm.rotation.x = -0.5;
    rightUpperArm.add(rightForearm);

    // Mano derecha: posicionada sobre el ratón
    // (Como hija del forearm, hereda toda la cadena de transformaciones)
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.12), M.skin);
    rightHand.geometry.translate(0, -0.025, 0);
    rightHand.position.set(0, -0.4, 0);
    rightForearm.add(rightHand);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.2), M.pants);
    leftLeg.position.set(-0.15, 0.6, 1.4);
    leftLeg.rotation.x = -1.3;
    personGroup.add(leftLeg);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.2), M.pants);
    rightLeg.position.set(0.15, 0.6, 1.4);
    rightLeg.rotation.x = -1.3;
    personGroup.add(rightLeg);

    // Objetos del escritorio
    const cupGroup = new THREE.Group();
    cupGroup.position.set(1.0, 1.04, 0.4);
    deskGroup.add(cupGroup);
    cupGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.13, 12), M.coffee).translateY(0.065));
    cupGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.005, 12), M.coffeeInner).translateY(0.13));
    const handle2 = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), M.coffee);
    handle2.position.set(0.07, 0.07, 0);
    handle2.rotation.y = Math.PI / 2;
    cupGroup.add(handle2);

    const plantGroup = new THREE.Group();
    plantGroup.position.set(-1.35, 1.04, -0.4);
    deskGroup.add(plantGroup);
    plantGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.22, 10), M.plantPot).translateY(0.11));
    const leafMat = [M.plantLeaf, M.plantLeafLight];
    for (let i = 0; i < (isMobile ? 5 : 7); i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), leafMat[i % 2]);
      leaf.scale.set(0.8, 1.5, 0.8);
      const a = (i / 7) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.08, 0.25 + i * 0.04, Math.sin(a) * 0.08);
      leaf.rotation.set(0.2, a, 0.15);
      plantGroup.add(leaf);
    }

    const lampGroup = new THREE.Group();
    lampGroup.position.set(1.4, 1.04, -0.55);
    deskGroup.add(lampGroup);
    lampGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 12), M.monitor));
    lampGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), M.monitor).translateY(0.3));
    lampGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.015, 0.015), M.monitor).translateX(0.2).translateY(0.6).rotateZ(0.4));
    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.18, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xe8b04a, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x5a3a1a, emissiveIntensity: 0.4 })
    );
    lampShade.position.set(0.36, 0.65, 0);
    lampShade.rotation.z = Math.PI - 0.4;
    lampGroup.add(lampShade);
    lampGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff3c0 })).translateX(0.36).translateY(0.58));

    const bookStack = new THREE.Group();
    bookStack.position.set(-1.2, 1.04, 0.45);
    deskGroup.add(bookStack);
    [M.book, M.book2, M.book3].forEach(function (b, i) {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.25), b);
      book.position.y = 0.025 + i * 0.055;
      book.rotation.y = (i - 1) * 0.05;
      if (!isMobile) book.castShadow = true;
      bookStack.add(book);
    });
    const notebook = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.4), M.shirtLight);
    notebook.position.set(0.55, 1.05, 0.5);
    notebook.rotation.y = 0.2;
    deskGroup.add(notebook);
    deskGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), mat(0xe8b04a, { roughness: 0.5 })).translateX(0.7).translateY(1.07).translateZ(0.55).rotateX(Math.PI/2).rotateZ(0.4));

    // ====================================================================
    // ORBIT
    // ====================================================================
    const orbit = { azimuth: 0, targetAzimuth: 0, polar: Math.PI / 2.2, targetPolar: Math.PI / 2.2, radius: 6.5, target: new THREE.Vector3(0, 1.1, 0) };
    function applyCamera() {
      const x = orbit.target.x + orbit.radius * Math.sin(orbit.polar) * Math.sin(orbit.azimuth);
      const y = orbit.target.y + orbit.radius * Math.cos(orbit.polar);
      const z = orbit.target.z + orbit.radius * Math.sin(orbit.polar) * Math.cos(orbit.azimuth);
      camera.position.set(x, y, z);
      camera.lookAt(orbit.target);
    }
    applyCamera();

    let isDragging = false, lastX = 0, lastY = 0, dragExpire = 0;
    let activePointerId = null;
    function getPoint(e) {
      if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }
    function onDown(e) {
      isDragging = true;
      activePointerId = (e.pointerId != null) ? e.pointerId : null;
      const p = getPoint(e);
      lastX = p.x; lastY = p.y;
      dragExpire = 2;
      // Captura el puntero: todos los eventos siguientes van al target hasta soltar,
      // incluso si el cursor sale del wrapper. Sin esto, drag se cortaba al cruzar
      // el borde del .hero-3d-wrapper.
      try {
        if (activePointerId != null && e.target && e.target.setPointerCapture) {
          e.target.setPointerCapture(activePointerId);
        }
      } catch (_) { /* API no soportada, fallback a window listeners */ }
      if (e.cancelable) e.preventDefault();
    }
    function onMove(e) {
      if (!isDragging) return;
      const p = getPoint(e);
      const dx = p.x - lastX, dy = p.y - lastY;
      lastX = p.x; lastY = p.y;
      orbit.targetAzimuth -= dx * 0.005;
      orbit.targetPolar -= dy * 0.003;
      orbit.targetPolar = Math.max(Math.PI / 2.6, Math.min(Math.PI / 1.9, orbit.targetPolar));
      orbit.targetAzimuth = Math.max(-Math.PI / 5, Math.min(Math.PI / 5, orbit.targetAzimuth));
      if (e.cancelable) e.preventDefault();
    }
    function onUp(e) {
      // Solo soltar si el evento corresponde al puntero activo
      if (e && activePointerId != null && e.pointerId != null && e.pointerId !== activePointerId) return;
      isDragging = false;
      activePointerId = null;
    }

    // Pointer Events (cubre mouse + touch + pen en un solo set de handlers)
    const wrapper = canvas.parentElement;
    const targets = [canvas, wrapper].filter(Boolean);
    targets.forEach(function (t) {
      t.addEventListener('pointerdown', onDown);
      t.addEventListener('pointermove', onMove);
      t.addEventListener('pointerup', onUp);
      t.addEventListener('pointercancel', onUp);
    });
    // Fallback: window-level move/up para drag iniciado en el canvas que sale del wrapper.
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // ====================================================================
    // ANIMACIÓN — throttled y eficiente
    // ====================================================================
    const clock = new THREE.Clock();
    let totalTime = 0;
    let running = true;
    let lastCodeReveal = 0;
    let lastCodeFrame = 0;

    function animate() {
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05); // cap delta
      totalTime += dt;
      codeFrame++;

      // Code: solo actualiza si hay cambio real
      codeReveal += dt * 25;
      if (codeReveal > totalChars + 30) codeReveal = 0;
      const codeChanged = (Math.floor(codeReveal) !== Math.floor(lastCodeReveal)) || (codeFrame % 30 !== lastCodeFrame % 30);
      if (codeChanged) {
        renderCode();
        lastCodeReveal = codeReveal;
        lastCodeFrame = codeFrame;
      }

      // Animaciones desactivadas si reduced-motion
      if (!prefersReducedMotion) {
        const breath = Math.sin(totalTime * 1.2) * 0.012;
        torso.position.y = 1.15 + breath;
        head.position.y = 1.9 + breath;
        neck.position.y = 1.65 + breath;
        shoulders.position.y = 1.55 + breath;

        if (!isMobile) {
          // ---- Mano DERECHA sobre el ratón: gesto de CLICK ----
          // Cada ~1.3s hace una pulsación corta (dip + leve inclinación)
          const clickCycle = (totalTime % 1.3) / 1.3;          // 0..1
          let clickDip = 0, clickTilt = 0;
          if (clickCycle < 0.09) {                            // ventana de click ~120ms
            const p = clickCycle / 0.09;                      // 0..1 dentro del click
            const env = Math.sin(p * Math.PI);                // envelope 0→1→0
            clickDip  = env * 0.022;                          // baja 22mm
            clickTilt = env * 0.18;                           // inclina los dedos hacia abajo
          }
          // Doble-click ocasional (~cada 6-8s) para más realismo
          const dbl = (totalTime % 6.7) < 0.25;
          if (dbl && clickCycle > 0.5 && clickCycle < 0.7) {
            const p = (clickCycle - 0.5) / 0.2;
            const env = Math.sin(p * Math.PI);
            clickDip  = Math.max(clickDip,  env * 0.022);
            clickTilt = Math.max(clickTilt, env * 0.18);
          }
          rightHand.position.y = -0.4 - clickDip;
          rightHand.rotation.x = -0.05 - clickTilt;           // -0.05 = leve inclinación base de "agarre"
          // Antebrazo derecho: sway sutil sincronizado
          rightForearm.rotation.x = -0.5 + Math.sin(totalTime * 3.1) * 0.018 - clickDip * 1.4;

          // ---- Mano IZQUIERDA sobre el teclado: gesto de TECLEO ----
          // Bobs rápidos (~10-14 Hz) + leve oleaje aleatorio para que no parezca metrónomo
          // Combina dos sinusoides a frecuencias distintas + ruido lento
          const typeBeat = Math.sin(totalTime * 12) * Math.sin(totalTime * 7.3);
          const typeWobble = Math.sin(totalTime * 2.1) * 0.003;
          const typeDip = typeBeat * 0.012 + typeWobble;       // amplitud ~12-15mm
          leftHand.position.y = -0.4 + typeDip;
          // Inclinación sutil de los dedos siguiendo el tecleo
          leftHand.rotation.x = 0.05 - Math.abs(typeBeat) * 0.12;
          // Antebrazo izquierdo: sway suave
          leftForearm.rotation.x = -0.5 + Math.sin(totalTime * 2.7) * 0.015;
        }

        // Auto-rotate suave
        if (dragExpire > 0) dragExpire -= dt;
        else {
          orbit.targetAzimuth = Math.sin(totalTime * 0.15) * 0.18;
          orbit.targetPolar = Math.PI / 2.2 + Math.sin(totalTime * 0.1) * 0.04;
        }

        orbit.azimuth += (orbit.targetAzimuth - orbit.azimuth) * 0.06;
        orbit.polar += (orbit.targetPolar - orbit.polar) * 0.06;
        applyCamera();
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    // ====================================================================
    // RESIZE
    // ====================================================================
    let resizeTimer;
    function resize() {
      const wrapper = canvas.parentElement;
      if (!wrapper) return;
      const w = wrapper.clientWidth, h = wrapper.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    function resizeDebounced() { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 100); }
    resize();
    window.addEventListener('resize', resizeDebounced);

    // Pausa cuando offscreen / tab oculto
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { running = e.isIntersecting; if (running) { clock.getDelta(); animate(); } });
      });
      io.observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) animate();
    });

    console.log('[hero-3d] Listo ✓', isMobile ? '(mobile)' : '(desktop)');
  }

  // Boot — espera a que el sitio esté idle para no bloquear TTI
  function showFallback() {
    var fb = document.getElementById('hero-3d-fallback');
    var cv = document.getElementById('hero-3d');
    if (fb) fb.hidden = false;
    if (cv) cv.style.display = 'none';
    var hint = document.querySelector('.hero-3d-hint');
    if (hint) hint.style.display = 'none';
  }
  function boot() {
    if (typeof THREE !== 'undefined') {
      // requestIdleCallback: arranca cuando el browser esté libre
      if (window.requestIdleCallback) {
        window.requestIdleCallback(function () {
          try { start(); } catch (err) { console.error('[hero-3d] Error:', err); showFallback(); }
        }, { timeout: 1500 });
      } else {
        setTimeout(function () {
          try { start(); } catch (err) { console.error('[hero-3d] Error:', err); showFallback(); }
        }, 200);
      }
    } else setTimeout(boot, 100);
  }
  setTimeout(function () { if (typeof THREE === 'undefined') { showFallback(); } }, 4000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ========================================================================
   JHON ALEX CORDERO — Interacciones v6
   FIX DEFINITIVO: cursor con inline style, sin transform
   Carrusel = SLIDER real con botones
   ======================================================================== */

(function () {
  'use strict';

  // ====================================================================
  // THEME TOGGLE — light / dark
  // Respeta prefers-color-scheme si no hay preferencia guardada.
  // ====================================================================
  function initTheme() {
    const root = document.documentElement;
    const toggle = document.getElementById('themeToggle');
    const label = document.getElementById('themeLabel');

    let saved = localStorage.getItem('jhon-theme');
    // Compat: si quedó el viejo valor "red" del tema anterior, lo tratamos como "light"
    if (saved === 'red') saved = 'light';
    if (!saved) {
      saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    function applyTheme(next) {
      root.setAttribute('data-theme', next);
      localStorage.setItem('jhon-theme', next);
      if (label) label.textContent = next === 'dark' ? 'Dark' : 'Light';

      // Actualiza el theme-color del navegador (la barrita en mobile)
      var meta = document.querySelector('meta[name="theme-color"]:not([media])');
      if (meta) meta.setAttribute('content', next === 'dark' ? '#0a0e1f' : '#f4f0e6');

      // Avisa al resto del sitio (ej. hero-3d.js) para que re-lea variables CSS
      root.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
    }

    applyTheme(saved);

    if (toggle) {
      toggle.addEventListener('click', function () {
        applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      });
    }
  }
  initTheme();

  // ====================================================================
  // CURSOR — desactivado (cursor nativo del sistema)
  // ====================================================================
  console.log('[cursor] nativo del sistema');

  // ====================================================================
  // CARRUSEL INFINITO — animación JS (requestAnimationFrame)
  // Mide el ancho real de un set y hace wrap. Se mueve SIEMPRE
  // (excluido de prefers-reduced-motion en CSS), como pidió el usuario.
  // ====================================================================
  function initTechCarousel() {
    var track = document.getElementById('techTrack');
    if (!track) {
      console.warn('[carrusel] no encontré #techTrack');
      return;
    }

    console.log('[carrusel] init OK — track width:', track.scrollWidth, 'px');

    // El HTML tiene 3 sets idénticos para que el wrap sea invisible
    var setsInTrack = 3;
    var pxPerSecond = 55;     // velocidad del scroll
    var offset = 0;
    var paused = false;
    var lastTs = 0;

    function setWidth() { return track.scrollWidth / setsInTrack; }

    function tick(ts) {
      if (lastTs === 0) lastTs = ts;
      var dt = (ts - lastTs) / 1000;
      lastTs = ts;

      if (!paused && dt > 0 && dt < 1) {
        offset -= pxPerSecond * dt;
        var sw = setWidth();
        // Wrap dentro de [-setWidth, 0] — al ser contenido duplicado,
        // pasar de -setWidth a 0 es visualmente idéntico (loop perfecto).
        if (offset <= -sw) offset += sw;
        else if (offset > 0) offset -= sw;
        track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px, 0, 0)';
      }
      requestAnimationFrame(tick);
    }

    var carousel = track.closest('.tech-carousel');
    if (carousel) {
      carousel.addEventListener('mouseenter', function () { paused = true; });
      carousel.addEventListener('mouseleave', function () { paused = false; lastTs = 0; });
      // Soporte táctil
      carousel.addEventListener('touchstart', function () { paused = true; }, { passive: true });
      carousel.addEventListener('touchend', function () { paused = false; lastTs = 0; });
    }

    // Pausa cuando la pestaña no está visible (ahorra CPU)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) paused = true;
      else { paused = false; lastTs = 0; }
    });

    // Ajuste al cambiar tamaño de ventana (no rompe el loop)
    var resizeRaf = 0;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(function () {
        var sw = setWidth();
        if (sw > 0) offset = offset % -sw;
      });
    });

    requestAnimationFrame(tick);
    console.log('[carrusel] tick iniciado ✓');
  }
  initTechCarousel();

  // ====================================================================
  // RESTO (nav, counters, reveal, etc)
  // ====================================================================
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 30); }, { passive: true });

  var navBurger = document.getElementById('navBurger');
  var navLinks = document.querySelector('.nav-links');
  if (navBurger && navLinks) {
    navBurger.addEventListener('click', function () {
      navLinks.classList.toggle('mobile-open');
      var tt = document.querySelector('.theme-toggle');
      if (tt) tt.classList.toggle('mobile-show');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { navLinks.classList.remove('mobile-open'); });
    });
  }

  var heroTitle = document.querySelector('.hero-title');
  if (heroTitle) setTimeout(function () { heroTitle.classList.add('in'); }, 150);

  var animateCounters = function () {
    document.querySelectorAll('[data-count]').forEach(function (c) {
      var target = parseInt(c.getAttribute('data-count'));
      var dur = 1500;
      var start = performance.now();
      var step = function (now) {
        var t = Math.min((now - start) / dur, 1);
        var e = 1 - Math.pow(1 - t, 3);
        c.textContent = Math.floor(e * target);
        if (t < 1) requestAnimationFrame(step);
        else c.textContent = target;
      };
      requestAnimationFrame(step);
    });
  };
  var heroObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { animateCounters(); heroObs.disconnect(); } });
  }, { threshold: 0.3 });
  var heroSection = document.querySelector('.hero');
  if (heroSection) heroObs.observe(heroSection);

  var revealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in-view'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { revealObs.observe(el); });

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  document.querySelectorAll('.stat').forEach(function (stat) {
    stat.addEventListener('mouseenter', function () {
      stat.classList.add('pulse');
      setTimeout(function () { stat.classList.remove('pulse'); }, 600);
    });
  });

  var headObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('head-in');
        headObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.section-head').forEach(function (el) { headObs.observe(el); });

  // ====================================================================
  // ACTIVE NAV LINK — resalta el link correspondiente a la sección visible
  // ====================================================================
  var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
  var sectionsById = {};
  navAnchors.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    var section = document.getElementById(id);
    if (section) sectionsById[id] = a;
  });
  var activeObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var anchor = sectionsById[entry.target.id];
      if (anchor) {
        if (entry.isIntersecting) anchor.setAttribute('aria-current', 'true');
        else anchor.removeAttribute('aria-current');
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
  Object.keys(sectionsById).forEach(function (id) {
    var sec = document.getElementById(id);
    if (sec) activeObs.observe(sec);
  });

  console.log('%c⟨/⟩ Jhon Alex Cordero', 'font: 700 22px Georgia; color:#1b6e4a; padding:8px;');
})();

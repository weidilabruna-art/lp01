/* Carrossel de autoridade + modal de depoimento (Máquina de Vendas)
   FONTE ÚNICA DE DADOS: o array DEPOIMENTOS abaixo.
   Pra adicionar pessoa: copiar um bloco, trocar id e name, deixar o resto null até ter o dado.
   - image: caminho relativo ('depoimentos/nome.webp', 160x160). null = iniciais.
   - username / followers: null = linha escondida (nunca inventar).
   - vimeoUrl: 'vimeo.com/ID', 'vimeo.com/ID/HASH' ou 'player.vimeo.com/video/ID?h=HASH'. null = "em breve".
   - printUrl: imagem (print de depoimento) mostrada no lugar do vídeo quando não há vimeoUrl. null = sem print.
   - vertical: true quando o vídeo é 9:16 (Reels). Se omitido, o código pergunta ao Vimeo e descobre sozinho.
   - role / stat: pra quem não é famoso no Instagram. role aparece no lugar do @ (ex.: 'CEO Móveis Planejados'), stat no lugar dos seguidores (ex.: 'Fatura R$ 1 mi por mês', tem que caber em 1 linha no celular). Deixar username e followers null nesse caso.
   A ordem do array é a ordem de prioridade visual (os dois primeiros aparecem sempre no carregamento). */
const DEPOIMENTOS = [
  { id: 'matheus-ceara',     name: 'Matheus Ceará',     username: 'matheusceara',      followers: '6,9 mi seguidores', image: 'depoimentos/matheus-ceara.webp',     vimeoUrl: null, printUrl: 'depoimentos/matheus-ceara-print.webp', alt: 'Foto de Matheus Ceará' },
  { id: 'bernardo-kister',   name: 'Bernardo Kister',   username: 'bernardopkuster',   followers: '682 mil seguidores', image: 'depoimentos/bernardo-kister.webp',   vimeoUrl: 'https://vimeo.com/1228598970/5a7b61acc7', vertical: true, printUrl: null, alt: 'Foto de Bernardo Kister' },
  { id: 'priscila-calijury', name: 'Priscila Calijury', username: 'priscila_calijuri', followers: '289 mil seguidores', image: 'depoimentos/priscila-calijury.webp', vimeoUrl: 'https://vimeo.com/1228599738/128bd5aef8', vertical: true, printUrl: null, alt: 'Foto de Priscila Calijury' },
  { id: 'fabiano-qs',        name: 'Fabiano QS',        username: 'fabianoqs',         followers: '479 mil seguidores', image: 'depoimentos/fabiano-qs.webp',        vimeoUrl: 'https://vimeo.com/1228598754/dd4c21f232', vertical: true, printUrl: null, alt: 'Foto de Fabiano QS' },
  { id: 'marcelo-soares',    name: 'Marcelo Soares',    username: null, followers: null, role: 'CEO Móveis Planejados', stat: 'Fatura R$ 1 mi por mês', image: 'depoimentos/marcelo-soares.webp', vimeoUrl: 'https://vimeo.com/1228601234/30212cca66', vertical: true, printUrl: null, alt: 'Foto de Marcelo Soares' },
];

(function () {
  'use strict';
  var section = document.querySelector('.autoridade');
  var viewport = section && section.querySelector('.autoridade-viewport');
  var track = section && section.querySelector('.autoridade-track');
  var overlay = document.getElementById('depo-modal');
  if (!section || !viewport || !track || !overlay) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = 28; // px por segundo

  /* ---------- helpers ---------- */
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }
  function parseVimeo(url) {
    if (!url) return null;
    var m = String(url).match(/(?:vimeo\.com\/(?:video\/)?)(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (!m) return null;
    var hash = m[2] || null;
    var h = String(url).match(/[?&]h=([a-zA-Z0-9]+)/);
    if (h) hash = h[1];
    return { id: m[1], hash: hash };
  }
  var ratioCache = {};
  function descobrirVertical(d, v) {
    if (typeof d.vertical === 'boolean') return Promise.resolve(d.vertical);
    if (d.id in ratioCache) return Promise.resolve(ratioCache[d.id]);
    var url = 'https://vimeo.com/' + v.id + (v.hash ? '/' + v.hash : '');
    return fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(url))
      .then(function (r) { return r.json(); })
      .then(function (j) { var vert = j && j.height > j.width; ratioCache[d.id] = vert; return vert; })
      .catch(function () { return false; });
  }
  function avatarHtml(d, size, eager) {
    var inner;
    if (d.image) {
      inner = '<img src="' + d.image + '" width="' + size + '" height="' + size + '" alt="' + (d.alt || d.name) + '" draggable="false" decoding="async"' +
        (eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"') + '>';
    } else {
      inner = '<span aria-hidden="true">' + initials(d.name) + '</span>';
    }
    return '<div class="autoridade-avatar">' + inner + '<i class="autoridade-play" aria-hidden="true"></i></div>';
  }
  function cardHtml(d, index, clone) {
    var meta = '';
    if (d.username) meta += '<div class="autoridade-meta">@' + d.username + '</div>';
    else if (d.role) meta += '<div class="autoridade-meta">' + d.role + '</div>';
    if (d.followers) meta += '<div class="autoridade-meta"><b>' + d.followers + '</b></div>';
    else if (d.stat) meta += '<div class="autoridade-meta"><b>' + d.stat + '</b></div>';
    return '<button type="button" class="autoridade-card" data-id="' + d.id + '"' +
      (d.vimeoUrl ? '' : ' data-sem-video') +
      (d.printUrl && !d.vimeoUrl ? ' data-print' : '') +
      (clone ? ' aria-hidden="true" tabindex="-1"' : '') +
      ' aria-label="Ver depoimento de ' + d.name + '">' +
      avatarHtml(d, 64, !clone && index < 2) +
      '<div class="autoridade-name">' + d.name + '</div>' + meta +
      '</button>';
  }

  /* ---------- render ---------- */
  var setHtml = DEPOIMENTOS.map(function (d, i) { return cardHtml(d, i, false); }).join('');
  track.innerHTML = setHtml;
  var setWidth = 0;
  var copies = 1;

  function measureSet() {
    var cards = track.querySelectorAll('.autoridade-card:not([aria-hidden])');
    if (!cards.length) return 0;
    var gap = parseFloat(getComputedStyle(track).gap) || 12;
    var w = 0;
    cards.forEach(function (c) { w += c.offsetWidth + gap; });
    return w;
  }
  function buildClones() {
    track.querySelectorAll('.autoridade-card[aria-hidden]').forEach(function (c) { c.remove(); });
    setWidth = measureSet();
    if (!setWidth) return;
    var need = Math.max(2, Math.ceil((viewport.offsetWidth * 2) / setWidth) + 1);
    var html = '';
    for (var k = 1; k < need; k++) {
      html += DEPOIMENTOS.map(function (d, i) { return cardHtml(d, i, true); }).join('');
    }
    track.insertAdjacentHTML('beforeend', html);
    copies = need;
  }

  if (reduced) {
    section.classList.add('is-static');
  } else {
    buildClones();
  }

  /* ---------- movimento ---------- */
  var x = 0, last = 0, raf = null, running = !reduced;
  var paused = { hover: false, modal: false, hidden: document.hidden, drag: false };
  var resumeTimer = null;

  function wrap() {
    if (!setWidth) return;
    while (x >= setWidth) x -= setWidth;
    while (x < 0) x += setWidth;
  }
  function apply() { track.style.transform = 'translate3d(' + (-x) + 'px,0,0)'; }
  function isPaused() { return paused.hover || paused.modal || paused.hidden || paused.drag; }
  function tick(ts) {
    if (!running) return;
    if (!last) last = ts;
    var dt = Math.min(64, ts - last);
    last = ts;
    if (!isPaused()) { x += SPEED * dt / 1000; wrap(); apply(); }
    raf = requestAnimationFrame(tick);
  }
  function start() { if (running && !raf) { last = 0; raf = requestAnimationFrame(tick); } }

  if (!reduced) {
    apply();
    start();
    if (window.matchMedia('(hover: hover)').matches) {
      viewport.addEventListener('mouseenter', function () { paused.hover = true; });
      viewport.addEventListener('mouseleave', function () { paused.hover = false; });
    }
    document.addEventListener('visibilitychange', function () { paused.hidden = document.hidden; last = 0; });
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { var old = setWidth; buildClones(); if (old && setWidth) x = x * (setWidth / old); wrap(); apply(); }, 150);
    });

    /* drag / swipe */
    var dragging = false, startX = 0, startOff = 0, moved = 0, pid = null, downCard = null;
    track.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      dragging = true; moved = 0; pid = e.pointerId;
      downCard = e.target.closest ? e.target.closest('.autoridade-card') : null;
      startX = e.clientX; startOff = x;
      paused.drag = true; clearTimeout(resumeTimer);
      track.classList.add('is-dragging');
      try { track.setPointerCapture(pid); } catch (_) {}
    });
    track.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      x = startOff - dx; wrap(); apply();
    });
    function endDrag(e) {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false;
      track.classList.remove('is-dragging');
      try { track.releasePointerCapture(pid); } catch (_) {}
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () { paused.drag = false; last = 0; }, 1500);
      /* Toque sem arrasto abre o depoimento aqui mesmo: com o pointer capturado,
         o click chega no trilho e não no card (celular), então não dá pra depender dele. */
      if (e && e.type === 'pointerup' && moved < 6 && downCard) {
        var card = downCard; downCard = null;
        suppressClickUntil = Date.now() + 500;
        abrirCard(card);
      }
      downCard = null;
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('click', function (e) {
      if (moved >= 6) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);
  }

  /* ---------- modal ---------- */
  var modal = overlay.querySelector('.depo-modal');
  var suppressClickUntil = 0;
  function abrirCard(card) {
    var d = DEPOIMENTOS.filter(function (it) { return it.id === card.getAttribute('data-id'); })[0];
    if (d) open(d, card);
  }
  var closeBtn = overlay.querySelector('.depo-modal-close');
  var headEl = overlay.querySelector('.depo-modal-head');
  var videoEl = overlay.querySelector('.depo-modal-video');
  var opener = null, player = null, scrollY = 0, closing = false;

  function pauseMainVideo() {
    try {
      var main = document.getElementById('vimeo-player');
      if (main && window.Vimeo && window.Vimeo.Player) { new window.Vimeo.Player(main).pause().catch(function () {}); }
    } catch (_) {}
  }
  /* ---------- pré-carregamento (depois que a página carregou) ----------
     Os players do Vimeo nascem escondidos dentro do modal assim que a página termina de carregar.
     Quem toca no rosto já encontra o vídeo pronto. Nada disso roda antes do load da página. */
  var warm = {};
  var slot = document.createElement('div');
  slot.className = 'depo-modal-slot';
  videoEl.appendChild(slot);
  function criarIframe(d, v, autoplay) {
    var src = 'https://player.vimeo.com/video/' + v.id + '?' + (v.hash ? 'h=' + v.hash + '&' : '') +
      'autoplay=' + (autoplay ? 1 : 0) + '&autopause=0&playsinline=1&badge=0&byline=0&title=0&dnt=1';
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('playsinline', '');
    iframe.setAttribute('loading', 'eager');
    iframe.title = 'Depoimento de ' + d.name;
    return iframe;
  }
  function preaquecer() {
    DEPOIMENTOS.forEach(function (d) {
      var v = parseVimeo(d.vimeoUrl);
      if (!v || warm[d.id]) return;
      var iframe = criarIframe(d, v, false);
      iframe.hidden = true;
      iframe.setAttribute('tabindex', '-1');
      videoEl.insertBefore(iframe, slot);
      var pl = null;
      try { if (window.Vimeo && window.Vimeo.Player) pl = new window.Vimeo.Player(iframe); } catch (_) {}
      warm[d.id] = { iframe: iframe, player: pl };
      if (typeof d.vertical !== 'boolean') descobrirVertical(d, v);
    });
    if (DEPOIMENTOS.some(function (d) { return d.printUrl; })) {
      DEPOIMENTOS.forEach(function (d) { if (d.printUrl) { var im = new Image(); im.src = d.printUrl; } });
    }
  }
  function agendarPreaquecimento() {
    var go = function () { setTimeout(preaquecer, 1200); };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }
  agendarPreaquecimento();

  function open(d, fromEl) {
    if (overlay.classList.contains('is-on')) return;
    opener = fromEl || null;
    headEl.innerHTML = avatarHtml(d, 48, true) +
      '<div><div class="depo-modal-name" id="depo-modal-title">' + d.name + '</div>' +
      (d.username ? '<div class="depo-modal-user">@' + d.username + '</div>' : (d.role ? '<div class="depo-modal-user">' + d.role + '</div>' : '')) + '</div>';
    var v = parseVimeo(d.vimeoUrl);
    slot.innerHTML = '';
    if (v) {
      var w = warm[d.id];
      if (w) {
        w.iframe.hidden = false;
        w.iframe.removeAttribute('tabindex');
        player = w.player;
        if (player && player.play) { try { player.play().catch(function () {}); } catch (_) {} }
      } else {
        var iframe = criarIframe(d, v, true);
        slot.appendChild(iframe);
        try { if (window.Vimeo && window.Vimeo.Player) player = new window.Vimeo.Player(iframe); } catch (_) { player = null; }
      }
      pauseMainVideo();
      descobrirVertical(d, v).then(function (vert) { videoEl.classList.toggle('is-vertical', !!vert); });
    } else if (d.printUrl) {
      videoEl.classList.add('is-print');
      slot.innerHTML = '<img src="' + d.printUrl + '" alt="Depoimento de ' + d.name + '" draggable="false" decoding="async">';
    } else {
      slot.innerHTML = '<div class="depo-modal-soon">Depoimento em vídeo em breve</div>';
    }
    scrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = (-scrollY) + 'px';
    document.body.classList.add('depo-lock');
    overlay.classList.remove('is-closing');
    overlay.classList.add('is-on');
    paused.modal = true;
    document.addEventListener('keydown', onKey);
    setTimeout(function () { closeBtn.focus(); }, 30);
  }
  function close() {
    if (!overlay.classList.contains('is-on') || closing) return;
    closing = true;
    if (player && player.pause) {
      try { player.pause().catch(function () {}); } catch (_) {}
      try { player.setCurrentTime(0).catch(function () {}); } catch (_) {}
    }
    player = null;
    overlay.classList.add('is-closing');
    setTimeout(function () {
      overlay.classList.remove('is-on', 'is-closing');
      slot.innerHTML = '';
      Object.keys(warm).forEach(function (k) { warm[k].iframe.hidden = true; warm[k].iframe.setAttribute('tabindex', '-1'); });
      videoEl.classList.remove('is-print', 'is-vertical');
      document.body.classList.remove('depo-lock');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
      document.removeEventListener('keydown', onKey);
      paused.modal = false; last = 0;
      closing = false;
      if (opener && opener.focus) opener.focus({ preventScroll: true });
      opener = null;
    }, 180);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      var f = [closeBtn].concat(Array.prototype.slice.call(videoEl.querySelectorAll('iframe:not([hidden])')));
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  }
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  /* click continua valendo pra teclado (Enter/Espaço) e pra navegador sem Pointer Events */
  track.addEventListener('click', function (e) {
    if (Date.now() < suppressClickUntil) return;
    var card = e.target.closest('.autoridade-card');
    if (!card) return;
    abrirCard(card);
  });
})();

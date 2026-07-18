/* LexusLight — script.js */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- language: English by default, Russian only on Russian
     devices (or a manual override from the footer button) ---------- */
  // scope is deliberately small: stat labels (Вид/Хп/Шиза/Азарт/Успех) and
  // the About quote+lore text, sourced from data-lang-ru.js / data-lang-en.js
  // (loaded before this file). Everything else — links, talk/act/flirt,
  // incidents/page views, and especially the chat line pools in
  // data-talk.js/data-spell.js/data-flirt.js — stays Russian-only
  // regardless of device language; that slang doesn't translate well, so
  // it's left alone on purpose rather than guessed at.
  // the HTML's own hardcoded text is already Russian, so this only has to
  // actively do something for non-Russian devices; Russian devices just
  // keep what's already on the page (re-applying LANG_RU is harmless, but
  // skipping it if missing doesn't break anything either).
  const LANG_STORAGE_KEY = 'll_lang_override';

  function detectLangCode() {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'ru' || saved === 'en') return saved;
    } catch (err) {
      // storage unavailable — just fall through to device detection
    }
    const deviceLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    return deviceLang.startsWith('ru') ? 'ru' : 'en';
  }

  function applyLanguage(code) {
    // NOT window.LANG_RU / window.LANG_EN: data-lang-ru.js/data-lang-en.js
    // declare these with `const`, and a top-level const/let in a plain
    // <script> doesn't attach to the window object (only `var` and implicit
    // globals do) — it's still reachable as a bare identifier from any
    // other classic <script> on the page, just not through `window.`. This
    // was the actual bug: the window.-prefixed lookup was always
    // undefined, so this function silently no-op'd on load and on every
    // click of the footer button.
    const lang = code === 'ru'
      ? (typeof LANG_RU !== 'undefined' ? LANG_RU : null)
      : (typeof LANG_EN !== 'undefined' ? LANG_EN : null);
    if (!lang) return;

    if (lang.stats) {
      document.querySelectorAll('[data-i18n-stat]').forEach(el => {
        const key = el.dataset.i18nStat;
        if (lang.stats[key]) el.textContent = lang.stats[key];
      });
    }

    if (lang.about) {
      const quoteEl = document.querySelector('.about-quote');
      if (quoteEl && lang.about.quote) quoteEl.textContent = lang.about.quote;

      if (lang.about.paragraphs) {
        const loreParas = document.querySelectorAll('.about-text p:not(.about-quote)');
        loreParas.forEach((p, i) => {
          if (lang.about.paragraphs[i]) p.textContent = lang.about.paragraphs[i];
        });
      }
    }

    const toggleBtn = document.getElementById('lang-toggle');
    // the button always shows the OTHER language — it's a switch-to button,
    // not a status readout of the current one.
    if (toggleBtn) toggleBtn.textContent = code === 'ru' ? 'EN' : 'RU';
  }

  let currentLangCode = detectLangCode();
  applyLanguage(currentLangCode);

  // footer button: for testing, or for a real visitor whose device language
  // doesn't match what they'd actually prefer to read — no other way to
  // flip it short of changing OS/browser language. Choice is remembered via
  // localStorage so it survives a reload/future visits.
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    currentLangCode = currentLangCode === 'ru' ? 'en' : 'ru';
    try {
      localStorage.setItem(LANG_STORAGE_KEY, currentLangCode);
    } catch (err) {
      // storage unavailable — the switch still works for this page view,
      // it just won't be remembered next visit
    }
    applyLanguage(currentLangCode);
  });

  /* ---------- avatar: parallax SVG (serval) ----------
     each <g class="depth" data-depth="..."> layer drifts a different amount
     under the cursor — bigger depth = moves more, giving a fake-3D parallax.
     tuning knobs: MAX_PX (how far layers can travel) and SMOOTH (how
     quickly they catch up — lower = laggier/dreamier, higher = snappier). */
  const avatarSvg = document.getElementById('avatar-svg');
  if (avatarSvg) {
    const avatarLayers = Array.from(avatarSvg.querySelectorAll('.depth')).map(el => ({
      el, depth: parseFloat(el.dataset.depth), cur: { x: 0, y: 0 }, lastX: null, lastY: null
    }));
    const AVATAR_MAX_PX = 24;
    const AVATAR_SMOOTH = 0.14;
    const avatarTarget = { x: 0, y: 0 };
    const lastMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // just record the raw cursor position here — cheap. The actual
    // getBoundingClientRect() read (which can force a layout reflow) and the
    // lerp/transform work happen at most once per animation frame in
    // tickAvatar below, not once per mousemove event (mousemove can fire far
    // more often than 60fps during a fast swipe, which was doing a layout
    // read + style write for every single one of those — a big chunk of the
    // jank, especially right after load before anything has settled).
    // touch devices have no cursor, so mousemove simply never fires there —
    // the parallax used to just sit dead-center on phones/tablets forever.
    // lastTouchTime marks any real pointer activity (mouse OR touch); once
    // it's been idle a bit, tickAvatar below drives the parallax with a
    // slow autonomous drift instead, so there's always some life to it
    // regardless of input method.
    let lastInputTime = 0;
    window.addEventListener('mousemove', (e) => {
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
      lastInputTime = performance.now();
    });
    function trackTouch(e) {
      if (!e.touches || !e.touches.length) return;
      lastMouse.x = e.touches[0].clientX;
      lastMouse.y = e.touches[0].clientY;
      lastInputTime = performance.now();
    }
    window.addEventListener('touchstart', trackTouch, { passive: true });
    window.addEventListener('touchmove', trackTouch, { passive: true });

    // skip re-writing style.transform when a layer hasn't meaningfully moved
    // since last frame — once the parallax settles near the target, this
    // stops forcing pointless style recalcs (and, since the outline <use>
    // mirrors this live content, stops forcing the outline filter to
    // re-rasterize) while the cursor sits still.
    const AVATAR_EPSILON = 0.01;
    const AVATAR_IDLE_MS = 1400; // how long without input before auto-drift kicks in

    function tickAvatar() {
      const idleFor = performance.now() - lastInputTime;
      if (lastInputTime && idleFor < AVATAR_IDLE_MS) {
        const rect = avatarSvg.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = (lastMouse.x - cx) / (window.innerWidth / 2);
        const ny = (lastMouse.y - cy) / (window.innerHeight / 2);
        avatarTarget.x = Math.max(-1, Math.min(1, nx));
        avatarTarget.y = Math.max(-1, Math.min(1, ny));
      } else {
        // idle (or touch never happened at all, e.g. first load on mobile) —
        // gentle figure-8-ish autonomous sway instead of sitting frozen.
        const t = performance.now();
        avatarTarget.x = Math.sin(t * 0.00035) * 0.55;
        avatarTarget.y = Math.sin(t * 0.0005 + 1.3) * 0.35;
      }

      avatarLayers.forEach(layer => {
        layer.cur.x += (avatarTarget.x - layer.cur.x) * AVATAR_SMOOTH;
        layer.cur.y += (avatarTarget.y - layer.cur.y) * AVATAR_SMOOTH;
        const mx = layer.cur.x * AVATAR_MAX_PX * layer.depth;
        const my = layer.cur.y * AVATAR_MAX_PX * layer.depth;
        if (layer.lastX === null || Math.abs(mx - layer.lastX) > AVATAR_EPSILON || Math.abs(my - layer.lastY) > AVATAR_EPSILON) {
          layer.el.style.transform = `translate(${mx.toFixed(2)}px, ${my.toFixed(2)}px)`;
          layer.lastX = mx;
          layer.lastY = my;
        }
      });
      requestAnimationFrame(tickAvatar);
    }
    requestAnimationFrame(tickAvatar);
  }

  /* ---------- characters: cards parsed live from Characters/<folder>/description.md ----------
     roster order/visuals come from data-characters.js (CHARACTERS); name/role/bio text
     is fetched + parsed fresh on every page load, so editing a description.md and
     reloading is all it takes — nothing to run, nothing to rebuild.
     NOTE: this requires the page to be served over http(s), not opened as a bare
     file:// (double-clicked). Browsers block fetch() of local files from file:// for
     security, full stop — there's no way around that from the page's own code. Use
     start-local-site.command (double-click it) to serve the folder over localhost,
     or just push to GitHub Pages, which is already http(s). */
  function parseCharacterMd(text) {
    const nameMatch = text.match(/^#\s+(.+)$/m);
    const roleMatch = text.match(/\*\*Role:\*\*\s*(.+)/);
    const sourceMatch = text.match(/\*\*Source:\*\*\s*(.+)/);
    const paragraphs = text.trim().split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const blurb = paragraphs.length ? paragraphs[paragraphs.length - 1] : '';
    return {
      name: nameMatch ? nameMatch[1].trim() : '',
      role: roleMatch ? roleMatch[1].trim() : '',
      source: sourceMatch ? sourceMatch[1].trim() : '',
      blurb
    };
  }

  async function loadCharacters() {
    const grid = document.getElementById('char-grid');
    if (!grid || typeof CHARACTERS === 'undefined') return;

    if (location.protocol === 'file:') {
      grid.innerHTML = '<p class="char-grid-warning">Character cards need a local server to load (double-click start-local-site.command), or view this on the live GitHub Pages site.</p>';
      return;
    }

    for (const c of CHARACTERS) {
      try {
        const res = await fetch(`Characters/${c.folder}/description.md`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${res.status} for ${c.folder}`);
        const { name, role, source, blurb } = parseCharacterMd(await res.text());

        const article = document.createElement('article');
        article.className = 'char-card';

        const pic = document.createElement('div');
        pic.className = `char-picture ${c.picClass}`;
        if (c.image) {
          const img = document.createElement('img');
          img.src = c.image;
          img.alt = name;
          pic.appendChild(img);
        } else {
          pic.appendChild(document.createTextNode(c.initials || ''));
        }
        if (source) {
          const tag = document.createElement('span');
          tag.className = 'char-game-tag';
          tag.textContent = source;
          pic.appendChild(tag);
        }

        const h3 = document.createElement('h3');
        h3.className = 'char-name';
        h3.textContent = name;

        const pRole = document.createElement('p');
        pRole.className = 'char-role';
        pRole.textContent = role;

        const pBlurb = document.createElement('p');
        pBlurb.className = 'char-blurb';
        pBlurb.textContent = blurb;

        article.append(pic, h3, pRole, pBlurb);
        grid.appendChild(article);
      } catch (err) {
        // one bad/missing file shouldn't take down the rest of the roster
        console.warn(`character card failed to load: ${c.folder}`, err);
      }
    }
  }

  loadCharacters();

  /* ---------- battle menu: talk / act / flirt — a dice roll on press ---------- */

  // avatar speech bubble — one gremlin, one mouth, no modals
  const avatarBubble = document.getElementById('avatar-bubble');
  const avatarBubbleKicker = document.getElementById('avatar-bubble-kicker');
  const avatarBubbleText = document.getElementById('avatar-bubble-text');
  const avatarBubbleClose = document.getElementById('avatar-bubble-close');

  function showBubble(pool, kickerText) {
    avatarBubbleText.textContent = pool[Math.floor(Math.random() * pool.length)];
    avatarBubbleKicker.textContent = kickerText;
    avatarBubble.classList.add('is-open');
  }
  avatarBubbleClose?.addEventListener('click', () => avatarBubble.classList.remove('is-open'));

  // line pools live in data-flirt.js / data-spell.js / data-talk.js,
  // loaded as globals before this file — one file per action to edit freely.
  // "encounters" is local per-browser (how many times THIS visitor pressed
  // talk/act/flirt) — separate from the global counters further down.
  // localStorage access is wrapped in try/catch: if it throws (private mode,
  // storage disabled, some file:// setups), the counter just won't persist
  // across reloads — it must NOT take down the rest of the page's JS with it.
  const encounterOut = document.getElementById('w-counter-out');
  let encounterCount = 0;
  try {
    encounterCount = Number(localStorage.getItem('ll_click_count') || 0);
  } catch (err) {
    console.warn('localStorage unavailable, encounters will not persist', err);
  }
  if (encounterOut) encounterOut.textContent = encounterCount;

  function setupBattleButton(btnId, iconId, pool, kickerText) {
    const btn = document.getElementById(btnId);
    const icon = document.getElementById(iconId);
    btn?.addEventListener('click', () => {
      icon.classList.remove('is-spinning');
      void icon.offsetWidth; // restart animation — the "dice roll"
      icon.classList.add('is-spinning');

      showBubble(pool, kickerText);

      encounterCount += 1;
      if (encounterOut) encounterOut.textContent = encounterCount;
      try {
        localStorage.setItem('ll_click_count', encounterCount);
      } catch (err) {
        // storage unavailable — the on-screen count above still updates fine
      }
    });
  }

  setupBattleButton('w-talk', 'w-talk-icon', TALK_LINES, 'talk');
  setupBattleButton('w-act', 'w-act-icon', SPELL_LINES, 'act');
  setupBattleButton('w-flirt', 'w-flirt-icon', FLIRT_LINES, 'flirt');

  // global counters — shared across every visitor, via a free no-auth
  // counting API (countapi.mileshilliard.com). no backend of our own.
  //
  // resilience: every remote call is try/catch'd. on failure we fall back
  // to displaying the last-known value cached in localStorage — that cache
  // is READ-ONLY fallback display, never a source of truth. we only ever
  // write it right after a successful remote read, and we NEVER push it
  // (or any locally-guessed number) back up to the shared API — there is
  // no "set" call anywhere in this file, on purpose.
  const CACHE_PREFIX = 'll_counter_cache_';

  function wireGlobalCounter(key, elId) {
    const el = document.getElementById(elId);
    function render(n) {
      if (el) el.textContent = Number(n) || 0;
    }
    function readCache() {
      try {
        return Number(localStorage.getItem(CACHE_PREFIX + key) || 0);
      } catch (err) {
        return 0;
      }
    }
    function writeCache(n) {
      try {
        localStorage.setItem(CACHE_PREFIX + key, Number(n) || 0);
      } catch (e) {
        // storage unavailable (private mode, quota, etc.) — fine, just skip caching
      }
    }
    return { key, render, readCache, writeCache };
  }

  async function fetchCounter(counter, endpoint) {
    try {
      const res = await fetch(`https://countapi.mileshilliard.com/api/v1/${endpoint}/${counter.key}`);
      const data = await res.json();
      const value = Number(data.value) || 0;
      counter.render(value);
      counter.writeCache(value);
    } catch (err) {
      // service unreachable/down — show the last value we actually saw,
      // never a fabricated or locally-incremented one
      console.warn(`global counter "${counter.key}" (${endpoint}) failed, falling back to cache`, err);
      counter.render(counter.readCache());
    }
  }

  // flirts: bumped only when the flirt button is pressed
  const flirtCounter = wireGlobalCounter('lexuslight_flirt_clicks_v1', 'w-flirt-count');
  fetchCounter(flirtCounter, 'get');
  document.getElementById('w-flirt')?.addEventListener('click', () => {
    fetchCounter(flirtCounter, 'hit');
  });

  // page views: bumped once per page load, for every visitor
  const pageviewCounter = wireGlobalCounter('lexuslight_pageviews_v1', 'w-pageviews-out');
  fetchCounter(pageviewCounter, 'hit');

  /* ---------- background: pixel starfield + rising potion-swirl particles ---------- */
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];
    let spirals = [];
    // full rainbow spread — 12 hues evenly around the color wheel
    const colors = Array.from({ length: 12 }, (_, i) => `hsl(${i * 30}, 85%, 62%)`);

    // real pixel-art spiral sample, recolored per particle — tint each color
    // onto its own offscreen canvas once the source image is loaded, then
    // stamp + rotate that sprite for every rising particle.
    const spiralImg = new Image();
    const spiralSprites = {};
    let spritesReady = false;
    spiralImg.src = 'Particle.png';
    spiralImg.onload = () => {
      const size = 20;
      colors.forEach(color => {
        const off = document.createElement('canvas');
        off.width = size;
        off.height = size;
        const octx = off.getContext('2d');
        octx.imageSmoothingEnabled = false;
        octx.drawImage(spiralImg, 0, 0, size, size);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = color;
        octx.fillRect(0, 0, size, size);
        spiralSprites[color] = off;
      });
      spritesReady = true;
    };

    function makeSpiralParticle(baseX, spawnLow) {
      return {
        baseX,
        y: spawnLow ? canvas.height + Math.random() * canvas.height : canvas.height - Math.random() * canvas.height,
        // gentle side-to-side sway as it rises, like a feather or a leaf
        // drifting on a slow breeze — replaces the old fixed circular orbit,
        // which read more like a mechanical loop than something elegant.
        swayAmplitude: 18 + Math.random() * 28,
        swayFreq: 0.0009 + Math.random() * 0.0007,
        swayPhase: Math.random() * Math.PI * 2,
        // still an actual continuous spin around its own axis (kept from the
        // original version) — only the ORBIT/path became the gentler sway,
        // the spin stayed, and it's a bit brisker here so it unmistakably
        // reads as spinning rather than a barely-there drift.
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.04 + Math.random() * 0.05,
        // a faint breathing pulse in size, for a touch of life
        pulseFreq: 0.001 + Math.random() * 0.0008,
        pulsePhase: Math.random() * Math.PI * 2,
        speed: 0.55 + Math.random() * 0.75,
        scale: 0.8 + Math.random() * 0.6,
        c: colors[Math.floor(Math.random() * colors.length)],
        // updated every frame in draw() so the click handler can hit-test
        // against where the particle actually is right now
        curX: baseX,
        curY: 0,
        curSize: 20
      };
    }

    function resize() {
      // #bg-canvas is position:absolute now (was fixed — see the CSS
      // comment on body::before for why), covering the page's real full
      // scrollable height rather than just one viewport, so the pixel
      // buffer needs to match that full height or the canvas element would
      // get visibly stretched/blurred past whatever this buffer covers.
      // changing width/height wipes the 2D context state, so smoothing
      // has to be re-disabled every time this runs, not just once at setup.
      canvas.width = window.innerWidth;
      canvas.height = Math.max(
        window.innerHeight,
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      ctx.imageSmoothingEnabled = false;

      // stars — small twinkling pixels that also drift upward, slowly.
      // capped: on a big/ultrawide monitor this scaled past 2000+ stars,
      // each needing its own sin()/alpha/fillRect call every frame — a real
      // contributor to jank, not just the avatar's SVG filter.
      const starCount = Math.min(600, Math.floor((canvas.width * canvas.height) / 1800));
      stars = Array.from({ length: starCount }, () => ({
        x: Math.floor(Math.random() * canvas.width),
        y: Math.floor(Math.random() * canvas.height),
        size: Math.random() < 0.2 ? 3 : 2,
        c: colors[Math.floor(Math.random() * colors.length)],
        tw: Math.random() * Math.PI * 2,
        speed: 0.1 + Math.random() * 0.2
      }));

      // spiral streams — minecraft-potion-style pixel swirls rising bottom -> top
      const streamCount = Math.max(3, Math.floor(canvas.width / 380));
      spirals = [];
      for (let i = 0; i < streamCount; i++) {
        const baseX = (canvas.width / streamCount) * (i + 0.5) + (Math.random() * 60 - 30);
        for (let j = 0; j < 4; j++) {
          spirals.push(makeSpiralParticle(baseX, false));
        }
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // twinkling starfield, drifting upward and wrapping at the bottom
      stars.forEach(s => {
        s.y -= s.speed;
        if (s.y < -s.size) {
          s.y = canvas.height + s.size;
          s.x = Math.floor(Math.random() * canvas.width);
        }
        const alpha = 0.4 + Math.max(0, Math.sin(t / 1600 + s.tw)) * 0.45;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x, Math.round(s.y), s.size, s.size);
      });

      // rising pixel spirals, drifting up like a feather on a slow breeze —
      // a gentle sideways sway (instead of the old fixed circular orbit) with
      // a real continuous spin still going, plus a faint size pulse.
      if (spritesReady) {
        spirals.forEach(p => {
          p.y -= p.speed;
          if (p.y < -20) Object.assign(p, makeSpiralParticle(p.baseX, true), { y: canvas.height + 20 });

          p.rotation += p.rotationSpeed;
          const cx = p.baseX + Math.sin(t * p.swayFreq + p.swayPhase) * p.swayAmplitude;
          const cy = p.y;
          const pulse = 1 + Math.sin(t * p.pulseFreq + p.pulsePhase) * 0.1;

          // smoothstep-eased edge fade — softer than a straight linear ramp
          const edgeRaw = Math.max(0, Math.min(1, (canvas.height - p.y) / 90, p.y / 90));
          const edgeFade = edgeRaw * edgeRaw * (3 - 2 * edgeRaw);

          const drawSize = 31.5 * p.scale * pulse;
          p.curX = cx;
          p.curY = cy;
          p.curSize = drawSize;
          ctx.globalAlpha = edgeFade * 0.7;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(p.rotation);
          ctx.drawImage(spiralSprites[p.c], -drawSize / 2, -drawSize / 2, drawSize, drawSize);
          ctx.restore();
        });
      }

      // click-triggered bursts — short-lived confetti that fly outward from
      // wherever a spiral got clicked, then fade out for good (not recycled).
      if (bursts.length) {
        bursts = bursts.filter(b => b.life > 0);
        bursts.forEach(b => {
          b.x += b.vx;
          b.y += b.vy;
          b.vx *= 0.95;
          b.vy *= 0.95;
          b.rotation += b.rotationSpeed;
          b.life -= b.decay;
          const drawSize = 22 * b.scale;
          ctx.globalAlpha = Math.max(0, b.life) * 0.85;
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rotation);
          ctx.drawImage(spiralSprites[b.c], -drawSize / 2, -drawSize / 2, drawSize, drawSize);
          ctx.restore();
        });
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }

    // clicking a spiral bursts it into a little firework of smaller spirals
    // and respawns it elsewhere (off-screen, so it doesn't just reappear on
    // the spot) — a small reward for poking the background.
    let bursts = [];
    function spawnBurst(x, y) {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 1.8 + Math.random() * 3;
        bursts.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          life: 1,
          decay: 0.018 + Math.random() * 0.015,
          scale: 0.4 + Math.random() * 0.5,
          c: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }

    // listen on window, not the canvas itself: #bg-canvas sits at z-index:-1
    // behind the page's normal-flow content, so it never actually receives
    // the click as its event target even though it's what's visibly under
    // the cursor. A window-level listener still fires on every click that
    // bubbles up regardless of which element was hit, and since the canvas
    // is a plain 1:1 CSS-pixel-sized fixed overlay (no devicePixelRatio
    // scaling, no offset), clientX/clientY map directly onto its drawing
    // coordinates with no getBoundingClientRect translation needed.
    window.addEventListener('click', (e) => {
      if (!spritesReady) return;
      const clickX = e.clientX;
      const clickY = e.clientY;
      for (const p of spirals) {
        const hitRadius = Math.max(18, p.curSize / 2 + 6);
        const dx = clickX - p.curX;
        const dy = clickY - p.curY;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          spawnBurst(p.curX, p.curY);
          Object.assign(p, makeSpiralParticle(p.baseX, true), { y: canvas.height + 20 });
          break; // one pop per click
        }
      }
    });

    resize();
    requestAnimationFrame(draw);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });
    // the page's real scrollable height can still grow after this script
    // runs — web fonts swapping in (font-display:swap) can reflow text
    // taller, images/fonts finishing can shift layout — so re-measure once
    // everything's actually finished loading, not just at DOMContentLoaded.
    window.addEventListener('load', resize);
  }
});

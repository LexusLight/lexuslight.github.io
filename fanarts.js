/* ---------- arts gallery: auto-pick up everything in fanarts/ ----------
   GitHub Pages is a static host and can't list a folder, so the page asks
   the GitHub API for the contents of fanarts/ in the repo and adds a card
   for every image that isn't already hard-coded in index.html. So: drop an
   image into fanarts/, push — it shows up. Any name works (spaces, Cyrillic),
   order is natural sort by file name (serval-2 before serval-10).
   The hard-coded cards in index.html stay as the fallback for when the API
   is unreachable / rate-limited (60 req/hour per visitor IP) or the page is
   opened locally — the API only sees what's already pushed. */
(() => {
  const grid = document.querySelector('.fanart-grid');
  if (!grid) return;
  const REPO = 'LexusLight/lexuslight.github.io';
  const DIR = 'fanarts';
  const IMG = /\.(jpe?g|png|webp|gif|avif)$/i;

  const fileName = (src) => {
    try { return decodeURIComponent(new URL(src, location.href).pathname.split('/').pop()); }
    catch (e) { return src; }
  };
  const have = new Set(Array.from(grid.querySelectorAll('img')).map(img => fileName(img.getAttribute('src'))));

  function addCard(name) {
    const url = DIR + '/' + encodeURIComponent(name);
    const a = document.createElement('a');
    a.className = 'fanart-card';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Lexus fanart ' + (grid.children.length + 1);
    img.loading = 'lazy';
    img.decoding = 'async';
    a.appendChild(img);
    grid.appendChild(a);
    have.add(name);
  }

  if (location.protocol === 'file:') return;
  fetch(`https://api.github.com/repos/${REPO}/contents/${DIR}`, { headers: { Accept: 'application/vnd.github+json' } })
    .then(r => (r.ok ? r.json() : []))
    .then(list => {
      if (!Array.isArray(list)) return;
      list
        .filter(f => f.type === 'file' && IMG.test(f.name) && !have.has(f.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .forEach(f => addCard(f.name));
    })
    .catch(() => { /* offline / rate-limited: hard-coded cards are enough */ });
})();

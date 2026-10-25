// Shared site behaviour: theme selection and current-page marking.
// Kept separate from app.js so the landing page needs no calculator code.

const THEMES = ['dark', 'light', 'glass'];

function applyTheme(name) {
  const t = THEMES.includes(name) ? name : 'dark';
  // dark is the default and lives in :root, so it needs no class
  for (const x of THEMES) document.body.classList.toggle(x, x === t && t !== 'dark');
  for (const sel of document.querySelectorAll('.theme-pick')) sel.value = t;
  try { localStorage.setItem('mc_theme', t); } catch (e) { /* private mode */ }
}

applyTheme(localStorage.getItem('mc_theme') || 'dark');

for (const sel of document.querySelectorAll('.theme-pick')) {
  sel.addEventListener('change', e => applyTheme(e.target.value));
}

// Mark the link for the page we are on, for styling and for screen readers.
const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
for (const a of document.querySelectorAll('.site-nav a')) {
  const href = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
  if (href && href === here) a.setAttribute('aria-current', 'page');
}

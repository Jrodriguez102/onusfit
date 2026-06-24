/* ============================================================
   ONUS FITNESS — main.js
   ============================================================ */


// ── HEADER: scroll state ──────────────────────────────────
const header = document.getElementById('site-header');

function updateHeader() {
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader(); // run once on load


// ── HEADER: mobile menu toggle ────────────────────────────
const hamburger = document.getElementById('hamburger');
const drawer    = document.getElementById('mobile-drawer');

hamburger.addEventListener('click', () => {
  const isOpen = hamburger.classList.toggle('open');
  drawer.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
  drawer.setAttribute('aria-hidden', !isOpen);
});

// Close drawer when a nav link is clicked
drawer.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    drawer.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
  });
});


// ============================================================
// ADD NEW SECTION SCRIPTS BELOW THIS LINE
// ============================================================
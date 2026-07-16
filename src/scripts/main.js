/* ============================================================
   ONUS FITNESS — main.js
   ============================================================ */

// Prevent the browser from auto-restoring a previous scroll position
// on reload — this was causing the header to render in its "scrolled"
// (frosted/light) state even when the page visually loads at the top.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// ── HEADER: scroll state ──────────────────────────────────
const header = document.getElementById('site-header');
let headerTicking = false;

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 20);
  headerTicking = false;
}

function onHeaderScroll() {
  if (!headerTicking) {
    window.requestAnimationFrame(updateHeader);
    headerTicking = true;
  }
}

window.addEventListener('scroll', onHeaderScroll, { passive: true });
window.addEventListener('load', updateHeader);
updateHeader(); // run once immediately in case we're already at top


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


// ── ABOUT: scroll-reveal for statement / rule / mission line ──
// Each [data-reveal] element fades/rises in once the About section
// enters the viewport. Individual stagger timing lives in CSS
// (transition-delay per element) — this just toggles the class.
const revealTargets = document.querySelectorAll('[data-reveal]');

if (revealTargets.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  revealTargets.forEach(el => revealObserver.observe(el));
}


// ============================================================
// ADD NEW SECTION SCRIPTS BELOW THIS LINE
// ============================================================
/* ============================================================
   ONUS FITNESS — portal.js
   Shared across login.html, signup.html, dashboard.html.
   Requires the Supabase JS CDN script to be loaded first (see
   each page's <script> tags).
   ============================================================ */

// ── CONFIG — fill these in from Supabase Dashboard → Project Settings → API ──
const SUPABASE_URL = 'https://hxcdhqiycgymqodnoxwf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4Y2RocWl5Y2d5bXFvZG5veHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NzIwOTIsImV4cCI6MjEwMDM0ODA5Mn0.zgv8_l_ebDZjgxZbnniCwoOXmtsg6NlHSd-_5tkU_rQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ── Helpers shared by every portal page ──────────────────────

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `form-message visible ${type}`;
}

function hideMessage(el) {
  el.className = 'form-message';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function parseNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// Redirect signed-out visitors away from the dashboard.
async function requireSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// Redirect already-signed-in visitors away from login/signup.
async function redirectIfSignedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = 'dashboard.html';
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}


// ── SIGNUP ────────────────────────────────────────────────────
function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  const messageEl = document.getElementById('form-message');
  const submitBtn = document.getElementById('signup-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage(messageEl);

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
      showMessage(messageEl, 'Passwords don\u2019t match.', 'error');
      return;
    }
    if (password.length < 8) {
      showMessage(messageEl, 'Password needs at least 8 characters.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    const { error } = await supabaseClient.auth.signUp({ email, password });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';

    if (error) {
      showMessage(messageEl, error.message, 'error');
      return;
    }

    showMessage(messageEl, 'Account created. Check your email to confirm, then log in.', 'success');
    form.reset();
  });
}


// ── LOGIN ─────────────────────────────────────────────────────
function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const messageEl = document.getElementById('form-message');
  const submitBtn = document.getElementById('login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage(messageEl);

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging In...';

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Log In';

    if (error) {
      showMessage(messageEl, error.message, 'error');
      return;
    }

    window.location.href = 'dashboard.html';
  });
}


// ── DASHBOARD ─────────────────────────────────────────────────

function greetingName(profile, user) {
  if (profile && profile.first_name) return profile.first_name;
  if (profile && profile.full_name) return profile.full_name.split(' ')[0];
  return user.email;
}

// Read-only summary of the signup-flow answers — not editable here.
// Values come from start.html's onboarding flow, so any free text
// (sub_goal_other) is escaped before going into innerHTML.
function renderSignupSummary(profile) {
  const el = document.getElementById('signup-summary-content');
  const hasAnswers = profile && (profile.main_goal || profile.equipment_tier || profile.training_days);

  if (!hasAnswers) {
    el.innerHTML = `<p class="order-empty">No signup answers on file yet.</p>`;
    return;
  }

  const subGoalsList = (profile.sub_goals || []).map(escapeHtml).join(', ');
  const subGoals = subGoalsList + (profile.sub_goal_other ? ` (${escapeHtml(profile.sub_goal_other)})` : '');

  el.innerHTML = `
    <div class="summary-card">
      <div class="summary-row"><span class="summary-label">Main Goal</span><span class="summary-value">${escapeHtml(profile.main_goal) || '—'}</span></div>
      <div class="summary-row"><span class="summary-label">Supporting Goals</span><span class="summary-value">${subGoals || '—'}</span></div>
      <div class="summary-row"><span class="summary-label">Equipment</span><span class="summary-value">${escapeHtml(profile.equipment_tier) || '—'}</span></div>
      <div class="summary-row"><span class="summary-label">Training Days</span><span class="summary-value">${escapeHtml(profile.training_days) || '—'}</span></div>
    </div>
  `;
}

// VIP-only editable stats form. Gated on the customer's most recent
// order tier — UI-level only; the DB doesn't yet enforce that a
// non-VIP account can't write these columns via a direct API call.
function renderVipStats(order, profile, user) {
  const container = document.getElementById('vip-stats-section');

  if (!order || order.tier !== 'VIP') {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <section class="dashboard-section">
      <p class="dashboard-section-title">Your Stats</p>
      <div class="profile-card">
        <form id="vip-stats-form">
          <div id="vip-stats-message" class="form-message" role="alert"></div>
          <div class="profile-grid">
            <div class="form-field">
              <label for="vip-bodyweight">Bodyweight</label>
              <input type="number" step="0.1" id="vip-bodyweight" name="current_bodyweight" />
            </div>
            <div class="form-field">
              <label for="vip-squat-max">Squat Max</label>
              <input type="number" step="0.1" id="vip-squat-max" name="current_squat_max" />
            </div>
            <div class="form-field">
              <label for="vip-bench-max">Bench Max</label>
              <input type="number" step="0.1" id="vip-bench-max" name="current_bench_max" />
            </div>
            <div class="form-field">
              <label for="vip-deadlift-max">Deadlift Max</label>
              <input type="number" step="0.1" id="vip-deadlift-max" name="current_deadlift_max" />
            </div>
          </div>
          <button type="submit" class="profile-save">Save Changes</button>
        </form>
      </div>
    </section>
  `;

  document.getElementById('vip-bodyweight').value = (profile && profile.current_bodyweight) ?? '';
  document.getElementById('vip-squat-max').value = (profile && profile.current_squat_max) ?? '';
  document.getElementById('vip-bench-max').value = (profile && profile.current_bench_max) ?? '';
  document.getElementById('vip-deadlift-max').value = (profile && profile.current_deadlift_max) ?? '';

  const vipForm = document.getElementById('vip-stats-form');
  const vipMessage = document.getElementById('vip-stats-message');

  vipForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage(vipMessage);

    const updates = {
      current_bodyweight: parseNumberOrNull(document.getElementById('vip-bodyweight').value),
      current_squat_max: parseNumberOrNull(document.getElementById('vip-squat-max').value),
      current_bench_max: parseNumberOrNull(document.getElementById('vip-bench-max').value),
      current_deadlift_max: parseNumberOrNull(document.getElementById('vip-deadlift-max').value),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      showMessage(vipMessage, error.message, 'error');
    } else {
      showMessage(vipMessage, 'Stats updated.', 'success');
    }
  });
}

async function initDashboard() {
  const root = document.getElementById('dashboard-root');
  if (!root) return;

  const session = await requireSession();
  if (!session) return;

  const user = session.user;

  // Load profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  document.getElementById('greeting-name').textContent = greetingName(profile, user);

  // Populate profile form
  document.getElementById('profile-full-name').value = (profile && profile.full_name) || '';
  document.getElementById('profile-phone').value = (profile && profile.phone) || '';

  renderSignupSummary(profile);

  // Load most recent order + its program (if any)
  const { data: orders } = await supabaseClient
    .from('orders')
    .select('*, programs(*)')
    .eq('user_id', user.id)
    .order('purchased_at', { ascending: false })
    .limit(1);

  const orderSection = document.getElementById('order-section-content');
  const order = orders && orders[0];

  renderVipStats(order, profile, user);

  if (!order) {
    orderSection.innerHTML = `<p class="order-empty">No order found on this account yet. If you just purchased, this can take a few minutes to appear.</p>`;
  } else {
    const isReady = order.status === 'fulfilled' && order.programs && order.programs.length > 0;
    const statusLabel = isReady ? 'Your program is ready' : 'Your program is being prepared';

    let downloadHtml = '';
    if (isReady) {
      const pdfPath = order.programs[0].pdf_url;
      const { data: signedUrlData } = await supabaseClient
        .storage
        .from('programs')
        .createSignedUrl(pdfPath, 60 * 60); // 1 hour link

      if (signedUrlData && signedUrlData.signedUrl) {
        downloadHtml = `<a href="${signedUrlData.signedUrl}" class="order-download" target="_blank" rel="noopener">Download Program</a>`;
      }
    }

    orderSection.innerHTML = `
      <div class="order-card">
        <div>
          <p class="order-tier">${order.tier}</p>
          <p class="order-status"><span class="status-dot ${isReady ? 'ready' : ''}"></span>${statusLabel}</p>
        </div>
        ${downloadHtml}
      </div>
    `;
  }

  // Profile save
  const profileForm = document.getElementById('profile-form');
  const profileMessage = document.getElementById('profile-message');

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage(profileMessage);

    const updates = {
      full_name: document.getElementById('profile-full-name').value.trim(),
      phone: document.getElementById('profile-phone').value.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      showMessage(profileMessage, error.message, 'error');
    } else {
      showMessage(profileMessage, 'Profile updated.', 'success');
      document.getElementById('greeting-name').textContent = greetingName(
        { ...profile, full_name: updates.full_name },
        user
      );
    }
  });

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}


// ── Run the relevant initializer for whichever page loaded this file ──
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-form') || document.getElementById('signup-form')) {
    redirectIfSignedIn();
  }
  initSignupForm();
  initLoginForm();
  initDashboard();
});

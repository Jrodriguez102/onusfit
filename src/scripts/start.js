/* ============================================================
   ONUS FITNESS — start.js
   Get-started signup wizard (start.html) only.
   Mock account creation / mock payment — sessionStorage-backed
   state, no Supabase calls. Real backend wiring is a later pass.
   ============================================================ */

const MAX_SUBGOALS = 2;
const VALID_TIERS = ['Base', 'Advanced', 'VIP'];

const state = JSON.parse(sessionStorage.getItem('onusWizardState') || '{}');
state.subGoals = state.subGoals || [];
state.subGoalOther = state.subGoalOther || '';

function save() { sessionStorage.setItem('onusWizardState', JSON.stringify(state)); }
function cssEscape(s) { return String(s).replace(/(["\\])/g, '\\$1'); }

const progressTrack = document.getElementById('progressTrack');
const stepCount = document.getElementById('stepCount');

function goToPanel(n) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-panel="${n}"]`).classList.add('active');

  if (n === 0) {
    progressTrack.classList.add('hidden');
    stepCount.textContent = 'Get Started';
  } else if (n >= 1 && n <= 4) {
    progressTrack.classList.remove('hidden');
    document.querySelectorAll('.progress-seg').forEach(s => {
      s.classList.toggle('filled', parseInt(s.dataset.seg) <= n);
    });
    stepCount.textContent = `Step ${n} of 4`;
  } else {
    progressTrack.classList.remove('hidden');
    document.querySelectorAll('.progress-seg').forEach(s => s.classList.add('filled'));
    if (n === 5) stepCount.textContent = 'Choose Your Plan';
    else if (n === 6) stepCount.textContent = 'Payment';
    else stepCount.textContent = 'Complete';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('beginBtn').addEventListener('click', () => goToPanel(1));

// ── Single-select cards ─────────────────────────────────
function wireSingleSelect(gridId, key, onChange) {
  const grid = document.getElementById(gridId);
  grid.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state[key] = card.dataset.value;
      save();
      if (onChange) onChange();
    });
  });
}

wireSingleSelect('mainGoalGrid', 'goal', checkPanel1);
wireSingleSelect('equipTierGrid', 'equipmentTier', checkPanel2);
wireSingleSelect('daysGrid', 'schedule', checkPanel2);
wireSingleSelect('genderGrid', 'gender', checkPanel3);

// ── Sub-goals — multi-select capped at 2 ────────────────
const subGoalGrid = document.getElementById('subGoalGrid');
const subGoalCounter = document.getElementById('subGoalCounter');
const otherGoalWrap = document.getElementById('otherGoalWrap');
const otherGoalText = document.getElementById('otherGoalText');

function toggleSubGoal(value) {
  if (state.subGoals.includes(value)) {
    state.subGoals = state.subGoals.filter(v => v !== value);
    if (value === 'Other') state.subGoalOther = '';
  } else {
    if (state.subGoals.length >= MAX_SUBGOALS) return;
    state.subGoals.push(value);
  }
  save();
  renderSubGoals();
  checkPanel1();
}

subGoalGrid.querySelectorAll('.option-card').forEach(card => {
  card.addEventListener('click', () => toggleSubGoal(card.dataset.value));
});

otherGoalText.addEventListener('input', () => {
  state.subGoalOther = otherGoalText.value;
  save();
  checkPanel1();
});

function renderSubGoals() {
  const atMax = state.subGoals.length >= MAX_SUBGOALS;
  subGoalGrid.querySelectorAll('.option-card').forEach(card => {
    const val = card.dataset.value;
    const isSelected = state.subGoals.includes(val);
    card.classList.toggle('selected', isSelected);
    card.classList.toggle('disabled', atMax && !isSelected);
  });
  subGoalCounter.textContent = `${state.subGoals.length} / ${MAX_SUBGOALS}`;
  const otherSelected = state.subGoals.includes('Other');
  otherGoalWrap.classList.toggle('visible', otherSelected);
  if (state.subGoalOther) otherGoalText.value = state.subGoalOther;
}

function checkPanel1() {
  const subGoalsOk = state.subGoals.length === MAX_SUBGOALS &&
    (!state.subGoals.includes('Other') || (state.subGoalOther && state.subGoalOther.trim().length > 0));
  const ok = !!state.goal && subGoalsOk;
  document.getElementById('toStep2').disabled = !ok;
}

function checkPanel2() {
  const ok = !!state.equipmentTier && !!state.schedule;
  document.getElementById('toStep3').disabled = !ok;
}

// ── Panel 3 — About You ─────────────────────────────────
const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const phone = document.getElementById('phone');

[firstName, lastName, phone].forEach(input => {
  input.addEventListener('input', () => {
    state[input.id] = input.value;
    save();
    checkPanel3();
  });
});

function checkPanel3() {
  const ok = firstName.value.trim() && lastName.value.trim() && phone.value.trim() && state.gender;
  document.getElementById('toStep4').disabled = !ok;
}

// ── Panel 4 — Account creation + consent ────────────────
const email = document.getElementById('email');
const password = document.getElementById('password');
const consentCheckbox = document.getElementById('consentCheckbox');

[email, password].forEach(input => {
  input.addEventListener('input', () => {
    state[input.id] = input.value;
    save();
    checkPanel4();
  });
});
consentCheckbox.addEventListener('change', () => {
  state.consent = consentCheckbox.checked;
  save();
  checkPanel4();
});

function checkPanel4() {
  const ok = email.value.trim().includes('@') && password.value.length >= 8 && consentCheckbox.checked;
  document.getElementById('createAccount').disabled = !ok;
}

// ── Restore state on load ───────────────────────────────
function restore() {
  if (state.goal) document.querySelector(`#mainGoalGrid [data-value="${cssEscape(state.goal)}"]`)?.classList.add('selected');
  if (state.equipmentTier) document.querySelector(`#equipTierGrid [data-value="${cssEscape(state.equipmentTier)}"]`)?.classList.add('selected');
  if (state.schedule) document.querySelector(`#daysGrid [data-value="${cssEscape(state.schedule)}"]`)?.classList.add('selected');
  if (state.gender) document.querySelector(`#genderGrid [data-value="${cssEscape(state.gender)}"]`)?.classList.add('selected');
  if (state.firstName) firstName.value = state.firstName;
  if (state.lastName) lastName.value = state.lastName;
  if (state.phone) phone.value = state.phone;
  if (state.email) email.value = state.email;
  if (state.password) password.value = state.password;
  if (state.consent) consentCheckbox.checked = true;
  if (state.tier) document.querySelector(`.pricing-card[data-value="${cssEscape(state.tier)}"]`)?.classList.add('selected');
  renderSubGoals();
  checkPanel1();
  checkPanel2();
  checkPanel3();
  checkPanel4();
}
restore();

// ── Pre-select tier from ?tier= query param ─────────────
// Lets the pricing-card "Start Here" links on the marketing page
// (start.html?tier=Base / Advanced / VIP) land here with that
// tier already selected on the Pricing panel — same as if the
// visitor had clicked the card themselves, so Continue is already
// enabled too. Missing/invalid param falls back to no selection.
function preselectTierFromQueryParam() {
  const tierParam = new URLSearchParams(window.location.search).get('tier');
  if (!VALID_TIERS.includes(tierParam)) return;

  document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.pricing-card[data-value="${cssEscape(tierParam)}"]`)?.classList.add('selected');
  state.tier = tierParam;
  save();
  document.getElementById('toPayment').disabled = false;
}
preselectTierFromQueryParam();

// ── Nav buttons ──────────────────────────────────────────
document.getElementById('toStep2').addEventListener('click', () => goToPanel(2));
document.getElementById('toStep3').addEventListener('click', () => goToPanel(3));
document.getElementById('toStep4').addEventListener('click', () => {
  renderSummary('summaryCard');
  goToPanel(4);
});
document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => goToPanel(parseInt(btn.dataset.back)));
});

function subGoalsDisplay() {
  const list = state.subGoals.map(v => v === 'Other' ? `Other (${state.subGoalOther})` : v);
  return list.join(', ') || '—';
}

function renderSummary(targetId) {
  const el = document.getElementById(targetId);
  el.innerHTML = `
    <div class="summary-row"><span class="summary-label">Main goal</span><span class="summary-value">${state.goal || '—'}</span></div>
    <div class="summary-row"><span class="summary-label">Supporting goals</span><span class="summary-value">${subGoalsDisplay()}</span></div>
    <div class="summary-row"><span class="summary-label">Equipment</span><span class="summary-value">${state.equipmentTier || '—'}</span></div>
    <div class="summary-row"><span class="summary-label">Training days</span><span class="summary-value">${state.schedule || '—'}</span></div>
    <div class="summary-row"><span class="summary-label">Name</span><span class="summary-value">${state.firstName || ''} ${state.lastName || ''}</span></div>
    <div class="summary-row"><span class="summary-label">Phone</span><span class="summary-value">${state.phone || '—'}</span></div>
    <div class="summary-row"><span class="summary-label">Gender</span><span class="summary-value">${state.gender || '—'}</span></div>
  `;
}

// ── Panel 4 — mock account creation — Panel 5 ───────────
document.getElementById('createAccount').addEventListener('click', () => {
  goToPanel(5);
});

// ── Panel 5 — pricing select ─────────────────────────────
document.querySelectorAll('.pricing-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.tier = card.dataset.value;
    save();
    document.getElementById('toPayment').disabled = false;
  });
});
document.getElementById('toPayment').addEventListener('click', () => goToPanel(6));

// ── Panel 6 — mock payment ───────────────────────────────
document.getElementById('submitPayment').addEventListener('click', () => {
  const cardName = document.getElementById('cardName').value.trim();
  const cardNumber = document.getElementById('cardNumber').value.trim();
  const cardExpiry = document.getElementById('cardExpiry').value.trim();
  const cardCvc = document.getElementById('cardCvc').value.trim();
  if (!cardName || !cardNumber || !cardExpiry || !cardCvc) return;
  state.cardName = cardName;
  save();

  const el = document.getElementById('finalSummaryCard');
  el.innerHTML = `
    <div class="summary-row"><span class="summary-label">Main goal</span><span class="summary-value">${state.goal}</span></div>
    <div class="summary-row"><span class="summary-label">Supporting goals</span><span class="summary-value">${subGoalsDisplay()}</span></div>
    <div class="summary-row"><span class="summary-label">Equipment</span><span class="summary-value">${state.equipmentTier}</span></div>
    <div class="summary-row"><span class="summary-label">Training days</span><span class="summary-value">${state.schedule}</span></div>
    <div class="summary-row"><span class="summary-label">Name</span><span class="summary-value">${state.firstName} ${state.lastName}</span></div>
    <div class="summary-row"><span class="summary-label">Phone</span><span class="summary-value">${state.phone}</span></div>
    <div class="summary-row"><span class="summary-label">Gender</span><span class="summary-value">${state.gender}</span></div>
    <div class="summary-row"><span class="summary-label">Email</span><span class="summary-value">${state.email}</span></div>
    <div class="summary-row"><span class="summary-label">Consent</span><span class="summary-value">Agreed to Privacy Policy &amp; ToS</span></div>
    <div class="summary-row"><span class="summary-label">Plan</span><span class="summary-value">${state.tier}</span></div>
    <div class="summary-row"><span class="summary-label">Payment</span><span class="summary-value">Mock — Stripe required at launch</span></div>
    <div class="summary-row"><span class="summary-label">Account status</span><span class="summary-value">paid (mock)</span></div>
  `;
  goToPanel(7);
});

document.getElementById('startOver').addEventListener('click', () => {
  sessionStorage.removeItem('onusWizardState');
  location.reload();
});

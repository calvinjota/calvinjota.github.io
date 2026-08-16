/*
 * paywall.js: decides whether the calculator stays visible or locked.
 * Listens to the 'authchange' event dispatched by auth.js and, once a user is
 * signed in, asks the Cloudflare Worker whether that user has an active Pro
 * subscription on RevenueCat. The calculator is unlocked only on {pro:true}.
 *
 * Fail-safe: any failure (network, worker down, invalid token) keeps the
 * calculator LOCKED. Access is never granted by error, only by explicit
 * confirmation.
 */

const WORKER_URL = 'https://api.calvinjota.com.br/check-pro';

// TODO: fill in with the Play Store link now that the app is live in production.
const APP_STORE_URL = '';

const $ = (id) => document.getElementById(id);

function setLocked(locked) {
  $('calcGate').dataset.locked = String(locked);
  $('gateOverlay').hidden = !locked;
}

function showGate(message, { showAppLink = false, showRetry = false } = {}) {
  setLocked(true);
  $('gateMessage').textContent = message;
  $('gateAppLink').hidden = !showAppLink;
  $('gateRetry').hidden = !showRetry;
  if (showAppLink) {
    if (APP_STORE_URL) {
      $('gateAppLink').href = APP_STORE_URL;
    } else {
      // Link not available yet: show the button in a disabled state.
      $('gateAppLink').removeAttribute('href');
      $('gateAppLink').setAttribute('aria-disabled', 'true');
    }
  }
}

async function checkSubscription(user) {
  showGate('Verificando sua assinatura…');
  $('planStatus').textContent = 'Verificando sua assinatura…';

  try {
    const idToken = await user.getIdToken();
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Falha na verificação.');

    if (data.pro) {
      setLocked(false);
      $('planStatus').textContent = 'Pro ativo ✓';
    } else {
      $('planStatus').textContent = 'Sem assinatura ativa.';
      showGate('Esta calculadora é exclusiva para assinantes Pro do Preço & Lucro.', { showAppLink: true });
    }
  } catch (e) {
    console.error('Erro ao verificar assinatura:', e);
    $('planStatus').textContent = 'Não foi possível verificar.';
    showGate('Não foi possível verificar sua assinatura agora. Tente novamente.', { showRetry: true });
  }
}

document.addEventListener('authchange', (e) => {
  const user = e.detail;
  if (user) {
    checkSubscription(user);
  } else {
    showGate('Entre com sua conta Google para acessar a calculadora.');
    $('planStatus').textContent = 'Exclusivo para assinantes do app.';
  }
});

$('gateRetry').addEventListener('click', () => {
  if (window.currentUser) checkSubscription(window.currentUser);
});

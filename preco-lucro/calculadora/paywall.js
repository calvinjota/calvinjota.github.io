/*
 * paywall.js: decide se a calculadora fica visível ou trancada.
 * Escuta o evento 'authchange' disparado por auth.js (Fase 2) e, quando há
 * usuário logado, pergunta pro Cloudflare Worker se ele tem assinatura Pro
 * ativa no RevenueCat. A calculadora só é liberada com {pro:true}.
 *
 * Fail-safe: qualquer erro (rede, worker fora do ar, token inválido) mantém a
 * calculadora TRANCADA. Nunca libera por falha, só por confirmação positiva.
 */

const WORKER_URL = 'https://api.calvinjota.com.br/check-pro';

// TODO: preencher com o link da Play Store quando o app for aprovado em produção.
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
      // Link ainda não disponível (app em revisão) — mostra o botão desabilitado.
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

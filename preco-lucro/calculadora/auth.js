/*
 * auth.js: login com Google no site (Firebase Web SDK, modular via CDN oficial).
 *
 * No app Android o login usa um plugin nativo; no navegador usamos o Firebase
 * Web SDK com popup do Google. Mesmo projeto Firebase ("preco-e-lucro").
 *
 * Fase atual (2): só autenticação (mostra/esconde o perfil no menu lateral).
 * A checagem de assinatura Pro (liberar/bloquear a calculadora) é a Fase 3,
 * feita por um Cloudflare Worker que valida o token abaixo. Por isso já
 * disparamos o evento 'authchange' e expomos window.currentUser.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'pt-BR'; // popup do Google em português
const provider = new GoogleAuthProvider();

const $ = (id) => document.getElementById(id);

/* ===================== Entrar ===================== */

$('btnGoogleLogin').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // Fechar o popup ou clicar duas vezes não é erro real, ignora em silêncio
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      console.error('Falha no login:', e);
      alert('Não foi possível entrar com o Google: ' + (e.message || e.code));
    }
  }
});

/* ===================== Sair ===================== */

$('btnLogout').addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Falha ao sair:', e);
  }
});

/* ===================== Reagir a login/logout ===================== */

onAuthStateChanged(auth, (user) => {
  const loggedIn = !!user;

  // alterna os dois estados do menu lateral (Perfil)
  $('profileLoggedOut').hidden = loggedIn;
  $('profileLoggedIn').hidden = !loggedIn;
  $('planStatus').textContent = loggedIn
    ? 'Verificando sua assinatura…' // a Fase 3 substituirá por Ativo/Inativo
    : 'Exclusivo para assinantes do app.';

  if (user) {
    $('profileName').textContent = user.displayName || 'Usuário';
    $('profileEmail').textContent = user.email || '';
    if (user.photoURL) {
      $('profilePhoto').src = user.photoURL;
      $('profilePhoto').hidden = false;
    }
  }

  // Disponibiliza o usuário para o resto do site (a Fase 3 lê isto para
  // pedir o token e consultar a assinatura no Cloudflare Worker).
  window.currentUser = user;
  document.dispatchEvent(new CustomEvent('authchange', { detail: user }));
});

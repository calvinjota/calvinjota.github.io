/*
 * auth.js: Google sign-in for the site (modular Firebase Web SDK via the
 * official CDN).
 *
 * The Android app signs in through a native plugin; the browser uses the
 * Firebase Web SDK with a Google popup. Both hit the same Firebase project
 * ("preco-e-lucro").
 *
 * This module only handles identity. It publishes the result through the
 * 'authchange' event and window.currentUser so paywall.js can trade the token
 * for a subscription check and sync.js can start listening to the user's data.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js?v=3';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'pt-BR'; // Google popup in Brazilian Portuguese
const provider = new GoogleAuthProvider();

const $ = (id) => document.getElementById(id);

/* ===================== Sign in ===================== */

$('btnGoogleLogin').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // Closing the popup or double-clicking is not a real failure, stay silent
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
      console.error('Falha no login:', e);
      alert('Não foi possível entrar com o Google: ' + (e.message || e.code));
    }
  }
});

/* ===================== Sign out ===================== */

$('btnLogout').addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Falha ao sair:', e);
  }
});

/* ===================== React to sign in/out ===================== */

onAuthStateChanged(auth, (user) => {
  const loggedIn = !!user;

  // Toggles the two profile states of the side menu
  $('profileLoggedOut').hidden = loggedIn;
  $('profileLoggedIn').hidden = !loggedIn;
  $('planStatus').textContent = loggedIn
    ? 'Verificando sua assinatura…' // paywall.js replaces this with the real status
    : 'Exclusivo para assinantes do app.';

  if (user) {
    $('profileName').textContent = user.displayName || 'Usuário';
    $('profileEmail').textContent = user.email || '';
    if (user.photoURL) {
      $('profilePhoto').src = user.photoURL;
      $('profilePhoto').hidden = false;
    }
  }

  // Publishes the user to the rest of the site (paywall.js reads it to request
  // the token and check the subscription on the Cloudflare Worker).
  window.currentUser = user;
  document.dispatchEvent(new CustomEvent('authchange', { detail: user }));
});

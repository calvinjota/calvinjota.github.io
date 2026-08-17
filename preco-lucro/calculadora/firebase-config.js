/*
 * firebase-config.js: public Firebase configuration for the "Preço & Lucro" web app.
 *
 * These keys are PUBLIC by design (they ship with every browser-side Firebase
 * app). Real security comes from the Firestore rules, which scope access to the
 * authenticated user, not from hiding these values.
 *
 * measurementId (Google Analytics) is left out on purpose: the site does not use
 * Analytics, which avoids tracking cookies and the consent banner they would
 * require under the Brazilian data protection law (LGPD).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyB8NW5jsuS1cBKlEt4JRL20MIV6FJkrowA',
  authDomain: 'preco-e-lucro.firebaseapp.com',
  projectId: 'preco-e-lucro',
  storageBucket: 'preco-e-lucro.firebasestorage.app',
  messagingSenderId: '117222837838',
  appId: '1:117222837838:web:fbe927ca7c8800ee313d1f',
};

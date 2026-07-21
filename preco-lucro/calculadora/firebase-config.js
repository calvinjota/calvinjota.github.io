/*
 * firebase-config.js: configuração pública do Firebase (app Web "Preço & Lucro").
 *
 * Estas chaves são PÚBLICAS por design (aparecem em qualquer app Firebase no
 * navegador). A segurança real vem das regras do Firestore, que restringem o
 * acesso por usuário autenticado, não destas chaves.
 *
 * measurementId (Google Analytics) foi omitido de propósito: não usamos
 * Analytics no site, para evitar cookies de rastreamento e a obrigação de
 * banner de consentimento (LGPD). Só usamos a parte de autenticação.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyB8NW5jsuS1cBKlEt4JRL20MIV6FJkrowA',
  authDomain: 'preco-e-lucro.firebaseapp.com',
  projectId: 'preco-e-lucro',
  storageBucket: 'preco-e-lucro.firebasestorage.app',
  messagingSenderId: '117222837838',
  appId: '1:117222837838:web:fbe927ca7c8800ee313d1f',
};

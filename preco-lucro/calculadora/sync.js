/*
 * sync.js: sincroniza os preços salvos com a mesma coleção Firestore que o
 * app Android usa ("userPrices"). Diferente do app (offline-first, com fila
 * de pendências), o site assume que quase sempre tem internet: a nuvem é a
 * fonte da verdade. Ao logar, buscamos os preços de lá; ao salvar/excluir no
 * site, escrevemos direto na nuvem.
 */

import { getApps, getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js?v=2';
import { persistSaved, renderSavedList } from './app.js?v=5';

// Reaproveita o app do Firebase já iniciado por auth.js, em vez de criar outro.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

let unsubscribe = null;

function cloudDocToLocal(docSnap) {
  const d = docSnap.data();
  return {
    id: d.id,
    name: d.name,
    inputs: d.inputs,
    display: d.display,
    lastModified: d.updatedAt ? new Date(d.updatedAt).getTime() : 0,
  };
}

function startListening(uid) {
  stopListening();
  const q = query(collection(db, 'userPrices'), where('userId', '==', uid));
  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(cloudDocToLocal).sort((a, b) => b.lastModified - a.lastModified);
      persistSaved(list);
      renderSavedList();
    },
    (e) => console.error('Erro ao sincronizar preços com a nuvem:', e)
  );
}

function stopListening() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

document.addEventListener('authchange', (e) => {
  const user = e.detail;
  if (user) {
    startListening(user.uid);
  } else {
    stopListening();
    // Limpa o cache local ao sair, para não deixar dados de uma conta
    // visíveis (mesmo que travados) para quem usar o navegador depois.
    persistSaved([]);
    renderSavedList();
  }
});

document.addEventListener('price-saved', async (e) => {
  const uid = window.currentUser?.uid;
  if (!uid) return;
  const price = e.detail;
  try {
    await addDoc(collection(db, 'userPrices'), {
      userId: uid,
      id: price.id,
      name: price.name,
      inputs: price.inputs,
      display: price.display,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Erro ao salvar preço na nuvem:', err);
  }
});

// "Salvar por cima" ou renomear (edição de um preço já existente, não criação)
document.addEventListener('price-updated', async (e) => {
  const uid = window.currentUser?.uid;
  if (!uid) return;
  const price = e.detail;
  try {
    const q = query(collection(db, 'userPrices'), where('userId', '==', uid), where('id', '==', price.id));
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) =>
        updateDoc(doc(db, 'userPrices', d.id), {
          name: price.name,
          inputs: price.inputs,
          display: price.display,
          updatedAt: new Date().toISOString(),
        })
      )
    );
  } catch (err) {
    console.error('Erro ao atualizar preço na nuvem:', err);
  }
});

document.addEventListener('price-deleted', async (e) => {
  const uid = window.currentUser?.uid;
  if (!uid) return;
  const { id } = e.detail;
  try {
    const q = query(collection(db, 'userPrices'), where('userId', '==', uid), where('id', '==', id));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'userPrices', d.id))));
  } catch (err) {
    console.error('Erro ao excluir preço na nuvem:', err);
  }
});

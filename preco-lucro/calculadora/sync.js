/*
 * sync.js: keeps saved prices in sync with the same Firestore collection the
 * Android app uses ("userPrices"). Unlike the app (offline-first, with a queue
 * of pending writes), the site assumes a connection is almost always there, so
 * the cloud is the source of truth: prices are fetched on sign-in, and saving
 * or deleting on the site writes straight to the cloud.
 */

import {
  getApps,
  getApp,
  initializeApp,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
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
import { firebaseConfig } from './firebase-config.js?v=3';
import { persistSaved, renderSavedList } from './saved-prices.js?v=1';

// Reuses the Firebase app already started by auth.js instead of creating another.
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
      // No sorting here: renderSavedList owns the order. Sorting in both places
      // would leave two competing orders, and only the cloud list would obey this one.
      const list = snapshot.docs.map(cloudDocToLocal);
      persistSaved(list);
      renderSavedList();
    },
    (e) => console.error('Erro ao sincronizar preços com a nuvem:', e),
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
    // Clears the local cache on sign-out so one account's data is not left
    // visible (even if locked) to whoever uses the browser next.
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

// Overwrite or rename (editing an existing price, not creating one)
document.addEventListener('price-updated', async (e) => {
  const uid = window.currentUser?.uid;
  if (!uid) return;
  const price = e.detail;
  try {
    const q = query(
      collection(db, 'userPrices'),
      where('userId', '==', uid),
      where('id', '==', price.id),
    );
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) =>
        updateDoc(doc(db, 'userPrices', d.id), {
          name: price.name,
          inputs: price.inputs,
          display: price.display,
          updatedAt: new Date().toISOString(),
        }),
      ),
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
    const q = query(
      collection(db, 'userPrices'),
      where('userId', '==', uid),
      where('id', '==', id),
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'userPrices', d.id))));
  } catch (err) {
    console.error('Erro ao excluir preço na nuvem:', err);
  }
});

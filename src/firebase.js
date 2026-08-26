import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsQXONc99MGiTLTh-lzlfsUgm1nyimIes",
authDomain: "eternalgy-crm.firebaseapp.com",
projectId: "eternalgy-crm",
storageBucket: "eternalgy-crm.firebasestorage.app",
messagingSenderId: "275979462445",
appId: "1:275979462445:web:71c70b7348f053246095a4",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// The CRM stores each collection (cases, agents, items...) as one JSON blob under a key, which
// keeps the app code simple. Shared keys go in one company-wide collection so every logged-in
// staff member sees the same data; personal keys are namespaced per user.
export const firebaseStorage = {
  async get(key, shared) {
    const col = shared ? "shared" : "personal";
    const id = shared ? key : `${auth.currentUser?.uid || "anon"}_${key}`;
    const snap = await getDoc(doc(db, col, id));
    if (!snap.exists()) throw new Error("not found");
    return { key, value: snap.data().value, shared: !!shared };
  },

  async set(key, value, shared) {
    try {
      const col = shared ? "shared" : "personal";
      const id = shared ? key : `${auth.currentUser?.uid || "anon"}_${key}`;
      await setDoc(doc(db, col, id), {
        key,
        value,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || "unknown",
      });
      return { key, value, shared: !!shared };
    } catch (e) {
      console.error("Save failed:", e);
      return null;
    }
  },

  async delete(key, shared) {
    try {
      const col = shared ? "shared" : "personal";
      const id = shared ? key : `${auth.currentUser?.uid || "anon"}_${key}`;
      await deleteDoc(doc(db, col, id));
      return { key, deleted: true, shared: !!shared };
    } catch (e) {
      return null;
    }
  },

  async list(prefix, shared) {
    try {
      const col = shared ? "shared" : "personal";
      const snap = await getDocs(collection(db, col));
      let keys = snap.docs.map((d) => d.data().key).filter(Boolean);
      if (prefix) keys = keys.filter((k) => k.startsWith(prefix));
      return { keys, prefix, shared: !!shared };
    } catch (e) {
      return { keys: [] };
    }
  },
};

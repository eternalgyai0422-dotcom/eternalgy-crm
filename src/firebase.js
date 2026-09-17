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

  // Per-document collection access — each id is its own Firestore document, so writing or
  // deleting one record never touches any other record in the same collection. This is what
  // the "cases" migration (case_records collection) is built on, to fix the old get/set/list
  // above always reading or writing one shared blob for an entire collection — which meant two
  // people saving around the same time could silently wipe out each other's changes.
  async listCollection(collectionName) {
    try {
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map((d) => d.data());
    } catch (e) {
      console.error("listCollection failed:", e);
      return [];
    }
  },
  async setDocById(collectionName, id, data) {
    try {
      await setDoc(doc(db, collectionName, id), data);
      return true;
    } catch (e) {
      console.error("setDocById failed:", e);
      return false;
    }
  },
  async deleteDocById(collectionName, id) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return true;
    } catch (e) {
      console.error("deleteDocById failed:", e);
      return false;
    }
  },
};

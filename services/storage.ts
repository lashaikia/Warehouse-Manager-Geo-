
import { Product, Transaction, User } from '../types';
import { db } from './firebaseConfig';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  setDoc,
  getDoc,
  writeBatch,
  limit,
  startAfter,
  orderBy,
  getCountFromServer,
  QueryConstraint,
  increment
} from 'firebase/firestore';

// Collection Names
const COLLS = {
  USERS: 'users',
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  SETTINGS: 'settings',
  USER_NOTES: 'user_notes'
};

// --- NUCLEAR SANITIZER V3 (The "Iron Dome") ---

/**
 * Checks if a value is a true Plain Old JavaScript Object (POJO).
 * This filters out Firestore References, Snapshots, DOM nodes, etc.
 */
const isPlainObject = (value: any): boolean => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/**
 * Recursive sanitizer that ONLY allows primitives and plain objects/arrays.
 * It ruthlessly discards anything else to prevent Circular Structure errors.
 */
const sanitizeData = (data: any, depth = 0): any => {
  // 0. Hard depth limit to prevent infinite recursion
  if (depth > 10) return null;

  // 1. Primitives (pass through)
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  // 2. Dates -> String
  if (data instanceof Date) return data.toISOString();

  // 3. Firestore Timestamp (Duck typing)
  if (typeof data.toDate === 'function') {
     try { return data.toDate().toISOString(); } catch { return null; }
  }

  // 4. Arrays -> Map recursively
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  // 5. CRITICAL: Filter out Non-Plain Objects (Firestore References, etc.)
  if (!isPlainObject(data)) {
      // Try to rescue 'id' if it's a reference-like object
      if (data.id && typeof data.id === 'string') return data.id;
      return null;
  }

  // 6. Plain Objects -> Reconstruct safely
  const safeObj: any = {};
  for (const key in data) {
    // Skip internal keys used by Firestore/Frameworks
    if (key.startsWith('_') || key.startsWith('$')) continue;
    if (['firestore', 'metadata', 'app', 'auth', 'database'].includes(key)) continue;

    if (Object.prototype.hasOwnProperty.call(data, key)) {
        try {
            const val = sanitizeData(data[key], depth + 1);
            if (val !== undefined) {
                safeObj[key] = val;
            }
        } catch (e) {
            continue;
        }
    }
  }
  return safeObj;
};

/**
 * Wrapper to safely save to localStorage without crashing app
 */
const tryStoreSession = (key: string, data: any) => {
    try {
        const clean = sanitizeData(data);
        localStorage.setItem(key, JSON.stringify(clean));
    } catch (e) {
        console.error("Storage Error (Circular Ref prevented):", e);
        // Fallback: Save minimal info if possible
        if (data && data.id) {
            const fallback = { id: data.id, role: data.role, name: data.name || 'User' };
            localStorage.setItem(key, JSON.stringify(fallback));
        }
    }
};

const mapDoc = (doc: any) => {
  const data = doc.data();
  const cleanData = sanitizeData(data);
  return { ...cleanData, id: doc.id };
};

// --- Auth & Users ---
const seedUsers: Omit<User, 'id'>[] = [
  { username: 'admin', name: 'მთავარი ადმინისტრატორი', role: 'admin', password: 'admin' },
  { username: 'editor', name: 'საწყობის ოპერატორი', role: 'editor', password: 'editor' },
  { username: 'viewer', name: 'სტუმარი', role: 'viewer', password: 'viewer' },
];

export const getUsers = async (): Promise<User[]> => {
  const q = query(collection(db, COLLS.USERS));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    for (const u of seedUsers) {
      await addDoc(collection(db, COLLS.USERS), u);
    }
    const newSnapshot = await getDocs(q);
    return newSnapshot.docs.map(mapDoc) as User[];
  }

  return snapshot.docs.map(mapDoc) as User[];
};

export const saveUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  const cleanData = sanitizeData(userData);
  const docRef = await addDoc(collection(db, COLLS.USERS), cleanData);
  return { ...cleanData, id: docRef.id };
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User[]> => {
  const userRef = doc(db, COLLS.USERS, id);
  const cleanUpdates = sanitizeData(updates);
  delete cleanUpdates.id; 
  
  await updateDoc(userRef, cleanUpdates);
  return await getUsers();
};

export const deleteUser = async (id: string): Promise<User[]> => {
  await deleteDoc(doc(db, COLLS.USERS, id));
  return await getUsers();
};

export const login = async (username: string, password: string): Promise<User | null> => {
  const q = query(
    collection(db, COLLS.USERS), 
    where("username", "==", username), 
    where("password", "==", password)
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const rawUser = mapDoc(snapshot.docs[0]);
    // Use Safe Storage Wrapper
    tryStoreSession('wm_session_user', rawUser);
    return rawUser as User;
  }
  return null;
};

export const logout = () => {
  localStorage.removeItem('wm_session_user');
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem('wm_session_user');
  try {
      return stored ? JSON.parse(stored) : null;
  } catch (e) {
      return null;
  }
};

export const changePassword = async (userId: string, oldPass: string, newPass: string): Promise<{ success: boolean, message: string }> => {
  const userRef = doc(db, COLLS.USERS, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { success: false, message: 'მომხმარებელი ვერ მოიძებნა' };
  }

  const userData = userSnap.data() as User;
  if (userData.password !== oldPass) {
    return { success: false, message: 'ძველი პაროლი არასწორია' };
  }

  await updateDoc(userRef, { password: newPass });
  
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    const updatedUser = { ...currentUser, password: newPass };
    tryStoreSession('wm_session_user', updatedUser);
  }

  return { success: true, message: 'პაროლი წარმატებით შეიცვალა' };
};

// --- Products ---

export const getProducts = async (): Promise<Product[]> => {
  const q = query(collection(db, COLLS.PRODUCTS), orderBy('lastUpdated', 'desc')); 
  const snapshot = await getDocs(q);
  const products = snapshot.docs.map(mapDoc) as Product[];
  return products;
};

export const getProductsPaginated = async (
  pageSize: number, 
  lastDoc: any = null,
  searchQuery: string = ''
): Promise<{ products: Product[], lastDoc: any }> => {
  
  let constraints: QueryConstraint[] = [];
  
  if (searchQuery) {
     constraints.push(where('nomenclature', '>=', searchQuery));
     constraints.push(where('nomenclature', '<=', searchQuery + '\uf8ff'));
     constraints.push(orderBy('nomenclature'));
  } else {
     constraints.push(orderBy('lastUpdated', 'desc'));
  }

  constraints.push(limit(pageSize));

  if (lastDoc) {
      constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, COLLS.PRODUCTS), ...constraints);
  const snapshot = await getDocs(q);
  
  const products = snapshot.docs.map(mapDoc) as Product[];
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return { products, lastDoc: lastVisible };
};

export const getProductsCount = async (): Promise<number> => {
    try {
        const statsRef = doc(db, COLLS.SETTINGS, 'stats');
        const statsSnap = await getDoc(statsRef);
        
        if (statsSnap.exists() && typeof statsSnap.data().productCount === 'number') {
          return statsSnap.data().productCount;
        }

        const coll = collection(db, COLLS.PRODUCTS);
        const snapshot = await getCountFromServer(coll);
        const count = snapshot.data().count;
        
        await setDoc(statsRef, { productCount: count }, { merge: true });
        
        return count;
    } catch (e) {
        console.error("Failed to get count", e);
        return 0;
    }
};

export const saveProduct = async (product: Omit<Product, 'id' | 'lastUpdated'>): Promise<Product> => {
  const newProduct = {
    ...product,
    lastUpdated: new Date().toISOString()
  };
  const cleanProduct = sanitizeData(newProduct);
  const docRef = await addDoc(collection(db, COLLS.PRODUCTS), cleanProduct);

  try {
      const statsRef = doc(db, COLLS.SETTINGS, 'stats');
      await setDoc(statsRef, { productCount: increment(1) }, { merge: true });
  } catch(e) { console.error("Stats update failed", e); }

  return { ...cleanProduct, id: docRef.id };
};

export const batchSaveProducts = async (products: Omit<Product, 'id' | 'lastUpdated'>[]) => {
  const BATCH_SIZE = 100; 
  const chunks = [];
  
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    chunks.push(products.slice(i, i + BATCH_SIZE));
  }

  let totalProcessed = 0;

  for (const chunk of chunks) {
    try {
        const batch = writeBatch(db);
        
        chunk.forEach(prod => {
           const newDocRef = doc(collection(db, COLLS.PRODUCTS));
           const dataToSave = {
               ...prod,
               lastUpdated: new Date().toISOString(),
           };
           batch.set(newDocRef, sanitizeData(dataToSave));
        });

        await batch.commit();
        totalProcessed += chunk.length;
        
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (e) {
        console.error("Batch write failed", e);
    }
  }

  if (totalProcessed > 0) {
      try {
          const statsRef = doc(db, COLLS.SETTINGS, 'stats');
          await setDoc(statsRef, { productCount: increment(totalProcessed) }, { merge: true });
      } catch(e) { console.error("Stats update failed", e); }
  }
  
  return totalProcessed;
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  const prodRef = doc(db, COLLS.PRODUCTS, id);
  const cleanUpdates = sanitizeData({ 
    ...updates, 
    lastUpdated: new Date().toISOString() 
  });
  delete cleanUpdates.id;
  await updateDoc(prodRef, cleanUpdates);
};

export const deleteProduct = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLS.PRODUCTS, id));
  try {
      const statsRef = doc(db, COLLS.SETTINGS, 'stats');
      await setDoc(statsRef, { productCount: increment(-1) }, { merge: true });
  } catch(e) { console.error("Stats update failed", e); }
};

// --- Transactions ---
export const getTransactions = async (): Promise<Transaction[]> => {
  const q = query(collection(db, COLLS.TRANSACTIONS));
  const snapshot = await getDocs(q);
  const txs = snapshot.docs.map(mapDoc) as Transaction[];
  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const logTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  const cleanTx = sanitizeData(transaction);
  await addDoc(collection(db, COLLS.TRANSACTIONS), cleanTx);
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction[]> => {
  const txRef = doc(db, COLLS.TRANSACTIONS, id);
  const cleanUpdates = sanitizeData(updates);
  delete cleanUpdates.id;
  
  await updateDoc(txRef, cleanUpdates);
  return await getTransactions();
};

export const deleteTransaction = async (id: string): Promise<Transaction[]> => {
  await deleteDoc(doc(db, COLLS.TRANSACTIONS, id));
  return await getTransactions();
};

// --- User Notes ---
export const getUserNote = async (userId: string): Promise<string> => {
  if (!userId) return '';
  const docRef = doc(db, COLLS.USER_NOTES, userId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    return data?.content || '';
  }
  return '';
};

export const saveUserNote = async (userId: string, content: string): Promise<void> => {
  if (!userId) return;
  const docRef = doc(db, COLLS.USER_NOTES, userId);
  await setDoc(docRef, { 
    content, 
    lastUpdated: new Date().toISOString() 
  }, { merge: true });
};

// --- Settings ---
const SETTINGS_DOC_ID = 'global';
const DEFAULT_OPTIONS = {
  warehouses: ["ცენტრალური საწყობი", "საწყობი N4-კარი1", "საწყობი N4-კარი2", "საწყობი N6", "გარე პერიმეტრი"],
  racks: Array.from({ length: 50 }, (_, i) => `სტელაჟი N${i + 1}`),
  categories: ["ელექტრონიკა", "ეკიპირება", "მასალები", "სხვა"],
  units: ["ცალი", "კგ", "მეტრი", "ლიტრი", "კომპლექტი", "წყვილი", "შეკვრა"] 
};

export const getOptions = async (type: 'warehouses' | 'racks' | 'categories' | 'units'): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  
  if (snapshot.exists()) {
    const data = sanitizeData(snapshot.data());
    return data[type] || DEFAULT_OPTIONS[type];
  } else {
    await setDoc(docRef, DEFAULT_OPTIONS);
    return DEFAULT_OPTIONS[type];
  }
};

export const saveOption = async (type: 'warehouses' | 'racks' | 'categories' | 'units', value: string): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? sanitizeData(snapshot.data()) : DEFAULT_OPTIONS;
  
  let list = data[type] || [];
  if (!list.some((item: string) => item.toLowerCase() === value.toLowerCase())) {
    list.push(value);
    await setDoc(docRef, { ...data, [type]: list });
  }
  return list;
};

export const deleteOption = async (type: 'warehouses' | 'racks' | 'categories' | 'units', value: string): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? sanitizeData(snapshot.data()) : DEFAULT_OPTIONS;

  let list = data[type] || [];
  list = list.filter((item: string) => item !== value);
  
  await setDoc(docRef, { ...data, [type]: list });
  return list;
};

export const updateOptionAndCascade = async (type: 'warehouses' | 'racks' | 'categories' | 'units', oldValue: string, newValue: string): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? sanitizeData(snapshot.data()) : DEFAULT_OPTIONS;
  
  let list = data[type] || [];
  const index = list.indexOf(oldValue);
  
  if (index !== -1) {
    list[index] = newValue;
    await setDoc(docRef, { ...data, [type]: list });

    let fieldToUpdate = '';
    if (type === 'warehouses') fieldToUpdate = 'warehouse';
    if (type === 'racks') fieldToUpdate = 'rack';
    if (type === 'categories') fieldToUpdate = 'category';
    if (type === 'units') fieldToUpdate = 'unit';

    if (fieldToUpdate) {
      const q = query(collection(db, COLLS.PRODUCTS), where(fieldToUpdate, '==', oldValue));
      const prodSnapshot = await getDocs(q);
      
      const updatePromises = prodSnapshot.docs.map(docSnap => 
        updateDoc(doc(db, COLLS.PRODUCTS, docSnap.id), { [fieldToUpdate]: newValue })
      );
      await Promise.all(updatePromises);
    }
  }
  return list;
};

// --- DATA CLEARING UTILS ---

const deleteCollection = async (collectionName: string) => {
    try {
        const colRef = collection(db, collectionName);
        const snapshot = await getDocs(colRef);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        return true;
    } catch (error) {
        console.error(`Error deleting collection ${collectionName}:`, error);
        return false;
    }
};

export const clearProductsCollection = async () => {
    return await deleteCollection(COLLS.PRODUCTS);
};

export const clearTransactionsCollection = async () => {
    return await deleteCollection(COLLS.TRANSACTIONS);
};

export const clearOperationalData = async () => {
  const p = await clearProductsCollection();
  const t = await clearTransactionsCollection();
  try {
      const statsRef = doc(db, COLLS.SETTINGS, 'stats');
      await setDoc(statsRef, { productCount: 0 }, { merge: true });
  } catch (e) { /* ignore */ }
  return p && t;
};

export const getDatabaseJSON = async () => {
  const users = await getUsers();
  const products = await getProducts();
  const transactions = await getTransactions();
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const settingsSnap = await getDoc(docRef);
  const settings = settingsSnap.exists() ? sanitizeData(settingsSnap.data()) : DEFAULT_OPTIONS;

  const data = {
    users,
    products,
    transactions,
    settings
  };
  
  try {
      const safeData = sanitizeData(data);
      return JSON.stringify(safeData, null, 2);
  } catch (e) {
      console.error("Backup serialization error", e);
      return JSON.stringify({ error: "Failed to serialize data" });
  }
};

export const importDatabaseJSON = (json: string) => {
  alert("Cloud ვერსიაში იმპორტი ამჟამად გამორთულია უსაფრთხოების მიზნით.");
  return false;
};

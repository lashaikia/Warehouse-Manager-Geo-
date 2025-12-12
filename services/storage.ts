
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
  orderBy,
  writeBatch,
  limit
} from 'firebase/firestore';

// Collection Names
const COLLS = {
  USERS: 'users',
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  SETTINGS: 'settings',
  USER_NOTES: 'user_notes'
};

// --- Helper Functions ---
const sanitizeData = (data: any): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  
  // Check for Firestore DocumentReference / CollectionReference / Query
  if (data.firestore && (data.path || data.type)) {
    return data.id || data.path || String(data);
  }
  
  if (data['toDate'] && typeof data['toDate'] === 'function') {
      return data.toDate().toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const clean: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'firestore' || typeof value === 'function') continue;
    clean[key] = sanitizeData(value);
  }
  return clean;
};

const mapDoc = (doc: any) => {
  const data = doc.data();
  return { ...sanitizeData(data), id: doc.id };
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
  const docRef = await addDoc(collection(db, COLLS.USERS), userData);
  return { ...userData, id: docRef.id };
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<User[]> => {
  const userRef = doc(db, COLLS.USERS, id);
  const { id: _, ...cleanUpdates } = updates as any;
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
    const user = mapDoc(snapshot.docs[0]) as User;
    try {
        localStorage.setItem('wm_session_user', JSON.stringify(user));
    } catch (e) {
        console.error("Session save failed", e);
    }
    return user;
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
    localStorage.setItem('wm_session_user', JSON.stringify({ ...currentUser, password: newPass }));
  }

  return { success: true, message: 'პაროლი წარმატებით შეიცვალა' };
};

// --- Products ---
export const getProducts = async (): Promise<Product[]> => {
  const q = query(collection(db, COLLS.PRODUCTS)); 
  const snapshot = await getDocs(q);
  const products = snapshot.docs.map(mapDoc) as Product[];
  return products.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
};

export const saveProduct = async (product: Omit<Product, 'id' | 'lastUpdated'>): Promise<Product> => {
  const newProduct = {
    ...product,
    lastUpdated: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, COLLS.PRODUCTS), newProduct);
  return { ...newProduct, id: docRef.id };
};

// ** NEW: Optimized Batch Save for large imports **
export const batchSaveProducts = async (products: Omit<Product, 'id' | 'lastUpdated'>[]) => {
  const BATCH_SIZE = 450; // Firestore limit is 500, keeping it safe
  const chunks = [];
  
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    chunks.push(products.slice(i, i + BATCH_SIZE));
  }

  let totalProcessed = 0;

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    
    chunk.forEach(prod => {
       const newDocRef = doc(collection(db, COLLS.PRODUCTS));
       const dataToSave = {
           ...prod,
           lastUpdated: new Date().toISOString(),
           // We can also store the ID in the doc if needed, but 'mapDoc' handles it usually.
           // However, to ensure consistency with our app logic:
       };
       batch.set(newDocRef, dataToSave);
    });

    await batch.commit();
    totalProcessed += chunk.length;
  }
  
  return totalProcessed;
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product[]> => {
  const prodRef = doc(db, COLLS.PRODUCTS, id);
  await updateDoc(prodRef, { 
    ...updates, 
    lastUpdated: new Date().toISOString() 
  });
  return await getProducts();
};

export const deleteProduct = async (id: string): Promise<Product[]> => {
  await deleteDoc(doc(db, COLLS.PRODUCTS, id));
  return await getProducts();
};

// --- Transactions ---
export const getTransactions = async (): Promise<Transaction[]> => {
  const q = query(collection(db, COLLS.TRANSACTIONS));
  const snapshot = await getDocs(q);
  const txs = snapshot.docs.map(mapDoc) as Transaction[];
  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const logTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  await addDoc(collection(db, COLLS.TRANSACTIONS), transaction);
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction[]> => {
  const txRef = doc(db, COLLS.TRANSACTIONS, id);
  await updateDoc(txRef, updates);
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
    return snapshot.data().content || '';
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
    const data = snapshot.data();
    return data[type] || DEFAULT_OPTIONS[type];
  } else {
    await setDoc(docRef, DEFAULT_OPTIONS);
    return DEFAULT_OPTIONS[type];
  }
};

export const saveOption = async (type: 'warehouses' | 'racks' | 'categories' | 'units', value: string): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? snapshot.data() : DEFAULT_OPTIONS;
  
  let list = data[type] || [];
  // Ensure we don't duplicate
  if (!list.some((item: string) => item.toLowerCase() === value.toLowerCase())) {
    list.push(value);
    await setDoc(docRef, { ...data, [type]: list });
  }
  return list;
};

export const deleteOption = async (type: 'warehouses' | 'racks' | 'categories' | 'units', value: string): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? snapshot.data() : DEFAULT_OPTIONS;

  let list = data[type] || [];
  list = list.filter((item: string) => item !== value);
  
  await setDoc(docRef, { ...data, [type]: list });
  return list;
};

export const updateOptionAndCascade = async (type: 'warehouses' | 'racks' | 'categories' | 'units', oldValue: string, newValue: string): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? snapshot.data() : DEFAULT_OPTIONS;
  
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

// Simplified delete to ensure it works for small datasets
const deleteCollection = async (collectionName: string) => {
    try {
        const colRef = collection(db, collectionName);
        const snapshot = await getDocs(colRef);
        
        // Simple Promise.all delete - best for small number of records (like 5)
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
      return JSON.stringify(data, null, 2);
  } catch (e) {
      console.error("Backup serialization error", e);
      return JSON.stringify({ error: "Failed to serialize data" });
  }
};

export const importDatabaseJSON = (json: string) => {
  alert("Cloud ვერსიაში იმპორტი ამჟამად გამორთულია უსაფრთხოების მიზნით.");
  return false;
};

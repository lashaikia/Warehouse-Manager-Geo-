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
  orderBy
} from 'firebase/firestore';

// Collection Names
const COLLS = {
  USERS: 'users',
  PRODUCTS: 'products',
  TRANSACTIONS: 'transactions',
  SETTINGS: 'settings'
};

// --- Helper Functions ---
const mapDoc = (doc: any) => ({ ...doc.data(), id: doc.id });

// --- Auth & Users ---
// საწყისი მომხმარებლები, თუ ბაზა ცარიელია
const seedUsers: Omit<User, 'id'>[] = [
  { username: 'admin', name: 'მთავარი ადმინისტრატორი', role: 'admin', password: 'admin' },
  { username: 'editor', name: 'საწყობის ოპერატორი', role: 'editor', password: 'editor' },
  { username: 'viewer', name: 'სტუმარი', role: 'viewer', password: 'viewer' },
];

export const getUsers = async (): Promise<User[]> => {
  const q = query(collection(db, COLLS.USERS));
  const snapshot = await getDocs(q);
  
  // თუ ბაზა ცარიელია, დავამატოთ საწყისი მომხმარებლები
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
  // Remove id from updates if present to avoid overwriting document key issues (though firestore ignores it usually)
  const { id: _, ...cleanUpdates } = updates as any;
  await updateDoc(userRef, cleanUpdates);
  return await getUsers();
};

export const deleteUser = async (id: string): Promise<User[]> => {
  await deleteDoc(doc(db, COLLS.USERS, id));
  return await getUsers();
};

export const login = async (username: string, password: string): Promise<User | null> => {
  // უსაფრთხოების მიზნით, რეალურ აპლიკაციაში უმჯობესია Firebase Auth-ის გამოყენება.
  // აქ ვიყენებთ მარტივ შედარებას კოლექციიდან.
  const q = query(
    collection(db, COLLS.USERS), 
    where("username", "==", username), 
    where("password", "==", password)
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const user = mapDoc(snapshot.docs[0]) as User;
    localStorage.setItem('wm_session_user', JSON.stringify(user));
    return user;
  }
  return null;
};

export const logout = () => {
  localStorage.removeItem('wm_session_user');
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem('wm_session_user');
  return stored ? JSON.parse(stored) : null;
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
  
  // განვაახლოთ ლოკალური სესია თუ მიმდინარე მომხმარებელმა შეიცვალა პაროლი
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    localStorage.setItem('wm_session_user', JSON.stringify({ ...currentUser, password: newPass }));
  }

  return { success: true, message: 'პაროლი წარმატებით შეიცვალა' };
};

// --- Products ---
export const getProducts = async (): Promise<Product[]> => {
  // Sort by lastUpdated desc
  const q = query(collection(db, COLLS.PRODUCTS)); // Firestore index might be needed for orderBy
  const snapshot = await getDocs(q);
  // Client side sorting for simplicity if index is missing
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
  // Sort manually to avoid complex index requirements initially
  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const logTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  await addDoc(collection(db, COLLS.TRANSACTIONS), transaction);
};

// --- Settings ---
// We will store settings in a single document: settings/global
const SETTINGS_DOC_ID = 'global';
const DEFAULT_OPTIONS = {
  warehouses: ["ცენტრალური საწყობი", "საწყობი N4-კარი1", "საწყობი N4-კარი2", "საწყობი N6", "გარე პერიმეტრი"],
  racks: Array.from({ length: 50 }, (_, i) => `სტელაჟი N${i + 1}`),
  categories: ["ელექტრონიკა", "ეკიპირება", "მასალები", "სხვა"]
};

export const getOptions = async (type: 'warehouses' | 'racks' | 'categories'): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  
  if (snapshot.exists()) {
    const data = snapshot.data();
    return data[type] || DEFAULT_OPTIONS[type];
  } else {
    // If doesn't exist, create it
    await setDoc(docRef, DEFAULT_OPTIONS);
    return DEFAULT_OPTIONS[type];
  }
};

export const saveOption = async (type: 'warehouses' | 'racks' | 'categories', value: string): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? snapshot.data() : DEFAULT_OPTIONS;
  
  let list = data[type] || [];
  if (!list.includes(value)) {
    list.push(value);
    list.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    
    await setDoc(docRef, { ...data, [type]: list });
  }
  return list;
};

export const deleteOption = async (type: 'warehouses' | 'racks' | 'categories', value: string): Promise<string[]> => {
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? snapshot.data() : DEFAULT_OPTIONS;

  let list = data[type] || [];
  list = list.filter((item: string) => item !== value);
  
  await setDoc(docRef, { ...data, [type]: list });
  return list;
};

export const updateOptionAndCascade = async (type: 'warehouses' | 'racks' | 'categories', oldValue: string, newValue: string): Promise<string[]> => {
  // 1. Update the option list
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const snapshot = await getDoc(docRef);
  let data = snapshot.exists() ? snapshot.data() : DEFAULT_OPTIONS;
  
  let list = data[type] || [];
  const index = list.indexOf(oldValue);
  
  if (index !== -1) {
    list[index] = newValue;
    list.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    await setDoc(docRef, { ...data, [type]: list });

    // 2. Cascade update to all products
    // Note: In Firestore, bulk updates usually require Batch writes. 
    // For simplicity here, we query and update individually. Large datasets would need a cloud function.
    let fieldToUpdate = '';
    if (type === 'warehouses') fieldToUpdate = 'warehouse';
    if (type === 'racks') fieldToUpdate = 'rack';
    if (type === 'categories') fieldToUpdate = 'category';

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

// --- Backup (Export only, since Firestore backup is complex to import client-side simply) ---
export const getDatabaseJSON = async () => {
  const users = await getUsers();
  const products = await getProducts();
  const transactions = await getTransactions();
  const docRef = doc(db, COLLS.SETTINGS, SETTINGS_DOC_ID);
  const settingsSnap = await getDoc(docRef);
  const settings = settingsSnap.exists() ? settingsSnap.data() : DEFAULT_OPTIONS;

  const data = {
    users,
    products,
    transactions,
    settings
  };
  return JSON.stringify(data, null, 2);
};

export const importDatabaseJSON = (json: string) => {
  alert("Cloud ვერსიაში იმპორტი ამჟამად გამორთულია უსაფრთხოების მიზნით.");
  return false;
};

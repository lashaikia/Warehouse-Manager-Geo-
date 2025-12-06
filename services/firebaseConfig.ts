import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const STORAGE_KEY = 'wm_firebase_config';

const getStoredConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Invalid config in storage");
  }
  return null;
};

// Default configuration with provided credentials
const defaultConfig = {
  apiKey: "AIzaSyBlFmufRkicgpswXC2t_LWwvaEg8MYyYpE",
  authDomain: "wh-manager-geo.firebaseapp.com",
  projectId: "wh-manager-geo",
  storageBucket: "wh-manager-geo.firebasestorage.app",
  messagingSenderId: "324707915062",
  appId: "1:324707915062:web:7c349dfac4c3f183144f97",
  measurementId: "G-RZ6DGYZ6TV"
};

const config = getStoredConfig() || defaultConfig;

const app = initializeApp(config);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Firestore persistence failed: multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Firestore persistence not supported');
    }
});

// კონფიგურაციის შენახვა და გვერდის გადატვირთვა
export const saveConfig = (newConfig: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  window.location.reload();
};

// კონფიგურაციის წაშლა
export const resetConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};

// შემოწმება, არის თუ არა კონფიგურაცია დაყენებული
export const isConfigured = () => {
    // Since we have valid hardcoded defaults, we are always configured.
    return true;
}
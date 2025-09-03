// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Optional: analytics if you want it
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDdVCyPjgK6nsJkDrL2AKc1E64OyRGce3U",
  authDomain: "test-app-811e3.firebaseapp.com",
  projectId: "test-app-811e3",
  // storageBucket: "test-app-811e3.appspot.com", // <-- fix this URL (not 'firebasestorage.app')
  storageBucket: "test-app-811e3.firebasestorage.app",
  messagingSenderId: "599104450678",
  appId: "1:599104450678:web:30381e31ec1a4b166c2f57",
  measurementId: "G-WS2ZC8QVDD",
};

const app = initializeApp(firebaseConfig);
const googleProvider = new GoogleAuthProvider();
const analytics = getAnalytics(app); // optional

export const auth = getAuth(app);
export const googleAuthProvider = googleProvider; // export the provider if needed elsewhere
export const db = getFirestore(app);
export const storage = getStorage(app);

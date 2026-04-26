import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwC-rhXq240NHd1iQUjBfUzb1j6q8lV9w",
  authDomain: "taskforce-pro-2e653.firebaseapp.com",
  projectId: "taskforce-pro-2e653",
  storageBucket: "taskforce-pro-2e653.firebasestorage.app",
  messagingSenderId: "577638265464",
  appId: "1:577638265464:web:6e3e903c40617e8cdfb38d",
  measurementId: "G-9CBWBFTBEW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

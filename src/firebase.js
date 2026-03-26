// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIiWiZXq1LLX9hYu9eCiLPXn6GKxKy9HU",
  authDomain: "ironlog-5c981.firebaseapp.com",
  projectId: "ironlog-5c981",
  storageBucket: "ironlog-5c981.firebasestorage.app",
  messagingSenderId: "1087458633169",
  appId: "1:1087458633169:web:35c0f53f864b797ff9ecf0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//Firestore DB
export const db = getFirestore(app);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
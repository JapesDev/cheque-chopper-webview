// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore'; // Full Firestore package

const firebaseConfig = {
    apiKey: "AIzaSyAnWVG2GmL5_hiWFhJyTRNZ2QuQ-Y0hdp4",
    authDomain: "cheque-chopper.firebaseapp.com",
    projectId: "cheque-chopper",
    storageBucket: "cheque-chopper.appspot.com",
    messagingSenderId: "523496994217",
    appId: "1:523496994217:web:bc02ea4417cfa888e440b8",
    measurementId: "G-T7TQPXQH84"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, db, auth };

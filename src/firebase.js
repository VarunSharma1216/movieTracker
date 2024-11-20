// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";  // Add this import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMxmY6-oyi_Qcd-xjfz648AaNeXBjksGA",
  authDomain: "movietracker-9fb87.firebaseapp.com",
  projectId: "movietracker-9fb87",
  storageBucket: "movietracker-9fb87.firebasestorage.app",
  messagingSenderId: "814908651052",
  appId: "1:814908651052:web:ea62c7c8499fbb29fcc389",
  measurementId: "G-GM5PZW5S99"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);  // Initialize Firestore and export it

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDKCQNjdwQJcafaFmlMP7YmNvw1Tm7W2pQ",
  authDomain: "topwar-helper.firebaseapp.com",
  projectId: "topwar-helper",
  storageBucket: "topwar-helper.firebasestorage.app",
  messagingSenderId: "129955976900",
  appId: "1:129955976900:web:298b4c48a483db6b21db91",
  measurementId: "G-LKC9791ZJB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
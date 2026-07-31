import { initializeApp } from 
"https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import { getAuth } from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { getFirestore } from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { getStorage } from
"https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";



const firebaseConfig = {

apiKey: "AIzaSyA0Z3rQM65O2yKTTORw3PyHSKf2rJtF_wU",

authDomain: "tfyfitness-4bb7a.firebaseapp.com",

projectId: "tfyfitness-4bb7a",

storageBucket: "tfyfitness-4bb7a.firebasestorage.app",

messagingSenderId: "181471812667",

appId: "1:181471812667:web:f8e49d1d15d16efbf4d01e"

};



const app = initializeApp(firebaseConfig);



export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);

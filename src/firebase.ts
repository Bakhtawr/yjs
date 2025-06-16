// firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyC5VXLQ-yDncEzTyHUP3RwFh60NB4-dCIs',
  authDomain: 'yjs-chat-app.firebaseapp.com',
  projectId: 'yjs-chat-app',
  storageBucket: 'yjs-chat-app.appspot.com',
  messagingSenderId: '623530906437',
  appId: '1:623530906437:web:12a1fac35fd9d44ea2e42c'
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
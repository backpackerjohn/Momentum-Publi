
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from '@firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore using the specific database ID from config
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  auth = getAuth(app);

  // Set up an observer on the Auth object to handle user state.
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed:", error);
      });
    }
  });

  // Validate connection as per system instructions
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error: any) {
      if (error && error.message && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  };
  testConnection();

} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { db, auth };

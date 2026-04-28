import { initializeApp, getApps } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDOSDlTxLL9L5Zx2SO1m4g2NDOQcJA8wOo',
  authDomain: 'system-d6042.firebaseapp.com',
  projectId: 'system-d6042',
  storageBucket: 'system-d6042.firebasestorage.app',
  messagingSenderId: '471181109603',
  appId: '1:471181109603:web:35db58fd34ac5943724b56',
  measurementId: 'G-3YJCV6MLRY',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
export default app;

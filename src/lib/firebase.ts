import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  browserLocalPersistence, 
  inMemoryPersistence, 
  browserPopupRedirectResolver, 
  getAuth, 
  GoogleAuthProvider 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleAuthProvider = new GoogleAuthProvider();


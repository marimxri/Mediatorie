import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  browserLocalPersistence, 
  inMemoryPersistence, 
  browserPopupRedirectResolver, 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Using browserLocalPersistence + inMemoryPersistence avoids "Database is closing/hidden" IndexedDB errors in iframe/sandboxed environments
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

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
const TOKEN_KEY = 'cristal_google_access_token';
const TOKEN_EXPIRY_KEY = 'cristal_google_token_expiry';

// Cache token in memory and in localStorage with expiry check (approx 55 minutes)
let cachedAccessToken: string | null = (() => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (token && expiry && Date.now() < parseInt(expiry, 10)) {
      return token;
    }
  } catch {
    // ignore
  }
  return null;
})();

export const saveToken = (token: string) => {
  cachedAccessToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    // Google OAuth access tokens typically expire in 3600 seconds
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000));
  } catch {
    // ignore
  }
};

export const clearStoredToken = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {
    // ignore
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = await getAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      clearStoredToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google.');
    }

    saveToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      console.log('Login pop-up foi fechado pelo usuário.');
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (token && expiry && Date.now() < parseInt(expiry, 10)) {
      cachedAccessToken = token;
      return token;
    }
  } catch {
    // ignore
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  clearStoredToken();
};

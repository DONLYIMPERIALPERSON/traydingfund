import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  applyActionCode,
  checkActionCode,
  signInWithCustomToken,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth'
import type { User, Auth, ActionCodeInfo, ConfirmationResult } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Use emulator in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  // Note: Admin pages might not need emulator, but keeping for consistency
}

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('No Firebase user is currently signed in')
  }
  return await user.getIdToken()
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  applyActionCode,
  checkActionCode,
  signInWithCustomToken,
  RecaptchaVerifier,
  signInWithPhoneNumber,
}

export type { User, Auth, ActionCodeInfo, ConfirmationResult }

// Extend window for reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined
  }
}
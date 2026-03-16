export type User = {
  uid: string
  email: string | null
}

export type Auth = {
  currentUser: User | null
}

export type ActionCodeInfo = {
  data: { email: string }
}

export const auth: Auth = {
  currentUser: {
    uid: 'mock-user-uid',
    email: 'trader@machefunded.com',
  },
}

export async function signInWithEmailAndPassword(_auth: Auth, _email: string, _password: string) {
  return { user: auth.currentUser }
}

export async function createUserWithEmailAndPassword(_auth: Auth, _email: string, _password: string) {
  return { user: auth.currentUser }
}

export async function signOut() {
  auth.currentUser = null
}

export async function sendSignInLinkToEmail() {
  return
}

export function isSignInWithEmailLink() {
  return false
}

export async function signInWithEmailLink() {
  return { user: auth.currentUser }
}

export function onAuthStateChanged(_auth: Auth, callback: (user: User | null) => void) {
  callback(auth.currentUser)
  return () => undefined
}

export async function sendPasswordResetEmail() {
  return
}

export async function confirmPasswordReset() {
  return
}

export async function verifyPasswordResetCode() {
  return 'mock-code'
}

export async function applyActionCode() {
  return
}

export async function checkActionCode() {
  return { data: { email: 'trader@machefunded.com' } } as ActionCodeInfo
}

export async function signInWithCustomToken() {
  return { user: auth.currentUser }
}
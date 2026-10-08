import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Note } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass database ID as second parameter
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Verify connection on initial boot as required by specification
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline. Please check connection and configuration.');
    }
  }
}
testConnection();

// Standardized Firestore error handling required by Firebase integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Create or update user profile document
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      const userPath = `users/${result.user.uid}`;
      try {
        await setDoc(
          userRef,
          {
            userId: result.user.uid,
            email: result.user.email || '',
            displayName: result.user.displayName || '',
            photoURL: result.user.photoURL || '',
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }
    }
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

// Firestore Notes Operations with error handler
export async function saveNoteToFirestore(userId: string, note: Note): Promise<void> {
  const notePath = `users/${userId}/notes/${note.id}`;
  try {
    const noteRef = doc(db, 'users', userId, 'notes', note.id);
    // Clean undefined values before saving to Firestore
    const sanitized = JSON.parse(
      JSON.stringify({
        ...note,
        userId,
        updatedAt: Date.now(),
      })
    );
    await setDoc(noteRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, notePath);
  }
}

export async function deleteNoteFromFirestore(userId: string, noteId: string): Promise<void> {
  const notePath = `users/${userId}/notes/${noteId}`;
  try {
    const noteRef = doc(db, 'users', userId, 'notes', noteId);
    await deleteDoc(noteRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, notePath);
  }
}

// Subscribe to real-time user notes
export function subscribeToUserNotes(
  userId: string,
  onNotesUpdate: (notes: Note[]) => void,
  onError?: (err: Error) => void
) {
  const notesPath = `users/${userId}/notes`;
  const notesCol = collection(db, 'users', userId, 'notes');

  return onSnapshot(
    notesCol,
    (snapshot) => {
      const list: Note[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Note;
        list.push({ ...data, id: docSnap.id });
      });
      // Sort by creation time desc
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onNotesUpdate(list);
    },
    (error) => {
      console.error('Notes subscription error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, notesPath);
    }
  );
}

import { auth, db, googleProvider } from '../firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast } from './utils.js';

let currentUser = null;
let unsubscribeTasks = null;

export function initFirebase(onUserChange, onTasksLoad) {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (unsubscribeTasks) unsubscribeTasks();
        if (user) {
            showToast(`Signed in as ${user.displayName}`, true);
            const userDocRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userDocRef);
            if (snapshot.exists()) {
                onTasksLoad(snapshot.data().tasks || []);
            } else {
                onTasksLoad([]);
            }
            unsubscribeTasks = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) onTasksLoad(docSnap.data().tasks || []);
            });
        } else {
            onTasksLoad(null); // use local only
        }
        onUserChange(user);
    });
}

export async function signInWithGoogle() {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch(e) { showToast(e.message, false); }
}

export async function signOutUser() {
    await signOut(auth);
    showToast("Signed out", true);
}

export async function syncTasksToCloud(tasks) {
    if (!currentUser) { showToast("Sign in to sync", false); return false; }
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, { tasks }, { merge: true });
    showToast("Tasks synced to cloud", true);
    return true;
}

export function isSignedIn() { return !!currentUser; }

import { auth, db, googleProvider } from '../firebase-config.js';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
            onTasksLoad(snapshot.exists() ? snapshot.data().tasks || [] : []);
            unsubscribeTasks = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) onTasksLoad(docSnap.data().tasks || []);
            });
        } else {
            onTasksLoad(null);
        }
        onUserChange(user);
    });
}

export async function signInWithGoogle() {
    const btn = document.getElementById('signInBtn');
    if (btn) btn.disabled = true;
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (popupError) {
        console.warn("Popup failed, trying redirect fallback", popupError);
        try { await signInWithRedirect(auth, googleProvider); } catch (redirectError) { showToast("Sign-in failed: " + redirectError.message, false); }
    }
    if (btn) btn.disabled = false;
}

export async function signOutUser() { await signOut(auth); showToast("Signed out", true); }
export async function syncTasksToCloud(tasks) {
    if (!currentUser) { showToast("Sign in to sync", false); return false; }
    await setDoc(doc(db, "users", currentUser.uid), { tasks }, { merge: true });
    showToast("Tasks synced to cloud", true);
    return true;
}
export function isSignedIn() { return !!currentUser; }

export async function shareTaskList(email) {
    if(!currentUser) { showToast("Sign in first", false); return; }
    const shareRef = doc(db, "shared", currentUser.uid);
    await setDoc(shareRef, { sharedWith: arrayUnion(email) }, { merge: true });
    showToast(`List shared with ${email}`, true);
}

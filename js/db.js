// js/db.js
import { showToast } from './utils.js';

let db = null;
const DB_NAME = "TaskForceDB";
const STORE_NAME = "tasks";

export async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
    });
}

export async function loadTasksFromDB() {
    try {
        if (!db) await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => {
                const fallback = localStorage.getItem("taskforce_fallback");
                resolve(fallback ? JSON.parse(fallback) : []);
            };
        });
    } catch (e) {
        const fallback = localStorage.getItem("taskforce_fallback");
        return fallback ? JSON.parse(fallback) : [];
    }
}

export async function saveTasksToDB(tasks) {
    try {
        if (!db) await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tasks.forEach(task => store.put(task));
        await tx.complete;
        // Update last saved timestamp
        const lastSavedElem = document.getElementById("lastSaved");
        if (lastSavedElem) {
            lastSavedElem.innerHTML = `<i class="far fa-save"></i> Last saved: ${new Date().toLocaleTimeString()}`;
        }
        return true;
    } catch (error) {
        console.error("IndexedDB save failed, using localStorage fallback", error);
        localStorage.setItem("taskforce_fallback", JSON.stringify(tasks));
        showToast("Saved to local backup", false);
        return false;
    }
}

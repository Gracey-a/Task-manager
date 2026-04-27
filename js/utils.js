export function generateId() { return Date.now() + Math.random(); }

export function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}

export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

let toastTimeout = null;
export function showToast(msg, isSuccess = true, undoCallback = null) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerHTML = `${msg} ${undoCallback ? '<button class="toast-undo" id="undoToastBtn">Undo</button>' : ''}`;
    toast.style.display = "flex";
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.display = "none";
    }, 6000); // Increased from 4000 to 6000ms (6 seconds)
    if (undoCallback) {
        const undoBtn = document.getElementById("undoToastBtn");
        if (undoBtn) undoBtn.addEventListener("click", () => { undoCallback(); toast.style.display = "none"; }, { once: true });
    }
    const announcer = document.getElementById("liveAnnouncer");
    if (announcer) announcer.textContent = msg;
}

export function flashButton(buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.classList.add('btn-flash');
        setTimeout(() => btn.classList.remove('btn-flash'), 500);
    }
}

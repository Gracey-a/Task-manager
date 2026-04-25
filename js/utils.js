export function generateId() { return Date.now() + Math.random(); }
export function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
}
let toastTimeout = null;
export function showToast(msg, isSuccess = true, undoCallback = null) {
    const toast = document.getElementById("toast");
    toast.innerHTML = `${msg} ${undoCallback ? '<button class="toast-undo" id="undoToastBtn">Undo</button>' : ''}`;
    toast.style.display = "flex";
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.style.display = "none"; }, 4000);
    if (undoCallback) {
        document.getElementById("undoToastBtn")?.addEventListener("click", () => {
            undoCallback();
            toast.style.display = "none";
        }, { once: true });
    }
}

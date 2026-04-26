export function initShortcuts(actions) {
    document.addEventListener('keydown', (e) => {
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('shortcutsModal').style.display = 'flex';
        }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        if (e.ctrlKey && e.key === 'n') { e.preventDefault(); actions.newTask(); }
        if (e.ctrlKey && e.key === 'f') { e.preventDefault(); actions.focusSearch(); }
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); actions.undo(); }
        if (e.key === 'Delete' && actions.deleteSelected) actions.deleteSelected();
    });
    document.getElementById('closeShortcuts')?.addEventListener('click', () => document.getElementById('shortcutsModal').style.display = 'none');
}

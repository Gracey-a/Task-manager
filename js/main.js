// js/main.js – Ultimate version with all enhancements
import { openDB, loadTasksFromDB, saveTasksToDB } from './db.js';
import { generateId, showToast, fileToBase64 } from './utils.js';
import { setGlobalTasks, getSelectedIds, clearSelected, renderStats, renderTaskList, renderMiniCalendar, setFilter, setSearch, setSortMethod, getFilteredTasks } from './ui.js';
import { renderKanban } from './kanban.js';
import { updateAnalytics } from './analytics.js';
import { initSwipe } from './swipe.js';
import { initShortcuts } from './shortcuts.js';
import { checkReminders } from './reminders.js';
import { startPomodoro, stopPomodoro } from './pomodoro.js';
import { initFirebase, signInWithGoogle, syncTasksToCloud, isSignedIn, signOutUser, shareTaskList } from './firebase.js';
import { startTimerForTask, stopTimerForTask } from './timeTracker.js';
import { exportToCSV } from './csvExport.js';
import { initRichText, getRichText, setRichText } from './richText.js';

let tasks = [], deletedStack = [], currentView = 'list', focusMode = false;
let selectedIds = new Set();
let quillEditor;

async function persist() { await saveTasksToDB(tasks); setGlobalTasks(tasks); renderAll(); updateAnalytics(tasks); if(isSignedIn()) syncTasksToCloud(tasks); }
function renderAll() {
    if(currentView === 'list') {
        document.getElementById('taskListContainer').style.display = 'block';
        document.getElementById('kanbanContainer').style.display = 'none';
        renderTaskList(toggleComplete, deleteTask, editTask, showLog);
    } else {
        document.getElementById('taskListContainer').style.display = 'none';
        document.getElementById('kanbanContainer').style.display = 'flex';
        renderKanban(getFilteredTasks(), toggleComplete, editTask, deleteTask);
    }
    renderStats(); renderMiniCalendar(tasks); updateAnalytics(tasks);
}

// Enhanced addTask with file attachments, rich text, recurring rules (rrule)
async function addTask(title, richDesc, due, priority, tagsStr, rruleStr, files) {
    if(!title.trim()) { showToast("Title required", false); return; }
    const attachments = [];
    for(const file of files) {
        const base64 = await fileToBase64(file);
        attachments.push({ name: file.name, data: base64, type: file.type, size: file.size });
    }
    const newTask = {
        id: generateId(),
        title: title.trim(),
        description: richDesc || '',
        dueDate: due || null,
        priority,
        tags: tagsStr.split(',').map(s=>s.trim()).filter(s=>s),
        rrule: rruleStr || null,
        attachments,
        completed: false,
        totalTimeSpent: 0,
        createdAt: new Date().toISOString(),
        activityLog: [`Created at ${new Date().toLocaleString()}`]
    };
    tasks.unshift(newTask);
    await persist();
    showToast(`Task "${newTask.title}" added`, true);
}

async function deleteTask(id, record=true) {
    const task = tasks.find(t=>t.id===id); if(!task) return;
    if(record) deletedStack.push({ ...task, index: tasks.findIndex(t=>t.id===id) });
    tasks = tasks.filter(t=>t.id!==id); await persist(); if(record) showToast(`Deleted "${task.title}"`, true, undoDelete);
}
async function undoDelete() { if(deletedStack.length) { const r = deletedStack.pop(); tasks.splice(r.index,0,r); await persist(); showToast(`Restored "${r.title}"`, true); } }
async function toggleComplete(id) {
    const t = tasks.find(t=>t.id===id);
    if(t) {
        t.completed = !t.completed;
        t.activityLog.push(`${t.completed?"Completed":"Reopened"} at ${new Date().toLocaleString()}`);
        if(t.completed) t.completedAt = new Date().toISOString();
        await persist();
    }
}
async function editTask(id) {
    const t = tasks.find(t=>t.id===id);
    if(t) {
        const newTitle = prompt("Edit title", t.title);
        if(newTitle?.trim()) t.title = newTitle.trim();
        const newDesc = prompt("Description (HTML)", t.description);
        if(newDesc !== null) t.description = newDesc;
        t.activityLog.push(`Edited at ${new Date().toLocaleString()}`);
        await persist();
    }
}
function showLog(id) { const t = tasks.find(t=>t.id===id); if(t) alert(`Activity:\n${t.activityLog.join('\n')}`); }
async function bulkDeleteSelected() { for(let id of [...selectedIds]) await deleteTask(id, true); selectedIds.clear(); await persist(); }
async function bulkCompleteSelected() { for(let id of selectedIds) { const t = tasks.find(t=>t.id===id); if(t && !t.completed) { t.completed = true; t.activityLog.push(`Completed at ${new Date().toLocaleString()}`); t.completedAt = new Date().toISOString(); } } await persist(); selectedIds.clear(); showToast("Selected tasks completed", true); }
async function exportJSON() { const data = JSON.stringify(tasks, null, 2); const blob = new Blob([data], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "taskforce_backup.json"; a.click(); URL.revokeObjectURL(a.href); }
async function importJSON(file) { const text = await file.text(); const imported = JSON.parse(text); tasks = imported; await persist(); showToast("Imported successfully", true); }

// File preview for new task
document.getElementById("taskFiles")?.addEventListener("change", (e) => {
    const preview = document.getElementById("filePreviewList");
    preview.innerHTML = Array.from(e.target.files).map(f => `<div>📎 ${f.name} (${(f.size/1024).toFixed(1)} KB)</div>`).join('');
});

// Rich text editor init
quillEditor = initRichText('richEditor');

// Add button event
document.getElementById("addBtn").onclick = async () => {
    const files = Array.from(document.getElementById("taskFiles").files);
    await addTask(
        document.getElementById("taskTitle").value,
        getRichText(),
        document.getElementById("taskDue").value,
        document.getElementById("taskPriority").value,
        document.getElementById("taskTags").value,
        document.getElementById("recurringRule").value,
        files
    );
    document.getElementById("taskTitle").value = "";
    setRichText("");
    document.getElementById("taskDue").value = "";
    document.getElementById("taskTags").value = "";
    document.getElementById("taskFiles").value = "";
    document.getElementById("filePreviewList").innerHTML = "";
};

// Other event listeners (same as before)
document.getElementById("filterAll").onclick = () => { setFilter("all"); renderAll(); };
document.getElementById("filterActive").onclick = () => { setFilter("active"); renderAll(); };
document.getElementById("filterCompleted").onclick = () => { setFilter("completed"); renderAll(); };
document.getElementById("sortBy").onchange = (e) => { setSortMethod(e.target.value); renderAll(); };
let dt; document.getElementById("searchTasks").addEventListener("input", (e) => { clearTimeout(dt); dt = setTimeout(() => { setSearch(e.target.value); renderAll(); }, 300); });
document.getElementById("bulkDeleteBtn").onclick = bulkDeleteSelected;
document.getElementById("bulkCompleteBtn").onclick = bulkCompleteSelected;
document.getElementById("exportBtn").onclick = exportJSON;
document.getElementById("importBtn").onclick = () => document.getElementById("importFile").click();
document.getElementById("importFile").onchange = (e) => { if(e.target.files[0]) importJSON(e.target.files[0]); };
document.getElementById("pomodoroStart").onclick = startPomodoro;
document.getElementById("pomodoroStop").onclick = stopPomodoro;
document.getElementById("syncBtn").onclick = () => syncTasksToCloud(tasks);
document.getElementById("shareListBtn").onclick = () => document.getElementById("shareModal").style.display = 'flex';
document.getElementById("shareConfirm").onclick = async () => { const email = document.getElementById("shareEmail").value; if(email) await shareTaskList(email); document.getElementById("shareModal").style.display = 'none'; };
document.getElementById("closeShareModal").onclick = () => document.getElementById("shareModal").style.display = 'none';
document.getElementById("signInBtn").onclick = () => isSignedIn() ? signOutUser() : signInWithGoogle();
document.getElementById("focusModeBtn").onclick = () => { focusMode = !focusMode; document.body.classList.toggle('focus-mode', focusMode); };
document.getElementById("viewToggleBtn").onclick = () => { currentView = currentView === 'list' ? 'kanban' : 'list'; renderAll(); };
document.getElementById("helpBtn").onclick = () => document.getElementById("shortcutsModal").style.display = 'flex';
document.getElementById("closeShortcuts").onclick = () => document.getElementById("shortcutsModal").style.display = 'none';
document.getElementById("exportCsvBtn").onclick = () => exportToCSV(tasks);

// Theme
function setTheme(theme) { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("taskforce_theme", theme); document.querySelectorAll(".theme-btn").forEach(btn => { if(btn.dataset.theme === theme) btn.classList.add("active"); else btn.classList.remove("active"); }); }
function loadTheme() { const saved = localStorage.getItem("taskforce_theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); setTheme(saved); }
document.querySelectorAll(".theme-btn").forEach(btn => btn.addEventListener("click", () => setTheme(btn.dataset.theme)));

initShortcuts({ newTask: ()=>document.getElementById("taskTitle").focus(), focusSearch: ()=>document.getElementById("searchTasks").focus(), undo: undoDelete, deleteSelected: bulkDeleteSelected });

async function init() { await openDB(); tasks = await loadTasksFromDB(); if(!tasks.length) tasks = []; setGlobalTasks(tasks); loadTheme(); await persist(); setInterval(() => checkReminders(tasks), 60000); if(Notification.permission === "default") Notification.requestPermission(); initFirebase((user)=>{ document.getElementById("signInBtn").innerHTML = user ? '<i class="fas fa-sign-out-alt"></i> Sign out' : '<i class="fab fa-google"></i> Sign in'; }, (cloudTasks)=>{ if(cloudTasks){ tasks = cloudTasks; persist(); } }); }
init();

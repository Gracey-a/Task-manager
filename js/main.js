import { openDB, loadTasksFromDB, saveTasksToDB } from './db.js';
import { generateId, showToast } from './utils.js';
import { setGlobalTasks, getSelectedIds, clearSelected, renderStats, renderTaskList, renderMiniCalendar, setFilter, setSearch, setSortMethod, getFilteredTasks } from './ui.js';
import { renderKanban } from './kanban.js';
import { updateAnalytics } from './analytics.js';
import { initSwipe } from './swipe.js';
import { initShortcuts } from './shortcuts.js';
import { checkRecurringTasks, checkReminders } from './reminders.js';
import { startPomodoro, stopPomodoro } from './pomodoro.js';
import { initFirebase, signInWithGoogle, syncTasksToCloud, isSignedIn, signOutUser } from './firebase.js';

let tasks = [], deletedStack = [], currentView = 'list', focusMode = false;
let selectedIds = new Set();

async function persist() { await saveTasksToDB(tasks); setGlobalTasks(tasks); renderAll(); updateAnalytics(tasks); if (isSignedIn()) syncTasksToCloud(tasks); }
function renderAll() {
    if (currentView === 'list') { document.getElementById('taskListContainer').style.display = 'block'; document.getElementById('kanbanContainer').style.display = 'none'; renderTaskList(toggleComplete, deleteTask, editTask, showLog); }
    else { document.getElementById('taskListContainer').style.display = 'none'; document.getElementById('kanbanContainer').style.display = 'flex'; renderKanban(getFilteredTasks(), toggleComplete, editTask, deleteTask); }
    renderStats(); renderMiniCalendar(tasks); updateAnalytics(tasks);
}
async function addTask(title, desc, due, priority, tagsStr, recurring, customDays) {
    if (!title.trim()) { showToast("Title required", false); return; }
    const newTask = { id: generateId(), title: title.trim(), description: desc.trim(), dueDate: due || null, priority, tags: tagsStr.split(',').map(s=>s.trim()).filter(s=>s), recurring: recurring || null, recurringDays: customDays || null, completed: false, createdAt: new Date().toISOString(), activityLog: [`Created at ${new Date().toLocaleString()}`] };
    tasks.unshift(newTask); await persist(); showToast(`Task "${newTask.title}" added`, true);
}
async function deleteTask(id, record=true) {
    const task = tasks.find(t=>t.id===id); if(!task) return;
    if(record) deletedStack.push({ ...task, index: tasks.findIndex(t=>t.id===id) });
    tasks = tasks.filter(t=>t.id!==id); await persist(); if(record) showToast(`Deleted "${task.title}"`, true, undoDelete);
}
async function undoDelete() { if(deletedStack.length) { const r = deletedStack.pop(); tasks.splice(r.index, 0, r); await persist(); showToast(`Restored "${r.title}"`, true); } }
async function toggleComplete(id) { const t = tasks.find(t=>t.id===id); if(t) { t.completed = !t.completed; t.activityLog.push(`${t.completed?"Completed":"Reopened"} at ${new Date().toLocaleString()}`); if(t.completed) t.completedAt = new Date().toISOString(); await persist(); } }
async function editTask(id) { const t = tasks.find(t=>t.id===id); if(t) { const newTitle = prompt("Edit title", t.title); if(newTitle?.trim()) t.title = newTitle.trim(); const newDesc = prompt("Description", t.description); if(newDesc !== null) t.description = newDesc; t.activityLog.push(`Edited at ${new Date().toLocaleString()}`); await persist(); } }
function showLog(id) { const t = tasks.find(t=>t.id===id); if(t) alert(`Activity for "${t.title}":\n${t.activityLog.join('\n')}`); }
async function bulkDeleteSelected() { for(let id of [...selectedIds]) await deleteTask(id, true); selectedIds.clear(); await persist(); }
async function bulkCompleteSelected() { for(let id of selectedIds) { const t = tasks.find(t=>t.id===id); if(t && !t.completed) { t.completed = true; t.activityLog.push(`Completed at ${new Date().toLocaleString()}`); t.completedAt = new Date().toISOString(); } } await persist(); selectedIds.clear(); showToast("Selected tasks completed", true); }
async function exportJSON() { const data = JSON.stringify(tasks, null, 2); const blob = new Blob([data], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "taskforce_backup.json"; a.click(); URL.revokeObjectURL(a.href); }
async function importJSON(file) { const text = await file.text(); const imported = JSON.parse(text); tasks = imported; await persist(); showToast("Imported successfully", true); }

// DOM bindings
document.getElementById("addBtn").onclick = () => { addTask(document.getElementById("taskTitle").value, document.getElementById("taskDesc").value, document.getElementById("taskDue").value, document.getElementById("taskPriority").value, document.getElementById("taskTags").value, document.getElementById("recurring").value, document.getElementById("customRecurDays").value); document.getElementById("taskTitle").value = ""; document.getElementById("taskDesc").value = ""; document.getElementById("taskDue").value = ""; document.getElementById("taskTags").value = ""; };
document.getElementById("filterAll").onclick = () => { setFilter("all"); renderAll(); };
document.getElementById("filterActive").onclick = () => { setFilter("active"); renderAll(); };
document.getElementById("filterCompleted").onclick = () => { setFilter("completed"); renderAll(); };
document.getElementById("sortBy").onchange = (e) => { setSortMethod(e.target.value); renderAll(); };
const debouncedSearch = (() => { let t; return (e) => { clearTimeout(t); t = setTimeout(() => { setSearch(e.target.value); renderAll(); }, 300); }; })();
document.getElementById("searchTasks").addEventListener('input', debouncedSearch);
document.getElementById("bulkDeleteBtn").onclick = bulkDeleteSelected;
document.getElementById("bulkCompleteBtn").onclick = bulkCompleteSelected;
document.getElementById("exportBtn").onclick = exportJSON;
document.getElementById("importBtn").onclick = () => document.getElementById("importFile").click();
document.getElementById("importFile").onchange = (e) => { if(e.target.files[0]) importJSON(e.target.files[0]); };
document.getElementById("pomodoroStart").onclick = startPomodoro;
document.getElementById("pomodoroStop").onclick = stopPomodoro;
document.getElementById("recurring").onchange = (e) => { document.getElementById("customRecurDays").style.display = e.target.value === 'custom' ? 'block' : 'none'; };
document.getElementById("syncBtn").onclick = () => syncTasksToCloud(tasks);
document.getElementById("signInBtn").onclick = () => isSignedIn() ? signOutUser() : signInWithGoogle();
document.getElementById("focusModeBtn").onclick = () => { focusMode = !focusMode; document.body.classList.toggle('focus-mode', focusMode); document.getElementById("focusModeBtn").innerHTML = focusMode ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'; };
document.getElementById("viewToggleBtn").onclick = () => { currentView = currentView === 'list' ? 'kanban' : 'list'; renderAll(); };
document.getElementById("helpBtn").onclick = () => document.getElementById('shortcutsModal').style.display = 'flex';

function setTheme(theme) { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("taskforce_theme", theme); document.querySelectorAll(".theme-btn").forEach(btn => { if(btn.dataset.theme === theme) btn.classList.add("active"); else btn.classList.remove("active"); }); }
function loadTheme() { const saved = localStorage.getItem("taskforce_theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); setTheme(saved); }
document.querySelectorAll(".theme-btn").forEach(btn => btn.addEventListener("click", () => setTheme(btn.dataset.theme)));

initShortcuts({ newTask: () => document.getElementById("taskTitle").focus(), focusSearch: () => document.getElementById("searchTasks").focus(), undo: undoDelete, deleteSelected: bulkDeleteSelected });

async function init() { await openDB(); tasks = await loadTasksFromDB(); if(!tasks.length) tasks = []; setGlobalTasks(tasks); loadTheme(); await persist(); setInterval(() => { tasks = checkRecurringTasks(tasks, async (newTasks) => { tasks = newTasks; await persist(); }); checkReminders(tasks); }, 60000); if(Notification.permission === "default") Notification.requestPermission(); initFirebase((user) => { document.getElementById("signInBtn").innerHTML = user ? '<i class="fas fa-sign-out-alt"></i> Sign out' : '<i class="fab fa-google"></i> Sign in'; }, (cloudTasks) => { if(cloudTasks) { tasks = cloudTasks; persist(); } }); }
init();

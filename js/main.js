import { openDB, loadTasksFromDB, saveTasksToDB } from './db.js';
import { generateId, showToast, fileToBase64, flashButton } from './utils.js';
import { setGlobalTasks, getSelectedIds, clearSelected, renderStats, renderTaskList, renderMiniCalendar, setFilter, setSearch, setSortMethod, getFilteredTasks } from './ui.js';
import { renderKanban } from './kanban.js';
import { initShortcuts } from './shortcuts.js';
import { checkRecurringTasks, checkReminders } from './reminders.js';
import { startPomodoro, stopPomodoro } from './pomodoro.js';
import { initFirebase, signInWithGoogle, syncTasksToCloud, isSignedIn, signOutUser, shareTaskList } from './firebase.js';
import { exportToCSV } from './csvExport.js';
import { initRichText, getRichText, setRichText } from './richText.js';

let tasks = [], deletedStack = [], currentView = 'list', focusMode = false;
let quillEditor;

async function persist() { await saveTasksToDB(tasks); setGlobalTasks(tasks); renderAll(); if(isSignedIn()) syncTasksToCloud(tasks); }
function renderAll() {
    if(currentView === 'list') {
        document.getElementById('taskListContainer').style.display = 'block';
        document.getElementById('kanbanContainer').style.display = 'none';
        renderTaskList(toggleComplete, deleteTask, openEditModal, showLog);
    } else {
        document.getElementById('taskListContainer').style.display = 'none';
        document.getElementById('kanbanContainer').style.display = 'flex';
        renderKanban(getFilteredTasks(), toggleComplete, openEditModal, deleteTask);
    }
    renderStats(); renderMiniCalendar(tasks);
}

async function addTask(title, richDesc, due, priority, tagsStr, rruleStr, customRecurDays, reminderOffset, files) {
    if(!title.trim()) { showToast("Title required", false); return; }
    const attachments = [];
    for(const file of files) {
        const base64 = await fileToBase64(file);
        attachments.push({ name: file.name, data: base64, type: file.type, size: file.size });
    }
    let finalRrule = rruleStr;
    if (rruleStr === 'custom') {
        finalRrule = customRecurDays && customRecurDays > 0 ? `RRULE:FREQ=DAILY;INTERVAL=${customRecurDays}` : '';
    }
    const newTask = {
        id: generateId(),
        title: title.trim(),
        description: richDesc || '',
        dueDate: due || null,
        priority,
        tags: tagsStr.split(',').map(s=>s.trim()).filter(s=>s),
        rrule: finalRrule || null,
        attachments,
        reminderOffset: reminderOffset || 0,
        reminderNotified: false,
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

let editingTaskId = null;
function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        editingTaskId = id;
        document.getElementById("editTitle").value = task.title;
        document.getElementById("editDesc").value = task.description;
        document.getElementById("editDue").value = task.dueDate || "";
        document.getElementById("editPriority").value = task.priority;
        const offsetSelect = document.getElementById("editReminderOffset");
        if (offsetSelect) offsetSelect.value = task.reminderOffset || 0;
        document.getElementById("editModal").style.display = 'flex';
    }
}
function closeEditModal() { document.getElementById("editModal").style.display = 'none'; editingTaskId = null; }
async function saveEdit() {
    if(editingTaskId) {
        const task = tasks.find(t => t.id === editingTaskId);
        if(task) {
            task.title = document.getElementById("editTitle").value.trim();
            task.description = document.getElementById("editDesc").value;
            task.dueDate = document.getElementById("editDue").value || null;
            task.priority = document.getElementById("editPriority").value;
            const newOffset = parseInt(document.getElementById("editReminderOffset").value);
            if(task.reminderOffset !== newOffset) {
                task.reminderOffset = newOffset;
                task.reminderNotified = false;
            }
            task.activityLog.push(`Edited at ${new Date().toLocaleString()}`);
            await persist();
        }
        closeEditModal();
    }
}
function showLog(id) { const t = tasks.find(t=>t.id===id); if(t) alert(`Activity:\n${t.activityLog.join('\n')}`); }

async function bulkDeleteSelected() {
    const ids = [...getSelectedIds()];
    if (ids.length === 0) { showToast("No tasks selected", false); return; }
    for(let id of ids) await deleteTask(id, true);
    clearSelected();
    await persist();
    showToast(`Deleted ${ids.length} tasks`, true);
}

async function bulkCompleteSelected() {
    const ids = [...getSelectedIds()];
    if (ids.length === 0) { showToast("No tasks selected", false); return; }
    let count = 0;
    for(let id of ids) {
        const t = tasks.find(t => t.id === id);
        if(t && !t.completed) {
            t.completed = true;
            t.activityLog.push(`Completed at ${new Date().toLocaleString()}`);
            t.completedAt = new Date().toISOString();
            count++;
        }
    }
    clearSelected();
    await persist();
    if (count > 0) showToast(`Completed ${count} tasks`, true);
    else showToast("Selected tasks already completed", false);
}

async function exportJSON() { const data = JSON.stringify(tasks, null, 2); const blob = new Blob([data], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "taskforce_backup.json"; a.click(); URL.revokeObjectURL(a.href); }
async function importJSON(file) { const text = await file.text(); const imported = JSON.parse(text); tasks = imported; await persist(); showToast("Imported successfully", true); }

// Export to Calendar
async function exportToCalendar() {
    const tasksWithDue = tasks.filter(task => !task.completed && task.dueDate);
    if (tasksWithDue.length === 0) {
        showToast("No pending tasks with due dates to export", false);
        return;
    }
    const events = [];
    for (const task of tasksWithDue) {
        let startDate = new Date(task.dueDate);
        if (isNaN(startDate.getTime()) || task.dueDate.length === 10) {
            startDate = new Date(`${task.dueDate}T09:00:00`);
        }
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        let description = (task.description || "").replace(/<[^>]*>/g, '').substring(0, 500);
        const reminderMins = task.reminderOffset || 0;
        const event = {
            start: [startDate.getFullYear(), startDate.getMonth()+1, startDate.getDate(), startDate.getHours(), startDate.getMinutes()],
            end: [endDate.getFullYear(), endDate.getMonth()+1, endDate.getDate(), endDate.getHours(), endDate.getMinutes()],
            title: task.title,
            description: description,
            location: "TaskForce",
            status: "CONFIRMED",
            busy: true
        };
        if (reminderMins > 0) {
            event.alarm = [{ action: "display", trigger: { minutes: reminderMins, before: true } }];
        }
        events.push(event);
    }
    ics.createEvents(events, (error, value) => {
        if (error) { showToast("Failed to generate calendar file", false); } 
        else {
            const blob = new Blob([value], { type: "text/calendar" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "taskforce_calendar.ics";
            link.click();
            URL.revokeObjectURL(link.href);
            showToast(`Exported ${events.length} events with reminders`, true);
            flashButton('exportCalendarBtn');
        }
    });
}

// File preview
document.getElementById("taskFiles")?.addEventListener("change", (e) => {
    const preview = document.getElementById("filePreviewList");
    preview.innerHTML = "";
    for (const file of e.target.files) {
        if (file.type.startsWith('image/')) {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.className = "image-preview-item";
            preview.appendChild(img);
        } else {
            const div = document.createElement("div");
            div.textContent = `📎 ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
            preview.appendChild(div);
        }
    }
});

quillEditor = initRichText('richEditor');

document.getElementById("recurringRule").addEventListener("change", (e) => {
    const customField = document.getElementById("customRecurDays");
    customField.style.display = e.target.value === 'custom' ? 'block' : 'none';
});

document.getElementById("addBtn").onclick = async () => {
    const files = Array.from(document.getElementById("taskFiles").files);
    const reminderVal = parseInt(document.getElementById("reminderOffset").value) || 0;
    const recurringVal = document.getElementById("recurringRule").value;
    let customDays = null;
    if (recurringVal === 'custom') {
        customDays = parseInt(document.getElementById("customRecurDays").value) || 1;
    }
    await addTask(
        document.getElementById("taskTitle").value,
        getRichText(),
        document.getElementById("taskDue").value,
        document.getElementById("taskPriority").value,
        document.getElementById("taskTags").value,
        recurringVal,
        customDays,
        reminderVal,
        files
    );
    document.getElementById("taskTitle").value = "";
    setRichText("");
    document.getElementById("taskDue").value = "";
    document.getElementById("taskTags").value = "";
    document.getElementById("taskFiles").value = "";
    document.getElementById("filePreviewList").innerHTML = "";
    document.getElementById("reminderOffset").value = "0";
    document.getElementById("recurringRule").value = "";
    document.getElementById("customRecurDays").style.display = 'none';
};

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
document.getElementById("exportCalendarBtn").onclick = exportToCalendar;

document.getElementById("closeEditModal").onclick = closeEditModal;
document.getElementById("saveEditBtn").onclick = saveEdit;
window.addEventListener('click', (e) => { if(e.target === document.getElementById("editModal")) closeEditModal(); });

function setTheme(theme) { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("taskforce_theme", theme); document.querySelectorAll(".theme-btn").forEach(btn => { if(btn.dataset.theme === theme) btn.classList.add("active"); else btn.classList.remove("active"); }); }
function loadTheme() { const saved = localStorage.getItem("taskforce_theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); setTheme(saved); }
document.querySelectorAll(".theme-btn").forEach(btn => btn.addEventListener("click", () => setTheme(btn.dataset.theme)));

initShortcuts({ newTask: ()=>document.getElementById("taskTitle").focus(), focusSearch: ()=>document.getElementById("searchTasks").focus(), undo: undoDelete, deleteSelected: bulkDeleteSelected });

async function init() { await openDB(); tasks = await loadTasksFromDB(); if(!tasks.length) tasks = []; setGlobalTasks(tasks); loadTheme(); await persist(); setInterval(async () => { tasks = checkRecurringTasks(tasks, async (newTasks) => { tasks = newTasks; await persist(); }); checkReminders(tasks); await persist(); }, 60000); if(Notification.permission === "default") Notification.requestPermission(); initFirebase((user)=>{ document.getElementById("signInBtn").innerHTML = user ? '<i class="fas fa-sign-out-alt"></i> Sign out' : '<i class="fab fa-google"></i> Sign in'; }, (cloudTasks)=>{ if(cloudTasks){ tasks = cloudTasks; persist(); } }); }
init();

// js/main.js
import { openDB, loadTasksFromDB, saveTasksToDB } from './db.js';
import { generateId, showToast } from './utils.js';
import { 
    setGlobalTasks, getSelectedIds, clearSelected,
    renderStats, renderTaskList, renderMiniCalendar,
    setFilter, setSearch, setSortMethod
} from './ui.js';
import { checkRecurringTasks, checkReminders } from './reminders.js';
import { startPomodoro, stopPomodoro } from './pomodoro.js';

// Global state
let tasks = [];
let deletedTaskStack = [];

// DOM refs
const addBtn = document.getElementById("addBtn");
const filterAll = document.getElementById("filterAll");
const filterActive = document.getElementById("filterActive");
const filterCompleted = document.getElementById("filterCompleted");
const sortSelect = document.getElementById("sortBy");
const searchInput = document.getElementById("searchTasks");
const bulkDelete = document.getElementById("bulkDeleteBtn");
const bulkComplete = document.getElementById("bulkCompleteBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

// Helper: debounce for search
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Core render & persist
async function persistAndRender() {
    await saveTasksToDB(tasks);
    setGlobalTasks(tasks);
    renderStats();
    renderTaskList(handleToggleComplete, handleDeleteTask, handleEditTask, handleShowLog);
    renderMiniCalendar(tasks);
    checkReminders(tasks);
}

async function fullRender() {
    setGlobalTasks(tasks);
    renderStats();
    renderTaskList(handleToggleComplete, handleDeleteTask, handleEditTask, handleShowLog);
    renderMiniCalendar(tasks);
}

// Task operations
async function addTask(title, desc, due, priority, tagsStr, recurring) {
    if (!title.trim()) { showToast("Title required", false); return false; }
    const newTask = {
        id: generateId(),
        title: title.trim(),
        description: desc.trim(),
        dueDate: due || null,
        priority,
        tags: tagsStr.split(',').map(s=>s.trim()).filter(s=>s),
        recurring: recurring || null,
        completed: false,
        createdAt: new Date().toISOString(),
        activityLog: [`Created at ${new Date().toLocaleString()}`]
    };
    tasks.unshift(newTask);
    await persistAndRender();
    showToast(`Task "${newTask.title}" added`, true);
    return true;
}

async function handleDeleteTask(id, recordForUndo = true) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (recordForUndo) deletedTaskStack.push({ ...task, index: tasks.findIndex(t => t.id === id) });
    tasks = tasks.filter(t => t.id !== id);
    await persistAndRender();
    if (recordForUndo) showToast(`Deleted "${task.title}"`, true, () => undoDelete());
}

async function undoDelete() {
    if (deletedTaskStack.length === 0) return;
    const restored = deletedTaskStack.pop();
    tasks.splice(restored.index, 0, restored);
    await persistAndRender();
    showToast(`Restored "${restored.title}"`, true);
}

async function handleToggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.activityLog.push(`${task.completed ? "Completed" : "Reopened"} at ${new Date().toLocaleString()}`);
        await persistAndRender();
    }
}

async function handleEditTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newTitle = prompt("Edit title", task.title);
    if (newTitle && newTitle.trim()) task.title = newTitle.trim();
    const newDesc = prompt("Description", task.description);
    if (newDesc !== null) task.description = newDesc;
    task.activityLog.push(`Edited at ${new Date().toLocaleString()}`);
    await persistAndRender();
}

function handleShowLog(id) {
    const task = tasks.find(t => t.id === id);
    if (task) alert(`Activity for "${task.title}":\n${task.activityLog.join('\n')}`);
}

async function bulkDeleteSelected() {
    const selected = [...getSelectedIds()];
    if (selected.length === 0) { showToast("No tasks selected", false); return; }
    for (let id of selected) {
        await handleDeleteTask(id, true);
    }
    clearSelected();
    await persistAndRender();
}

async function bulkCompleteSelected() {
    const selected = [...getSelectedIds()];
    if (selected.length === 0) { showToast("No tasks selected", false); return; }
    for (let id of selected) {
        const task = tasks.find(t => t.id === id);
        if (task && !task.completed) {
            task.completed = true;
            task.activityLog.push(`Completed at ${new Date().toLocaleString()}`);
        }
    }
    await persistAndRender();
    clearSelected();
    showToast("Selected tasks completed", true);
}

async function exportToJSON() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taskforce_backup.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Tasks exported", true);
}

async function importFromJSON(file) {
    try {
        const text = await file.text();
        const imported = JSON.parse(text);
        tasks = imported;
        await persistAndRender();
        showToast("Imported successfully", true);
    } catch (e) {
        showToast("Invalid JSON file", false);
    }
}

// Theme
function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("taskforce_theme", theme);
    document.querySelectorAll(".theme-btn").forEach(btn => {
        if (btn.dataset.theme === theme) btn.classList.add("active");
        else btn.classList.remove("active");
    });
}
function loadTheme() {
    const saved = localStorage.getItem("taskforce_theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(saved);
}

// Recurring check
async function runRecurringCheck() {
    tasks = checkRecurringTasks(tasks, async (newTasks) => { tasks = newTasks; await persistAndRender(); });
    await persistAndRender();
}

// Event binding
function bindEvents() {
    addBtn.onclick = async () => {
        await addTask(
            document.getElementById("taskTitle").value,
            document.getElementById("taskDesc").value,
            document.getElementById("taskDue").value,
            document.getElementById("taskPriority").value,
            document.getElementById("taskTags").value,
            document.getElementById("recurring").value
        );
        document.getElementById("taskTitle").value = "";
        document.getElementById("taskDesc").value = "";
        document.getElementById("taskDue").value = "";
        document.getElementById("taskTags").value = "";
    };
    filterAll.onclick = () => { setFilter("all"); fullRender(); };
    filterActive.onclick = () => { setFilter("active"); fullRender(); };
    filterCompleted.onclick = () => { setFilter("completed"); fullRender(); };
    sortSelect.onchange = (e) => { setSortMethod(e.target.value); fullRender(); };
    
    const debouncedSearch = debounce((e) => {
        setSearch(e.target.value);
        fullRender();
    }, 300);
    searchInput.addEventListener('input', debouncedSearch);
    
    bulkDelete.onclick = bulkDeleteSelected;
    bulkComplete.onclick = bulkCompleteSelected;
    exportBtn.onclick = exportToJSON;
    importBtn.onclick = () => importFile.click();
    importFile.onchange = (e) => { if (e.target.files[0]) importFromJSON(e.target.files[0]); };
    document.getElementById("pomodoroStart").onclick = startPomodoro;
    document.getElementById("pomodoroStop").onclick = stopPomodoro;
    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.addEventListener("click", () => setTheme(btn.dataset.theme));
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'n') { e.preventDefault(); document.getElementById("taskTitle").focus(); }
        if (e.ctrlKey && e.key === 'f') { e.preventDefault(); searchInput.focus(); }
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); if (deletedTaskStack.length > 0) undoDelete(); else showToast("Nothing to undo", false); }
        if (e.key === 'Delete' && getSelectedIds().size > 0) bulkDeleteSelected();
    });
}

// Initialisation
async function init() {
    await openDB();
    tasks = await loadTasksFromDB();
    if (tasks.length === 0) tasks = [];
    setGlobalTasks(tasks);
    bindEvents();
    loadTheme();
    await persistAndRender();
    setInterval(runRecurringCheck, 60000);
    if (Notification.permission === "default") Notification.requestPermission();
}
init();

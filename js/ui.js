// ui.js
import { escapeHtml } from './utils.js';

let tasks = [];
let selectedTaskIds = new Set();
let currentFilter = "all";
let searchQuery = "";
let sortMethod = "due";

export function setGlobalTasks(newTasks) { tasks = newTasks; }
export function getSelectedIds() { return selectedTaskIds; }
export function clearSelected() { selectedTaskIds.clear(); }
export function toggleSelectTask(id) {
    if (selectedTaskIds.has(id)) selectedTaskIds.delete(id);
    else selectedTaskIds.add(id);
}

export function getFilteredTasks() {
    let filtered = tasks.filter(t => {
        if (currentFilter === "active") return !t.completed;
        if (currentFilter === "completed") return t.completed;
        return true;
    });
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(q) || 
            t.description.toLowerCase().includes(q) ||
            t.tags.some(tag => tag.toLowerCase().includes(q))
        );
    }
    if (sortMethod === "due") {
        filtered.sort((a,b) => (a.dueDate || "9999") > (b.dueDate || "9999") ? 1 : -1);
    } else if (sortMethod === "priority") {
        const order = { high: 1, medium: 2, low: 3 };
        filtered.sort((a,b) => order[a.priority] - order[b.priority]);
    } else {
        filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return filtered;
}

export function renderStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    document.getElementById("stats").innerHTML = `
        <div>Total: ${total}</div>
        <div>Active: ${active}</div>
        <div>Completed: ${completed}</div>
    `;
}

export function renderTaskList(onToggleComplete, onDelete, onEdit, onShowLog) {
    const filtered = getFilteredTasks();
    const container = document.getElementById("taskListContainer");
    if (filtered.length === 0) {
        container.innerHTML = "<div class='card'>✨ No tasks. Add one!</div>";
        return;
    }
    container.innerHTML = filtered.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-header">
                <input type="checkbox" class="task-select" data-id="${task.id}" ${selectedTaskIds.has(task.id) ? 'checked' : ''}>
                <span class="task-title">${escapeHtml(task.title)}</span>
                <span class="badge" style="background:${task.priority==='high'?'#FEE2E2':task.priority==='medium'?'#FEF3C7':'#D1FAE5'}">${task.priority}</span>
                ${task.dueDate ? `<span class="badge"><i class="far fa-clock"></i> ${new Date(task.dueDate).toLocaleString()}</span>` : ''}
                ${task.tags.map(t => `<span class="badge tag">${escapeHtml(t)}</span>`).join('')}
                <div class="task-actions">
                    <button class="complete-btn" data-id="${task.id}" title="Complete"><i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i></button>
                    <button class="edit-btn" data-id="${task.id}" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${task.id}" title="Delete"><i class="fas fa-trash"></i></button>
                    <button class="log-btn" data-id="${task.id}" title="Activity Log"><i class="fas fa-history"></i></button>
                </div>
            </div>
            ${task.description ? `<div class="task-desc" style="font-size:0.8rem; margin-top:0.3rem; color:var(--text-muted)">${escapeHtml(task.description)}</div>` : ''}
        </div>
    `).join('');
    
    // Attach event listeners
    document.querySelectorAll('.task-select').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseFloat(e.target.dataset.id);
            if (e.target.checked) selectedTaskIds.add(id);
            else selectedTaskIds.delete(id);
        });
    });
    document.querySelectorAll('.complete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => onToggleComplete(parseFloat(btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => onDelete(parseFloat(btn.dataset.id), true));
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => onEdit(parseFloat(btn.dataset.id)));
    });
    document.querySelectorAll('.log-btn').forEach(btn => {
        btn.addEventListener('click', (e) => onShowLog(parseFloat(btn.dataset.id)));
    });
}

export function renderMiniCalendar(tasks) {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    let html = `<div class="cal-grid">${['S','M','T','W','T','F','S'].map(d=>`<div>${d}</div>`).join('')}`;
    for(let i=0; i<firstDay; i++) html += `<div></div>`;
    for(let d=1; d<=daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const hasTask = tasks.some(t => t.dueDate && t.dueDate.startsWith(dateStr));
        html += `<div class="cal-day ${hasTask ? 'has-task' : ''}">${d}</div>`;
    }
    html += `</div>`;
    document.getElementById("miniCalendar").innerHTML = html;
}

export function setFilter(filter) { currentFilter = filter; }
export function setSearch(query) { searchQuery = query; }
export function setSortMethod(method) { sortMethod = method; }

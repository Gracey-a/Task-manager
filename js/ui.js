import { escapeHtml } from './utils.js';

let tasks = [], selectedIds = new Set(), currentFilter = "all", searchQuery = "", sortMethod = "due";

export function setGlobalTasks(newTasks) { tasks = newTasks; }
export function getSelectedIds() { return selectedIds; }
export function clearSelected() { selectedIds.clear(); }
export function toggleSelectTask(id) { selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id); }

export function getFilteredTasks() {
    let filtered = tasks.filter(t => {
        if (currentFilter === "active") return !t.completed;
        if (currentFilter === "completed") return t.completed;
        return true;
    });
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.tags && t.tags.some(tag=>tag.toLowerCase().includes(q))));
    }
    if (sortMethod === "due") filtered.sort((a,b) => (a.dueDate||"9999") > (b.dueDate||"9999") ? 1 : -1);
    else if (sortMethod === "priority") { const order = { high:1, medium:2, low:3 }; filtered.sort((a,b) => order[a.priority] - order[b.priority]); }
    else filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    return filtered;
}

export function renderStats() {
    const total = tasks.length, completed = tasks.filter(t=>t.completed).length;
    const statsDiv = document.getElementById("stats");
    if (statsDiv) statsDiv.innerHTML = `<div>Total: ${total}</div><div>Active: ${total-completed}</div><div>Completed: ${completed}</div>`;
}

export function renderTaskList(onToggleComplete, onDelete, onEdit, onShowLog) {
    const filtered = getFilteredTasks();
    const container = document.getElementById("taskListContainer");
    if (!filtered.length) { container.innerHTML = "<div class='card'>✨ No tasks. Add one!</div>"; return; }
    container.innerHTML = filtered.map(task => {
        // Safely render description HTML (sanitize: remove scripts, allow basic formatting)
        let descHtml = task.description || '';
        // Simple sanitization: remove <script> tags (just in case)
        descHtml = descHtml.replace(/<script.*?<\/script>/gi, '');
        // Render description if not empty
        const descMarkup = descHtml ? `<div class="task-desc" style="font-size:0.85rem; margin-top:0.3rem; color:var(--text-secondary);">${descHtml}</div>` : '';

        // Build metadata badges
        let metaHtml = '';
        if (task.priority) metaHtml += `<span class="badge">${task.priority}</span>`;
        if (task.dueDate) metaHtml += `<span class="badge"><i class="far fa-clock"></i> ${new Date(task.dueDate).toLocaleString()}</span>`;
        if (task.tags && task.tags.length) {
            metaHtml += task.tags.map(t => `<span class="badge tag">${escapeHtml(t)}</span>`).join('');
        }

        // Attachments
        let attachmentsHtml = '';
        if (task.attachments && task.attachments.length) {
            attachmentsHtml = `<div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.3rem; align-items:center;">`;
            task.attachments.forEach(att => {
                if (att.type && att.type.startsWith('image/')) {
                    attachmentsHtml += `<img src="${att.data}" class="image-thumb" alt="${escapeHtml(att.name)}" 
                                        style="cursor:pointer; width:50px; height:50px; object-fit:cover; border-radius:0.3rem; border:1px solid var(--border-light);"
                                        onclick="window.open('${att.data}', '_blank')">`;
                } else {
                    const icon = att.type?.includes('pdf') ? '📄' : 
                                 att.type?.includes('zip') ? '📦' : 
                                 att.type?.includes('doc') ? '📝' : '📎';
                    attachmentsHtml += `<span class="badge" style="cursor:pointer; padding:0.2rem 0.5rem; background:var(--bg-page);"
                                        onclick="window.open('${att.data}', '_blank')">${icon} ${escapeHtml(att.name)}</span>`;
                }
            });
            attachmentsHtml += `</div>`;
        }

        return `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div style="display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap;">
                <input type="checkbox" class="task-select" data-id="${task.id}" ${selectedIds.has(task.id) ? 'checked' : ''}>
                <span class="task-title" style="flex:1; font-weight:600; font-size:1rem;">${escapeHtml(task.title)}</span>
                <div class="task-actions" style="display:flex; gap:0.3rem; align-items:center;">
                    <button class="complete-btn" data-id="${task.id}" title="Toggle complete"><i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i></button>
                    <button class="edit-btn" data-id="${task.id}" title="Edit task"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${task.id}" title="Delete task"><i class="fas fa-trash"></i></button>
                    <button class="log-btn" data-id="${task.id}" title="Activity log"><i class="fas fa-history"></i></button>
                </div>
            </div>
            ${descMarkup}
            <div style="display:flex; flex-wrap:wrap; gap:0.3rem; margin-top:0.3rem;">
                ${metaHtml}
            </div>
            ${attachmentsHtml}
        </div>
        `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.task-select').forEach(cb => cb.addEventListener('change', (e) => { const id = parseFloat(e.target.dataset.id); e.target.checked ? selectedIds.add(id) : selectedIds.delete(id); }));
    document.querySelectorAll('.complete-btn').forEach(btn => btn.addEventListener('click', (e) => onToggleComplete(parseFloat(btn.dataset.id))));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => onDelete(parseFloat(btn.dataset.id), true)));
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => onEdit(parseFloat(btn.dataset.id))));
    document.querySelectorAll('.log-btn').forEach(btn => btn.addEventListener('click', (e) => onShowLog(parseFloat(btn.dataset.id))));
}

export function renderMiniCalendar(tasks) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = `<div style="text-align:center; margin-bottom:0.5rem; font-weight:600;">${monthNames[month]} ${year}</div>`;
    html += `<div class="cal-grid">${['S','M','T','W','T','F','S'].map(d=>`<div>${d}</div>`).join('')}`;
    for (let i=0; i<firstDay; i++) html += `<div></div>`;
    for (let d=1; d<=daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const hasTask = tasks.some(t => t.dueDate && t.dueDate.startsWith(dateStr));
        html += `<div class="cal-day ${hasTask ? 'has-task' : ''}">${d}</div>`;
    }
    html += `</div>`;
    const container = document.getElementById("miniCalendar");
    if (container) container.innerHTML = html;
}

export function setFilter(f) { currentFilter = f; }
export function setSearch(q) { searchQuery = q; }
export function setSortMethod(m) { sortMethod = m; }

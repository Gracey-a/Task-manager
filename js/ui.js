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

// ========== Attachment Modal (global) ==========
function openAttachmentModal(data, type, name) {
    // Remove any existing modal
    const existing = document.getElementById('attachmentModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'attachmentModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: 2rem;
        animation: fadeIn 0.2s ease;
    `;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const container = document.createElement('div');
    container.style.cssText = `
        max-width: 90%; max-height: 90%; background: var(--bg-surface);
        border-radius: 0.75rem; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        position: relative; display: flex; flex-direction: column;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute; top: 0.5rem; right: 0.8rem; background: rgba(0,0,0,0.5);
        color: white; border: none; font-size: 1.5rem; cursor: pointer;
        border-radius: 50%; width: 2.2rem; height: 2.2rem; display: flex;
        align-items: center; justify-content: center; z-index: 10;
    `;
    closeBtn.onclick = (e) => { e.stopPropagation(); modal.remove(); };
    container.appendChild(closeBtn);

    const content = document.createElement('div');
    content.style.cssText = 'flex:1; padding:1rem; overflow:auto; display:flex; justify-content:center; align-items:center;';

    if (type && type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = data;
        img.style.cssText = 'max-width:100%; max-height:80vh; border-radius:0.3rem; object-fit:contain;';
        content.appendChild(img);
    } else {
        const iframe = document.createElement('iframe');
        iframe.src = data;
        iframe.style.cssText = 'width:90vw; height:85vh; border:none; border-radius:0.3rem;';
        iframe.title = name || 'Attachment';
        content.appendChild(iframe);
    }

    container.appendChild(content);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // Add animation keyframes if not exists
    if (!document.getElementById('attachmentModalStyle')) {
        const style = document.createElement('style');
        style.id = 'attachmentModalStyle';
        style.textContent = `
            @keyframes fadeIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
        `;
        document.head.appendChild(style);
    }
}

// Expose function globally so event listeners can call it
window.openAttachmentModal = openAttachmentModal;

export function renderTaskList(onToggleComplete, onDelete, onEdit, onShowLog) {
    const filtered = getFilteredTasks();
    const container = document.getElementById("taskListContainer");
    if (!filtered.length) { container.innerHTML = "<div class='card'>✨ No tasks. Add one!</div>"; return; }
    container.innerHTML = filtered.map(task => {
        let descHtml = task.description || '';
        descHtml = descHtml.replace(/<script.*?<\/script>/gi, '');
        const descMarkup = descHtml ? `<div class="task-desc">${descHtml}</div>` : '';

        let metaHtml = '';
        if (task.priority) metaHtml += `<span class="badge">${task.priority}</span>`;
        if (task.dueDate) metaHtml += `<span class="badge"><i class="far fa-clock"></i> ${new Date(task.dueDate).toLocaleString()}</span>`;
        if (task.tags && task.tags.length) {
            metaHtml += task.tags.map(t => `<span class="badge tag">${escapeHtml(t)}</span>`).join('');
        }

        let attachmentsHtml = '';
        if (task.attachments && task.attachments.length) {
            attachmentsHtml = `<div class="attachments-container" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.3rem; align-items:center;">`;
            task.attachments.forEach((att, index) => {
                // Use data attributes to store attachment info
                const dataAttr = encodeURIComponent(att.data);
                const typeAttr = encodeURIComponent(att.type || '');
                const nameAttr = encodeURIComponent(att.name || 'file');
                if (att.type && att.type.startsWith('image/')) {
                    attachmentsHtml += `<img src="${att.data}" class="attachment-thumb" data-attachment="${dataAttr}" data-type="${typeAttr}" data-name="${nameAttr}" alt="${escapeHtml(att.name)}">`;
                } else {
                    const icon = att.type?.includes('pdf') ? '📄' : 
                                 att.type?.includes('zip') ? '📦' : 
                                 att.type?.includes('doc') ? '📝' : '📎';
                    attachmentsHtml += `<span class="attachment-file" data-attachment="${dataAttr}" data-type="${typeAttr}" data-name="${nameAttr}">${icon} ${escapeHtml(att.name)}</span>`;
                }
            });
            attachmentsHtml += `</div>`;
        }

        return `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-row">
                <input type="checkbox" class="task-select" data-id="${task.id}" ${selectedIds.has(task.id) ? 'checked' : ''}>
                <span class="task-title">${escapeHtml(task.title)}</span>
                <div class="task-actions">
                    <button class="complete-btn" data-id="${task.id}" title="Toggle complete"><i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i></button>
                    <button class="edit-btn" data-id="${task.id}" title="Edit task"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${task.id}" title="Delete task"><i class="fas fa-trash"></i></button>
                    <button class="log-btn" data-id="${task.id}" title="Activity log"><i class="fas fa-history"></i></button>
                </div>
            </div>
            ${descMarkup}
            <div class="meta-row">${metaHtml}</div>
            ${attachmentsHtml}
        </div>
        `;
    }).join('');

    // Attach event listeners for task actions
    document.querySelectorAll('.task-select').forEach(cb => cb.addEventListener('change', (e) => { const id = parseFloat(e.target.dataset.id); e.target.checked ? selectedIds.add(id) : selectedIds.delete(id); }));
    document.querySelectorAll('.complete-btn').forEach(btn => btn.addEventListener('click', (e) => onToggleComplete(parseFloat(btn.dataset.id))));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => onDelete(parseFloat(btn.dataset.id), true)));
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => onEdit(parseFloat(btn.dataset.id))));
    document.querySelectorAll('.log-btn').forEach(btn => btn.addEventListener('click', (e) => onShowLog(parseFloat(btn.dataset.id))));

    // Attach click listeners for attachments
    document.querySelectorAll('.attachment-thumb, .attachment-file').forEach(el => {
        el.addEventListener('click', (e) => {
            const data = decodeURIComponent(el.dataset.attachment);
            const type = decodeURIComponent(el.dataset.type);
            const name = decodeURIComponent(el.dataset.name);
            window.openAttachmentModal(data, type, name);
        });
    });
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

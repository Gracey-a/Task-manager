import { escapeHtml } from './utils.js';
export function renderKanban(tasks, onToggle, onEdit, onDelete) {
    const cols = {
        backlog: tasks.filter(t => !t.completed && (!t.priority || t.priority === 'low')),
        inProgress: tasks.filter(t => !t.completed && t.priority === 'medium'),
        done: tasks.filter(t => t.completed)
    };
    const titles = { backlog: 'Backlog', inProgress: 'In Progress', done: 'Completed' };
    let html = '';
    for (const [key, colTasks] of Object.entries(cols)) {
        html += `<div class="kanban-column"><h3>${titles[key]}</h3>`;
        colTasks.forEach(task => {
            html += `<div class="kanban-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                        <div><strong>${escapeHtml(task.title)}</strong></div>
                        <small>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}</small>
                        <div><button class="complete-btn" data-id="${task.id}"><i class="fas fa-check"></i></button>
                        <button class="edit-btn" data-id="${task.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" data-id="${task.id}"><i class="fas fa-trash"></i></button></div>
                    </div>`;
        });
        html += `</div>`;
    }
    document.getElementById("kanbanContainer").innerHTML = html;
    document.querySelectorAll('#kanbanContainer .complete-btn').forEach(btn => btn.addEventListener('click', (e) => onToggle(parseFloat(btn.dataset.id))));
    document.querySelectorAll('#kanbanContainer .edit-btn').forEach(btn => btn.addEventListener('click', (e) => onEdit(parseFloat(btn.dataset.id))));
    document.querySelectorAll('#kanbanContainer .delete-btn').forEach(btn => btn.addEventListener('click', (e) => onDelete(parseFloat(btn.dataset.id), true)));
}

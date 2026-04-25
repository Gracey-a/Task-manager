// js/reminders.js
export function checkRecurringTasks(tasks, saveCallback) {
    let changed = false;
    tasks.forEach(task => {
        if (task.completed && task.recurring) {
            const newTask = { 
                ...task, 
                id: Date.now() + Math.random(), 
                completed: false, 
                createdAt: new Date().toISOString(),
                activityLog: [`Recurring from ${task.title} at ${new Date().toLocaleString()}`]
            };
            if (task.recurring === 'daily' && task.dueDate) {
                let newDue = new Date(task.dueDate);
                newDue.setDate(newDue.getDate() + 1);
                newTask.dueDate = newDue.toISOString().slice(0,16);
            } else if (task.recurring === 'weekly' && task.dueDate) {
                let newDue = new Date(task.dueDate);
                newDue.setDate(newDue.getDate() + 7);
                newTask.dueDate = newDue.toISOString().slice(0,16);
            }
            tasks.push(newTask);
            task.recurring = null;
            changed = true;
        }
    });
    if (changed) saveCallback(tasks);
    return tasks;
}

export function checkReminders(tasks) {
    const now = new Date();
    const upcoming = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) <= new Date(now.getTime() + 3600000));
    if (upcoming.length && Notification.permission === "granted") {
        upcoming.forEach(task => {
            new Notification("TaskForce Reminder", { body: `"${task.title}" is due soon!` });
        });
    }
    return upcoming.length;
}

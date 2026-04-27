// js/reminders.js
export function checkRecurringTasks(tasks, saveCallback) {
    let changed = false;
    tasks.forEach(task => {
        if (task.completed && task.rrule && task.rrule !== '') {
            let newDue = null;
            if (task.dueDate) {
                let d = new Date(task.dueDate);
                const rule = parseRRule(task.rrule);
                if (rule) {
                    const next = rule.after(d);
                    if (next) newDue = next.toISOString().slice(0,16);
                }
            }
            const newTask = { 
                ...task, 
                id: Date.now()+Math.random(), 
                completed: false, 
                dueDate: newDue, 
                createdAt: new Date().toISOString(), 
                activityLog: [`Recurring from ${task.title}`], 
                reminderNotified: false 
            };
            tasks.push(newTask);
            task.rrule = null;
            changed = true;
        }
    });
    if (changed) saveCallback(tasks);
    return tasks;
}

function parseRRule(rruleStr) {
    try { return RRule.fromString(rruleStr); } catch(e) { return null; }
}

export function checkReminders(tasks) {
    const now = new Date();
    let notified = 0;
    tasks.forEach(task => {
        if (task.completed || !task.dueDate) return;
        const offset = task.reminderOffset;
        if (!offset || offset === 0) return;
        if (task.reminderNotified) return;
        const due = new Date(task.dueDate);
        const remindAt = new Date(due.getTime() - offset * 60 * 1000);
        if (now >= remindAt) {
            if (Notification.permission === "granted") {
                new Notification("TaskForce Reminder", {
                    body: `"${task.title}" is due in ${formatReminderOffset(offset)}`,
                    icon: "/icons/icon-192.png"
                });
            }
            task.reminderNotified = true;
            if (window.showToast) window.showToast(`🔔 Reminder: "${task.title}" is due soon!`, true);
            notified++;
        }
    });
    return notified;
}

export function formatReminderOffset(minutes) {
    if (minutes >= 1440) return `${minutes/1440} day(s)`;
    if (minutes >= 60) return `${minutes/60} hour(s)`;
    return `${minutes} minute(s)`;
}

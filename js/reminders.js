export function checkRecurringTasks(tasks, saveCallback) {
    let changed = false;
    tasks.forEach(task => {
        if (task.completed && task.recurring && task.recurring !== '') {
            let newDue = null;
            if (task.dueDate) {
                let d = new Date(task.dueDate);
                if (task.recurring === 'daily') d.setDate(d.getDate() + 1);
                else if (task.recurring === 'weekly') d.setDate(d.getDate() + 7);
                else if (task.recurring === 'custom' && task.recurringDays) d.setDate(d.getDate() + task.recurringDays);
                newDue = d.toISOString().slice(0,16);
            }
            const newTask = { ...task, id: Date.now()+Math.random(), completed: false, dueDate: newDue, createdAt: new Date().toISOString(), activityLog: [`Recurring from ${task.title} at ${new Date().toLocaleString()}`] };
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
        upcoming.forEach(task => { new Notification("TaskForce Reminder", { body: `"${task.title}" is due soon!` }); });
    }
    return upcoming.length;
}

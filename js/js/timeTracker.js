export function startTimerForTask(taskId) {
    let start = Date.now();
    localStorage.setItem(`timer_${taskId}`, start);
    return start;
}
export function stopTimerForTask(taskId, updateTaskCallback) {
    const start = localStorage.getItem(`timer_${taskId}`);
    if (start) {
        const elapsed = Math.floor((Date.now() - parseInt(start)) / 1000);
        localStorage.removeItem(`timer_${taskId}`);
        updateTaskCallback(taskId, elapsed);
        return elapsed;
    }
    return 0;
}

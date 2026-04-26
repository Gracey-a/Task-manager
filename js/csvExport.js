export function exportToCSV(tasks) {
    const headers = ['Title','Description (plain)','Due Date','Priority','Status','Tags','Total Time (s)'];
    const rows = tasks.map(t => [
        t.title, t.description?.replace(/<[^>]*>/g, '') || '', t.dueDate || '', t.priority,
        t.completed ? 'Completed' : 'Active', (t.tags || []).join(';'), t.totalTimeSpent || 0
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'taskforce_export.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

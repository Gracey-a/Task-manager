let chart = null;
export function updateAnalytics(tasks) {
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0,10);
    }).reverse();
    const completedPerDay = last7Days.map(day => tasks.filter(t => t.completed && t.activityLog?.some(log => log.includes(day))).length);
    const ctx = document.getElementById('completionChart').getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, { type: 'line', data: { labels: last7Days, datasets: [{ label: 'Completed tasks', data: completedPerDay, borderColor: '#3B5C7D' }] } });
    const total = tasks.length, completed = tasks.filter(t=>t.completed).length;
    document.getElementById('insights').innerHTML = `✅ Completion rate: ${total?Math.round(completed/total*100):0}%<br>🏆 Total tasks: ${total}`;
}

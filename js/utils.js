function parseSafeDate(dateStr) {
    if (!dateStr) return new Date(0);
    const str = String(dateStr);
    if (str.includes('-')) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    } else if (str.includes('.')) {
        let [d, m, y] = str.split('.').map(Number);
        if (y < 2000) y += 2000;
        return new Date(y, m - 1, d);
    }
    return new Date(str);
}

function formatDisplayTime(timeStr) {
    const str = String(timeStr);
    if (str.includes('T')) {
        const d = new Date(str);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    return str;
}

function getStatusData(dbStatus) {
    if (dbStatus === 'В очереди') return { text: 'Очікує', color: 'text-yellow-600 bg-yellow-100' };
    if (dbStatus === 'Выполнено') return { text: 'Підтверджено', color: 'text-teal-600 bg-teal-100' };
    return { text: 'Скасовано', color: 'text-red-600 bg-red-100' };
}

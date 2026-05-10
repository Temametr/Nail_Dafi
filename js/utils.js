// js/utils.js

export function parseSafeDate(dateStr) {
    if (!dateStr) return new Date(0);
    const str = String(dateStr);
    if (str.includes('-')) {
        const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d);
    } else if (str.includes('.')) {
        let [d, m, y] = str.split('.').map(Number);
        if (y < 2000) y += 2000; return new Date(y, m - 1, d);
    }
    return new Date(str);
}

export function formatDisplayTime(timeStr) {
    const str = String(timeStr);
    if (str.includes('T')) {
        const d = new Date(str); return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    return str;
}

export function getStatusData(dbStatus) {
    if (dbStatus === 'В очереди') return { text: 'Очікує', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (dbStatus === 'Выполнено') return { text: 'Підтверджено', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    return { text: 'Скасовано', color: 'text-red-700 bg-red-50 border-red-200' };
}

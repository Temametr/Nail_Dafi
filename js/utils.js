export function parseSafeDate(dateStr) {
    if (!dateStr) {
        return new Date(0);
    }

    const str = String(dateStr).trim();

    try {
        if (str.includes('-')) {
            const [y, m, d] = str.split('-').map(Number);

            if (
                Number.isNaN(y) ||
                Number.isNaN(m) ||
                Number.isNaN(d)
            ) {
                return new Date(0);
            }

            return new Date(y, m - 1, d);
        }

        if (str.includes('.')) {
            let [d, m, y] = str.split('.').map(Number);

            if (
                Number.isNaN(y) ||
                Number.isNaN(m) ||
                Number.isNaN(d)
            ) {
                return new Date(0);
            }

            if (y < 2000) {
                y += 2000;
            }

            return new Date(y, m - 1, d);
        }

        const parsed = new Date(str);

        if (Number.isNaN(parsed.getTime())) {
            return new Date(0);
        }

        return parsed;
    } catch (e) {
        console.error('parseSafeDate error:', e);
        return new Date(0);
    }
}

export function formatDisplayTime(timeStr) {
    if (!timeStr) return '--:--';

    const str = String(timeStr).trim();

    try {
        if (str.includes('T')) {
            const d = new Date(str);

            if (Number.isNaN(d.getTime())) {
                return '--:--';
            }

            return (
                d.getHours().toString().padStart(2, '0') +
                ':' +
                d.getMinutes().toString().padStart(2, '0')
            );
        }

        return str;
    } catch (e) {
        console.error('formatDisplayTime error:', e);
        return '--:--';
    }
}

export function getStatusData(dbStatus) {
    switch (dbStatus) {
        case 'В очереди':
            return {
                text: 'Очікує',
                color: 'text-amber-700 bg-amber-50 border-amber-200'
            };

        case 'Выполнено':
            return {
                text: 'Підтверджено',
                color: 'text-teal-700 bg-teal-50 border-teal-200'
            };

        case 'Отменено':
            return {
                text: 'Скасовано',
                color: 'text-red-700 bg-red-50 border-red-200'
            };

        default:
            return {
                text: 'Невідомо',
                color: 'text-slate-600 bg-slate-100 border-slate-200'
            };
    }
}

export function sanitizeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function debounce(fn, delay = 250) {
    let timeout;

    return (...args) => {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

export function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

export function safeText(value, fallback = '') {
    if (value === null || value === undefined) {
        return fallback;
    }

    return String(value).trim();
}

export function isValidObject(value) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
    );
}
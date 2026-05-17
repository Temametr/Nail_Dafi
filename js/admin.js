import { state } from './state.js';
import {
    formatDisplayTime,
    getStatusData,
    parseSafeDate,
    sanitizeHtml
} from './utils.js';

const STATUS_PENDING = 'В очереди';
const STATUS_CONFIRMED = 'Подтверждено';
const STATUS_DONE = 'Выполнено';
const STATUS_CANCELLED = 'Отменено';

function normalizeText(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function parsePrice(value) {
    const clean = String(value || '')
        .replace(',', '.')
        .replace(/[^\d.]/g, '');

    return Number(clean) || 0;
}

function getServicePrice(serviceName) {
    const targetName = normalizeText(serviceName);

    const service = (state.services || []).find(item =>
        normalizeText(item.name) === targetName
    );

    if (!service) {
        console.warn('Service price not found:', serviceName);
        return 0;
    }

    return parsePrice(service.price);
}

function parseYmdLocal(value) {
    const parts = String(value || '').split('-').map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return new Date(0);
    }

    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatSelectedDate(value) {
    if (!value) return 'Обраний день';

    const date = parseYmdLocal(value);

    return date.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long'
    });
}

function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function renderAdminStats(period = 'today') {

    const selectedPeriod =
        period || state.adminStatsPeriod || 'today';

    const periodTitleMap = {
        today: 'Сьогодні',
        yesterday: 'Вчора',
        week: 'Тиждень',
        month: 'Місяць',
        year: 'Рік'
    };

    const title =
        document.getElementById('admin-period-title');

    if (title) {
        title.textContent =
    selectedPeriod === 'custom'
        ? formatSelectedDate(state.adminStatsCustomDate)
        : periodTitleMap[selectedPeriod] || 'Сьогодні';
    }

    const bookings = (state.adminBookings || []).filter(booking => {
        if (!booking.rawDate) return false;

        const bookingDate = parseYmdLocal(booking.rawDate);
const now = new Date();

now.setHours(0, 0, 0, 0);

        if (selectedPeriod === 'today') {
            return isSameDay(bookingDate, now);
        }

        if (selectedPeriod === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);

            return isSameDay(bookingDate, yesterday);
        }

        if (selectedPeriod === 'week') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 6);

            return bookingDate >= weekStart && bookingDate <= now;
        }

        if (selectedPeriod === 'month') {
            return (
                bookingDate.getMonth() === now.getMonth() &&
                bookingDate.getFullYear() === now.getFullYear()
            );
        }

        if (selectedPeriod === 'year') {
            return (
                bookingDate.getFullYear() === now.getFullYear()
            );
        }

        if (selectedPeriod === 'custom') {
            if (!state.adminStatsCustomDate) return false;

            const customDate = parseYmdLocal(state.adminStatsCustomDate);

return isSameDay(bookingDate, customDate);
        }

        return false;
    });

    const activeBookings = bookings.filter(
        booking => booking.status !== STATUS_CANCELLED
    );

    const pendingBookings = bookings.filter(
        booking => booking.status === STATUS_PENDING
    );

    const doneBookings = bookings.filter(
        booking => booking.status === STATUS_DONE
    );

    const cancelledBookings = bookings.filter(
        booking => booking.status === STATUS_CANCELLED
    );

    const revenue = doneBookings.reduce((sum, booking) => {
        return sum + getServicePrice(booking.service);
    }, 0);

    const statCount =
        document.getElementById('stat-count');

    const statPending =
        document.getElementById('stat-pending');

    const statRevenue =
        document.getElementById('stat-revenue');

    const statCancelled =
        document.getElementById('stat-cancelled');

    if (statCount) {
        statCount.textContent = activeBookings.length;
    }

    if (statPending) {
        statPending.textContent = pendingBookings.length;
    }

    if (statRevenue) {
        statRevenue.textContent = `${revenue} ₴`;
    }

    if (statCancelled) {
        statCancelled.textContent = cancelledBookings.length;
    }

    renderNearestBooking();
    renderTodaySchedule();
}

function getFilteredAdminBookings() {
    return state.adminBookings.filter(booking => {
        if (
            !state.currentBookingFilter ||
            state.currentBookingFilter === 'all'
        ) {
            return true;
        }

        if (state.currentBookingFilter === 'pending') {
            return booking.status === STATUS_PENDING;
        }

        if (state.currentBookingFilter === 'confirmed') {
            return booking.status === STATUS_CONFIRMED;
        }

        if (state.currentBookingFilter === 'done') {
            return booking.status === STATUS_DONE;
        }

        if (state.currentBookingFilter === 'cancelled') {
            return booking.status === STATUS_CANCELLED;
        }

        return true;
    });
}

export function renderAdminBookings() {
    const container = document.getElementById('admin-bookings-list');

    if (!container) return;

    const filtered = getFilteredAdminBookings();

    if (!filtered.length) {
    container.innerHTML = `
        <div class="bg-white rounded-[1.5rem] px-5 py-10 text-center">
            <div class="text-4xl mb-3">📅</div>

            <div class="text-[15px] font-semibold text-slate-800">
                У цьому розділі записів немає
            </div>

            <div class="text-[12px] text-slate-400 mt-2">
                Нові записи зʼявляться тут автоматично
            </div>
        </div>
    `;
    return;
}

    container.innerHTML = filtered
        .map((booking, index) => renderAdminBookingCard(booking, index))
        .join('');
}

function renderAdminBookingCard(booking, index) {
    const statusData = getStatusData(booking.status);
    const delay = index * 30;

    const isPending = booking.status === STATUS_PENDING;
    const isConfirmed = booking.status === STATUS_CONFIRMED;
    const isDone = isDoneBookingStatus(booking.status);
    const isCancelled = booking.status === STATUS_CANCELLED;

    const time = formatDisplayTime(booking.time);
    const clientName = sanitizeHtml(booking.clientName || 'Клієнт');
    const clientPhone = sanitizeHtml(booking.clientPhone || 'Телефон не вказано');
    const service = sanitizeHtml(booking.service || 'Послуга');
    const date = sanitizeHtml(booking.date || '');
    const masterName = sanitizeHtml(booking.masterName || '');

    const statusIcon = isDone
        ? '✅'
        : isCancelled
            ? '✕'
            : isConfirmed
                ? '🔵'
                : '⏳';

    const statusIconClass = isDone
        ? 'ui-icon-green'
        : isCancelled
            ? 'ui-icon-red'
            : isConfirmed
                ? 'ui-icon-blue'
                : 'ui-icon-amber';

    return `
        <div
            class="
                ui-card p-3 ui-appear
                active:scale-[0.99]
                transition-all duration-200
                ${isCancelled ? 'opacity-70' : ''}
            "
            style="animation-delay: ${delay}ms;"
        >
            <div class="flex items-start gap-3">
                <div class="ui-icon ${statusIconClass}">
                    ${statusIcon}
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 min-w-0">
                                <div class="text-[16px] font-black text-slate-950 leading-tight truncate">
                                    ${time}
                                </div>

                                <div class="text-[11px] font-bold text-slate-400 truncate">
                                    ${date}
                                </div>
                            </div>

                            <div class="text-[15px] font-black text-slate-900 mt-1 truncate">
                                ${clientName}
                            </div>
                        </div>

                        <span class="text-[10px] font-black px-2.5 py-1.5 rounded-full border shrink-0 ${statusData.color}">
                            ${statusData.text}
                        </span>
                    </div>

                    <div class="text-[13px] font-bold text-slate-600 mt-2 truncate">
                        ${service}
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5 mt-2">
                        <span class="ui-chip">
                            📞 ${clientPhone}
                        </span>

                        ${
                            masterName
                                ? `
                                    <span class="ui-chip">
                                        💅 ${masterName}
                                    </span>
                                `
                                : ''
                        }

                        ${
                            booking.clientTelegram
                                ? `
                                    <button
                                        type="button"
                                        onclick="event.stopPropagation(); window.appAPI.openTelegramChat('${sanitizeHtml(booking.clientTelegram)}')"
                                        class="ui-chip bg-teal-50 text-teal-700 border-teal-100 active:scale-95 transition-all"
                                    >
                                        💬 Telegram
                                    </button>
                                `
                                : ''
                        }
                    </div>

                    ${
                        booking.cancelReason
                            ? `
                                <div class="mt-3 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2 leading-relaxed">
                                    Причина: ${sanitizeHtml(booking.cancelReason)}
                                </div>
                            `
                            : ''
                    }
                </div>
            </div>

            ${renderAdminActions(booking)}
        </div>
    `;
}

function renderAdminTelegramButton(booking) {
    return '';
}

function isDoneBookingStatus(status) {
    const value = String(status || '').trim().toLowerCase();

    return (
        value === 'выполнено' ||
        value === 'виконано' ||
        value === 'done'
    );
}

function renderAdminActions(booking) {
    if (booking.status === STATUS_PENDING) {
        return `
            <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                    onclick="window.appAPI.changeBookingStatus('${booking.id}', '${STATUS_CONFIRMED}')"
                    class="h-11 rounded-2xl bg-slate-950 text-white text-xs font-black shadow-lg active:scale-95 transition-all"
                >
                    ✅ Прийняти
                </button>

                <button
                    onclick="window.appAPI.openCancelModal('${booking.id}', 'admin')"
                    class="h-11 rounded-2xl bg-white text-red-600 text-xs font-black border border-red-100 active:scale-95 transition-all"
                >
                    ✕ Відмовити
                </button>
            </div>
        `;
    }

    if (booking.status === STATUS_CONFIRMED) {
        return `
            <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                    onclick="window.appAPI.changeBookingStatus('${booking.id}', '${STATUS_DONE}')"
                    class="h-11 rounded-2xl bg-emerald-500 text-white text-xs font-black shadow-lg active:scale-95 transition-all"
                >
                    ✅ Виконано
                </button>

                <button
                    onclick="window.appAPI.openCancelModal('${booking.id}', 'admin')"
                    class="h-11 rounded-2xl bg-white text-red-600 text-xs font-black border border-red-100 active:scale-95 transition-all"
                >
                    ✕ Скасувати
                </button>
            </div>
        `;
    }

    if (isDoneBookingStatus(booking.status)) {
        return `
            <div class="mt-3 pt-3 border-t border-slate-100">
                <button
                    type="button"
                    onclick="window.appAPI.openWorkPhotosModalByBookingId('${booking.id}')"
                    class="w-full h-11 rounded-2xl bg-slate-950 text-white text-xs font-black shadow-lg active:scale-95 transition-all"
                >
                    📸 Додати фото роботи
                </button>
            </div>
        `;
    }

    return '';
}

function renderNearestBooking() {

    const container =
        document.getElementById(
            'admin-next-booking'
        );

    if (!container) return;

    const now = new Date();

    const nearest = (state.adminBookings || [])
        .filter(booking =>
            booking.status !== STATUS_CANCELLED &&
            booking.status !== STATUS_DONE
        )
        .map(booking => {

            const dateTime = new Date(
                `${booking.rawDate}T${booking.time}`
            );

            return {
                ...booking,
                timestamp: dateTime.getTime()
            };
        })
        .filter(booking =>
            booking.timestamp >= now.getTime()
        )
        .sort((a, b) =>
            a.timestamp - b.timestamp
        )[0];

    if (!nearest) {

        container.innerHTML = `
            <div class="text-center py-7">
                <div class="text-4xl mb-3">🌸</div>

                <div class="text-sm font-black text-slate-700">
                    Найближчих активних записів немає
                </div>

                <div class="text-xs font-medium text-slate-400 mt-1">
                    Можна трохи видихнути ✨
                </div>
            </div>
        `;

        return;
    }

    const statusData =
        getStatusData(nearest.status);

    const isPending =
        nearest.status === STATUS_PENDING;

    const isConfirmed =
        nearest.status === STATUS_CONFIRMED;

    container.innerHTML = `
        <div class="space-y-5">

            <div class="flex items-start justify-between gap-4">

                <div class="flex-1 min-w-0">

                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-[10px] font-black px-3 py-1.5 rounded-full border ${statusData.color}">
                            ${statusData.text}
                        </span>

                        <span class="text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-100 text-slate-500">
                            Найближчий
                        </span>
                    </div>

                    <div class="text-xl font-black text-slate-950 truncate">
                        ${sanitizeHtml(nearest.clientName)}
                    </div>

                    <div class="text-sm font-semibold text-slate-500 mt-1 truncate">
                        ${sanitizeHtml(nearest.service)}
                    </div>

                    <div class="grid grid-cols-2 gap-2 mt-4">

                        <div class="px-3 py-3 rounded-2xl bg-blue-50 text-blue-600">
                            <div class="text-[9px] font-black uppercase tracking-wider opacity-60">
                                Час
                            </div>
                            <div class="text-sm font-black mt-0.5">
                                ${sanitizeHtml(nearest.time)}
                            </div>
                        </div>

                        <div class="px-3 py-3 rounded-2xl bg-emerald-50 text-emerald-600">
                            <div class="text-[9px] font-black uppercase tracking-wider opacity-60">
                                Телефон
                            </div>
                            <div class="text-sm font-black mt-0.5 truncate">
                                ${sanitizeHtml(nearest.clientPhone || '—')}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="w-16 h-16 rounded-[1.4rem] bg-gradient-to-br from-rose-100 to-blue-100 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    💅
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">

                ${
                    nearest.clientTelegram
                        ? `
                            <button
                                onclick="window.appAPI.openTelegramChat('${nearest.clientTelegram}')"
                                class="card-convex-sm py-3 bg-teal-50 text-teal-800 rounded-xl text-sm font-black active:scale-95 transition-all"
                            >
                                💬 Написати
                            </button>
                        `
                        : `
                            <a
                                href="tel:${sanitizeHtml(nearest.clientPhone || '')}"
                                class="card-convex-sm py-3 bg-teal-50 text-teal-800 rounded-xl text-sm font-black active:scale-95 transition-all text-center"
                            >
                                📞 Подзвонити
                            </a>
                        `
                }

                ${
                    isPending
                        ? `
                            <button
                                onclick="window.appAPI.changeBookingStatus('${nearest.id}', '${STATUS_CONFIRMED}')"
                                class="card-convex-sm py-3 bg-slate-950 text-white rounded-xl text-sm font-black shadow-lg active:scale-95 transition-all"
                            >
                                Прийняти
                            </button>
                        `
                        : ''
                }

                ${
                    isConfirmed
                        ? `
                            <button
                                onclick="window.appAPI.changeBookingStatus('${nearest.id}', '${STATUS_DONE}')"
                                class="card-convex-sm py-3 bg-emerald-500 text-white rounded-xl text-sm font-black shadow-lg active:scale-95 transition-all"
                            >
                                Виконано
                            </button>
                        `
                        : ''
                }

                <button
                    onclick="window.appAPI.openCancelModal('${nearest.id}', 'admin')"
                    class="card-convex-sm py-3 bg-white text-red-600 rounded-xl text-sm font-black border border-red-100 active:scale-95 transition-all ${isPending || isConfirmed ? 'col-span-2' : ''}"
                >
                    Скасувати
                </button>
            </div>
        </div>
    `;
}

function renderTodaySchedule() {

    const container =
        document.getElementById(
            'admin-today-schedule'
        );

    if (!container) return;

    const now = new Date();

    const todayBookings = (state.adminBookings || [])
        .filter(booking => {

            if (
                booking.status === STATUS_CANCELLED
            ) {
                return false;
            }

            const bookingDate =
                new Date(booking.rawDate);

            return (
                bookingDate.toDateString() ===
                now.toDateString()
            );
        })
        .sort((a, b) =>
            String(a.time).localeCompare(
                String(b.time)
            )
        );

    if (!todayBookings.length) {

        container.innerHTML = `
            <div class="card-convex p-8 text-center">
                <div class="text-4xl mb-3">✨</div>

                <div class="text-sm font-black text-slate-700">
                    Сьогодні записів поки немає
                </div>

                <div class="text-xs font-medium text-slate-400 mt-1">
                    Ідеальний день для планування 💅
                </div>
            </div>
        `;

        return;
    }

    container.innerHTML =
        todayBookings.map(booking => {

            const statusData =
                getStatusData(booking.status);

            const isPending =
                booking.status === STATUS_PENDING;

            const isConfirmed =
                booking.status === STATUS_CONFIRMED;

            const isDone =
                booking.status === STATUS_DONE;

            return `

                <div class="card-convex p-4">

                    <div class="flex items-start gap-4">

                        <div class="w-14 h-14 rounded-2xl bg-slate-950 text-white flex flex-col items-center justify-center shrink-0 shadow-lg">

                            <div class="text-[10px] font-bold opacity-70 uppercase">
                                час
                            </div>

                            <div class="text-sm font-black">
                                ${sanitizeHtml(booking.time)}
                            </div>
                        </div>

                        <div class="flex-1 min-w-0">

                            <div class="flex items-start justify-between gap-2">

                                <div class="min-w-0">
                                    <div class="text-sm font-black text-slate-950 truncate">
                                        ${sanitizeHtml(booking.clientName)}
                                    </div>

                                    <div class="text-xs font-semibold text-slate-400 mt-1 truncate">
                                        ${sanitizeHtml(booking.service)}
                                    </div>
                                </div>

                                <span class="text-[9px] font-black px-2.5 py-1.5 rounded-full border shrink-0 ${statusData.color}">
                                    ${statusData.text}
                                </span>
                            </div>

                            <div class="flex items-center gap-2 mt-3 flex-wrap">

                                <a
                                    href="tel:${sanitizeHtml(booking.clientPhone || '')}"
                                    class="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl active:scale-95 transition-all"
                                >
                                    📞 ${sanitizeHtml(booking.clientPhone || '—')}
                                </a>

                                ${
                                    booking.clientTelegram
                                        ? `
                                            <button
                                                onclick="window.appAPI.openTelegramChat('${booking.clientTelegram}')"
                                                class="text-[11px] font-black text-teal-700 bg-teal-50 px-3 py-2 rounded-xl active:scale-95 transition-all"
                                            >
                                                💬 Telegram
                                            </button>
                                        `
                                        : ''
                                }
                            </div>
                        </div>
                    </div>

                    ${
                        !isDone
                            ? `
                                <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">

                                    ${
                                        isPending
                                            ? `
                                                <button
                                                    onclick="window.appAPI.changeBookingStatus('${booking.id}', '${STATUS_CONFIRMED}')"
                                                    class="py-3 bg-slate-950 text-white rounded-xl text-xs font-black shadow-lg active:scale-95 transition-all"
                                                >
                                                    Прийняти
                                                </button>
                                            `
                                            : ''
                                    }

                                    ${
                                        isConfirmed
                                            ? `
                                                <button
                                                    onclick="window.appAPI.changeBookingStatus('${booking.id}', '${STATUS_DONE}')"
                                                    class="py-3 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg active:scale-95 transition-all"
                                                >
                                                    Виконано
                                                </button>
                                            `
                                            : ''
                                    }

                                    <button
                                        onclick="window.appAPI.openCancelModal('${booking.id}', 'admin')"
                                        class="py-3 bg-white text-red-600 rounded-xl text-xs font-black border border-red-100 active:scale-95 transition-all ${isPending || isConfirmed ? '' : 'col-span-2'}"
                                    >
                                        Скасувати
                                    </button>
                                </div>
                            `
                            : `
    <div class="mt-4 pt-4 border-t border-slate-100 space-y-2">
        <div class="py-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black text-center">
            ✅ Послуга виконана
        </div>

        <button
            type="button"
            onclick="window.appAPI.openWorkPhotosModalByBookingId('${booking.id}')"
            class="w-full py-3 bg-slate-950 text-white rounded-xl text-xs font-black shadow-lg active:scale-95 transition-all"
        >
            📸 Додати фото роботи
        </button>
    </div>
`
                    }
                </div>
            `;
        }).join('');
}
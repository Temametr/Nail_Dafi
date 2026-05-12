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

export function renderAdminStats(period = 'day') {

    const now = new Date();

    const bookings = (state.adminBookings || []).filter(booking => {

        if (!booking.rawDate) {
            return false;
        }

        const bookingDate = new Date(booking.rawDate);

        if (period === 'day') {
            return bookingDate.toDateString() === now.toDateString();
        }

        if (period === 'week') {

            const diff =
                (bookingDate - now) / (1000 * 60 * 60 * 24);

            return diff >= -7 && diff <= 7;
        }

        if (period === 'month') {
            return (
                bookingDate.getMonth() === now.getMonth() &&
                bookingDate.getFullYear() === now.getFullYear()
            );
        }

        return true;
    });

    const activeBookings = bookings.filter(
        booking =>
            booking.status !== 'Отменено'
    );

    const pendingBookings = bookings.filter(
        booking =>
            booking.status === 'В очереди'
    );

    const cancelledBookings = bookings.filter(
        booking =>
            booking.status === 'Отменено'
    );

    let revenue = 0;

    activeBookings.forEach(booking => {

        const service = state.services.find(
            item =>
                String(item.name) === String(booking.service)
        );

        if (!service) return;

        revenue += Number(service.price || 0);
    });

    const statCount =
        document.getElementById('stat-count');

    const statPending =
        document.getElementById('stat-pending');

    const statRevenue =
        document.getElementById('stat-revenue');

    const statCancelled =
        document.getElementById('stat-cancelled');

    if (statCount) {
        statCount.textContent =
            activeBookings.length;
    }

    if (statPending) {
        statPending.textContent =
            pendingBookings.length;
    }

    if (statRevenue) {
        statRevenue.textContent =
            `${revenue} ₴`;
    }

    if (statCancelled) {
        statCancelled.textContent =
            cancelledBookings.length;
    }

    renderNearestBooking();
    renderTodaySchedule();
}

function getFilteredAdminBookings() {
    return state.adminBookings.filter(booking => {
        if (state.currentBookingFilter === 'pending') {
            return booking.status === STATUS_PENDING;
        }

        if (state.currentBookingFilter === 'confirmed') {
            return booking.status === STATUS_CONFIRMED;
        }

        if (state.currentBookingFilter === 'done') {
            return booking.status === STATUS_DONE;
        }

        return booking.status === STATUS_CANCELLED;
    });
}

function syncAdminBookingTabsVisibility() {
    const hasPending = state.adminBookings.some(
        booking => booking.status === STATUS_PENDING
    );

    const pendingTab = document.getElementById('admin-subtab-pending');

    if (pendingTab) {
        pendingTab.classList.toggle('hidden', !hasPending);
    }

    if (!hasPending && state.currentBookingFilter === 'pending') {
        state.currentBookingFilter = 'confirmed';
    }
}

export function renderAdminBookings() {
    const container = document.getElementById('admin-bookings-list');

    if (!container) return;

    syncAdminBookingTabsVisibility();

    const filtered = getFilteredAdminBookings();

    if (!filtered.length) {
        container.innerHTML =
            "<div class='text-center py-12 text-slate-400 font-medium'>У цьому розділі записів немає.</div>";
        return;
    }

    container.innerHTML = filtered
        .map((booking, index) => renderAdminBookingCard(booking, index))
        .join('');
}

function renderAdminBookingCard(booking, index) {
    const statusData = getStatusData(booking.status);
    const delay = index * 35;

    return `
        <div
            class="card-convex p-5 mb-5 shadow-convex animate-pop-in border border-white"
            style="animation-delay: ${delay}ms;"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="w-full pr-3">
                    <div class="font-extrabold text-slate-950 text-lg mb-4 tracking-tight leading-tight">
                        ${sanitizeHtml(booking.service)}
                    </div>

                    <div class="space-y-2">
                        <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5">
                            <span class="w-7 h-7 rounded-full bg-slate-100 flex justify-center items-center text-slate-500 text-[10px]">
                                📅
                            </span>
                            ${sanitizeHtml(booking.date)} в ${formatDisplayTime(booking.time)}
                        </div>

                        <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5">
                            <span class="w-7 h-7 rounded-full bg-slate-100 flex justify-center items-center text-slate-500 text-[10px]">
                                👤
                            </span>
                            ${sanitizeHtml(booking.clientName)}
                        </div>
                        <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5">
    <span class="w-7 h-7 rounded-full bg-green-50 flex justify-center items-center text-green-600 text-[10px]">
        📞
    </span>
    ${sanitizeHtml(booking.clientPhone || 'Телефон не вказано')}
</div>
                    </div>
                </div>

                <span class="text-[10px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${statusData.color}">
                    ${statusData.text}
                </span>
            </div>

            ${renderAdminTelegramButton(booking)}

            ${
                booking.cancelReason
                    ? `
                        <div class="text-xs text-red-700 mt-4 bg-red-50 p-4 rounded-2xl border border-red-100 font-medium leading-relaxed">
                            Причина: ${sanitizeHtml(booking.cancelReason)}
                        </div>
                    `
                    : ''
            }

            ${renderAdminActions(booking)}
        </div>
    `;
}

function renderAdminTelegramButton(booking) {
    if (!booking.clientTelegram) {
        return '';
    }

    return `
        <button
            onclick="window.appAPI.openTelegramChat('${booking.clientTelegram}')"
            class="card-convex-sm shadow-convex-sm flex items-center justify-center w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-sm font-bold mt-5 active:scale-95 transition-all"
        >
            💬 Написати клієнту
        </button>
    `;
}

function renderAdminActions(booking) {
    if (booking.status === STATUS_PENDING) {
        return `
            <div class="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                <button
                    onclick="window.appAPI.changeBookingStatus('${booking.id}', '${STATUS_CONFIRMED}')"
                    class="card-convex-sm flex-1 py-3.5 bg-slate-950 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all"
                >
                    Прийняти
                </button>

                <button
                    onclick="window.appAPI.openCancelModal('${booking.id}', 'admin')"
                    class="card-convex-sm flex-1 py-3.5 bg-white text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200"
                >
                    Відмовити
                </button>
            </div>
        `;
    }

    if (booking.status === STATUS_CONFIRMED) {
        return `
            <div class="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                <button
                    onclick="window.appAPI.changeBookingStatus('${booking.id}', '${STATUS_DONE}')"
                    class="card-convex-sm flex-1 py-3.5 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all"
                >
                    Виконано
                </button>

                <button
                    onclick="window.appAPI.openCancelModal('${booking.id}', 'admin')"
                    class="card-convex-sm flex-1 py-3.5 bg-white text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold active:scale-95 transition-all border border-red-100"
                >
                    Скасувати
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
                booking.status === 'Отменено'
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
                <div class="text-sm font-bold text-slate-500">
                    Сьогодні записів поки немає
                </div>
            </div>
        `;

        return;
    }

    container.innerHTML =
        todayBookings.map(booking => `

            <div class="card-convex p-4 flex items-center gap-4">

                <div class="w-14 h-14 rounded-2xl bg-slate-950 text-white flex flex-col items-center justify-center shrink-0 shadow-lg">

                    <div class="text-[10px] font-bold opacity-70 uppercase">
                        час
                    </div>

                    <div class="text-sm font-black">
                        ${sanitizeHtml(booking.time)}
                    </div>
                </div>

                <div class="flex-1 min-w-0">

                    <div class="text-sm font-black text-slate-950 truncate">
                        ${sanitizeHtml(booking.clientName)}
                    </div>

                    <div class="text-xs font-semibold text-slate-400 mt-1 truncate">
                        ${sanitizeHtml(booking.service)}
                    </div>

                    <div class="flex items-center gap-2 mt-3">

                        <div class="text-[11px] font-bold text-emerald-600">
                            📞 ${sanitizeHtml(booking.clientPhone || '—')}
                        </div>

                    </div>
                </div>

                <div class="
                    px-3 py-2 rounded-xl text-[10px]
                    font-black uppercase tracking-wider
                    ${booking.status === 'Выполнено'
                        ? 'bg-emerald-50 text-emerald-600'
                        : booking.status === 'В очереди'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-blue-50 text-blue-600'}
                ">
                    ${sanitizeHtml(booking.status)}
                </div>

            </div>

        `).join('');
}
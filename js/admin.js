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

export function renderAdminStats(period) {
    ['day', 'week', 'month'].forEach(item => {
        const button = document.getElementById(`stat-btn-${item}`);

        if (!button) return;

        if (item === period) {
            button.classList.remove('text-slate-400');
            button.classList.add('bg-white', 'shadow-md', 'text-slate-950');
        } else {
            button.classList.add('text-slate-400');
            button.classList.remove('bg-white', 'shadow-md', 'text-slate-950');
        }
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let startDate = new Date(now);

    if (period === 'week') {
        startDate.setDate(now.getDate() - 6);
    } else if (period === 'month') {
        startDate.setDate(now.getDate() - 29);
    }

    let totalCount = 0;
    let totalRevenue = 0;
    let cancelledCount = 0;

    state.adminBookings.forEach(booking => {
        const bookingDate = parseSafeDate(booking.date);
        bookingDate.setHours(0, 0, 0, 0);

        const service = state.services.find(
            item => item.name === booking.service
        );

        const price = service ? Number(service.price) || 0 : 0;

        const inRange =
            period === 'day'
                ? bookingDate.getTime() === now.getTime()
                : bookingDate >= startDate && bookingDate <= now;

        if (!inRange) return;

        if (
            booking.status === STATUS_PENDING ||
            booking.status === STATUS_CONFIRMED ||
            booking.status === STATUS_DONE
        ) {
            totalCount++;
        }

        if (booking.status === STATUS_DONE) {
            totalRevenue += price;
        }

        if (booking.status === STATUS_CANCELLED) {
            cancelledCount++;
        }
    });

    const countEl = document.getElementById('stat-count');
    const revenueEl = document.getElementById('stat-revenue');
    const cancelledEl = document.getElementById('stat-cancelled');

    if (countEl) countEl.innerText = totalCount;
    if (revenueEl) revenueEl.innerText = `${totalRevenue} ₴`;
    if (cancelledEl) cancelledEl.innerText = cancelledCount;
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
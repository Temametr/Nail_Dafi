import { state } from '../state.js';
import { formatDisplayTime, getStatusData, sanitizeHtml } from '../utils.js';

export function renderClientBookings() {
    const container = document.getElementById('my-bookings-list');

    if (!container) return;

    const filtered = state.clientBookings.filter(booking => {
        if (state.currentBookingFilter === 'active') {
            return booking.status === 'В очереди' || booking.status === 'Выполнено';
        }

        return booking.status === 'Отменено';
    });

    if (filtered.length === 0) {
        container.innerHTML =
            "<div class='text-center py-12 text-slate-400 font-medium'>У тебе поки немає записів.</div>";
        return;
    }

    container.innerHTML = filtered.map((booking, index) => {
        const isConfirmed = booking.status === 'Выполнено';
        const isPending = booking.status === 'В очереди';
        const statusData = getStatusData(booking.status);

        const master = state.masters.find(
            item => item.id.toString() === String(booking.masterId || '')
        );

        const masterName = master
            ? master.name.replace(/^(Майстер|Мастер)\s+/i, '').trim()
            : 'Майстра не знайдено';

        const delay = index * 40;

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
                                ${sanitizeHtml(booking.date)} о ${formatDisplayTime(booking.time)}
                            </div>

                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-full bg-rose-50 flex justify-center items-center text-rose-500 text-[10px]">
                                    💅
                                </span>
                                Майстер: ${sanitizeHtml(masterName)}
                            </div>
                        </div>
                    </div>

                    <span class="text-[10px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${statusData.color}">
                        ${statusData.text}
                    </span>
                </div>

                ${
                    booking.cancelReason
                        ? `
                            <div class="text-xs text-red-700 mt-4 bg-red-50 p-4 rounded-2xl border border-red-100 font-medium leading-relaxed">
                                Коментар: ${sanitizeHtml(booking.cancelReason)}
                            </div>
                        `
                        : ''
                }

                ${
                    isPending || isConfirmed
                        ? `
                            <div class="mt-4 pt-4 border-t border-slate-100 space-y-3.5">
                                ${
                                    isConfirmed
                                        ? `
                                          <button
    onclick='window.appAPI.openBookingMessages(${JSON.stringify(booking)})'
    class="card-convex-sm flex items-center justify-center w-full py-3.5 bg-slate-950 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all"
>
    Написати майстру 💬
</button>

                                            <div class="flex gap-3">
                                                <button
                                                    onclick="window.appAPI.startReschedule('${booking.id}')"
                                                    class="card-convex-sm flex-1 py-3 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200"
                                                >
                                                    Перенести
                                                </button>

                                                <button
                                                    onclick="window.appAPI.openCancelModal('${booking.id}', 'client')"
                                                    class="card-convex-sm flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold active:scale-95 transition-all border border-red-100"
                                                >
                                                    Скасувати
                                                </button>
                                            </div>
                                        `
                                        : `
                                            <button
                                                onclick="window.appAPI.openCancelModal('${booking.id}', 'client')"
                                                class="card-convex-sm w-full py-3.5 bg-white text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200"
                                            >
                                                Скасувати візит
                                            </button>
                                        `
                                }
                            </div>
                        `
                        : ''
                }
            </div>
        `;
    }).join('');
}
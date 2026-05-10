// js/admin.js
import { state, tg } from './state.js';
import { formatDisplayTime, getStatusData, parseSafeDate } from './utils.js';
import { updateBookingStatusAPI, fetchBookings } from './api.js';

export function renderAdminStats(period) {
    ['day', 'week', 'month'].forEach(p => {
        const btn = document.getElementById(`stat-btn-${p}`);
        if (p === period) {
            btn.classList.remove('text-slate-400'); btn.classList.add('bg-white', 'shadow-md', 'text-slate-950');
        } else {
            btn.classList.add('text-slate-400'); btn.classList.remove('bg-white', 'shadow-md', 'text-slate-950');
        }
    });

    const now = new Date(); now.setHours(0, 0, 0, 0); 
    let startDate = new Date(now);
    if (period === 'week') startDate.setDate(now.getDate() - 6); 
    else if (period === 'month') startDate.setDate(now.getDate() - 29); 

    let totalCount = 0; let totalRevenue = 0; let cancelledCount = 0;

    state.adminBookings.forEach(b => {
        const bDate = parseSafeDate(b.date); bDate.setHours(0, 0, 0, 0);
        const s = state.services.find(srv => srv.name === b.service);
        const price = s ? Number(s.price) : 0;
        let isMatch = false;

        if (period === 'day') { if (bDate.getTime() === now.getTime()) isMatch = true; } 
        else { if (bDate >= startDate && bDate <= now) isMatch = true; }

        if (isMatch) {
            if (b.status === 'Выполнено' || b.status === 'В очереди') { totalCount++; totalRevenue += price; } 
            else if (b.status === 'Отменено') cancelledCount++;
        }
    });

    document.getElementById('stat-count').innerText = totalCount;
    document.getElementById('stat-revenue').innerText = `${totalRevenue} ₴`;
    document.getElementById('stat-cancelled').innerText = cancelledCount;
}

export function renderAdminBookings() {
    const container = document.getElementById('admin-bookings-list');
    const filtered = state.adminBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });

    if (filtered.length === 0) { 
        container.innerHTML = "<div class='text-center py-12 text-slate-400 font-medium'>Записей пока нет</div>"; 
        return; 
    }

    container.innerHTML = filtered.map((b, i) => {
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        const delay = i * 40;

        return `
            <div class="card-convex p-5 mb-5 shadow-convex animate-pop-in border border-white" style="animation-delay: ${delay}ms;">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-full pr-3">
                        <div class="font-extrabold text-slate-950 text-lg mb-4 tracking-tight leading-tight">${b.service}</div>
                        <div class="space-y-2">
                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5"><span class="w-7 h-7 rounded-full bg-slate-100 flex justify-center items-center text-slate-500 text-[10px]">📅</span> ${b.date} в ${formatDisplayTime(b.time)}</div>
                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5"><span class="w-7 h-7 rounded-full bg-slate-100 flex justify-center items-center text-slate-500 text-[10px]">👤</span> ${b.clientName}</div>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                <a href="tg://user?id=${b.clientId}" class="card-convex-sm shadow-convex-sm flex items-center justify-center w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-sm font-bold mt-5 active:scale-95 transition-all">💬 Написать клиенту</a>
                ${b.cancelReason ? `<div class="text-xs text-red-700 mt-4 bg-red-50 p-4 rounded-2xl border border-red-100 font-medium leading-relaxed">Причина: ${b.cancelReason}</div>` : ''}
                ${isPending ? `<div class="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button onclick="window.appAPI.changeBookingStatus('${b.id}', 'Выполнено')" class="card-convex-sm flex-1 py-3.5 bg-slate-950 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all">Принять</button>
                    <button onclick="window.appAPI.openCancelModal('${b.id}', 'admin')" class="card-convex-sm flex-1 py-3.5 bg-white text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200">Отказать</button>
                </div>` : ''}
            </div>
        `;
    }).join('');
}

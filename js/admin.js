function renderAdminStats(period) {
    ['day', 'week', 'month'].forEach(p => {
        const btn = document.getElementById(`stat-btn-${p}`);
        if (p === period) {
            btn.classList.remove('text-slate-500'); btn.classList.add('bg-white', 'shadow-sm', 'text-slate-800');
        } else {
            btn.classList.add('text-slate-500'); btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-800');
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

function renderAdminBookings() {
    const container = document.getElementById('admin-bookings-list');
    const filtered = state.adminBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });

    if (filtered.length === 0) { container.innerHTML = "<div class='text-center py-4 text-slate-500 mt-6'>Записів у цій категорії немає.</div>"; return; }

    container.innerHTML = filtered.map(b => {
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);

        return `
            <div class="glass p-5 rounded-3xl mb-4 border-l-4 ${isPending ? 'border-yellow-400' : 'border-transparent'} shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 bg-white/80 backdrop-blur-md">
                <div class="flex justify-between items-start mb-3">
                    <div class="w-full pr-3">
                        <div class="font-bold text-slate-800 text-base mb-3 leading-tight">Запис на ${b.service}</div>
                        <div class="text-sm text-slate-600 mb-1">Обрана дата: <span class="font-semibold text-slate-800">${b.date}</span></div>
                        <div class="text-sm text-slate-600 mb-3">Обраний час: <span class="font-semibold text-slate-800">${formatDisplayTime(b.time)}</span></div>
                        <div class="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">👤</span>${b.clientName}
                        </div>
                    </div>
                    <span class="text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                
                <a href="tg://user?id=${b.clientId}" class="flex items-center justify-center w-full py-2 bg-teal-50 text-teal-700 rounded-xl text-sm font-bold mt-2 active:scale-95 transition-all">✉️ Написати клієнту</a>
                
                ${b.cancelReason ? `<div class="text-xs text-red-500 mt-3 bg-red-50 p-2.5 rounded-xl border border-red-100">Причина: ${b.cancelReason}</div>` : ''}
                ${isPending ? `<div class="flex gap-2 mt-3 pt-3 border-t border-slate-200/50">
                        <button onclick="changeBookingStatus('${b.id}', 'Выполнено')" class="flex-1 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm">Підтвердити</button>
                        <button onclick="openCancelModal('${b.id}', 'admin')" class="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold active:scale-95 transition-all">Скасувати</button>
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

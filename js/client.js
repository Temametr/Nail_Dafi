import { state, tg } from './state.js';
import { formatDisplayTime, getStatusData } from './utils.js';

export function renderHomeMasters() {
    const list = document.getElementById('home-masters-list');
    const reversedMasters = [...state.masters].reverse();
    
    list.innerHTML = reversedMasters.map((m, i) => {
        const cleanName = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        const originalIndex = state.masters.indexOf(m);
        const imgSrc = originalIndex === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
        
        return `
        <div onclick="window.appAPI.openMasterProfile('${m.id}')" class="cursor-pointer relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-convex animate-pop-in border-2 border-white/60" style="animation-delay: ${i*50}ms">
            <img src="${imgSrc}" alt="${cleanName}" class="absolute inset-0 w-full h-full object-cover">
            <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-rose-950/60 via-rose-900/20 to-transparent"></div>
            <div class="absolute bottom-2.5 left-2.5 right-2.5 bg-white/85 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-white/60 text-center flex flex-col justify-center items-center">
                <h3 class="font-black text-slate-900 text-sm tracking-tight leading-none mb-1 truncate w-full">${cleanName}</h3>
                <p class="text-[8px] font-bold text-rose-500 uppercase tracking-widest">Топ-майстер</p>
            </div>
        </div>
        `;
    }).join('');
}

export function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map((s, i) => `
        <div onclick="window.appAPI.selectService('${s.id}')" class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 transition-all duration-300 cursor-pointer shadow-convex animate-pop-in border border-white" style="animation-delay: ${i*40}ms">
            <div class="flex items-center gap-4 flex-1 min-w-0 pr-2">
                <div class="shrink-0 w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shadow-inner border border-blue-100">💅</div>
                <div class="flex-1 min-w-0">
                    <div class="font-extrabold text-slate-950 text-lg leading-tight break-words tracking-tight">${s.name}</div>
                    <div class="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5"><span class="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">🕒</span> ${s.duration} хв</div>
                </div>
            </div>
            <div class="text-slate-950 font-black text-xl whitespace-nowrap tracking-tight">${s.price} ₴</div>
        </div>
    `).join('');
}

export function renderMasters() {
    const list = document.getElementById('masters-list');
    list.innerHTML = state.masters.map((m, i) => {
        const cleanName = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        const imgSrc = state.masters.indexOf(m) === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
        return `
        <div onclick="window.appAPI.selectMaster('${m.id}')" class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 transition-all duration-300 cursor-pointer shadow-convex animate-pop-in border border-white" style="animation-delay: ${i*40}ms">
            <div class="flex items-center gap-4 flex-1 min-w-0">
                <div class="relative shrink-0">
                    <div class="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center font-black text-teal-600 text-2xl shadow-inner border border-teal-100 overflow-hidden">
                        <img src="${imgSrc}" alt="${cleanName}" class="w-full h-full object-cover">
                    </div>
                    <div class="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full shadow-sm"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-extrabold text-slate-950 text-lg truncate tracking-tight">${cleanName}</div>
                    <div class="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Графік: ${m.workHours}</div>
                </div>
            </div>
            <div class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
        </div>
    `}).join('');
}

export function renderCalendar() {
    const container = document.getElementById('date-scroll');
    container.innerHTML = ''; document.getElementById('time-slots').innerHTML = ''; 
    state.selectedDate = null; state.selectedTime = null;
    tg.MainButton.hide();

    const now = new Date(); const currentHour = now.getHours();
    for (let i = 0; i < 14; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i);
        const dayOfWeek = d.getDay(); 
        let isWorkingDay = dayOfWeek !== 1 && state.selectedMaster.workDays.includes(dayOfWeek);
        if (i === 0 && currentHour >= 18) isWorkingDay = false;

        const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]; 
        const dayNames = ['Нд', 'Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб'];
        const dayName = dayNames[dayOfWeek];
        const dayNum = d.getDate();

        const btn = document.createElement('button');
        btn.className = isWorkingDay ? "date-btn flex-shrink-0 w-[4.5rem] h-[5.5rem] card-convex-sm flex flex-col items-center justify-center transition-all duration-300 shadow-convex-sm active:scale-90" : "flex-shrink-0 w-[4.5rem] h-[5.5rem] card-convex-sm flex flex-col items-center justify-center bg-slate-100/50 text-slate-400 opacity-50 cursor-not-allowed";
        btn.innerHTML = `<span class="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">${dayName}</span><span class="text-3xl font-black text-slate-950 tracking-tighter">${dayNum}</span>`;
        if (isWorkingDay) btn.onclick = (e) => window.appAPI.selectDate(dateStr, e.currentTarget);
        container.appendChild(btn);
    }
}

export function renderClientBookings() {
    const container = document.getElementById('my-bookings-list');
    const filtered = state.clientBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });

    if (filtered.length === 0) { container.innerHTML = "<div class='text-center py-12 text-slate-400 font-medium'>У тебе поки немає записів.</div>"; return; }

    container.innerHTML = filtered.map((b, i) => {
        const isConfirmed = b.status === 'Выполнено';
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        const masterObj = state.masters.find(m => m.id.toString() === (b.masterId || '').toString());
        let masterName = masterObj ? masterObj.name : 'Майстра не знайдено';
        masterName = masterName.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        const delay = i * 40;

        return `
            <div class="card-convex p-5 mb-5 shadow-convex animate-pop-in border border-white" style="animation-delay: ${delay}ms;">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-full pr-3">
                        <div class="font-extrabold text-slate-950 text-lg mb-4 tracking-tight leading-tight">${b.service}</div>
                        <div class="space-y-2">
                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5"><span class="w-7 h-7 rounded-full bg-slate-100 flex justify-center items-center text-slate-500 text-[10px]">📅</span> ${b.date} о ${formatDisplayTime(b.time)}</div>
                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5"><span class="w-7 h-7 rounded-full bg-rose-50 flex justify-center items-center text-rose-500 text-[10px]">💅</span> Майстер: ${masterName}</div>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                ${b.cancelReason ? `<div class="text-xs text-red-700 mt-4 bg-red-50 p-4 rounded-2xl border border-red-100 font-medium leading-relaxed">Коментар майстра: ${b.cancelReason}</div>` : ''}
                ${(isPending || isConfirmed) ? `<div class="mt-4 pt-4 border-t border-slate-100 space-y-3.5">
                    ${isConfirmed ? `
                        <button onclick="tg.showAlert('Ця функція скоро з\\'явиться! Поки пишіть у приватні повідомлення 💬')" class="card-convex-sm flex items-center justify-center w-full py-3.5 bg-slate-950 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all">Написати майстру 💬</button>
                        <div class="flex gap-3">
                            <button onclick="window.appAPI.startReschedule('${b.id}')" class="card-convex-sm flex-1 py-3 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200">Перенести</button>
                            <button onclick="window.appAPI.openCancelModal('${b.id}', 'client')" class="card-convex-sm flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold active:scale-95 transition-all border border-red-100">Скасувати</button>
                        </div>` : `
                        <button onclick="window.appAPI.openCancelModal('${b.id}', 'client')" class="card-convex-sm w-full py-3.5 bg-white text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200">Скасувати візит</button>
                    `}</div>` : ''}
            </div>
        `;
    }).join('');
}

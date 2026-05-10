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
            <img src="${imgSrc}" alt="${cleanName}" class="absolute inset-0 w-full h-full object-cover object-top">
            <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-rose-950/60 via-rose-900/20 to-transparent"></div>
            <div class="absolute bottom-2.5 left-2.5 right-2.5 bg-white/85 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-white/60 text-center flex flex-col justify-center items-center">
                <h3 class="font-black text-slate-900 text-sm tracking-tight leading-none mb-1 truncate w-full">${cleanName}</h3>
                <p class="text-[8px] font-bold text-rose-500 uppercase tracking-widest">Топ-майстер</p>
            </div>
        </div>`;
    }).join('');
}

export function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map((s, i) => `
        <div onclick="window.appAPI.selectService('${s.id}')" class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 transition-all shadow-convex animate-pop-in border border-white" style="animation-delay: ${i*40}ms">
            <div class="flex items-center gap-4 flex-1 min-w-0 pr-2">
                <div class="shrink-0 w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 text-2xl border border-blue-100">💅</div>
                <div class="flex-1 min-w-0">
                    <div class="font-extrabold text-slate-950 text-lg leading-tight break-words tracking-tight">${s.name}</div>
                    <div class="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">🕒 ${s.duration} хв</div>
                </div>
            </div>
            <div class="text-slate-950 font-black text-xl whitespace-nowrap">${s.price} ₴</div>
        </div>`).join('');
}

export function renderMasters() {
    const list = document.getElementById('masters-list');
    list.innerHTML = state.masters.map((m, i) => {
        const cleanName = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        const imgSrc = state.masters.indexOf(m) === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
        return `
        <div onclick="window.appAPI.selectMaster('${m.id}')" class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 shadow-convex animate-pop-in border border-white">
            <div class="flex items-center gap-4 flex-1">
                <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    <img src="${imgSrc}" class="w-full h-full object-cover object-top">
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-extrabold text-slate-950 text-lg truncate">${cleanName}</div>
                    <div class="text-[10px] font-bold text-slate-500 mt-1">Графік: ${m.workHours}</div>
                </div>
            </div>
            <div class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">➡️</div>
        </div>`;
    }).join('');
}

export function renderCalendar() {
    const container = document.getElementById('date-scroll');
    container.innerHTML = '';
    const timeSlotsContainer = document.getElementById('time-slots');
    if (timeSlotsContainer) timeSlotsContainer.innerHTML = '';

    const now = new Date();
    const monthsToShow = [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)];
    const monthNames = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
    const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    let fullHTML = '';

    monthsToShow.forEach(firstOfMonth => {
        fullHTML += `<div class="col-span-7 text-center text-[11px] font-black text-slate-800 mt-4 mb-2 uppercase tracking-[0.2em] bg-white/50 py-2 rounded-xl border border-white/60 shadow-sm">${monthNames[firstOfMonth.getMonth()]} ${firstOfMonth.getFullYear()}</div>`;
        dayLabels.forEach(label => fullHTML += `<div class="text-[9px] font-bold text-rose-300 text-center pb-2 uppercase">${label}</div>`);

        let firstDayIdx = firstOfMonth.getDay(); 
        let offset = firstDayIdx === 0 ? 6 : firstDayIdx - 1;
        for (let i = 0; i < offset; i++) fullHTML += `<div class="w-full aspect-square"></div>`;

        const lastDayOfMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
        for (let day = 1; day <= lastDayOfMonth; day++) {
            const d = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), day);
            const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            const dayOfWeek = d.getDay(); 

            const isPast = d < new Date().setHours(0,0,0,0);
            const isWorking = dayOfWeek !== 1 && state.selectedMaster.workDays.includes(dayOfWeek);
            const isTooLateToday = (dateStr === new Date().toISOString().split('T')[0] && now.getHours() >= 19);

            if (!isPast && isWorking && !isTooLateToday) {
                fullHTML += `<button onclick="window.appAPI.selectDate('${dateStr}', this)" class="date-btn w-full aspect-square rounded-xl bg-white text-slate-950 flex items-center justify-center transition-all shadow-sm border border-slate-100 active:scale-90"><span class="text-[15px] font-black">${day}</span></button>`;
            } else {
                fullHTML += `<div class="w-full aspect-square rounded-xl flex items-center justify-center text-slate-300 opacity-40"><span class="text-[15px] font-bold">${day}</span></div>`;
            }
        }
    });
    container.innerHTML = fullHTML;
}

// ✅ ВИПРАВЛЕНО: Жорстка перевірка закінчення послуги до 20:00
export function renderTimeSlots(occupiedSlots) {
    const container = document.getElementById('time-slots');
    
    // Створюємо масив усіх можливих точок початку (кожні 30 хв з 10:00 до 19:30)
    const slots = [];
    for (let h = 10; h <= 19; h++) {
        slots.push(`${h}:00`);
        slots.push(`${h}:30`);
    }

    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    // Скільки 30-хвилинних блоків займає послуга
    const reqBlocks = Math.ceil(state.selectedService.duration / 30);

    let availableCount = 0;
    container.innerHTML = slots.map((time, i) => {
        let isAvail = true;
        
        // 1. ПЕРЕВІРКА НА 20:00:
        // i + reqBlocks — це індекс моменту завершення. 
        // В масиві slots 20 елементів (від 0 до 19). 20-й індекс — це віртуальні 20:00.
        if (i + reqBlocks > slots.length) {
            isAvail = false; 
        } else {
            // 2. ПЕРЕВІРКА НА ЗАЙНЯТІСТЬ:
            // Перевіряємо кожні 30 хв протягом тривалості послуги
            for (let j = 0; j < reqBlocks; j++) {
                if (occupiedSlots.includes(slots[i + j])) {
                    isAvail = false;
                    break;
                }
            }
        }

        // 3. ПЕРЕВІРКА НА МИНУЛИЙ ЧАС (якщо запис на сьогодні)
        if (isAvail && state.selectedDate === todayStr) {
            const [h, m] = time.split(':').map(Number);
            if (h < currentHour || (h === currentHour && m <= currentMin)) {
                isAvail = false;
            }
        }

        if (isAvail) availableCount++;
        
        return isAvail 
            ? `<button onclick="window.appAPI.selectTime('${time}', this)" class="time-btn card-convex-sm shadow-convex-sm py-3.5 bg-white text-slate-950 text-[13px] font-black active:scale-90 transition-all duration-300 animate-pop-in" style="animation-delay: ${i*10}ms">${time}</button>` 
            : `<button disabled class="py-3.5 rounded-xl bg-slate-100 text-slate-300 line-through text-[13px] font-bold cursor-not-allowed border border-slate-200">${time}</button>`;
    }).join('');

    if (availableCount === 0) container.innerHTML = '<div class="col-span-4 text-center text-slate-500 py-6 font-medium bg-white rounded-2xl border border-slate-100 shadow-convex-sm">На жаль, вільного часу немає 😔</div>';
}

export function renderClientBookings() {
    const container = document.getElementById('my-bookings-list');
    const filtered = state.clientBookings.filter(b => state.currentBookingFilter === 'active' ? (b.status === 'В очереди' || b.status === 'Выполнено') : b.status === 'Отменено');
    if (filtered.length === 0) { container.innerHTML = "<div class='text-center py-12 text-slate-400 font-medium'>У тебе поки немає записів.</div>"; return; }
    container.innerHTML = filtered.map(b => {
        const isConfirmed = b.status === 'Выполнено';
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        const m = state.masters.find(ma => ma.id.toString() === (b.masterId || '').toString());
        return `
        <div class="card-convex p-5 mb-5 shadow-convex animate-pop-in border border-white">
            <div class="flex justify-between items-start mb-4">
                <div class="w-full pr-3">
                    <div class="font-extrabold text-slate-950 text-lg leading-tight mb-3">${b.service}</div>
                    <div class="space-y-2 text-sm font-semibold text-slate-600">
                        <div>📅 ${b.date} о ${formatDisplayTime(b.time)}</div>
                        <div>💅 Майстер: ${(m ? m.name : 'Мастер').replace(/^(Майстер|Мастер)\s+/i, '')}</div>
                    </div>
                </div>
                <span class="text-[10px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${statusData.color}">${statusData.text}</span>
            </div>
            ${(isPending || isConfirmed) ? `<div class="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                <button onclick="window.appAPI.startReschedule('${b.id}')" class="flex-1 py-3 bg-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200">Перенести</button>
                <button onclick="window.appAPI.openCancelModal('${b.id}', 'client')" class="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">Скасувати</button>
            </div>` : ''}
        </div>`;
    }).join('');
}

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
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthsToShow = [new Date(currentYear, currentMonth, 1), new Date(currentYear, currentMonth + 1, 1)];
    
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

export function renderTimeSlots(occupiedSlots) {
    const container = document.getElementById('time-slots');
    
    const slots = [];
    for (let h = 10; h <= 19; h++) {
        slots.push(`${h}:00`);
        slots.push(`${h}:30`);
    }

    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const reqBlocks = Math.ceil(state.selectedService.duration / 30);

    let availableCount = 0;
    container.innerHTML = slots.map((time, i) => {
        let isAvail = true;
        
        if (i + reqBlocks > slots.length) {
            isAvail = false; 
        } else {
            for (let j = 0; j < reqBlocks; j++) {
                if (occupiedSlots.includes(slots[i + j])) {
                    isAvail = false;
                    break;
                }
            }
        }

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
    const filtered = state.clientBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });
    
    if (filtered.length === 0) { 
        container.innerHTML = "<div class='text-center py-12 text-slate-400 font-medium'>У тебе поки немає записів.</div>"; 
        return; 
    }

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
                ${b.cancelReason ? `<div class="text-xs text-red-700 mt-4 bg-red-50 p-4 rounded-2xl border border-red-100 font-medium leading-relaxed">Коментар: ${b.cancelReason}</div>` : ''}
                
                ${(isPending || isConfirmed) ? `
                    <div class="mt-4 pt-4 border-t border-slate-100 space-y-3.5">
                        ${isConfirmed ? `
                            <button onclick="tg.showAlert('Ця функція скоро з\\'явиться! Поки пишіть у приватні повідомлення 💬')" class="card-convex-sm flex items-center justify-center w-full py-3.5 bg-slate-950 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all">
                                Написати майстру 💬
                            </button>
                            <div class="flex gap-3">
                                <button onclick="window.appAPI.startReschedule('${b.id}')" class="card-convex-sm flex-1 py-3 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200">
                                    Перенести
                                </button>
                                <button onclick="window.appAPI.openCancelModal('${b.id}', 'client')" class="card-convex-sm flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold active:scale-95 transition-all border border-red-100">
                                    Скасувати
                                </button>
                            </div>
                        ` : `
                            <button onclick="window.appAPI.openCancelModal('${b.id}', 'client')" class="card-convex-sm w-full py-3.5 bg-white text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200">
                                Скасувати візит
                            </button>
                        `}
                    </div>` : ''}
            </div>
        `;
    }).join('');
}
// ✅ НОВЕ: Динамічний рендер профілю користувача з даними Telegram
export function renderUserProfile() {
    const container = document.getElementById('tab-profile');
    if (!container) return;

    // Беремо об'єкт користувача, який нам передає Telegram
    const user = state.user || {};
    
    // Формуємо ім'я
    const firstName = user.first_name || 'Гість';
    const lastName = user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Інші дані
    const username = user.username ? `@${user.username}` : '';
    const isPremium = !!user.is_premium; // true якщо є преміум
    const photoUrl = user.photo_url; // Доступно в нових версіях Telegram API
    const langCode = user.language_code || 'uk';

    // Розпізнаємо мову
    let langText = 'Українська 🇺🇦';
    if (langCode.startsWith('ru')) langText = 'Російська';
    else if (langCode.startsWith('en')) langText = 'English 🇬🇧';

    // Формуємо аватар (Або фото, або перша літера імені)
    let avatarHTML = '';
    if (photoUrl) {
        avatarHTML = `<img src="${photoUrl}" class="w-full h-full rounded-full object-cover">`;
    } else {
        const initial = firstName.charAt(0).toUpperCase();
        avatarHTML = `<div class="w-full h-full rounded-full flex items-center justify-center text-3xl font-black text-blue-500">${initial}</div>`;
    }

    // Зірочка Premium
    const premiumBadge = isPremium 
        ? `<div class="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
           </div>` 
        : '';

    // Малюємо HTML
    container.innerHTML = `
        <h3 class="font-bold text-xs px-2 text-rose-400 uppercase tracking-[0.15em] mb-4 text-center">Особисті дані</h3>
        
        <div class="card-convex p-5 flex items-center gap-5 mx-1 animate-pop-in">
            <div class="relative w-20 h-20 shrink-0 bg-blue-50 rounded-full border border-blue-100 shadow-inner">
                ${avatarHTML}
                ${premiumBadge}
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-extrabold text-slate-950 text-xl tracking-tight truncate">${fullName}</div>
                ${username ? `<div class="text-xs font-bold text-blue-500 mt-1 truncate">${username}</div>` : ''}
                <div class="text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg mt-2 inline-block border border-slate-100">Telegram ID: ${user.id}</div>
            </div>
        </div>

        <h3 class="font-bold text-xs px-2 text-rose-400 uppercase tracking-[0.15em] mt-8 mb-4 text-center">Налаштування</h3>
        
        <div class="card-convex p-1 mx-1 space-y-1 animate-pop-in" style="animation-delay: 50ms">
            <div class="p-4 flex justify-between items-center bg-white rounded-t-[1.75rem] rounded-b-xl">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 text-lg">🌐</div>
                    <span class="font-bold text-slate-700 text-sm">Мова</span>
                </div>
                <span class="font-black text-slate-900 text-sm">${langText}</span>
            </div>
            
            <div class="p-4 flex justify-between items-center bg-white rounded-xl">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 text-lg">⭐</div>
                    <span class="font-bold text-slate-700 text-sm">Telegram Premium</span>
                </div>
                <span class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isPremium ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}">${isPremium ? 'Активний' : 'Відсутній'}</span>
            </div>

            <div class="p-4 flex justify-between items-center bg-white rounded-b-[1.75rem] rounded-t-xl" onclick="tg.showAlert('Сповіщення через бота увімкнені!')">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-500 text-lg">🔔</div>
                    <span class="font-bold text-slate-700 text-sm">Сповіщення</span>
                </div>
                <div class="w-11 h-6 bg-green-400 rounded-full p-0.5 flex justify-end items-center cursor-pointer shadow-inner">
                    <div class="w-5 h-5 bg-white rounded-full shadow-sm"></div>
                </div>
            </div>
        </div>
        
        <p class="text-center text-[10px] font-bold text-slate-400 mt-8 uppercase tracking-widest">NailBar Dafi v1.0</p>
    `;
}


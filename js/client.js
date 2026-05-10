function renderClientBookings() {
    const container = document.getElementById('my-bookings-list');
    const filtered = state.clientBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });

    if (filtered.length === 0) { container.innerHTML = "<div class='text-center py-4 text-slate-500 mt-10'>У цій категорії записів немає.</div>"; return; }

    container.innerHTML = filtered.map(b => {
        const isConfirmed = b.status === 'Выполнено';
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        
        const masterObj = state.masters.find(m => m.id.toString() === (b.masterId || '').toString());
        let masterName = masterObj ? masterObj.name : 'Майстра не знайдено';
        masterName = masterName.replace(/^(Майстер|Мастер)\s+/i, '').trim();

        return `
            <div class="glass p-5 rounded-3xl mb-4 border-l-4 ${isPending ? 'border-yellow-400' : 'border-transparent'} shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 bg-white/80 backdrop-blur-md">
                <div class="flex justify-between items-start mb-3">
                    <div class="w-full pr-3">
                        <div class="font-bold text-slate-800 text-base mb-3 leading-tight">Запис на ${b.service}</div>
                        <div class="text-sm text-slate-600 mb-1">Обрана дата: <span class="font-semibold text-slate-800">${b.date}</span></div>
                        <div class="text-sm text-slate-600 mb-3">Обраний час: <span class="font-semibold text-slate-800">${formatDisplayTime(b.time)}</span></div>
                        <div class="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-xs shadow-sm">💅</span>Майстер: ${masterName}
                        </div>
                    </div>
                    <span class="text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                ${b.cancelReason ? `<div class="text-xs text-red-500 mt-3 bg-red-50 p-2.5 rounded-xl border border-red-100">Причина: ${b.cancelReason}</div>` : ''}
                
                ${(isPending || isConfirmed) ? `
                    <div class="mt-4 pt-4 border-t border-slate-200/50 space-y-2">
                        ${isConfirmed ? `
                            <button onclick="tg.showAlert('Тут буде відкриватися чат з майстром 💬')" class="w-full py-2.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm border border-teal-100/50 mb-2">
                                Написати майстру
                            </button>
                            <div class="flex gap-2">
                                <button onclick="startReschedule('${b.id}')" class="flex-1 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm border border-slate-200/60">
                                    Змінити дату
                                </button>
                                <button onclick="openCancelModal('${b.id}', 'client')" class="flex-1 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm border border-red-100/50">
                                    Скасувати
                                </button>
                            </div>
                        ` : `
                            <button onclick="openCancelModal('${b.id}', 'client')" class="w-full py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm border border-slate-200/60">
                                Скасувати візит
                            </button>
                        `}
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

function startReschedule(bookingId) {
    const booking = state.clientBookings.find(b => b.id === bookingId);
    if (!booking) return;

    state.editingBookingId = bookingId;
    state.selectedService = state.services.find(s => s.name === booking.service);
    state.selectedMaster = state.masters.find(m => m.id.toString() === booking.masterId.toString());

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-home').classList.remove('hidden-step');
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);
        if(btn) {
            if (nav === 'home') { btn.classList.remove('text-slate-400'); btn.classList.add('text-rose-500'); }
            else { btn.classList.remove('text-rose-500'); btn.classList.add('text-slate-400'); }
        }
    });

    stopPolling();
    renderCalendar();
    showStep('step-datetime');
    tg.BackButton.show(); 
}

function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map(s => `
        <div onclick="selectService(${s.id})" class="group bg-white/80 backdrop-blur-md p-4 rounded-3xl mb-4 flex justify-between items-center active:scale-95 transition-all duration-300 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
            <div class="flex items-center gap-3 flex-1 min-w-0 pr-2">
                <div class="shrink-0 w-12 h-12 bg-rose-100/60 rounded-2xl flex items-center justify-center text-rose-500 text-xl shadow-inner">💅</div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-slate-800 text-base leading-tight break-words">${s.name}</div>
                    <div class="flex items-center gap-1 text-xs text-slate-500 mt-1 font-medium">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${s.duration} хв
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <div class="text-rose-600 font-extrabold text-lg whitespace-nowrap">${s.price} ₴</div>
                <div class="text-slate-300"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div>
            </div>
        </div>
    `).join('');
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id === id);
    renderMasters();
    showStep('step-master');
}

function renderMasters() {
    const list = document.getElementById('masters-list');
    list.innerHTML = state.masters.map(m => {
        const cleanName = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        return `
        <div onclick="selectMaster('${m.id}')" class="group bg-white/80 backdrop-blur-md p-5 rounded-3xl mb-4 flex items-center justify-between active:scale-95 transition-all duration-300 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
            <div class="flex items-center gap-4 flex-1 min-w-0 pr-2">
                <div class="relative shrink-0">
                    <div class="w-14 h-14 bg-gradient-to-br from-rose-100 to-teal-50 rounded-full flex items-center justify-center font-bold text-teal-700 text-2xl shadow-inner border border-white">${cleanName.charAt(0)}</div>
                    <div class="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-white rounded-full shadow-sm"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-slate-800 text-lg leading-tight truncate">${cleanName}</div>
                    <div class="text-[11px] text-slate-500 mt-1 font-medium bg-slate-100 px-2 py-1 rounded-lg inline-block truncate max-w-full">Працює: ${m.workHours}</div>
                </div>
            </div>
            <div class="text-slate-300 shrink-0"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div>
        </div>
    `}).join('');
}

function selectMaster(id) {
    state.selectedMaster = state.masters.find(m => m.id.toString() === id.toString());
    renderCalendar();
    showStep('step-datetime');
}

function renderCalendar() {
    const container = document.getElementById('date-scroll');
    container.innerHTML = ''; document.getElementById('time-slots').innerHTML = ''; 
    state.selectedDate = null; state.selectedTime = null;
    tg.MainButton.hide();

    const now = new Date(); const currentHour = now.getHours();
    let datesHTML = '';

    for (let i = 0; i < 14; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i);
        const dayOfWeek = d.getDay(); 
        
        let isWorkingDay = dayOfWeek !== 1 && state.selectedMaster.workDays.includes(dayOfWeek);
        if (i === 0 && currentHour >= 18) isWorkingDay = false;

        const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]; 
        const dayNames = ['Нд', 'Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб'];
        const dayName = dayNames[dayOfWeek];
        const dayNum = d.getDate();

        if (isWorkingDay) {
            datesHTML += `<button onclick="selectDate('${dateStr}', this)" class="date-btn flex-shrink-0 w-16 h-22 py-3 rounded-3xl flex flex-col items-center justify-center transition-all bg-white/80 backdrop-blur-sm active:scale-95 text-slate-700 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/80"><span class="text-[10px] uppercase font-bold text-slate-400 mb-1">${dayName}</span><span class="text-2xl font-extrabold text-slate-800">${dayNum}</span></button>`;
        } else {
            datesHTML += `<button disabled class="flex-shrink-0 w-16 h-22 py-3 rounded-3xl flex flex-col items-center justify-center bg-slate-100/50 text-slate-400 opacity-50 cursor-not-allowed border border-transparent"><span class="text-[10px] uppercase font-bold mb-1">${dayName}</span><span class="text-2xl font-extrabold">${dayNum}</span></button>`;
        }
    }
    container.innerHTML = datesHTML;
}

async function selectDate(dateStr, btnElement) {
    state.selectedDate = dateStr; state.selectedTime = null; tg.MainButton.hide();
    
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('selected-item', 'shadow-md');
        btn.classList.add('bg-white/80', 'text-slate-700');
        const d = btn.querySelector('span:first-child'); const n = btn.querySelector('span:last-child');
        if(d) d.classList.replace('text-rose-100', 'text-slate-400');
        if(n) n.classList.replace('text-white', 'text-slate-800');
    });
    
    btnElement.classList.remove('bg-white/80', 'text-slate-700');
    btnElement.classList.add('selected-item', 'shadow-md');
    btnElement.querySelector('span:first-child').classList.replace('text-slate-400', 'text-rose-100');
    btnElement.querySelector('span:last-child').classList.replace('text-slate-800', 'text-white');

    const timeLoader = document.getElementById('time-loader');
    document.getElementById('time-slots').innerHTML = ''; timeLoader.classList.remove('hidden');

    try {
        const ignoreParam = state.editingBookingId ? `&ignoreBookingId=${state.editingBookingId}` : '';
        const response = await fetch(`${API_URL}?action=getOccupiedSlots&date=${dateStr}&masterId=${state.selectedMaster.id}${ignoreParam}`);
        const data = await response.json();
        renderTimeSlots(data.occupiedSlots || []);
    } catch (e) { tg.showAlert("Не вдалося завантажити розклад."); } 
    finally { timeLoader.classList.add('hidden'); }
}

function renderTimeSlots(occupiedSlots) {
    const container = document.getElementById('time-slots');
    let timeHTML = '';
    const slots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentHour = now.getHours(); const currentMinute = now.getMinutes();
    const requiredSlotsCount = Math.ceil(state.selectedService.duration / 60);
    let availableSlotsCount = 0;

    slots.forEach((time) => {
        let isAvailable = true;
        const startHourNum = parseInt(time.split(':')[0]);

        for (let i = 0; i < requiredSlotsCount; i++) {
            const targetHourNum = startHourNum + i;
            const targetTimeStr = `${targetHourNum.toString().padStart(2, '0')}:00`;

            if (targetHourNum >= 20 || occupiedSlots.includes(targetTimeStr)) { isAvailable = false; break; }
            if (state.selectedDate === todayStr && i === 0 && (startHourNum < currentHour || (startHourNum === currentHour && 0 <= currentMinute))) { isAvailable = false; break; }
        }

        if (!isAvailable) {
            timeHTML += `<button disabled class="py-3.5 rounded-2xl bg-slate-100/60 text-slate-400 line-through text-sm font-bold cursor-not-allowed border border-transparent">${time}</button>`;
        } else {
            availableSlotsCount++;
            timeHTML += `<button onclick="selectTime('${time}', this)" class="time-btn py-3.5 rounded-2xl bg-white/80 backdrop-blur-sm text-slate-700 text-sm font-bold active:scale-95 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/80">${time}</button>`;
        }
    });

    if (availableSlotsCount === 0) container.innerHTML = '<div class="col-span-3 text-center text-slate-500 py-4 font-medium">На обрану дату немає "вікна" потрібного розміру 😔</div>';
    else container.innerHTML = timeHTML;
}

function selectTime(time, btnElement) {
    state.selectedTime = time;
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('selected-item', 'shadow-md');
        btn.classList.add('bg-white/80', 'text-slate-700');
    });
    
    btnElement.classList.remove('bg-white/80', 'text-slate-700');
    btnElement.classList.add('selected-item', 'shadow-md');
    
    if (state.editingBookingId) {
        tg.MainButton.text = `Підтвердити зміну на ${time}`;
    } else {
        tg.MainButton.text = `Підтвердити запис на ${time}`;
    }
    
    tg.MainButton.show(); 
    tg.MainButton.onClick(submitBooking);
}

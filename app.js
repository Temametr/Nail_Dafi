// Ініціалізація Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// УВАГА: Встав сюди свій URL від Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxlQQ5e4FzxLUyAX6OSxfKMdjLqU_1nbfTwMpxC_3Tm-Ga_VvnVScIklojzwdoQ-6VBIw/exec";

// Глобальний стан додатку
let state = {
    user: tg.initDataUnsafe?.user || { id: "12345", first_name: "Тестовий Користувач" },
    services: [],
    masters: [],
    selectedService: null,
    selectedMaster: null,
    selectedDate: null,
    selectedTime: null,
    isAdmin: false
};

// Змінна для модального вікна
let currentCancelBookingId = null;

// Запуск при завантаженні сторінки
window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('user-name').innerText = state.user.first_name;
    tg.MainButton.color = "#f43f5e"; 
    
    // Прив'язуємо кнопку скасування в модалці
    document.getElementById('confirm-cancel-btn').addEventListener('click', confirmCancelAdmin);
    
    await loadInitialData();
});

/**
 * Базове завантаження
 */
async function loadInitialData() {
    try {
        const response = await fetch(`${API_URL}?action=getInitData`);
        const data = await response.json();
        
        state.services = data.services;
        state.masters = data.masters;
        state.isAdmin = state.masters.some(m => m.id.toString() === state.user.id.toString());

        renderApp();
    } catch (e) {
        tg.showAlert("Помилка завантаження даних.");
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
}

/**
 * Розподіл ролей
 */
function renderApp() {
    if (state.isAdmin) {
        document.getElementById('admin-screen').classList.remove('hidden-step');
        loadBookings('admin');
    } else {
        document.getElementById('client-screen').classList.remove('hidden-step');
        renderServices();
    }
}

/**
 * Навігація
 */
function showStep(stepId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    document.getElementById(stepId).classList.remove('hidden-step');

    if (stepId === 'step-my-bookings') {
        loadBookings('client'); // Завантажуємо записи клієнта при переході на вкладку
    }

    if (stepId === 'step-booking') {
        tg.BackButton.hide();
        tg.MainButton.hide();
        state.selectedService = null;
        state.selectedMaster = null;
        state.selectedDate = null;
        state.selectedTime = null;
    } else {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            if (stepId === 'step-master') showStep('step-booking');
            else if (stepId === 'step-datetime') showStep('step-master');
            else showStep('step-booking');
            tg.MainButton.hide();
        });
    }
}

// === ЛОГІКА ЗАПИСІВ ===

/**
 * Завантаження списку записів з бази
 */
async function loadBookings(role) {
    const containerId = role === 'admin' ? 'admin-bookings-list' : 'my-bookings-list';
    document.getElementById(containerId).innerHTML = '<div class="text-center py-4 text-slate-500 animate-pulse">Оновлення списку...</div>';
    
    try {
        const response = await fetch(`${API_URL}?action=getBookings&userId=${state.user.id}&role=${role}`);
        const data = await response.json();
        
        if (role === 'admin') renderAdminBookings(data.bookings || []);
        else renderClientBookings(data.bookings || []);
    } catch (e) {
        document.getElementById(containerId).innerHTML = '<div class="text-center py-4 text-red-500">Помилка мережі.</div>';
    }
}

/**
 * Хелпер для красивого відображення часу (вирізає баг Google Sheets 1899-го року)
 */
function formatDisplayTime(timeStr) {
    const str = String(timeStr);
    if (str.includes('T')) {
        const d = new Date(str);
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    return str;
}

/**
 * Хелпер для статусів (змінено тексти на Підтверджено)
 */
function getStatusData(dbStatus) {
    if (dbStatus === 'В очереди') return { text: 'Очікує', color: 'text-yellow-600 bg-yellow-100' };
    if (dbStatus === 'Выполнено') return { text: 'Підтверджено', color: 'text-teal-600 bg-teal-100' };
    return { text: 'Скасовано', color: 'text-red-600 bg-red-100' };
}

/**
 * Отрисовка для КЛІЄНТА
 */
function renderClientBookings(bookings) {
    const container = document.getElementById('my-bookings-list');
    if (bookings.length === 0) {
        container.innerHTML = "<div class='text-center py-4 text-slate-500'>У вас ще немає записів.</div>";
        return;
    }

    container.innerHTML = bookings.map(b => {
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        
        return `
            <div class="glass p-4 rounded-2xl mb-3 shadow-sm">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-bold text-slate-800 mb-1">${b.service}</div>
                        <div class="text-sm text-slate-600">${b.date} • <span class="font-semibold">${formatDisplayTime(b.time)}</span></div>
                    </div>
                    <span class="text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                ${b.cancelReason ? `<div class="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded-lg">Причина: ${b.cancelReason}</div>` : ''}
                
                ${isPending ? `
                    <button onclick="changeBookingStatus('${b.id}', 'Отменено', 'Скасовано клієнтом')" 
                            class="w-full mt-2 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold active:scale-95 transition-all">
                        Скасувати запис
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Отрисовка для АДМІНА (Новий дизайн карток)
 */
function renderAdminBookings(bookings) {
    const container = document.getElementById('admin-bookings-list');
    if (bookings.length === 0) {
        container.innerHTML = "<div class='text-center py-4 text-slate-500'>Наразі записів немає.</div>";
        return;
    }

    container.innerHTML = bookings.map(b => {
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);

        return `
            <div class="glass p-5 rounded-2xl mb-4 border-l-4 ${isPending ? 'border-yellow-400' : 'border-transparent'} shadow-sm">
                <div class="flex justify-between items-start mb-3">
                    <div class="w-full pr-3">
                        <div class="font-bold text-slate-800 text-base mb-3 leading-tight">Запис на ${b.service}</div>
                        <div class="text-sm text-slate-600 mb-1">Обрана дата: <span class="font-semibold text-slate-800">${b.date}</span></div>
                        <div class="text-sm text-slate-600 mb-3">Обраний час: <span class="font-semibold text-slate-800">${formatDisplayTime(b.time)}</span></div>
                        
                        <div class="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">👤</span>
                            ${b.clientName}
                        </div>
                    </div>
                    <span class="text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                
                <a href="tg://user?id=${b.clientId}" class="flex items-center justify-center w-full py-2 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold mt-2 active:scale-95 transition-all">
                    ✉️ Написати клієнту
                </a>
                
                ${b.cancelReason ? `<div class="text-xs text-red-500 mt-3 bg-red-50 p-2 rounded-lg">Причина: ${b.cancelReason}</div>` : ''}
                
                ${isPending ? `
                    <div class="flex gap-2 mt-3 pt-3 border-t border-slate-200/50">
                        <button onclick="changeBookingStatus('${b.id}', 'Выполнено')" class="flex-1 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm">Підтвердити</button>
                        <button onclick="openCancelModal('${b.id}')" class="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold active:scale-95 transition-all">Скасувати</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Мережевий запит на зміну статусу
 */
async function changeBookingStatus(bookingId, newStatus, reason = "") {
    tg.MainButton.showProgress();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'updateStatus', bookingId, newStatus, reason })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success'); // Вібрація
            loadBookings(state.isAdmin ? 'admin' : 'client'); // Оновлюємо список
        } else {
            tg.showAlert('Помилка: ' + result.message);
        }
    } catch (e) {
        tg.showAlert('Помилка з\'єднання. Спробуйте ще раз.');
    } finally {
        tg.MainButton.hideProgress();
    }
}

// === ЛОГІКА МОДАЛЬНОГО ВІКНА (СКАСУВАННЯ АДМІНОМ) ===

function openCancelModal(bookingId) {
    currentCancelBookingId = bookingId;
    document.getElementById('cancel-modal').classList.remove('hidden');
    document.getElementById('cancel-modal').classList.add('flex');
}

function closeCancelModal() {
    currentCancelBookingId = null;
    document.getElementById('cancel-modal').classList.add('hidden');
    document.getElementById('cancel-modal').classList.remove('flex');
    document.getElementById('cancel-reason').value = '';
}

function confirmCancelAdmin() {
    const reason = document.getElementById('cancel-reason').value.trim();
    if (!reason) {
        tg.showAlert("Будь ласка, вкажіть причину для клієнта.");
        return;
    }
    changeBookingStatus(currentCancelBookingId, 'Отменено', reason);
    closeCancelModal();
}

// === ІСНУЮЧИЙ КОД ДЛЯ СТВОРЕННЯ ЗАПИСУ ===

function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map(s => `
        <div onclick="selectService(${s.id})" class="glass p-4 rounded-2xl flex justify-between items-center active:scale-95 transition-all cursor-pointer">
            <div>
                <div class="font-bold text-slate-800">${s.name}</div>
                <div class="text-xs text-slate-500">${s.duration} хв</div>
            </div>
            <div class="text-rose-600 font-bold">${s.price} ₴</div>
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
    list.innerHTML = state.masters.map(m => `
        <div onclick="selectMaster('${m.id}')" class="glass p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all cursor-pointer">
            <div class="w-12 h-12 bg-rose-200 rounded-full flex items-center justify-center font-bold text-rose-600 shadow-sm">${m.name.charAt(0)}</div>
            <div>
                <div class="font-bold text-slate-800">${m.name}</div>
                <div class="text-xs text-slate-500">Працює: ${m.workHours}</div>
            </div>
        </div>
    `).join('');
}

function selectMaster(id) {
    state.selectedMaster = state.masters.find(m => m.id.toString() === id.toString());
    renderCalendar();
    showStep('step-datetime');
}

function renderCalendar() {
    const container = document.getElementById('date-scroll');
    container.innerHTML = '';
    document.getElementById('time-slots').innerHTML = ''; 
    state.selectedDate = null;
    state.selectedTime = null;
    tg.MainButton.hide();

    const now = new Date();
    const currentHour = now.getHours();
    let datesHTML = '';

    for (let i = 0; i < 14; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const dayOfWeek = d.getDay(); 
        
        let isWorkingDay = dayOfWeek !== 1 && state.selectedMaster.workDays.includes(dayOfWeek);
        
        if (i === 0 && currentHour >= 18) {
            isWorkingDay = false;
        }

        const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]; 
        
        const dayNames = ['Нд', 'Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб'];
        const dayName = dayNames[dayOfWeek];
        const dayNum = d.getDate();

        if (isWorkingDay) {
            datesHTML += `<button onclick="selectDate('${dateStr}', this)" class="date-btn flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all glass active:scale-95 text-slate-800 border-2 border-transparent"><span class="text-xs uppercase font-medium">${dayName}</span><span class="text-xl font-bold">${dayNum}</span></button>`;
        } else {
            datesHTML += `<button disabled class="flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed"><span class="text-xs uppercase">${dayName}</span><span class="text-xl font-bold">${dayNum}</span></button>`;
        }
    }
    container.innerHTML = datesHTML;
}

async function selectDate(dateStr, btnElement) {
    state.selectedDate = dateStr;
    state.selectedTime = null;
    tg.MainButton.hide();
    document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('selected-item'));
    btnElement.classList.add('selected-item');

    const timeSlotsContainer = document.getElementById('time-slots');
    const timeLoader = document.getElementById('time-loader');
    timeSlotsContainer.innerHTML = '';
    timeLoader.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}?action=getOccupiedSlots&date=${dateStr}&masterId=${state.selectedMaster.id}`);
        const data = await response.json();
        renderTimeSlots(data.occupiedSlots || []);
    } catch (e) {
        tg.showAlert("Не вдалося завантажити розклад.");
    } finally {
        timeLoader.classList.add('hidden');
    }
}

function renderTimeSlots(occupiedSlots) {
    const container = document.getElementById('time-slots');
    let timeHTML = '';
    const slots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let availableSlotsCount = 0;

    slots.forEach(time => {
        const isOccupied = occupiedSlots.some(occTime => {
            const dateObj = new Date(occTime);
            if (!isNaN(dateObj)) {
                const h = dateObj.getUTCHours().toString().padStart(2, '0');
                const m = dateObj.getUTCMinutes().toString().padStart(2, '0');
                return `${h}:${m}` === time;
            }
            return occTime.includes(time);
        });

        let isPast = false;
        if (state.selectedDate === todayStr) {
            const [slotHour, slotMinute] = time.split(':').map(Number);
            if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
                isPast = true;
            }
        }

        if (isOccupied || isPast) {
            timeHTML += `<button disabled class="py-3 rounded-xl bg-slate-200 text-slate-400 line-through text-sm font-semibold cursor-not-allowed">${time}</button>`;
        } else {
            availableSlotsCount++;
            timeHTML += `<button onclick="selectTime('${time}', this)" class="time-btn py-3 rounded-xl glass text-slate-800 text-sm font-semibold active:scale-95 transition-all border-2 border-transparent">${time}</button>`;
        }
    });

    if (availableSlotsCount === 0) {
        container.innerHTML = '<div class="col-span-3 text-center text-slate-500 py-4 font-medium">На обрану дату немає вільного часу 😔</div>';
    } else {
        container.innerHTML = timeHTML;
    }
}

function selectTime(time, btnElement) {
    state.selectedTime = time;
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('selected-item'));
    btnElement.classList.add('selected-item');
    tg.MainButton.text = `Підтвердити запис на ${time}`;
    tg.MainButton.show();
    tg.MainButton.onClick(submitBooking);
}

async function submitBooking() {
    tg.MainButton.showProgress();
    const bookingData = {
        action: 'createBooking',
        date: state.selectedDate,
        time: state.selectedTime,
        masterId: state.selectedMaster.id,
        clientId: state.user.id.toString(),
        clientName: state.user.first_name,
        service: state.selectedService.name,
        comment: ""
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
        const result = await response.json();

        if (result.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert('Супер! Ваш запис успішно створено 🎉', () => {
                showStep('step-my-bookings');
            });
        } else {
            tg.showAlert('Помилка: ' + result.message);
        }
    } catch (e) {
        tg.showAlert('Помилка підключення. Спробуйте ще раз.');
    } finally {
        tg.MainButton.hideProgress();
    }
}

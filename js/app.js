import { state, tg, modalState, polling } from './state.js';
import { fetchInitialData, fetchBookings, updateBookingStatusAPI, submitBookingAPI, fetchOccupiedSlotsAPI } from './api.js';
import { renderHomeMasters, renderServices, renderMasters, renderCalendar, renderClientBookings } from './client.js';
import { renderAdminStats, renderAdminBookings } from './admin.js';

// ПРИВ'ЯЗУЄМО ФУНКЦІЇ ДО ВІКНА (Щоб працювали onclick у HTML)
window.appAPI = {
    switchTab, switchBookingTab, startClientBookingFlow, startReschedule,
    selectService, selectMaster, selectDate, selectTime,
    changeBookingStatus, openCancelModal, closeCancelModal, confirmCancel,
    renderAdminStats
};

// ІНІЦІАЛІЗАЦІЯ
window.addEventListener('DOMContentLoaded', async () => {
    tg.MainButton.color = "#3b82f6";
    tg.BackButton.onClick(handleBack);
    await loadApp();
});

async function loadInitialData() {
    try {
        const data = await fetchInitialData();
        state.services = data.services;
        state.masters = data.masters;
        const masterData = state.masters.find(m => m.id.toString() === state.user.id.toString());
        if (masterData) {
            state.isAdmin = true;
            state.adminMasterInfo = masterData;
        }
    } catch (e) { tg.showAlert("Помилка завантаження даних."); }
}

async function loadApp() {
    await loadInitialData();
    document.getElementById('loader').classList.add('hidden');
    if (state.isAdmin) {
        document.getElementById('admin-screen').classList.remove('hidden-step');
        document.getElementById('admin-bottom-nav').classList.remove('hidden-step');
        switchTab('admin', 'home');
    } else {
        document.getElementById('client-screen').classList.remove('hidden-step');
        document.getElementById('client-bottom-nav').classList.remove('hidden-step');
        renderHomeMasters();
        renderServices();
        switchTab('client', 'home');
    }
}

// ✅ ОНОВЛЕНО: Виправлена логіка кнопки "Назад"
function handleBack() {
    if (!document.getElementById('tab-booking-flow').classList.contains('hidden-step')) {
        
        // 1. Якщо ми ПЕРЕНОСИМО запис (редагування) -> одразу йдемо назад у візити
        if (state.editingBookingId) {
            state.editingBookingId = null;
            switchTab('client', 'bookings');
            return;
        }

        // 2. Якщо це НОВИЙ запис -> крокуємо покроково назад
        if (!document.getElementById('step-datetime').classList.contains('hidden-step')) {
            showStep('step-master');
        } else if (!document.getElementById('step-master').classList.contains('hidden-step')) {
            showStep('step-booking');
        } else { 
            // Якщо ми на першому кроці створення -> повертаємось у візити
            state.editingBookingId = null; 
            switchTab('client', 'bookings'); 
        }
    }
}

function switchTab(role, tabId) {
    document.querySelectorAll(role === 'admin' ? '.admin-tab-content' : '.tab-content').forEach(el => el.classList.add('hidden-step'));
    const target = document.getElementById(role === 'admin' ? `admin-tab-${tabId}` : `tab-${tabId}`);
    if (target) target.classList.remove('hidden-step');
    document.getElementById(`${role}-bottom-nav`).classList.remove('hidden-step');

    const activeColor = role === 'admin' ? 'text-teal-600' : 'text-blue-500';
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`${role}-nav-${nav}`);
        if (btn) {
            if (nav === tabId) {
                btn.classList.remove('text-slate-400');
                btn.classList.add(activeColor, role === 'admin' ? 'bg-teal-50' : 'bg-blue-50');
            } else {
                btn.classList.remove(activeColor, 'bg-teal-50', 'bg-blue-50');
                btn.classList.add('text-slate-400');
            }
        }
    });

    updateHeaderTitle(role, tabId);
    tg.BackButton.hide();
    tg.MainButton.hide();
    stopPolling();
    state.editingBookingId = null;

    if (role === 'client') {
        if (tabId === 'home') renderHomeMasters();
        else if (tabId === 'bookings') { loadBookings('client'); startPolling('client'); }
    } else {
        if (tabId === 'home') { loadBookings('admin', false, true); startPolling('admin', true); }
        else if (tabId === 'bookings') { loadBookings('admin'); startPolling('admin'); }
    }
}

function updateHeaderTitle(role, tabId) {
    const title = document.getElementById(role === 'client' ? 'client-header-title' : 'admin-header-title');
    if (!title) return;
    if (role === 'client') {
        if (tabId === 'home') title.innerHTML = `Привіт, <span class="text-blue-600">${state.user.first_name}</span> 👋`;
        else if (tabId === 'bookings') title.innerHTML = `Твої візити 💅`;
        else if (tabId === 'profile') title.innerHTML = `Мій кабінет ⚙️`;
    } else {
        const cleanName = state.adminMasterInfo.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        if (tabId === 'home') title.innerHTML = `Панель: <span class="text-teal-600">${cleanName}</span> 📊`;
        else title.innerHTML = `Розклад 📅`;
    }
}

// ✅ ОНОВЛЕНО: Візуальне відображення завантаження (Спінер)
async function loadBookings(role, isSilent = false, forDashboard = false) {
    const containerId = role === 'admin' ? (forDashboard ? null : 'admin-bookings-list') : 'my-bookings-list';
    
    if (!isSilent && containerId) {
        // Динамічний колір спінера: синій для клієнта, бірюзовий для майстра
        const spinnerColor = role === 'admin' ? 'border-t-teal-500' : 'border-t-blue-500';
        document.getElementById(containerId).innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 animate-pulse">
                <div class="w-12 h-12 border-4 border-slate-100 rounded-full ${spinnerColor} animate-spin mb-4 shadow-sm"></div>
                <p class="text-slate-400 font-medium text-sm">Завантажуємо дані...</p>
            </div>
        `;
    }

    try {
        const data = await fetchBookings(role);
        if (role === 'admin') {
            state.adminBookings = data.bookings || [];
            if (forDashboard) renderAdminStats('day');
            else renderAdminBookings();
        } else {
            state.clientBookings = data.bookings || [];
            renderClientBookings();
        }
    } catch (e) { 
        console.error(e); 
        if (!isSilent && containerId) {
            document.getElementById(containerId).innerHTML = '<div class="text-center py-12 text-red-500 font-medium">Помилка мережі 🌐</div>';
        }
    }
}

function startPolling(role, forDashboard = false) {
    stopPolling();
    polling.interval = setInterval(() => loadBookings(role, true, forDashboard), 15000);
}

function stopPolling() {
    if (polling.interval) clearInterval(polling.interval);
}

// ФЛОУ ЗАПИСУ
function startClientBookingFlow() {
    state.editingBookingId = null;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    document.getElementById('client-header-title').innerHTML = `Новий <span class="text-blue-600">візит</span> 📝`;
    renderServices();
    showStep('step-booking');
    tg.BackButton.show();
}

function startReschedule(bookingId) {
    const booking = state.clientBookings.find(b => b.id === bookingId);
    if (!booking) return;
    state.editingBookingId = bookingId;
    state.selectedService = state.services.find(s => s.name === booking.service);
    state.selectedMaster = state.masters.find(m => m.id.toString() === booking.masterId.toString());
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    document.getElementById('client-header-title').innerHTML = `Зміна <span class="text-blue-600">дати</span> 📅`;
    renderCalendar();
    showStep('step-datetime');
    tg.BackButton.show();
}

function showStep(stepId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    document.getElementById(stepId).classList.remove('hidden-step');
    if (stepId === 'step-booking') {
        tg.MainButton.hide();
        state.selectedService = null; state.selectedMaster = null; state.selectedDate = null; state.selectedTime = null;
    }
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id.toString() === id.toString());
    renderMasters();
    showStep('step-master');
}

function selectMaster(id) {
    state.selectedMaster = state.masters.find(m => m.id.toString() === id.toString());
    renderCalendar();
    showStep('step-datetime');
}

async function selectDate(dateStr, btnElement) {
    state.selectedDate = dateStr;
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('selected-item', 'shadow-blue-300');
        btn.classList.add('bg-white', 'text-slate-700', 'shadow-convex-sm');
        const d = btn.querySelector('span:first-child'); const n = btn.querySelector('span:last-child');
        if(d) d.classList.replace('text-blue-100', 'text-slate-400');
        if(n) n.classList.replace('text-white', 'text-slate-950');
    });
    
    btnElement.classList.remove('bg-white', 'text-slate-700', 'shadow-convex-sm');
    btnElement.classList.add('selected-item', 'shadow-blue-300');
    btnElement.querySelector('span:first-child').classList.replace('text-slate-400', 'text-blue-100');
    btnElement.querySelector('span:last-child').classList.replace('text-slate-950', 'text-white');

    document.getElementById('time-slots').innerHTML = '';
    document.getElementById('time-loader').classList.remove('hidden');
    try {
        const data = await fetchOccupiedSlotsAPI(dateStr, state.selectedMaster.id, state.editingBookingId);
        renderTimeSlots(data.occupiedSlots || []);
    } finally { document.getElementById('time-loader').classList.add('hidden'); }
}

function renderTimeSlots(occupiedSlots) {
    const container = document.getElementById('time-slots');
    const slots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const reqSlots = Math.ceil(state.selectedService.duration / 60);

    let availableSlotsCount = 0;
    let timeHTML = slots.map((time, i) => {
        let isAvail = true;
        const startH = parseInt(time.split(':')[0]);
        for (let j = 0; j < reqSlots; j++) {
            const h = startH + j;
            if (h >= 20 || occupiedSlots.includes(`${h.toString().padStart(2, '0')}:00`)) isAvail = false;
            if (state.selectedDate === todayStr && j === 0 && (startH < currentHour || (startH === currentHour && 0 <= currentMinute))) isAvail = false;
        }
        if (isAvail) availableSlotsCount++;
        return isAvail 
            ? `<button onclick="window.appAPI.selectTime('${time}', this)" class="time-btn card-convex-sm shadow-convex-sm py-4 bg-white text-slate-950 text-sm font-black active:scale-90 transition-all duration-300 animate-pop-in" style="animation-delay: ${i*20}ms">${time}</button>` 
            : `<button disabled class="py-4 rounded-xl bg-slate-100 text-slate-400 line-through text-sm font-bold cursor-not-allowed border border-slate-200">${time}</button>`;
    }).join('');

    if (availableSlotsCount === 0) container.innerHTML = '<div class="col-span-3 text-center text-slate-500 py-6 font-medium bg-white rounded-2xl border border-slate-100 shadow-convex-sm">На жаль, на цю дату вільного часу немає 😔</div>';
    else container.innerHTML = timeHTML;
}

function selectTime(time, btnElement) {
    state.selectedTime = time;
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('selected-item', 'shadow-blue-300');
        btn.classList.add('bg-white', 'text-slate-950', 'shadow-convex-sm');
    });
    
    btnElement.classList.remove('bg-white', 'text-slate-950', 'shadow-convex-sm');
    btnElement.classList.add('selected-item', 'shadow-blue-300');
    
    tg.MainButton.text = state.editingBookingId ? `Перенести на ${time}` : `Записатися на ${time}`;
    tg.MainButton.show();
    tg.MainButton.onClick(async () => {
        tg.MainButton.showProgress();
        const res = await submitBookingAPI({
            action: state.editingBookingId ? 'rescheduleBooking' : 'createBooking',
            date: state.selectedDate, time: state.selectedTime, masterId: state.selectedMaster.id,
            clientId: state.user.id.toString(), clientName: state.user.first_name,
            service: state.selectedService.name, bookingId: state.editingBookingId
        });
        if (res.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert(state.editingBookingId ? "Запит на перенесення надіслано!" : "Ура! Ти записалася на манікюр 🎉", () => switchTab('client', 'bookings'));
        } else tg.showAlert('Помилка: ' + res.message);
        tg.MainButton.hideProgress();
    });
}

// МОДАЛКИ
function openCancelModal(bookingId, role) {
    modalState.currentCancelBookingId = bookingId;
    modalState.currentCancelRole = role;
    const title = document.getElementById('cancel-modal-title');
    const input = document.getElementById('cancel-reason');
    if (role === 'client') {
        title.innerText = 'Скасувати?';
        input.placeholder = 'Напишіть причину скасування для майстра...';
    } else {
        title.innerText = 'Скасувати?';
        input.placeholder = 'Напишіть клієнту, чому візит скасовано...';
    }
    document.getElementById('cancel-modal').classList.remove('hidden');
    document.getElementById('cancel-modal').classList.add('flex');
}

function closeCancelModal() {
    document.getElementById('cancel-modal').classList.add('hidden');
    document.getElementById('cancel-modal').classList.remove('flex');
    document.getElementById('cancel-reason').value = '';
}

async function confirmCancel() {
    const reason = document.getElementById('cancel-reason').value.trim();
    if (!reason) return tg.showAlert("Будь ласка, вкажіть причину для іншої сторони.");
    const res = await updateBookingStatusAPI(modalState.currentCancelBookingId, 'Отменено', reason);
    if (res.status === 'success') loadBookings(state.isAdmin ? 'admin' : 'client');
    closeCancelModal();
}

async function changeBookingStatus(id, status) {
    const res = await updateBookingStatusAPI(id, status);
    if (res.status === 'success') loadBookings('admin');
}

function switchBookingTab(filter, role) {
    state.currentBookingFilter = filter;
    const btnA = document.getElementById(`${role}-subtab-active`);
    const btnC = document.getElementById(`${role}-subtab-cancelled`);
    if (filter === 'active') {
        btnA.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300";
        btnC.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100";
    } else {
        btnC.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300";
        btnA.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100";
    }
    role === 'admin' ? renderAdminBookings() : renderClientBookings();
}

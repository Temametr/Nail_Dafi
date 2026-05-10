// js/app.js
import { state, tg, modalState, polling } from './state.js';
import { fetchInitialData, fetchBookings, updateBookingStatusAPI, submitBookingAPI, fetchOccupiedSlotsAPI } from './api.js';
import { renderHomeMasters, renderServices, renderMasters, renderCalendar, renderClientBookings } from './client.js';
import { renderAdminStats, renderAdminBookings } from './admin.js';

// ПРИВЯЗЫВАЕМ ФУНКЦИИ К ОКНУ (Чтобы работали onclick в HTML)
window.appAPI = {
    switchTab, switchBookingTab, startClientBookingFlow, startReschedule,
    selectService, selectMaster, selectDate, selectTime,
    changeBookingStatus, openCancelModal, closeCancelModal, confirmCancel,
    renderAdminStats
};

// ИНИЦИАЛИЗАЦИЯ
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
    } catch (e) { tg.showAlert("Ошибка загрузки данных."); }
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

function handleBack() {
    if (!document.getElementById('tab-booking-flow').classList.contains('hidden-step')) {
        if (!document.getElementById('step-datetime').classList.contains('hidden-step')) showStep('step-master');
        else if (!document.getElementById('step-master').classList.contains('hidden-step')) showStep('step-booking');
        else { state.editingBookingId = null; switchTab('client', 'bookings'); }
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
        if (tabId === 'home') title.innerHTML = `Привет, <span class="text-blue-600">${state.user.first_name}</span> 👋`;
        else if (tabId === 'bookings') title.innerHTML = `Твои визиты 💅`;
        else if (tabId === 'profile') title.innerHTML = `Мой кабинет ⚙️`;
    } else {
        const cleanName = state.adminMasterInfo.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        if (tabId === 'home') title.innerHTML = `Панель: <span class="text-teal-600">${cleanName}</span> 📊`;
        else title.innerHTML = `Расписание 📅`;
    }
}

async function loadBookings(role, isSilent = false, forDashboard = false) {
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
    } catch (e) { console.error(e); }
}

function startPolling(role, forDashboard = false) {
    stopPolling();
    polling.interval = setInterval(() => loadBookings(role, true, forDashboard), 15000);
}

function stopPolling() {
    if (polling.interval) clearInterval(polling.interval);
}

// ФЛОУ ЗАПИСИ
function startClientBookingFlow() {
    state.editingBookingId = null;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    document.getElementById('client-header-title').innerHTML = `Новый <span class="text-blue-600">визит</span> 📝`;
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
    document.getElementById('client-header-title').innerHTML = `Смена <span class="text-blue-600">даты</span> 📅`;
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
    document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('selected-item'));
    btnElement.classList.add('selected-item');
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
    const reqSlots = Math.ceil(state.selectedService.duration / 60);

    container.innerHTML = slots.map((time, i) => {
        let isAvail = true;
        const startH = parseInt(time.split(':')[0]);
        for (let j = 0; j < reqSlots; j++) {
            const h = startH + j;
            if (h >= 20 || occupiedSlots.includes(`${h.toString().padStart(2, '0')}:00`)) isAvail = false;
            if (state.selectedDate === todayStr && h <= currentHour) isAvail = false;
        }
        return isAvail ? `<button onclick="window.appAPI.selectTime('${time}', this)" class="time-btn card-convex-sm shadow-convex-sm py-4 bg-white text-slate-950 text-sm font-black active:scale-90 transition-all duration-300 animate-pop-in" style="animation-delay: ${i*20}ms">${time}</button>` : `<button disabled class="py-4 rounded-xl bg-slate-100 text-slate-300 line-through text-xs font-bold border border-slate-200">${time}</button>`;
    }).join('');
}

function selectTime(time, btnElement) {
    state.selectedTime = time;
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('selected-item'));
    btnElement.classList.add('selected-item');
    tg.MainButton.text = state.editingBookingId ? `Перенести на ${time}` : `Записаться на ${time}`;
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
            tg.showAlert("Успешно!", () => switchTab('client', 'bookings'));
        } else tg.showAlert(res.message);
        tg.MainButton.hideProgress();
    });
}

// МОДАЛКИ
function openCancelModal(bookingId, role) {
    modalState.currentCancelBookingId = bookingId;
    modalState.currentCancelRole = role;
    document.getElementById('cancel-modal').classList.remove('hidden');
    document.getElementById('cancel-modal').classList.add('flex');
}
function closeCancelModal() {
    document.getElementById('cancel-modal').classList.add('hidden');
    document.getElementById('cancel-reason').value = '';
}
async function confirmCancel() {
    const reason = document.getElementById('cancel-reason').value.trim();
    if (!reason) return tg.showAlert("Укажите причину");
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
        btnA.className = "flex-1 py-3 text-xs font-bold uppercase bg-slate-950 text-white rounded-xl shadow-lg transition-all";
        btnC.className = "flex-1 py-3 text-xs font-bold uppercase bg-white text-slate-500 rounded-xl border border-rose-100 transition-all";
    } else {
        btnC.className = "flex-1 py-3 text-xs font-bold uppercase bg-slate-950 text-white rounded-xl shadow-lg transition-all";
        btnA.className = "flex-1 py-3 text-xs font-bold uppercase bg-white text-slate-500 rounded-xl border border-rose-100 transition-all";
    }
    role === 'admin' ? renderAdminBookings() : renderClientBookings();
}

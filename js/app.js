import { state, tg, modalState, polling } from './state.js';
import { fetchInitialData, fetchBookings, updateBookingStatusAPI, submitBookingAPI, fetchOccupiedSlotsAPI } from './api.js';
import { renderHomeMasters, renderServices, renderMasters, renderCalendar, renderClientBookings, renderTimeSlots } from './client.js';
import { renderAdminStats, renderAdminBookings } from './admin.js';

window.appAPI = {
    switchTab, switchBookingTab, startClientBookingFlow, startReschedule,
    selectService, selectMaster, selectDate, selectTime,
    changeBookingStatus, openCancelModal, closeCancelModal, confirmCancel,
    renderAdminStats, openMasterProfile, closeMasterProfile, bookFromProfile
};

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
        if (masterData) { state.isAdmin = true; state.adminMasterInfo = masterData; }
    } catch (e) { tg.showAlert("Помилка мережі"); }
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

// ✅ ПРАВКА: Повне скидання при виході з календаря
function handleBack() {
    if (!document.getElementById('master-profile-modal').classList.contains('hidden')) { 
        closeMasterProfile(); 
        return; 
    }

    if (!document.getElementById('tab-booking-flow').classList.contains('hidden-step')) {
        if (state.editingBookingId) { 
            state.editingBookingId = null; 
            switchTab('client', 'bookings'); 
            return; 
        }

        if (!document.getElementById('step-datetime').classList.contains('hidden-step')) {
            resetDateTimeSelection(); // Очищуємо старий вибір
            if (state.viewedMasterId) showStep('step-booking'); 
            else showStep('step-master');
        } else if (!document.getElementById('step-master').classList.contains('hidden-step')) {
            showStep('step-booking');
        } else {
            if (state.viewedMasterId) { switchTab('client', 'home'); openMasterProfile(state.viewedMasterId); } 
            else switchTab('client', 'bookings');
        }
    }
}

// ✅ ПРАВКА: Очищення дати та часу
function resetDateTimeSelection() {
    state.selectedDate = null;
    state.selectedTime = null;
    const timeContainer = document.getElementById('time-slots');
    if (timeContainer) timeContainer.innerHTML = '';
    tg.MainButton.hide();
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
            if (nav === tabId) { btn.classList.remove('text-slate-400'); btn.classList.add(activeColor, 'bg-white/50'); }
            else { btn.classList.remove(activeColor, 'bg-white/50'); btn.classList.add('text-slate-400'); }
        }
    });

    updateHeaderTitle(role, tabId);
    tg.BackButton.hide();
    tg.MainButton.hide();
    if (role === 'client') {
        if (tabId === 'home') renderHomeMasters();
        else if (tabId === 'bookings') loadBookings('client');
    } else {
        if (tabId === 'home') loadBookings('admin', false, true);
        else loadBookings('admin');
    }
}

function updateHeaderTitle(role, tabId) {
    const title = document.getElementById(role === 'client' ? 'client-header-title' : 'admin-header-title');
    if (!title) return;
    if (role === 'client') {
        if (tabId === 'home') title.innerHTML = `Привіт, <span class="text-blue-600">${state.user.first_name}</span> 👋`;
        else if (tabId === 'bookings') title.innerHTML = `Твої візити 💅`;
        else title.innerHTML = `Мій кабінет ⚙️`;
    } else {
        const cleanName = state.adminMasterInfo.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        title.innerHTML = tabId === 'home' ? `Панель: <span class="text-teal-600">${cleanName}</span> 📊` : `Розклад 📅`;
    }
}

async function loadBookings(role, silent = false, dash = false) {
    const contId = role === 'admin' ? (dash ? null : 'admin-bookings-list') : 'my-bookings-list';
    try {
        const data = await fetchBookings(role);
        if (role === 'admin') { state.adminBookings = data.bookings || []; dash ? renderAdminStats('day') : renderAdminBookings(); }
        else { state.clientBookings = data.bookings || []; renderClientBookings(); }
    } catch (e) { console.error(e); }
}

function startClientBookingFlow() {
    state.editingBookingId = null; state.selectedMaster = null; state.viewedMasterId = null;
    resetDateTimeSelection();
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    renderServices();
    showStep('step-booking');
    tg.BackButton.show();
}

function startReschedule(id) {
    const b = state.clientBookings.find(x => x.id === id);
    state.editingBookingId = id;
    state.selectedService = state.services.find(s => s.name === b.service);
    state.selectedMaster = state.masters.find(m => m.id.toString() === b.masterId.toString());
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    renderCalendar();
    showStep('step-datetime');
    tg.BackButton.show();
}

function showStep(sId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    document.getElementById(sId).classList.remove('hidden-step');
    if (sId === 'step-booking') tg.MainButton.hide();
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id.toString() === id.toString());
    if (state.selectedMaster) { renderCalendar(); showStep('step-datetime'); }
    else { renderMasters(); showStep('step-master'); }
}

function selectMaster(id) {
    resetDateTimeSelection(); // Скидаємо старі дати при виборі нового майстра
    state.selectedMaster = state.masters.find(m => m.id.toString() === id.toString());
    renderCalendar();
    showStep('step-datetime');
}

async function selectDate(date, btn) {
    state.selectedDate = date;
    state.selectedTime = null; // Обов'язково скидаємо час
    tg.MainButton.hide();
    
    document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected-item'));
    btn.classList.add('selected-item');
    document.getElementById('time-loader').classList.remove('hidden');
    document.getElementById('time-slots').innerHTML = '';
    
    const d = await fetchOccupiedSlotsAPI(date, state.selectedMaster.id, state.editingBookingId);
    renderTimeSlots(d.occupiedSlots || []);
    document.getElementById('time-loader').classList.add('hidden');
}

function selectTime(t, btn) {
    state.selectedTime = t;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected-item'));
    btn.classList.add('selected-item');
    tg.MainButton.text = state.editingBookingId ? `Перенести на ${t}` : `Записатися на ${t}`;
    tg.MainButton.show();
    tg.MainButton.onClick(async () => {
        tg.MainButton.showProgress();
        const r = await submitBookingAPI({ action: state.editingBookingId ? 'rescheduleBooking' : 'createBooking', date: state.selectedDate, time: state.selectedTime, masterId: state.selectedMaster.id, clientId: state.user.id.toString(), clientName: state.user.first_name, service: state.selectedService.name, bookingId: state.editingBookingId });
        if (r.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert("Готово!", () => switchTab('client', 'bookings'));
        }
        else tg.showAlert(r.message);
        tg.MainButton.hideProgress();
    });
}

function openMasterProfile(id) {
    state.viewedMasterId = id;
    const m = state.masters.find(x => x.id.toString() === id.toString());
    const originalIdx = state.masters.indexOf(m);
    document.getElementById('mp-image').src = originalIdx === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
    document.getElementById('mp-name').innerText = m.name.replace(/^(Майстер|Мастер)\s+/i, '');
    document.getElementById('mp-description').innerText = m.about || "Найкращий майстер нашого острівця!";
    document.getElementById('master-profile-modal').classList.remove('hidden');
    document.getElementById('master-profile-modal').classList.add('flex');
    tg.BackButton.show();
}

function closeMasterProfile() {
    document.getElementById('master-profile-modal').classList.add('hidden');
    document.getElementById('master-profile-modal').classList.remove('flex');
    state.viewedMasterId = null; tg.BackButton.hide();
}

function bookFromProfile() {
    state.selectedMaster = state.masters.find(x => x.id.toString() === state.viewedMasterId.toString());
    resetDateTimeSelection(); // Чистимо старий вибір
    document.getElementById('master-profile-modal').classList.add('hidden');
    document.getElementById('master-profile-modal').classList.remove('flex');
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    renderServices();
    showStep('step-booking');
}

function openCancelModal(id, role) { modalState.currentCancelBookingId = id; document.getElementById('cancel-modal').classList.remove('hidden'); document.getElementById('cancel-modal').classList.add('flex'); }
function closeCancelModal() { document.getElementById('cancel-modal').classList.add('hidden'); }
async function confirmCancel() {
    const r = await updateBookingStatusAPI(modalState.currentCancelBookingId, 'Отменено', document.getElementById('cancel-reason').value);
    if (r.status === 'success') loadBookings(state.isAdmin ? 'admin' : 'client');
    closeCancelModal();
}
function changeBookingStatus(id, s) { updateBookingStatusAPI(id, s).then(() => loadBookings('admin')); }
function switchBookingTab(f, r) { state.currentBookingFilter = f; renderClientBookings(); }

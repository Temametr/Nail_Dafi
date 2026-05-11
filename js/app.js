import { state, tg, modalState, polling } from './state.js';
import { fetchInitialData, fetchBookings, updateBookingStatusAPI, submitBookingAPI, fetchOccupiedSlotsAPI } from './api.js';
import { renderHomeMasters, renderServices, renderMasters, renderCalendar, renderClientBookings, renderTimeSlots, renderUserProfile } from './client.js';
import { renderAdminStats, renderAdminBookings } from './admin.js';

window.appAPI = {
    switchTab, switchBookingTab, startClientBookingFlow, startReschedule,
    selectService, selectMaster, selectDate, selectTime,
    changeBookingStatus, openCancelModal, closeCancelModal, confirmCancel,
    renderAdminStats, openMasterProfile, closeMasterProfile, bookFromProfile,
    openMap // Відкриття карти за прямим посиланням
};

let currentSubmitHandler = null;

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
    } catch (e) { 
        tg.showAlert("Помилка мережі або завантаження даних."); 
    }
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
    if (!document.getElementById('cancel-modal').classList.contains('hidden')) { closeCancelModal(); return; }
    if (!document.getElementById('master-profile-modal').classList.contains('hidden')) { closeMasterProfile(); return; }

    if (!document.getElementById('tab-booking-flow').classList.contains('hidden-step')) {
        if (state.editingBookingId) { 
            state.editingBookingId = null; 
            switchTab('client', 'bookings'); 
            return; 
        }

        if (!document.getElementById('step-time').classList.contains('hidden-step')) {
            state.selectedTime = null;
            tg.MainButton.hide();
            showStep('step-date');
        } 
        else if (!document.getElementById('step-date').classList.contains('hidden-step')) {
            resetDateTimeSelection();
            if (state.viewedMasterId) showStep('step-booking'); 
            else showStep('step-master');
        } 
        else if (!document.getElementById('step-master').classList.contains('hidden-step')) {
            showStep('step-booking');
        } 
        else {
            if (state.viewedMasterId) { 
                switchTab('client', 'home'); 
                openMasterProfile(state.viewedMasterId); 
            } else {
                switchTab('client', 'bookings');
            }
        }
    }
}

function resetDateTimeSelection() {
    state.selectedDate = null; 
    state.selectedTime = null;
    const timeSlotsContainer = document.getElementById('time-slots');
    if (timeSlotsContainer) timeSlotsContainer.innerHTML = '';
    tg.MainButton.hide();
}

function switchTab(role, tabId) {
    const screenPrefix = role === 'admin' ? 'admin-' : '';
    document.querySelectorAll(role === 'admin' ? '.admin-tab-content' : '.tab-content').forEach(el => el.classList.add('hidden-step'));
    const target = document.getElementById(`${screenPrefix}tab-${tabId}`);
    if (target) target.classList.remove('hidden-step');

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
    stopPolling();
    state.editingBookingId = null;

    if (role === 'client') {
        if (tabId === 'home') renderHomeMasters();
        else if (tabId === 'bookings') { loadBookings('client'); startPolling('client'); }
        else if (tabId === 'profile') renderUserProfile(); 
    } else {
        if (tabId === 'home') { loadBookings('admin', false, true); startPolling('admin', true); }
        else if (tabId === 'bookings') { loadBookings('admin'); startPolling('admin'); }
    }
}

function updateHeaderTitle(role, tabId) {
    const title = document.getElementById(role === 'client' ? 'client-header-title' : 'admin-header-title');
    if (!title) return;
    if (role === 'client') {
        if (tabId === 'home') title.innerHTML = `Привіт, <span class="text-blue-600">${state.user.first_name || 'Гість'}</span> 👋`;
        else if (tabId === 'bookings') title.innerHTML = `Твої візити 💅`;
        else title.innerHTML = `Мій кабінет ⚙️`;
    } else {
        const cleanName = state.adminMasterInfo.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        title.innerHTML = tabId === 'home' ? `Панель: <span class="text-teal-600">${cleanName}</span> 📊` : `Розклад 📅`;
    }
}

async function loadBookings(role, silent = false, dash = false) {
    const contId = role === 'admin' ? (dash ? null : 'admin-bookings-list') : 'my-bookings-list';
    if (!silent && contId) {
        const spinnerColor = role === 'admin' ? 'border-t-teal-500' : 'border-t-blue-500';
        document.getElementById(contId).innerHTML = `<div class="flex flex-col items-center justify-center py-16 animate-pulse"><div class="w-12 h-12 border-4 border-slate-100 rounded-full ${spinnerColor} animate-spin mb-4 shadow-sm"></div><p class="text-slate-400 font-medium text-sm">Завантажуємо дані...</p></div>`;
    }
    try {
        const data = await fetchBookings(role);
        if (role === 'admin') { state.adminBookings = data.bookings || []; dash ? renderAdminStats('day') : renderAdminBookings(); }
        else { state.clientBookings = data.bookings || []; renderClientBookings(); }
    } catch (e) { 
        if (!silent && contId) document.getElementById(contId).innerHTML = '<div class="text-center py-12 text-red-500 font-medium">Помилка мережі 🌐</div>';
    }
}

function startPolling(role, forDashboard = false) {
    stopPolling();
    polling.interval = setInterval(() => loadBookings(role, true, forDashboard), 15000);
}

function stopPolling() { if (polling.interval) clearInterval(polling.interval); }

function startClientBookingFlow() {
    state.editingBookingId = null; state.selectedMaster = null; state.viewedMasterId = null;
    resetDateTimeSelection();
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);
        if(btn) {
            if (nav === 'bookings') { btn.classList.remove('text-slate-400'); btn.classList.add('text-blue-500', 'bg-blue-50'); }
            else { btn.classList.remove('text-blue-500', 'bg-blue-50'); btn.classList.add('text-slate-400'); }
        }
    });

    renderServices(); showStep('step-booking'); tg.BackButton.show();
}

function startReschedule(id) {
    const b = state.clientBookings.find(x => x.id === id);
    state.editingBookingId = id;
    state.selectedService = state.services.find(s => s.name === b.service);
    state.selectedMaster = state.masters.find(m => m.id.toString() === b.masterId.toString());
    resetDateTimeSelection();
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);
        if(btn) {
            if (nav === 'bookings') { btn.classList.remove('text-slate-400'); btn.classList.add('text-blue-500', 'bg-blue-50'); }
            else { btn.classList.remove('text-blue-500', 'bg-blue-50'); btn.classList.add('text-slate-400'); }
        }
    });

    renderCalendar(); showStep('step-date'); tg.BackButton.show();
}

function showStep(sId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    const target = document.getElementById(sId);
    if(target) target.classList.remove('hidden-step');
    if (sId === 'step-booking') tg.MainButton.hide();
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id.toString() === id.toString());
    if (state.selectedMaster) { renderCalendar(); showStep('step-date'); }
    else { renderMasters(); showStep('step-master'); }
}

function selectMaster(id) {
    resetDateTimeSelection();
    state.selectedMaster = state.masters.find(m => m.id.toString() === id.toString());
    renderCalendar(); showStep('step-date');
}

async function selectDate(date, btn) {
    state.selectedDate = date; state.selectedTime = null; tg.MainButton.hide();
    document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected-item', 'shadow-blue-300', 'border-transparent'));
    btn.classList.add('selected-item', 'shadow-blue-300', 'border-transparent');
    
    const d = new Date(date);
    const dateFormatted = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
    const titleEl = document.getElementById('time-step-title');
    if(titleEl) titleEl.innerText = `Час на ${dateFormatted}`;

    showStep('step-time'); 
    document.getElementById('time-loader').classList.remove('hidden');
    document.getElementById('time-slots').innerHTML = '';
    const dData = await fetchOccupiedSlotsAPI(date, state.selectedMaster.id, state.editingBookingId);
    renderTimeSlots(dData.occupiedSlots || []);
    document.getElementById('time-loader').classList.add('hidden');
}

function selectTime(t, btn) {
    state.selectedTime = t;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected-item', 'shadow-blue-300', 'border-transparent'));
    btn.classList.add('selected-item', 'shadow-blue-300', 'border-transparent');
    
    tg.MainButton.text = state.editingBookingId ? `Перенести на ${t}` : `Записатися на ${t}`;
    tg.MainButton.show();
    
    if (currentSubmitHandler) { tg.MainButton.offClick(currentSubmitHandler); }
    currentSubmitHandler = async () => {
        tg.MainButton.showProgress();
        const r = await submitBookingAPI({ action: state.editingBookingId ? 'rescheduleBooking' : 'createBooking', date: state.selectedDate, time: state.selectedTime, masterId: state.selectedMaster.id, clientId: state.user.id.toString(), clientName: state.user.first_name, service: state.selectedService.name, bookingId: state.editingBookingId });
        if (r.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert(state.editingBookingId ? "Запит на перенесення надіслано!" : "Ура! Ти записалася на манікюр 🎉", () => switchTab('client', 'bookings'));
        } else { tg.showAlert('Помилка: ' + r.message); }
        tg.MainButton.hideProgress();
    };
    tg.MainButton.onClick(currentSubmitHandler);
}

function openMasterProfile(id) {
    state.viewedMasterId = id;
    const m = state.masters.find(x => x.id.toString() === id.toString());
    const originalIdx = state.masters.indexOf(m);
    document.getElementById('mp-image').src = originalIdx === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
    document.getElementById('mp-name').innerText = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
    document.getElementById('mp-phone').innerText = m.phone || "Не вказано";
    document.getElementById('mp-phone-link').href = m.phone ? `tel:${m.phone.replace(/[^0-9+]/g, '')}` : "#";
    document.getElementById('mp-description').innerText = m.about || "Найкращий майстер нашого салону!";
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
    resetDateTimeSelection();
    document.getElementById('master-profile-modal').classList.add('hidden');
    document.getElementById('master-profile-modal').classList.remove('flex');
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);
        if(btn) {
            if (nav === 'home') { btn.classList.remove('text-slate-400'); btn.classList.add('text-blue-500', 'bg-blue-50'); }
            else { btn.classList.remove('text-blue-500', 'bg-blue-50'); btn.classList.add('text-slate-400'); }
        }
    });

    renderServices(); showStep('step-booking'); tg.BackButton.show();
}

// ✅ ОНОВЛЕНО: Надійне посилання Google Maps з новими координатами
function openMap() {
    const lat = 50.0273880;
    const lng = 36.3314636;
    // Офіційний формат Google Maps URL, який автоматично прокидається в додаток на смартфоні
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    tg.openLink(url);
}

function openCancelModal(id, role) { 
    modalState.currentCancelBookingId = id; 
    modalState.currentCancelRole = role;
    const title = document.getElementById('cancel-modal-title');
    const input = document.getElementById('cancel-reason');
    title.innerText = 'Скасувати?';
    input.placeholder = role === 'client' ? 'Напишіть причину скасування для майстра...' : 'Напишіть клієнту, чому візит скасовано...';
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
    if (!reason) return tg.showAlert("Будь ласка, вкажіть причину.");
    const r = await updateBookingStatusAPI(modalState.currentCancelBookingId, 'Отменено', reason);
    if (r.status === 'success') loadBookings(state.isAdmin ? 'admin' : 'client');
    closeCancelModal();
}

async function changeBookingStatus(id, s) { 
    const r = await updateBookingStatusAPI(id, s);
    if (r.status === 'success') loadBookings('admin');
}

function switchBookingTab(f, r) { 
    state.currentBookingFilter = f; 
    const btnA = document.getElementById(`${r}-subtab-active`);
    const btnC = document.getElementById(`${r}-subtab-cancelled`);
    if (f === 'active') {
        btnA.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300";
        btnC.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100";
    } else {
        btnC.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300";
        btnA.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100";
    }
    r === 'admin' ? renderAdminBookings() : renderClientBookings(); 
}

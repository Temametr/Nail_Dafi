import { state, tg, modalState, polling } from './state.js';
import { fetchInitialData, fetchBookings, updateBookingStatusAPI, submitBookingAPI, fetchOccupiedSlotsAPI } from './api.js';
import { renderHomeMasters, renderServices, renderMasters, renderCalendar, renderClientBookings, renderTimeSlots } from './client.js';
import { renderAdminStats, renderAdminBookings } from './admin.js'; // Імпорт адмінки

window.appAPI = {
    switchTab, switchBookingTab, startClientBookingFlow, startReschedule,
    selectService, selectMaster, selectDate, selectTime,
    changeBookingStatus, openCancelModal, closeCancelModal, confirmCancel,
    renderAdminStats, openMasterProfile, closeMasterProfile, bookFromProfile
};

let currentSubmitHandler = null;

window.addEventListener('DOMContentLoaded', async () => {
    tg.MainButton.color = "#3b82f6";
    tg.BackButton.onClick(handleBack);
    await loadApp();
});

async function loadApp() {
    try {
        const data = await fetchInitialData();
        state.services = data.services || [];
        state.masters = data.masters || [];
        
        const masterData = state.masters.find(m => m.id.toString() === state.user.id.toString());
        if (masterData) { 
            state.isAdmin = true; 
            state.adminMasterInfo = masterData; 
        }

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
    } catch (e) { 
        tg.showAlert("Помилка завантаження даних. Спробуйте пізніше."); 
    }
}

// Логіка кнопки "Назад" (надійна)
function handleBack() {
    // Закриття профілю
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

function showStep(sId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    const stepEl = document.getElementById(sId);
    if (stepEl) stepEl.classList.remove('hidden-step');
    if (sId === 'step-booking') tg.MainButton.hide();
}

function switchTab(role, tabId) {
    document.querySelectorAll(role === 'admin' ? '.admin-tab-content' : '.tab-content').forEach(el => el.classList.add('hidden-step'));
    const target = document.getElementById(role === 'admin' ? `admin-tab-${tabId}` : `tab-${tabId}`);
    if (target) target.classList.remove('hidden-step');
    
    const navBar = document.getElementById(`${role}-bottom-nav`);
    if (navBar) navBar.classList.remove('hidden-step');

    const activeColor = role === 'admin' ? 'text-teal-600' : 'text-blue-500';
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`${role}-nav-${nav}`);
        if (btn) {
            if (nav === tabId) { btn.classList.remove('text-slate-400'); btn.classList.add(activeColor, 'bg-white/50'); }
            else { btn.classList.remove(activeColor, 'bg-white/50'); btn.classList.add('text-slate-400'); }
        }
    });

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

async function loadBookings(role, silent = false, dash = false) {
    const contId = role === 'admin' ? (dash ? null : 'admin-bookings-list') : 'my-bookings-list';
    if (!silent && contId) {
        document.getElementById(contId).innerHTML = `<div class="flex flex-col items-center justify-center py-16 animate-pulse"><div class="w-12 h-12 border-4 border-slate-100 rounded-full border-t-blue-500 animate-spin mb-4 shadow-sm"></div><p class="text-slate-400 font-medium text-sm">Завантажуємо дані...</p></div>`;
    }
    try {
        const data = await fetchBookings(role);
        if (role === 'admin') { 
            state.adminBookings = data.bookings || []; 
            dash ? renderAdminStats('day') : renderAdminBookings(); 
        } else { 
            state.clientBookings = data.bookings || []; 
            renderClientBookings(); 
        }
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
    state.editingBookingId = null; 
    state.selectedMaster = null; 
    state.viewedMasterId = null;
    resetDateTimeSelection();
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    
    renderServices();
    showStep('step-booking');
    tg.BackButton.show();
}

function startReschedule(id) {
    const b = state.clientBookings.find(x => x.id === id);
    if(!b) return;
    state.editingBookingId = id;
    state.selectedService = state.services.find(s => s.name === b.service);
    state.selectedMaster = state.masters.find(m => m.id.toString() === b.masterId.toString());
    resetDateTimeSelection();
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    
    renderCalendar();
    showStep('step-date');
    tg.BackButton.show();
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id.toString() === id.toString());
    if (state.selectedMaster) { renderCalendar(); showStep('step-date'); }
    else { renderMasters(); showStep('step-master'); }
}

function selectMaster(id) {
    resetDateTimeSelection(); 
    state.selectedMaster = state.masters.find(m => m.id.toString() === id.toString());
    renderCalendar();
    showStep('step-date');
}

async function selectDate(date, btn) {
    state.selectedDate = date;
    state.selectedTime = null;
    tg.MainButton.hide();
    
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
            tg.showAlert(state.editingBookingId ? "Запит на перенесення надіслано!" : "Готово! Запис успішно створено 🎉", () => switchTab('client', 'bookings'));
        } else { tg.showAlert('Помилка: ' + r.message); }
        tg.MainButton.hideProgress();
    };
    tg.MainButton.onClick(currentSubmitHandler);
}

function openMasterProfile(id) {
    state.viewedMasterId = id;
    const m = state.masters.find(x => x.id.toString() === id.toString());
    if(!m) return;
    
    const originalIdx = state.masters.indexOf(m);
    document.getElementById('mp-image').src = originalIdx === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
    document.getElementById('mp-name').innerText = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
    
    const phoneEl = document.getElementById('mp-phone');
    if(phoneEl) phoneEl.innerText = m.phone || "Не вказано";
    
    const phoneLinkEl = document.getElementById('mp-phone-link');
    if(phoneLinkEl) phoneLinkEl.href = m.phone ? `tel:${m.phone.replace(/[^0-9+]/g, '')}` : "#";
    
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
    
    renderServices();
    showStep('step-booking');
    tg.BackButton.show();
}

function openCancelModal(id, role) { 
    modalState.currentCancelBookingId = id; 
    modalState.currentCancelRole = role;
    const title = document.getElementById('cancel-modal-title');
    const input = document.getElementById('cancel-reason');
    if(title) title.innerText = 'Скасувати?';
    if(input) input.placeholder = role === 'client' ? 'Напишіть причину скасування для майстра...' : 'Напишіть клієнту, чому візит скасовано...';
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
    r === 'admin' ? renderAdminBookings() : renderClientBookings(); 
}

import { state, tg, modalState, polling } from './state.js';
import { fetchInitialData, fetchBookings, updateBookingStatusAPI, submitBookingAPI, fetchOccupiedSlotsAPI } from './api.js';
import { renderHomeMasters, renderServices, renderMasters, renderCalendar, renderClientBookings, renderTimeSlots } from './client.js';

window.appAPI = {
    switchTab, switchBookingTab, startClientBookingFlow, startReschedule,
    selectService, selectMaster, selectDate, selectTime,
    changeBookingStatus, openCancelModal, closeCancelModal, confirmCancel,
    renderAdminStats: () => {}, openMasterProfile, closeMasterProfile, bookFromProfile
};

window.addEventListener('DOMContentLoaded', async () => {
    tg.MainButton.color = "#3b82f6";
    tg.BackButton.onClick(handleBack);
    await loadApp();
});

async function loadApp() {
    try {
        const data = await fetchInitialData();
        state.services = data.services;
        state.masters = data.masters;
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('client-screen').classList.remove('hidden-step');
        document.getElementById('client-bottom-nav').classList.remove('hidden-step');
        switchTab('client', 'home');
    } catch (e) { tg.showAlert("Помилка завантаження"); }
}

// ✅ ОНОВЛЕНО: Покрокова логіка кнопки "Назад"
function handleBack() {
    if (!document.getElementById('master-profile-modal').classList.contains('hidden')) { closeMasterProfile(); return; }

    if (!document.getElementById('tab-booking-flow').classList.contains('hidden-step')) {
        // Якщо ми на виборі ЧАСУ -> йдемо на вибір ДАТИ
        if (!document.getElementById('step-time').classList.contains('hidden-step')) {
            showStep('step-date');
        } 
        // Якщо ми на виборі ДАТИ -> йдемо до майстра або послуг
        else if (!document.getElementById('step-date').classList.contains('hidden-step')) {
            resetDateTimeSelection();
            if (state.viewedMasterId) showStep('step-booking'); 
            else showStep('step-master');
        } 
        // Якщо ми на виборі МАЙСТРА -> йдемо до послуг
        else if (!document.getElementById('step-master').classList.contains('hidden-step')) {
            showStep('step-booking');
        } 
        // Повернення в самий початок (до списку візитів або профілю)
        else {
            if (state.viewedMasterId) { switchTab('client', 'home'); openMasterProfile(state.viewedMasterId); } 
            else switchTab('client', 'bookings');
        }
    }
}

function resetDateTimeSelection() {
    state.selectedDate = null; state.selectedTime = null;
    tg.MainButton.hide();
}

function switchTab(role, tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden-step');
    updateHeaderTitle(role, tabId);
    tg.BackButton.hide(); tg.MainButton.hide();
    if (tabId === 'home') renderHomeMasters();
    else if (tabId === 'bookings') loadBookings('client');
}

function updateHeaderTitle(role, tabId) {
    const title = document.getElementById('client-header-title');
    if (tabId === 'home') title.innerHTML = `Привіт, <span class="text-blue-600">${state.user.first_name}</span> 👋`;
    else if (tabId === 'bookings') title.innerHTML = `Твої візити 💅`;
    else title.innerHTML = `Мій кабінет ⚙️`;
}

async function loadBookings(role) {
    const data = await fetchBookings(role);
    state.clientBookings = data.bookings || [];
    renderClientBookings();
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

function showStep(sId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    document.getElementById(sId).classList.remove('hidden-step');
    if (sId === 'step-booking') tg.MainButton.hide();
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id.toString() === id.toString());
    if (state.selectedMaster) { renderCalendar(); showStep('step-date'); }
    else { renderMasters(); showStep('step-master'); }
}

function selectMaster(id) {
    state.selectedMaster = state.masters.find(m => m.id.toString() === id.toString());
    renderCalendar();
    showStep('step-date');
}

// ✅ ОНОВЛЕНО: Перехід до кроку ЧАСУ після вибору дати
async function selectDate(date, btn) {
    state.selectedDate = date;
    state.selectedTime = null;
    
    // Візуально виділяємо дату перед переходом (опціонально, бо екран зміниться)
    document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected-item'));
    btn.classList.add('selected-item');
    
    // Перемикаємо заголовок, щоб клієнт бачив, на яку дату вибирає час
    const d = new Date(date);
    const dateFormatted = d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
    document.getElementById('time-step-title').innerText = `Час на ${dateFormatted}`;

    showStep('step-time'); // ПЕРЕХІД НА НОВИЙ КРОК
    
    document.getElementById('time-loader').classList.remove('hidden');
    document.getElementById('time-slots').innerHTML = '';
    
    const dData = await fetchOccupiedSlotsAPI(date, state.selectedMaster.id, state.editingBookingId);
    renderTimeSlots(dData.occupiedSlots || []);
    document.getElementById('time-loader').classList.add('hidden');
}

function selectTime(t, btn) {
    state.selectedTime = t;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected-item'));
    btn.classList.add('selected-item');
    tg.MainButton.text = `Записатися на ${t}`;
    tg.MainButton.show();
    tg.MainButton.onClick(async () => {
        tg.MainButton.showProgress();
        const r = await submitBookingAPI({ action: 'createBooking', date: state.selectedDate, time: state.selectedTime, masterId: state.selectedMaster.id, clientId: state.user.id.toString(), clientName: state.user.first_name, service: state.selectedService.name });
        if (r.status === 'success') { tg.HapticFeedback.notificationOccurred('success'); tg.showAlert("Запис створено!", () => switchTab('client', 'bookings')); }
        tg.MainButton.hideProgress();
    });
}

function openMasterProfile(id) {
    state.viewedMasterId = id;
    const m = state.masters.find(x => x.id.toString() === id.toString());
    const originalIdx = state.masters.indexOf(m);
    document.getElementById('mp-image').src = originalIdx === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
    document.getElementById('mp-name').innerText = m.name.replace(/^(Майстер|Мастер)\s+/i, '');
    document.getElementById('mp-description').innerText = m.about || "Найкращий майстер!";
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
    document.getElementById('master-profile-modal').classList.add('hidden');
    document.getElementById('tab-home').classList.add('hidden-step');
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    renderServices();
    showStep('step-booking');
}

function switchBookingTab() { renderClientBookings(); }
function openCancelModal() {}
function closeCancelModal() {}
function confirmCancel() {}
function changeBookingStatus() {}

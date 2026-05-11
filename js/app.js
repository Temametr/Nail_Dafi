import { state, tg, modalState, polling } from './state.js';

import {
    fetchInitialData,
    fetchBookings,
    updateBookingStatusAPI,
    submitBookingAPI,
    fetchOccupiedSlotsAPI
} from './api.js';

import {
    renderHomeMasters,
    renderServices,
    renderMasters,
    renderCalendar,
    renderClientBookings,
    renderTimeSlots,
    renderUserProfile,
    renderMessagesTab
} from './client.js';

import { renderAdminStats, renderAdminBookings } from './admin.js';

import {
    showMainButton,
    hideMainButton,
    enableMainButton,
    disableMainButton,
    showMainButtonProgress,
    hideMainButtonProgress,
    setMainButtonHandler
} from './core/telegram/mainButton.js';

import {
    showBackButton,
    hideBackButton,
    setBackButtonHandler
} from './core/telegram/backButton.js';

import { notifySuccess } from './core/telegram/haptic.js';

window.appAPI = {
    switchTab,
    switchBookingTab,
    startClientBookingFlow,
    startReschedule,
    selectService,
    selectMaster,
    selectDate,
    selectTime,
    changeBookingStatus,
    openCancelModal,
    closeCancelModal,
    confirmCancel,
    renderAdminStats,
    openMasterProfile,
    closeMasterProfile,
    bookFromProfile,
    openMap
};

let currentSubmitHandler = null;
let isSubmittingBooking = false;
let lastDateRequestId = 0;

window.addEventListener('DOMContentLoaded', async () => {
    tg.MainButton.color = '#3b82f6';
    setBackButtonHandler(handleBack);
    await loadApp();
});

async function loadInitialData() {
    try {
        const data = await fetchInitialData();

        state.services = data.services || [];
        state.masters = data.masters || [];

        if (state.user && state.user.id) {
            const masterData = state.masters.find(
                m => m.id.toString() === state.user.id.toString()
            );

            if (masterData) {
                state.isAdmin = true;
                state.adminMasterInfo = masterData;
            }
        }
    } catch (e) {
        console.error('Помилка завантаження даних:', e);
        tg.showAlert('Помилка мережі або завантаження даних.');
    }
}

async function loadApp() {
    await loadInitialData();

    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');

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
    if (!document.getElementById('cancel-modal').classList.contains('hidden')) {
        closeCancelModal();
        return;
    }

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
            hideMainButton();
            showStep('step-date');
        } else if (!document.getElementById('step-date').classList.contains('hidden-step')) {
            resetDateTimeSelection();

            if (state.viewedMasterId) {
                showStep('step-booking');
            } else {
                showStep('step-master');
            }
        } else if (!document.getElementById('step-master').classList.contains('hidden-step')) {
            showStep('step-booking');
        } else {
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
    lastDateRequestId++;

    const timeSlotsContainer = document.getElementById('time-slots');
    if (timeSlotsContainer) timeSlotsContainer.innerHTML = '';

    hideMainButton();
}

function switchTab(role, tabId) {
    const screenPrefix = role === 'admin' ? 'admin-' : '';

    document
        .querySelectorAll(role === 'admin' ? '.admin-tab-content' : '.tab-content')
        .forEach(el => el.classList.add('hidden-step'));

    const target = document.getElementById(`${screenPrefix}tab-${tabId}`);
    if (target) target.classList.remove('hidden-step');

    const activeColor = role === 'admin' ? 'text-teal-600' : 'text-blue-500';

    ['home', 'bookings', 'messages', 'profile'].forEach(nav => {
        const btn = document.getElementById(`${role}-nav-${nav}`);

        if (btn) {
            if (nav === tabId) {
                btn.classList.remove('text-slate-400');
                btn.classList.add(activeColor, 'bg-white/50');
            } else {
                btn.classList.remove(activeColor, 'bg-white/50');
                btn.classList.add('text-slate-400');
            }
        }
    });

    updateHeaderTitle(role, tabId);
    hideBackButton();
    hideMainButton();
    stopPolling();

    state.editingBookingId = null;
    isSubmittingBooking = false;

    if (role === 'client') {
        if (tabId === 'home') renderHomeMasters();
        else if (tabId === 'bookings') {
            loadBookings('client');
            startPolling('client');
        } else if (tabId === 'messages') renderMessagesTab();
        else if (tabId === 'profile') renderUserProfile();
    } else {
        if (tabId === 'home') {
            loadBookings('admin', false, true);
            startPolling('admin', true);
        } else if (tabId === 'bookings') {
            loadBookings('admin');
            startPolling('admin');
        }
    }
}

function updateHeaderTitle(role, tabId) {
    const title = document.getElementById(
        role === 'client' ? 'client-header-title' : 'admin-header-title'
    );

    if (!title) return;

    const firstName = state.user && state.user.first_name
        ? state.user.first_name
        : 'Гість';

    if (role === 'client') {
        if (tabId === 'home') {
            title.innerHTML = `Привіт, <span class="text-blue-600">${firstName}</span> 👋`;
        } else if (tabId === 'bookings') {
            title.innerHTML = 'Твої візити 💅';
        } else if (tabId === 'messages') {
            title.innerHTML = 'Мої чати 💬';
        } else {
            title.innerHTML = 'Мій кабінет ⚙️';
        }
    } else {
        const adminName = state.adminMasterInfo && state.adminMasterInfo.name
            ? state.adminMasterInfo.name
            : 'Майстер';

        const cleanName = adminName.replace(/^(Майстер|Мастер)\s+/i, '').trim();

        title.innerHTML = tabId === 'home'
            ? `Панель: <span class="text-teal-600">${cleanName}</span> 📊`
            : 'Розклад 📅';
    }
}

async function loadBookings(role, silent = false, dash = false) {
    const contId = role === 'admin'
        ? dash ? null : 'admin-bookings-list'
        : 'my-bookings-list';

    if (!silent && contId) {
        const spinnerColor = role === 'admin'
            ? 'border-t-teal-500'
            : 'border-t-blue-500';

        document.getElementById(contId).innerHTML = `
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
            dash ? renderAdminStats('day') : renderAdminBookings();
        } else {
            state.clientBookings = data.bookings || [];
            renderClientBookings();
        }
    } catch (e) {
        console.error('Помилка завантаження записів:', e);

        if (!silent && contId) {
            document.getElementById(contId).innerHTML =
                '<div class="text-center py-12 text-red-500 font-medium">Помилка мережі 🌐</div>';
        }
    }
}

function startPolling(role, forDashboard = false) {
    stopPolling();
    polling.interval = setInterval(
        () => loadBookings(role, true, forDashboard),
        15000
    );
}

function stopPolling() {
    if (polling.interval) {
        clearInterval(polling.interval);
        polling.interval = null;
    }
}

function startClientBookingFlow() {
    state.editingBookingId = null;
    state.selectedMaster = null;
    state.viewedMasterId = null;
    isSubmittingBooking = false;

    resetDateTimeSelection();

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');

    ['home', 'bookings', 'messages', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);

        if (btn) {
            if (nav === 'bookings') {
                btn.classList.remove('text-slate-400');
                btn.classList.add('text-blue-500', 'bg-blue-50');
            } else {
                btn.classList.remove('text-blue-500', 'bg-blue-50');
                btn.classList.add('text-slate-400');
            }
        }
    });

    renderServices();
    showStep('step-booking');
    showBackButton();
}

function startReschedule(id) {
    const b = state.clientBookings.find(x => x.id === id);
    if (!b) return tg.showAlert('Запис не знайдено');

    state.editingBookingId = id;
    state.selectedService = state.services.find(s => s.name === b.service);
    state.selectedMaster = state.masters.find(
        m => m.id.toString() === b.masterId.toString()
    );

    if (!state.selectedService || !state.selectedMaster) {
        return tg.showAlert('Не вдалося підготувати перенесення запису.');
    }

    isSubmittingBooking = false;
    resetDateTimeSelection();

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');

    ['home', 'bookings', 'messages', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);

        if (btn) {
            if (nav === 'bookings') {
                btn.classList.remove('text-slate-400');
                btn.classList.add('text-blue-500', 'bg-blue-50');
            } else {
                btn.classList.remove('text-blue-500', 'bg-blue-50');
                btn.classList.add('text-slate-400');
            }
        }
    });

    renderCalendar();
    showStep('step-date');
    showBackButton();
}

function showStep(sId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));

    const target = document.getElementById(sId);
    if (target) target.classList.remove('hidden-step');

    if (sId === 'step-booking') hideMainButton();
}

function selectService(id) {
    state.selectedService = state.services.find(
        s => s.id.toString() === id.toString()
    );

    if (!state.selectedService) {
        return tg.showAlert('Послугу не знайдено');
    }

    if (state.selectedMaster) {
        renderCalendar();
        showStep('step-date');
    } else {
        renderMasters();
        showStep('step-master');
    }
}

function selectMaster(id) {
    resetDateTimeSelection();

    state.selectedMaster = state.masters.find(
        m => m.id.toString() === id.toString()
    );

    if (!state.selectedMaster) {
        return tg.showAlert('Майстра не знайдено');
    }

    renderCalendar();
    showStep('step-date');
}

async function selectDate(date, btn) {
    const requestId = ++lastDateRequestId;

    state.selectedDate = date;
    state.selectedTime = null;
    hideMainButton();

    document.querySelectorAll('.date-btn').forEach(b =>
        b.classList.remove('selected-item', 'shadow-blue-300', 'border-transparent')
    );

    btn.classList.add('selected-item', 'shadow-blue-300', 'border-transparent');

    const d = new Date(date);
    const dateFormatted = d.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long'
    });

    const titleEl = document.getElementById('time-step-title');
    if (titleEl) titleEl.innerText = `Час на ${dateFormatted}`;

    showStep('step-time');

    const loader = document.getElementById('time-loader');
    const slots = document.getElementById('time-slots');

    if (loader) loader.classList.remove('hidden');
    if (slots) slots.innerHTML = '';

    try {
        const dData = await fetchOccupiedSlotsAPI(
            date,
            state.selectedMaster.id,
            state.editingBookingId
        );

        if (requestId !== lastDateRequestId) return;

        renderTimeSlots(dData.occupiedSlots || []);
    } catch (error) {
        if (requestId !== lastDateRequestId) return;

        console.error('Помилка завантаження слотів:', error);

        if (slots) {
            slots.innerHTML = `
                <div class="col-span-4 text-center text-red-500 py-6 font-medium bg-white rounded-2xl border border-red-100 shadow-convex-sm">
                    Не вдалося завантажити час. Спробуйте ще раз.
                </div>
            `;
        }
    } finally {
        if (requestId === lastDateRequestId && loader) {
            loader.classList.add('hidden');
        }
    }
}

function selectTime(t, btn) {
    state.selectedTime = t;

    document.querySelectorAll('.time-btn').forEach(b =>
        b.classList.remove('selected-item', 'shadow-blue-300', 'border-transparent')
    );

    btn.classList.add('selected-item', 'shadow-blue-300', 'border-transparent');

    const buttonText = state.editingBookingId
        ? `Перенести на ${t}`
        : `Записатися на ${t}`;

    showMainButton(buttonText);

    currentSubmitHandler = setMainButtonHandler(async () => {
        if (isSubmittingBooking) return;

        isSubmittingBooking = true;
        disableMainButton();
        showMainButtonProgress();

        try {
            const clientName = state.user && state.user.first_name
                ? state.user.first_name
                : 'Гість';

            const clientId = state.user && state.user.id
                ? state.user.id.toString()
                : '';

            if (!clientId) {
                throw new Error('Telegram user не визначений');
            }

            const r = await submitBookingAPI({
                action: state.editingBookingId ? 'rescheduleBooking' : 'createBooking',
                date: state.selectedDate,
                time: state.selectedTime,
                masterId: state.selectedMaster.id,
                clientId,
                clientName,
                service: state.selectedService.name,
                bookingId: state.editingBookingId
            });

            if (r.status === 'success') {
                notifySuccess();

                tg.showAlert(
                    state.editingBookingId
                        ? 'Запит на перенесення надіслано!'
                        : 'Ура! Ти записалася на манікюр 🎉',
                    () => switchTab('client', 'bookings')
                );
            } else {
                tg.showAlert('Помилка: ' + (r.message || 'невідома помилка'));
            }
        } catch (error) {
            console.error('Помилка створення запису:', error);
            tg.showAlert(error.message || 'Не вдалося створити запис.');
        } finally {
            hideMainButtonProgress();
            enableMainButton();
            isSubmittingBooking = false;
        }
    }, currentSubmitHandler);
}

function openMasterProfile(id) {
    try {
        state.viewedMasterId = id;

        const m = state.masters.find(x => x.id.toString() === id.toString());
        if (!m) return;

        const originalIdx = state.masters.indexOf(m);

        document.getElementById('mp-image').src =
            originalIdx === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';

        document.getElementById('mp-name').innerText =
            m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();

        const phoneStr = m.phone ? String(m.phone) : null;

        document.getElementById('mp-phone').innerText = phoneStr || 'Не вказано';
        document.getElementById('mp-phone-link').href = phoneStr
            ? `tel:${phoneStr.replace(/[^0-9+]/g, '')}`
            : '#';

        document.getElementById('mp-description').innerText =
            m.about || 'Найкращий майстер нашого салону!';

        document.getElementById('master-profile-modal').classList.remove('hidden');
        document.getElementById('master-profile-modal').classList.add('flex');

        showBackButton();
    } catch (e) {
        console.error('Помилка профілю майстра:', e);
    }
}

function closeMasterProfile() {
    document.getElementById('master-profile-modal').classList.add('hidden');
    document.getElementById('master-profile-modal').classList.remove('flex');

    state.viewedMasterId = null;
    hideBackButton();
}

function bookFromProfile() {
    if (!state.viewedMasterId) return;

    state.selectedMaster = state.masters.find(
        x => x.id.toString() === state.viewedMasterId.toString()
    );

    if (!state.selectedMaster) {
        return tg.showAlert('Майстра не знайдено');
    }

    resetDateTimeSelection();

    document.getElementById('master-profile-modal').classList.add('hidden');
    document.getElementById('tab-home').classList.add('hidden-step');
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');

    ['home', 'bookings', 'messages', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);

        if (btn) {
            if (nav === 'home') {
                btn.classList.remove('text-slate-400');
                btn.classList.add('text-blue-500', 'bg-blue-50');
            } else {
                btn.classList.remove('text-blue-500', 'bg-blue-50');
                btn.classList.add('text-slate-400');
            }
        }
    });

    renderServices();
    showStep('step-booking');
    showBackButton();
}

function openMap() {
    const lat = 50.027388;
    const lng = 36.3314636;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    tg.openLink(url);
}

function openCancelModal(id, role) {
    modalState.currentCancelBookingId = id;
    modalState.currentCancelRole = role;

    const title = document.getElementById('cancel-modal-title');
    const input = document.getElementById('cancel-reason');

    title.innerText = 'Скасувати?';
    input.placeholder = role === 'client'
        ? 'Напишіть причину скасування для майстра...'
        : 'Напишіть клієнту, чому візит скасовано...';

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

    if (!reason) {
        return tg.showAlert('Будь ласка, вкажіть причину.');
    }

    try {
        const r = await updateBookingStatusAPI(
            modalState.currentCancelBookingId,
            'Отменено',
            reason
        );

        if (r.status === 'success') {
            loadBookings(state.isAdmin ? 'admin' : 'client');
        } else {
            tg.showAlert('Помилка: ' + (r.message || 'невідома помилка'));
        }
    } catch (error) {
        console.error('Помилка скасування:', error);
        tg.showAlert(error.message || 'Не вдалося скасувати запис.');
    } finally {
        closeCancelModal();
    }
}

async function changeBookingStatus(id, s) {
    try {
        const r = await updateBookingStatusAPI(id, s);

        if (r.status === 'success') {
            loadBookings('admin');
        } else {
            tg.showAlert('Помилка: ' + (r.message || 'невідома помилка'));
        }
    } catch (error) {
        console.error('Помилка зміни статусу:', error);
        tg.showAlert(error.message || 'Не вдалося змінити статус.');
    }
}

function switchBookingTab(f, r) {
    state.currentBookingFilter = f;

    const btnA = document.getElementById(`${r}-subtab-active`);
    const btnC = document.getElementById(`${r}-subtab-cancelled`);

    if (f === 'active') {
        btnA.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300';

        btnC.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100';
    } else {
        btnC.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300';

        btnA.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100';
    }

    r === 'admin' ? renderAdminBookings() : renderClientBookings();
}
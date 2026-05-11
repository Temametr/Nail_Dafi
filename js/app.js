import { state, tg, modalState, polling } from './state.js';

import {
    fetchInitialData,
    fetchBookings,
    updateBookingStatusAPI
} from './api.js';

import {
    renderHomeMasters,
    renderServices,
    renderClientBookings,
    renderUserProfile,
    renderMessagesTab
} from './client.js';

import { renderAdminStats, renderAdminBookings } from './admin.js';

import {
    startClientBookingFlow,
    startReschedule,
    selectService,
    selectMaster,
    selectDate,
    selectTime,
    resetDateTimeSelection,
    showStep
} from './features/booking/bookingFlow.js';

import {
    hideMainButton
} from './core/telegram/mainButton.js';

import {
    showBackButton,
    hideBackButton,
    setBackButtonHandler
} from './core/telegram/backButton.js';

import {
    showModal,
    hideModal,
    setInputValue,
    setText,
    setPlaceholder,
    getInputValue,
    setHtml
} from './core/ui/modalManager.js';

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
                master => master.id.toString() === state.user.id.toString()
            );

            if (masterData) {
                state.isAdmin = true;
                state.adminMasterInfo = masterData;
            }
        }
    } catch (error) {
        console.error('Помилка завантаження даних:', error);
        tg.showAlert('Помилка мережі або завантаження даних.');
    }
}

async function loadApp() {
    await loadInitialData();

    const loader = document.getElementById('loader');

    if (loader) {
        loader.classList.add('hidden');
    }

    if (state.isAdmin) {
        document
            .getElementById('admin-screen')
            .classList.remove('hidden-step');

        document
            .getElementById('admin-bottom-nav')
            .classList.remove('hidden-step');

        switchTab('admin', 'home');
    } else {
        document
            .getElementById('client-screen')
            .classList.remove('hidden-step');

        document
            .getElementById('client-bottom-nav')
            .classList.remove('hidden-step');

        renderHomeMasters();
        renderServices();

        switchTab('client', 'home');
    }
}

function handleBack() {
    if (
        !document
            .getElementById('cancel-modal')
            .classList
            .contains('hidden')
    ) {
        closeCancelModal();
        return;
    }

    if (
        !document
            .getElementById('master-profile-modal')
            .classList
            .contains('hidden')
    ) {
        closeMasterProfile();
        return;
    }

    if (
        !document
            .getElementById('tab-booking-flow')
            .classList
            .contains('hidden-step')
    ) {
        if (state.editingBookingId) {
            state.editingBookingId = null;
            switchTab('client', 'bookings');
            return;
        }

        if (
            !document
                .getElementById('step-time')
                .classList
                .contains('hidden-step')
        ) {
            state.selectedTime = null;
            hideMainButton();
            showStep('step-date');
            return;
        }

        if (
            !document
                .getElementById('step-date')
                .classList
                .contains('hidden-step')
        ) {
            resetDateTimeSelection();

            if (state.viewedMasterId) {
                showStep('step-booking');
            } else {
                showStep('step-master');
            }

            return;
        }

        if (
            !document
                .getElementById('step-master')
                .classList
                .contains('hidden-step')
        ) {
            showStep('step-booking');
            return;
        }

        if (state.viewedMasterId) {
            switchTab('client', 'home');
            openMasterProfile(state.viewedMasterId);
        } else {
            switchTab('client', 'bookings');
        }
    }
}

function switchTab(role, tabId) {
    const screenPrefix = role === 'admin' ? 'admin-' : '';

    document
        .querySelectorAll(role === 'admin' ? '.admin-tab-content' : '.tab-content')
        .forEach(element => element.classList.add('hidden-step'));

    const target = document.getElementById(`${screenPrefix}tab-${tabId}`);

    if (target) {
        target.classList.remove('hidden-step');
    }

    const activeColor = role === 'admin'
        ? 'text-teal-600'
        : 'text-blue-500';

    ['home', 'bookings', 'messages', 'profile'].forEach(nav => {
        const btn = document.getElementById(`${role}-nav-${nav}`);

        if (!btn) return;

        if (nav === tabId) {
            btn.classList.remove('text-slate-400');
            btn.classList.add(activeColor, 'bg-white/50');
        } else {
            btn.classList.remove(activeColor, 'bg-white/50');
            btn.classList.add('text-slate-400');
        }
    });

    updateHeaderTitle(role, tabId);

    hideBackButton();
    hideMainButton();

    stopPolling();

    state.editingBookingId = null;

    if (role === 'client') {
        if (tabId === 'home') {
            renderHomeMasters();
        } else if (tabId === 'bookings') {
            loadBookings('client');
            startPolling('client');
        } else if (tabId === 'messages') {
            renderMessagesTab();
        } else if (tabId === 'profile') {
            renderUserProfile();
        }
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
        role === 'client'
            ? 'client-header-title'
            : 'admin-header-title'
    );

    if (!title) return;

    const firstName =
        state.user && state.user.first_name
            ? state.user.first_name
            : 'Гість';

    if (role === 'client') {
        if (tabId === 'home') {
            title.innerHTML =
                `Привіт, <span class="text-blue-600">${firstName}</span> 👋`;
        } else if (tabId === 'bookings') {
            title.innerHTML = 'Твої візити 💅';
        } else if (tabId === 'messages') {
            title.innerHTML = 'Мої чати 💬';
        } else {
            title.innerHTML = 'Мій кабінет ⚙️';
        }

        return;
    }

    const adminName =
        state.adminMasterInfo && state.adminMasterInfo.name
            ? state.adminMasterInfo.name
            : 'Майстер';

    const cleanName = adminName
        .replace(/^(Майстер|Мастер)\s+/i, '')
        .trim();

    title.innerHTML = tabId === 'home'
        ? `Панель: <span class="text-teal-600">${cleanName}</span> 📊`
        : 'Розклад 📅';
}

async function loadBookings(role, silent = false, dash = false) {
    const contId = role === 'admin'
        ? dash ? null : 'admin-bookings-list'
        : 'my-bookings-list';

    if (!silent && contId) {
        const spinnerColor = role === 'admin'
            ? 'border-t-teal-500'
            : 'border-t-blue-500';

        setHtml(contId, `
            <div class="flex flex-col items-center justify-center py-16 animate-pulse">
                <div class="w-12 h-12 border-4 border-slate-100 rounded-full ${spinnerColor} animate-spin mb-4 shadow-sm"></div>
                <p class="text-slate-400 font-medium text-sm">Завантажуємо дані...</p>
            </div>
        `);
    }

    try {
        const data = await fetchBookings(role);

        if (role === 'admin') {
            state.adminBookings = data.bookings || [];

            dash
                ? renderAdminStats('day')
                : renderAdminBookings();
        } else {
            state.clientBookings = data.bookings || [];
            renderClientBookings();
        }
    } catch (error) {
        console.error('Помилка завантаження записів:', error);

        if (!silent && contId) {
            setHtml(
                contId,
                '<div class="text-center py-12 text-red-500 font-medium">Помилка мережі 🌐</div>'
            );
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
    if (!polling.interval) return;

    clearInterval(polling.interval);

    polling.interval = null;
}

function openMasterProfile(id) {
    try {
        state.viewedMasterId = id;

        const master = state.masters.find(
            item => item.id.toString() === id.toString()
        );

        if (!master) return;

        const originalIndex = state.masters.indexOf(master);

        document.getElementById('mp-image').src =
            originalIndex === 0
                ? 'media/IMG_0222.jpeg'
                : 'media/IMG_0223.jpeg';

        document.getElementById('mp-name').innerText =
            master.name
                .replace(/^(Майстер|Мастер)\s+/i, '')
                .trim();

        const phone = master.phone
            ? String(master.phone)
            : null;

        document.getElementById('mp-phone').innerText =
            phone || 'Не вказано';

        document.getElementById('mp-phone-link').href = phone
            ? `tel:${phone.replace(/[^0-9+]/g, '')}`
            : '#';

        document.getElementById('mp-description').innerText =
            master.about || 'Найкращий майстер нашого салону!';

        document
            .getElementById('master-profile-modal')
            .classList
            .remove('hidden');

        document
            .getElementById('master-profile-modal')
            .classList
            .add('flex');

        showBackButton();
    } catch (error) {
        console.error('Помилка профілю майстра:', error);
    }
}

function closeMasterProfile() {
    document
        .getElementById('master-profile-modal')
        .classList
        .add('hidden');

    document
        .getElementById('master-profile-modal')
        .classList
        .remove('flex');

    state.viewedMasterId = null;

    hideBackButton();
}

function bookFromProfile() {
    if (!state.viewedMasterId) return;

    state.selectedMaster = state.masters.find(
        item => item.id.toString() === state.viewedMasterId.toString()
    );

    if (!state.selectedMaster) {
        return tg.showAlert('Майстра не знайдено');
    }

    resetDateTimeSelection();

    document
        .getElementById('master-profile-modal')
        .classList
        .add('hidden');

    document
        .getElementById('tab-home')
        .classList
        .add('hidden-step');

    document
        .getElementById('tab-booking-flow')
        .classList
        .remove('hidden-step');

    ['home', 'bookings', 'messages', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);

        if (!btn) return;

        if (nav === 'home') {
            btn.classList.remove('text-slate-400');
            btn.classList.add('text-blue-500', 'bg-blue-50');
        } else {
            btn.classList.remove('text-blue-500', 'bg-blue-50');
            btn.classList.add('text-slate-400');
        }
    });

    renderServices();

    showStep('step-booking');

    showBackButton();
}

function openMap() {
    const lat = 50.027388;
    const lng = 36.3314636;

    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    tg.openLink(url);
}

function openCancelModal(id, role) {
    modalState.currentCancelBookingId = id;
    modalState.currentCancelRole = role;

    setText('cancel-modal-title', 'Скасувати?');

    setPlaceholder(
        'cancel-reason',
        role === 'client'
            ? 'Напишіть причину скасування для майстра...'
            : 'Напишіть клієнту, чому візит скасовано...'
    );

    showModal('cancel-modal');
}

function closeCancelModal() {
    hideModal('cancel-modal');
    setInputValue('cancel-reason', '');
}

async function confirmCancel() {
    const reason = getInputValue('cancel-reason').trim();

    if (!reason) {
        return tg.showAlert('Будь ласка, вкажіть причину.');
    }

    try {
        const response = await updateBookingStatusAPI(
            modalState.currentCancelBookingId,
            'Отменено',
            reason
        );

        if (response.status === 'success') {
            loadBookings(state.isAdmin ? 'admin' : 'client');
        } else {
            tg.showAlert(
                'Помилка: ' +
                (response.message || 'невідома помилка')
            );
        }
    } catch (error) {
        console.error('Помилка скасування:', error);

        tg.showAlert(
            error.message ||
            'Не вдалося скасувати запис.'
        );
    } finally {
        closeCancelModal();
    }
}

async function changeBookingStatus(id, status) {
    try {
        const response = await updateBookingStatusAPI(id, status);

        if (response.status === 'success') {
            loadBookings('admin');
        } else {
            tg.showAlert(
                'Помилка: ' +
                (response.message || 'невідома помилка')
            );
        }
    } catch (error) {
        console.error('Помилка зміни статусу:', error);

        tg.showAlert(
            error.message ||
            'Не вдалося змінити статус.'
        );
    }
}

function switchBookingTab(filter, role) {
    state.currentBookingFilter = filter;

    const activeButton = document.getElementById(`${role}-subtab-active`);
    const cancelledButton = document.getElementById(`${role}-subtab-cancelled`);

    if (filter === 'active') {
        activeButton.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300';

        cancelledButton.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100';
    } else {
        cancelledButton.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300';

        activeButton.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100';
    }

    role === 'admin'
        ? renderAdminBookings()
        : renderClientBookings();
}
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

import {
    openMasterProfile,
    closeMasterProfile,
    bookFromProfile
} from './features/masters/masterProfile.js';

import {
    setActiveNav,
    updateHeaderTitle
} from './features/navigation/navigationState.js';

import {
    startPolling as startPollingManager,
    stopPolling
} from './core/polling/pollingManager.js';

import {
    renderLoading,
    renderError
} from './core/ui/loadingManager.js';

import {
    showError,
    showSuccess,
    logError,
    showNetworkError,
    showValidationError
} from './core/ui/notify.js';

import {
    openCancelModal,
    closeCancelModal,
    confirmCancel as confirmCancelAction
} from './features/cancel/cancelBooking.js';

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
        logError('Помилка завантаження даних', error);
showNetworkError();
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

    setActiveNav(role, tabId);

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
        startPollingManager(() => loadBookings('client', true));
    } else if (tabId === 'messages') {
        renderMessagesTab();
    } else if (tabId === 'profile') {
        renderUserProfile();
    }
} else {
    if (tabId === 'home') {
        loadBookings('admin', false, true);
        startPollingManager(() => loadBookings('admin', true, true));
    } else if (tabId === 'bookings') {
        loadBookings('admin');
        startPollingManager(() => loadBookings('admin', true));
    }
}
}

async function loadBookings(role, silent = false, dash = false) {
    const contId = role === 'admin'
        ? dash ? null : 'admin-bookings-list'
        : 'my-bookings-list';

    if (!silent && contId) {
    renderLoading(contId, {
        color: role === 'admin'
            ? 'border-t-teal-500'
            : 'border-t-blue-500'
    });
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
        logError('Помилка завантаження записів', error);

        if (!silent && contId) {
            renderError(contId);
        }
    }
}

function openMap() {
    const lat = 50.027388;
    const lng = 36.3314636;

    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    tg.openLink(url);
}

function confirmCancel() {
    return confirmCancelAction((role) => {
        loadBookings(role);
    });
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
        logError('Помилка зміни статусу', error);

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
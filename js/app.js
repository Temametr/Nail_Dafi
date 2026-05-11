import { state, tg } from './state.js';

import {
    renderHomeMasters,
    renderClientBookings,
    renderUserProfile,
    renderMessagesTab
} from './client.js';

import {
    renderAdminStats,
    renderAdminBookings
} from './admin.js';

import {
    startClientBookingFlow,
    startReschedule,
    selectService,
    selectMaster,
    selectDate,
    selectTime,
    resetDateTimeSelection,
    showStep,
    setBookingSuccessHandler
} from './features/booking/bookingFlow.js';

import {
    hideMainButton
} from './core/telegram/mainButton.js';

import {
    hideBackButton,
    setBackButtonHandler
} from './core/telegram/backButton.js';

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
    openCancelModal,
    closeCancelModal,
    confirmCancel as confirmCancelAction
} from './features/cancel/cancelBooking.js';

import {
    changeBookingStatusAction
} from './features/admin/adminActions.js';

import {
    loadBookings
} from './features/bookings/bookingsLoader.js';

import {
    loadInitialData,
    bootstrapClient,
    bootstrapAdmin,
    hideLoader
} from './core/bootstrap/appBootstrap.js';

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

    setBookingSuccessHandler(() => {
        switchTab('client', 'bookings');
    });

    await loadApp();
});

async function loadApp() {
    await loadInitialData();

    hideLoader();

    if (state.isAdmin) {
        await bootstrapAdmin();
        switchTab('admin', 'home');
    } else {
        await bootstrapClient();
        switchTab('client', 'home');
    }
}

function handleBack() {
    const cancelModal = document.getElementById('cancel-modal');

    if (
        cancelModal &&
        !cancelModal.classList.contains('hidden')
    ) {
        closeCancelModal();
        return;
    }

    const profileModal =
        document.getElementById('master-profile-modal');

    if (
        profileModal &&
        !profileModal.classList.contains('hidden')
    ) {
        closeMasterProfile();
        return;
    }

    const bookingFlow =
        document.getElementById('tab-booking-flow');

    if (
        bookingFlow &&
        !bookingFlow.classList.contains('hidden-step')
    ) {
        if (state.editingBookingId) {
            state.editingBookingId = null;

            switchTab('client', 'bookings');

            return;
        }

        const timeStep =
            document.getElementById('step-time');

        if (
            timeStep &&
            !timeStep.classList.contains('hidden-step')
        ) {
            state.selectedTime = null;

            hideMainButton();

            showStep('step-date');

            return;
        }

        const dateStep =
            document.getElementById('step-date');

        if (
            dateStep &&
            !dateStep.classList.contains('hidden-step')
        ) {
            resetDateTimeSelection();

            if (state.viewedMasterId) {
                showStep('step-booking');
            } else {
                showStep('step-master');
            }

            return;
        }

        const masterStep =
            document.getElementById('step-master');

        if (
            masterStep &&
            !masterStep.classList.contains('hidden-step')
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
    const screenPrefix =
        role === 'admin'
            ? 'admin-'
            : '';

    document
        .querySelectorAll(
            role === 'admin'
                ? '.admin-tab-content'
                : '.tab-content'
        )
        .forEach(element => {
            element.classList.add('hidden-step');
        });

    const target =
        document.getElementById(
            `${screenPrefix}tab-${tabId}`
        );

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

            startPollingManager(() => {
                loadBookings('client', true);
            });

        } else if (tabId === 'messages') {
            renderMessagesTab();

        } else if (tabId === 'profile') {
            renderUserProfile();
        }

        return;
    }

    if (tabId === 'home') {
        loadBookings('admin', false, true);

        startPollingManager(() => {
            loadBookings('admin', true, true);
        });

    } else if (tabId === 'bookings') {
        loadBookings('admin');

        startPollingManager(() => {
            loadBookings('admin', true);
        });
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

function changeBookingStatus(id, status) {
    return changeBookingStatusAction(
        id,
        status,
        () => {
            loadBookings('admin');
        }
    );
}

function switchBookingTab(filter, role) {
    state.currentBookingFilter = filter;

    const activeButton =
        document.getElementById(
            `${role}-subtab-active`
        );

    const cancelledButton =
        document.getElementById(
            `${role}-subtab-cancelled`
        );

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
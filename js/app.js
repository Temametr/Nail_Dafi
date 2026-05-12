import { state, tg } from './state.js';

import {
    renderHomeMasters
} from './client.js';

import {
    renderAdminStats
} from './admin.js';

import {
    startClientBookingFlow,
    startReschedule,
    selectService,
    selectMaster,
    confirmClientPhone,
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
    switchTab as switchTabController,
    switchBookingTab as switchBookingTabController
} from './features/navigation/tabsController.js';

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

import { APP_CONFIG } from './config/appConfig.js';

import {
    openTelegramChat
} from './utils/telegramChat.js';

window.appAPI = {
    switchTab,
    switchBookingTab,

    startClientBookingFlow,
    startReschedule,

    selectService,
    selectMaster,
    selectDate,
    selectTime,
    confirmClientPhone,

    changeBookingStatus,

    openCancelModal,
    closeCancelModal,
    confirmCancel,

    renderAdminStats,

    openMasterProfile,
    closeMasterProfile,
    bookFromProfile,
    
    openTelegramChat,

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

    const cancelModal =
        document.getElementById('cancel-modal');

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

    return switchTabController({
        role,
        tabId,
        loadBookings
    });
}

function switchBookingTab(filter, role) {

    return switchBookingTabController({
        filter,
        role
    });
}

function openMap() {

    const { lat, lng } = APP_CONFIG.map;

    const url =
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    tg.openLink(url);
}

function confirmCancel() {

    const bookingId =
        window.modalState?.currentCancelBookingId;

    const role =
        window.modalState?.currentCancelRole ||
        (state.isAdmin ? 'admin' : 'client');

    const reasonInput =
        document.getElementById('cancel-reason');

    const reason =
        String(reasonInput?.value || '').trim();

    const targetList =
        role === 'admin'
            ? state.adminBookings
            : state.clientBookings;

    const booking =
        targetList.find(
            item => String(item.id) === String(bookingId)
        );

    if (booking && reason) {
        booking.status = 'Отменено';
        booking.cancelReason = reason;

        switchBookingTab('cancelled', role);

        if (role === 'admin') {
            renderAdminStats('day');
        }
    }

    return confirmCancelAction((updatedRole) => {
        loadBookings(updatedRole, true);
    });
}

function changeBookingStatus(id, status) {

    const booking = state.adminBookings.find(
        item => String(item.id) === String(id)
    );

    if (booking) {
        booking.status = status;
    }

    switchBookingTab(
        state.currentBookingFilter,
        'admin'
    );

    renderAdminStats('day');

    return changeBookingStatusAction(
        id,
        status,
        () => {
            loadBookings('admin', true);
        }
    );
}
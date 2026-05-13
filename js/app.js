import { state, tg, modalState } from './state.js';

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

import {
    openAdminProfile,
    closeAdminProfile,
    openAdminProfileEdit,
    closeAdminProfileEdit,
    saveAdminProfileField
} from './features/admin/adminProfile.js';

import {
    openManualBookingModal,
    closeManualBookingModal,
    manualBookingNextFromClient,
    selectManualService,
    selectManualMaster,
    selectManualDate,
    selectManualTime,
    createManualBooking
} from './features/admin/manualBooking.js';

import {
    loadAdminClients,
    searchAdminClients,
    renderAdminClients,
    openClientTelegram,
    toggleClientBlocked,
    deleteAdminClient
} from './features/admin/adminClients.js';

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
    
    toggleAdminPeriodMenu,
setAdminStatsPeriod,
setAdminStatsCustomDate,
prepareAdminDatePicker,

    openCancelModal,
    closeCancelModal,
    confirmCancel,

    renderAdminStats,

    openMasterProfile,
    closeMasterProfile,
    bookFromProfile,
    
    openManualBookingModal,
closeManualBookingModal,
manualBookingNextFromClient,
selectManualService,
selectManualMaster,
selectManualDate,
selectManualTime,
createManualBooking,

loadAdminClients,
searchAdminClients,
renderAdminClients,
openClientTelegram,
toggleClientBlocked,
deleteAdminClient,
    
    openTelegramChat,
    
    openAdminProfile,
closeAdminProfile,
openAdminProfileEdit,
closeAdminProfileEdit,
saveAdminProfileField,

    openMap
};

window.addEventListener('DOMContentLoaded', async () => {

    tg.MainButton.color = '#3b82f6';

    setBackButtonHandler(handleBack);

    setBookingSuccessHandler(() => {
    state.currentBookingFilter = 'pending';

    switchTab('client', 'bookings');

    loadBookings('client', true);
});

    await loadApp();
});

async function loadApp() {

    await loadInitialData();

    hideLoader();

    if (state.isAdmin) {

    await bootstrapAdmin();

    switchTab('admin', 'home');

    setTimeout(() => {
        loadBookings('admin', true);
    }, 300);
    
    setTimeout(() => {
    loadAdminClients(true);
}, 800);

} else {

    await bootstrapClient();

    switchTab('client', 'home');

    setTimeout(() => {
        loadBookings('client', true);
    }, 300);
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
    modalState.currentCancelBookingId;

const role =
    modalState.currentCancelRole ||
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
            renderAdminStats(state.adminStatsPeriod || 'today');
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

    renderAdminStats(state.adminStatsPeriod || 'today');

    return changeBookingStatusAction(
        id,
        status,
        () => {
            loadBookings('admin', true);
        }
    );
}
function toggleAdminPeriodMenu() {
    const menu = document.getElementById('admin-period-menu');

    if (!menu) return;

    menu.classList.toggle('hidden');
}

function closeAdminPeriodMenu() {
    const menu = document.getElementById('admin-period-menu');

    if (!menu) return;

    menu.classList.add('hidden');
}

function setAdminStatsPeriod(period) {
    state.adminStatsPeriod = period;
    state.adminStatsCustomDate = '';
    localStorage.setItem('adminStatsPeriod', period);
localStorage.removeItem('adminStatsCustomDate');

    renderAdminStats(period);

    closeAdminPeriodMenu();
}

function setAdminStatsCustomDate(date) {
    if (!date) return;

    state.adminStatsPeriod = 'custom';
    state.adminStatsCustomDate = date;
    localStorage.setItem('adminStatsPeriod', 'custom');
localStorage.setItem('adminStatsCustomDate', date);

    renderAdminStats('custom');

    closeAdminPeriodMenu();
}

function getTodayYmd() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function prepareAdminDatePicker() {
    const input = document.getElementById('admin-period-date');

    if (!input) return;

    if (!input.value) {
        input.value =
            state.adminStatsCustomDate ||
            getTodayYmd();
    }
}
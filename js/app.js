import { state, tg, modalState } from './state.js';

import {
    renderAdminStats
} from './admin.js';

import {
    startClientBookingFlow,
    startReschedule,
    selectService,
    focusBookingService,
    confirmSelectedService,
    selectMaster,
    selectDate,
    selectTime,
    submitSelectedBookingTime,
    resetDateTimeSelection,
    showStep,
    moveBookingService,
    moveBookingCalendarMonth,
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
    switchBookingTab as switchBookingTabController,
    toggleBookingFilterMenu
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
    deleteAdminClient,
    openClientProfile,
    closeClientProfile,
    renderClientProfile,
    contactClientFromProfile,
    toggleClientBlockedFromProfile,
    deleteClientFromProfile
} from './features/admin/adminClients.js';

import {
    checkClientPhoneFast,
    showClientContactGate,
    hideClientContactGate,
    requestClientContactAtLaunch
} from './features/client/clientContactGate.js';

let workPhotosModulePromise = null;

function loadWorkPhotosModule() {
    if (!workPhotosModulePromise) {
        workPhotosModulePromise = import('./features/works/workPhotosModal.js');
    }

    return workPhotosModulePromise;
}

async function openWorkPhotosModalLazy(booking) {
    const module = await loadWorkPhotosModule();
    module.openWorkPhotosModal(booking);
}

async function closeWorkPhotosModalLazy() {
    const module = await loadWorkPhotosModule();
    module.closeWorkPhotosModal();
}

async function handleWorkPhotoInputChangeLazy(input) {
    const module = await loadWorkPhotosModule();
    module.handleWorkPhotoInputChange(input);
}

async function publishCurrentWorkPhotosLazy() {
    const module = await loadWorkPhotosModule();
    module.publishCurrentWorkPhotos();
}

function prepareTelegramViewport() {
    try {
        tg.ready();

        document.body.classList.remove(
            'is-telegram-fullscreen',
            'is-telegram-compact'
        );

        if (typeof tg.expand === 'function') {
            tg.expand();
        }

        if (typeof tg.requestFullscreen === 'function') {
            tg.requestFullscreen();

            document.body.classList.add(
                'is-telegram-fullscreen'
            );
        } else {
            document.body.classList.add(
                'is-telegram-compact'
            );
        }

        if (typeof tg.disableVerticalSwipes === 'function') {
            tg.disableVerticalSwipes();
        }

        if (typeof tg.onEvent === 'function') {
            tg.onEvent('viewportChanged', () => {
                document.body.classList.add(
                    'is-telegram-fullscreen'
                );
            });
        }

    } catch (error) {
        console.warn(
            'prepareTelegramViewport failed:',
            error
        );

        document.body.classList.add(
            'is-telegram-compact'
        );
    }
}

async function openWorkPhotosModalByBookingId(bookingId) {
    const booking = state.adminBookings.find(
        item => String(item.id) === String(bookingId)
    );

    if (!booking) {
        tg.showAlert('Запис не знайдено');
        return;
    }

    await openWorkPhotosModalLazy(booking);
}

window.appAPI = {
    switchTab,
    switchBookingTab,
    setBookingFilter: switchBookingTab,
    toggleBookingFilterMenu,

    startClientBookingFlow,
    startReschedule,
    closeClientBookingFlow,

    selectService,
    selectMaster,
    selectDate,
    selectTime,
    submitSelectedBookingTime,
    
    focusService: focusBookingService,
    moveFocusedService: moveBookingService,
    moveCalendarMonth: moveBookingCalendarMonth,
    confirmSelectedService,

    changeBookingStatus,
    
    toggleAdminPeriodMenu,
    setAdminStatsPeriod,
    setAdminStatsCustomDate,
    prepareAdminDatePicker,

    openCancelModal,
    closeCancelModal,
    confirmCancel,
    
    openWorkPhotosModalByBookingId,
    openWorkPhotosModal: openWorkPhotosModalLazy,
    closeWorkPhotosModal: closeWorkPhotosModalLazy,
    handleWorkPhotoInputChange: handleWorkPhotoInputChangeLazy,
    publishCurrentWorkPhotos: publishCurrentWorkPhotosLazy,
    

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

openClientProfile,
closeClientProfile,
renderClientProfile,
contactClientFromProfile,
toggleClientBlockedFromProfile,
deleteClientFromProfile,

    openMap,
    
    requestClientContactAtLaunch: () => {
    requestClientContactAtLaunch(async () => {
        hideClientContactGate();

        await bootstrapClient();

        switchTab('client', 'home');

        setTimeout(() => {
            loadBookings('client', true);
        }, 300);
    });
},
};

window.addEventListener('DOMContentLoaded', async () => {
    prepareTelegramViewport();

    tg.MainButton.color = '#3b82f6';

    setBackButtonHandler(handleBack);

    setBookingSuccessHandler(() => {
    document.body.classList.remove('booking-flow-hidden-shell');

    const clientNav =
        document.getElementById('client-bottom-nav');

    if (clientNav) {
        clientNav.classList.remove('hidden-step');
    }

    state.currentBookingFilter = 'all';
    state.bookingReturnTab = 'bookings';

    switchTab('client', 'bookings');

    loadBookings('client', true);
});

    await loadApp();
});

async function loadApp() {
    try {
        await loadInitialData();

        if (state.isAdmin) {
            await bootstrapAdmin();

            switchTab('admin', 'home');

            hideLoader();

            setTimeout(() => {
                loadBookings('admin', true);
            }, 300);

            setTimeout(() => {
                loadAdminClients(true);
            }, 800);

            return;
        }

        const hasPhone =
            await checkClientPhoneFast();

        if (!hasPhone) {
            showClientContactGate();
            hideLoader();
            return;
        }

        hideClientContactGate();

        await bootstrapClient();

        switchTab('client', 'home');

        hideLoader();

        setTimeout(() => {
            loadBookings('client', true);
        }, 300);

    } catch (error) {
        console.error('loadApp failed:', error);

        hideLoader();

        const app = document.getElementById('app');

        if (app) {
            app.insertAdjacentHTML(
                'afterbegin',
                `
                <div class="min-h-[75vh] flex items-center justify-center px-6 text-center">
                    <div class="card-convex p-7 w-full max-w-sm">
                        <div class="text-4xl mb-4">⚠️</div>

                        <h2 class="text-xl font-black text-slate-950">
                            Не вдалося запустити додаток
                        </h2>

                        <p class="text-sm font-medium text-slate-500 mt-3 leading-relaxed">
                            ${error.message || 'Помилка завантаження'}
                        </p>

                        <button
                            onclick="location.reload()"
                            class="w-full py-4 bg-slate-950 text-white rounded-3xl text-sm font-black shadow-lg active:scale-95 transition-all mt-6"
                        >
                            Спробувати ще раз
                        </button>
                    </div>
                </div>
                `
            );
        }
    }
}

function handleBack() {
    
        const workPhotosModal =
    document.getElementById('work-photos-modal');

if (
    workPhotosModal &&
    !workPhotosModal.classList.contains('hidden')
) {
    closeWorkPhotosModalLazy();
    return;
}
    
        const adminProfileEditModal =
        document.getElementById('admin-profile-edit-modal');

    if (
        adminProfileEditModal &&
        !adminProfileEditModal.classList.contains('hidden')
    ) {
        closeAdminProfileEdit();
        return;
    }

    const adminProfileModal =
        document.getElementById('admin-profile-modal');

    if (
        adminProfileModal &&
        !adminProfileModal.classList.contains('hidden')
    ) {
        closeAdminProfile();
        return;
    }

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

    state.calendarMonthOffset = 0;

    if (state.viewedMasterId) {
        state.selectedService = null;

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
    state.selectedMaster = null;
    state.selectedDate = null;
    state.selectedTime = null;
    state.calendarMonthOffset = 0;

    showStep('step-booking');

    return;
}

        if (state.viewedMasterId) {
    closeClientBookingFlow();

    openMasterProfile(state.viewedMasterId);

    return;
}

closeClientBookingFlow();
}
}

function switchTab(role, tabId) {
    
    if (role === 'client') {
    document.body.classList.remove('booking-flow-hidden-shell');

    const clientNav =
        document.getElementById('client-bottom-nav');

    if (clientNav) {
        clientNav.classList.remove('hidden-step');
    }
}

    return switchTabController({
        role,
        tabId,
        loadBookings
    });
}

function closeClientBookingFlow() {
    document.body.classList.remove('booking-flow-hidden-shell');

    const clientNav =
        document.getElementById('client-bottom-nav');

    if (clientNav) {
        clientNav.classList.remove('hidden-step');
    }

    const returnTab =
        state.bookingReturnTab || 'bookings';

    state.bookingReturnTab = 'bookings';

    switchTab('client', returnTab);
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

        switchBookingTab(state.currentBookingFilter || 'all', role);

        if (role === 'admin') {
            renderAdminStats(state.adminStatsPeriod || 'today');
        }
    }

    return confirmCancelAction((updatedRole) => {
        loadBookings(updatedRole, true);
    });
}

function isDoneBookingStatus(status) {
    const value = String(status || '').trim().toLowerCase();

    return (
        value === 'выполнено' ||
        value === 'виконано' ||
        value === 'done'
    );
}

function askToAddWorkPhotos(booking) {
    if (!booking) return;

    try {
        tg.showConfirm(
            'Додати фото роботи в галерею?',
            async (confirmed) => {
                if (!confirmed) return;

                await openWorkPhotosModalLazy(booking);
            }
        );
    } catch (error) {
        console.warn('showConfirm failed:', error);

        const confirmed = window.confirm(
            'Додати фото роботи в галерею?'
        );

        if (confirmed) {
            openWorkPhotosModalLazy(booking);
        }
    }
}

function changeBookingStatus(id, status) {
    const booking = state.adminBookings.find(
        item => String(item.id) === String(id)
    );

    const previousStatus = booking
        ? booking.status
        : '';

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
        async () => {
            await loadBookings('admin', true);

            if (
                booking &&
                isDoneBookingStatus(status) &&
                !isDoneBookingStatus(previousStatus)
            ) {
                const freshBooking = state.adminBookings.find(
                    item => String(item.id) === String(id)
                );

                askToAddWorkPhotos({
                    ...(freshBooking || booking),
                    status
                });
            }
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
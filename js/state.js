export const tg = window.Telegram.WebApp;

export const API_URL =
    "https://script.google.com/macros/s/AKfycbxlQQ5e4FzxLUyAX6OSxfKMdjLqU_1nbfTwMpxC_3Tm-Ga_VvnVScIklojzwdoQ-6VBIw/exec";

const fallbackUser = {
    id: "",
    first_name: "Гість"
};

function getTelegramUser() {
    try {
        if (
            tg &&
            tg.initDataUnsafe &&
            tg.initDataUnsafe.user
        ) {
            return tg.initDataUnsafe.user;
        }
    } catch (e) {
        console.error('Telegram user init error:', e);
    }

    return fallbackUser;
}

export const state = {
    user: getTelegramUser(),

    services: [],
    masters: [],

    selectedService: null,
    selectedMaster: null,

    selectedDate: null,
    selectedTime: null,
    
    clientPhone: '',
    clientPhoneStatus: 'unknown',
    clientPhoneSyncing: false,

    viewedMasterId: null,
    
    adminStatsPeriod: localStorage.getItem('adminStatsPeriod') || 'today',
    adminStatsCustomDate: localStorage.getItem('adminStatsCustomDate') || '',

    editingBookingId: null,

    isAdmin: false,
    adminMasterInfo: null,

    clientBookings: [],
    adminBookings: [],
    
    adminClients: [],
    adminClientsSearchQuery: '',

    currentBookingFilter: 'confirmed',

    ui: {
        loading: false,
        bookingSubmitting: false
    }
};

export const modalState = {
    currentCancelBookingId: null,
    currentCancelRole: null
};

export const polling = {
    interval: null
};

export function resetBookingState() {
    state.selectedService = null;
    state.selectedMaster = null;

    state.selectedDate = null;
    state.selectedTime = null;

    state.editingBookingId = null;
}

export function resetDateSelectionState() {
    state.selectedDate = null;
    state.selectedTime = null;
}

export function setLoading(value) {
    state.ui.loading = Boolean(value);
}

export function setBookingSubmitting(value) {
    state.ui.bookingSubmitting = Boolean(value);
}
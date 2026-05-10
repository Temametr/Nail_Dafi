// js/state.js

export const tg = window.Telegram.WebApp;

export const API_URL = "https://script.google.com/macros/s/AKfycbxlQQ5e4FzxLUyAX6OSxfKMdjLqU_1nbfTwMpxC_3Tm-Ga_VvnVScIklojzwdoQ-6VBIw/exec";

export const state = {
    user: tg.initDataUnsafe?.user || { id: "12345", first_name: "Тестовий Користувач" },
    services: [],
    masters: [],
    selectedService: null,
    selectedMaster: null,
    selectedDate: null,
    selectedTime: null,
    editingBookingId: null,
    isAdmin: false,
    adminMasterInfo: null,
    clientBookings: [],
    adminBookings: [],
    currentBookingFilter: 'active'
};

export const modalState = {
    currentCancelBookingId: null,
    currentCancelRole: null
};

export const polling = {
    interval: null
};

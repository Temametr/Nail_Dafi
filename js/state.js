// Ініціалізація Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// УВАГА: Встав сюди свій URL від Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxlQQ5e4FzxLUyAX6OSxfKMdjLqU_1nbfTwMpxC_3Tm-Ga_VvnVScIklojzwdoQ-6VBIw/exec";

// Глобальний стан додатку
let state = {
    user: tg.initDataUnsafe?.user || { id: "12345", first_name: "Тестовий Користувач" },
    services: [],
    masters: [],
    
    selectedService: null,
    selectedMaster: null,
    selectedDate: null,
    selectedTime: null,
    
    editingBookingId: null, // Зберігає ID при перенесенні запису

    isAdmin: false,
    adminMasterInfo: null,
    
    clientBookings: [], 
    adminBookings: [],
    currentBookingFilter: 'active'
};

let currentCancelBookingId = null;
let currentCancelRole = null; 
let pollingInterval = null; 

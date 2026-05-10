// js/api.js
import { API_URL, state } from './state.js';

// Отримати початкові дані (послуги та майстрів)
export async function fetchInitialData() {
    const response = await fetch(`${API_URL}?action=getInitData`);
    return await response.json();
}

// Отримати записи (візити)
export async function fetchBookings(role) {
    const response = await fetch(`${API_URL}?action=getBookings&userId=${state.user.id}&role=${role}`);
    return await response.json();
}

// Оновити статус запису (підтвердити / скасувати)
export async function updateBookingStatusAPI(bookingId, newStatus, reason = "") {
    const response = await fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'updateStatus', bookingId, newStatus, reason }) 
    });
    return await response.json();
}

// Створити новий запис або змінити дату (reschedule)
export async function submitBookingAPI(bookingData) {
    const response = await fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify(bookingData) 
    });
    return await response.json();
}

// Отримати зайнятий час майстра на вибрану дату
export async function fetchOccupiedSlotsAPI(dateStr, masterId, ignoreBookingId) {
    const ignoreParam = ignoreBookingId ? `&ignoreBookingId=${ignoreBookingId}` : '';
    const response = await fetch(`${API_URL}?action=getOccupiedSlots&date=${dateStr}&masterId=${masterId}${ignoreParam}`);
    return await response.json();
}

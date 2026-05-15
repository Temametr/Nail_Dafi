import { API_URL, state } from './state.js';
import { requestJson } from './core/httpClient.js';

function getCurrentUserId() {
    return state.user && state.user.id
        ? String(state.user.id)
        : '';
}

function assertUserId() {
    const userId = getCurrentUserId();

    if (!userId) {
        throw new Error('Telegram user не визначений. Відкрийте додаток через Telegram.');
    }

    return userId;
}

export async function fetchInitialData() {
    return await requestJson(API_URL, {
        params: {
            action: 'getInitData'
        }
    });
}

export async function fetchBookings(role) {
    return await requestJson(API_URL, {
        params: {
            action: 'getBookings',
            userId: assertUserId(),
            role
        }
    });
}

export async function updateBookingStatusAPI(bookingId, newStatus, reason = '') {
    return await requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'updateStatus',
            bookingId,
            newStatus,
            reason
        }
    });
}

export async function submitBookingAPI(bookingData) {
    return await requestJson(API_URL, {
        method: 'POST',
        body: bookingData
    });
}

export async function fetchOccupiedSlotsAPI(dateStr, masterId, ignoreBookingId) {
    return await requestJson(API_URL, {
        params: {
            action: 'getOccupiedSlots',
            date: dateStr,
            masterId,
            ignoreBookingId
        }
    });
}

export async function updateMasterProfileFieldAPI(masterId, field, value) {
    return await requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'updateMasterProfileField',
            masterId,
            field,
            value
        }
    });
}

export async function createBookingAPI(data) {
    return await requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'createBooking',
            ...data
        }
    });
}

export async function fetchClientsAPI() {
    return await requestJson(API_URL, {
        params: {
            action: 'getClients'
        }
    });
}

export async function updateClientStatusAPI(clientId, isBlocked, reason = '') {
    return await requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'updateClientStatus',
            clientId,
            isBlocked,
            reason
        }
    });
}

export async function deleteClientAPI(clientId) {
    return await requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'deleteClient',
            clientId
        }
    });
}

export async function fetchClientBookingsAPI(clientId) {
    return await requestJson(API_URL, {
        params: {
            action: 'getClientBookings',
            clientId
        }
    });
}

export async function fetchClientContactAPI(clientId) {
    return await requestJson(API_URL, {
        params: {
            action: 'getClientContact',
            clientId
        }
    });
}

export async function publishWorkPhotosAPI(data) {
    return await requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'publishWorkPhotos',
            ...data
        }
    });
}
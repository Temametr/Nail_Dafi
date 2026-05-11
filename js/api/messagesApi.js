import { API_URL, state } from '../state.js';

import {
    requestJson
} from '../core/httpClient.js';

function getUserId() {
    return state.user?.id
        ? String(state.user.id)
        : '';
}

function getRole() {
    return state.isAdmin
        ? 'admin'
        : 'client';
}

export function fetchBookingMessages(bookingId) {
    return requestJson(API_URL, {
        params: {
            action: 'getBookingMessages',
            bookingId,
            userId: getUserId(),
            role: getRole()
        }
    });
}

export function sendBookingMessage(bookingId, text) {
    return requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'sendBookingMessage',
            bookingId,
            senderId: getUserId(),
            senderRole: getRole(),
            text
        }
    });
}

export function markBookingMessagesRead(bookingId) {
    return requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'markBookingMessagesRead',
            bookingId,
            userId: getUserId(),
            role: getRole()
        }
    });
}

export function fetchUnreadMessagesCount() {
    return requestJson(API_URL, {
        params: {
            action: 'getUnreadMessagesCount',
            userId: getUserId(),
            role: getRole()
        }
    });
}
import { API_URL, state } from '../state.js';
import { requestJson } from '../core/httpClient.js';

function getUserId() {
    return state.user?.id ? String(state.user.id) : '';
}

export function fetchChats(role) {
    return requestJson(API_URL, {
        params: {
            action: 'getChats',
            userId: getUserId(),
            role
        }
    });
}

export function fetchMessages(chatId) {
    return requestJson(API_URL, {
        params: {
            action: 'getMessages',
            chatId,
            userId: getUserId()
        }
    });
}

export function sendMessage(payload) {
    return requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'sendMessage',
            ...payload
        }
    });
}

export function markChatRead(chatId, role) {
    return requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'markChatRead',
            chatId,
            userId: getUserId(),
            role
        }
    });
}

export function fetchUnreadCounts(role) {
    return requestJson(API_URL, {
        params: {
            action: 'getUnreadCounts',
            userId: getUserId(),
            role
        }
    });
}
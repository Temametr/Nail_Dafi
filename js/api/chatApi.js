import { API_URL, state } from '../state.js';

import {
    requestJson
} from '../core/httpClient.js';

function getUserId() {
    return state.user?.id
        ? String(state.user.id)
        : '';
}

export async function fetchChats(role) {
    return requestJson(API_URL, {
        params: {
            action: 'getChats',
            userId: getUserId(),
            role
        }
    });
}

export async function fetchMessages(chatId) {
    return requestJson(API_URL, {
        params: {
            action: 'getMessages',
            chatId,
            userId: getUserId()
        }
    });
}

export async function fetchUnreadCounts(role) {
    return requestJson(API_URL, {
        params: {
            action: 'getUnreadCounts',
            userId: getUserId(),
            role
        }
    });
}

export async function markChatRead(chatId, role) {
    return requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'markChatRead',
            chatId,
            role,
            userId: getUserId()
        }
    });
}

export async function sendMessage(payload) {
    return requestJson(API_URL, {
        method: 'POST',
        body: {
            action: 'sendMessage',
            ...payload
        }
    });
}
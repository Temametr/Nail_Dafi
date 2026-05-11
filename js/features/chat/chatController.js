import { state, tg } from '../../state.js';

import {
    fetchChats,
    fetchMessages,
    fetchUnreadCounts,
    markChatRead,
    sendMessage
} from '../../api/chatApi.js';

import {
    chatState,
    resetActiveChat
} from './chatState.js';

import {
    renderChatsList,
    renderChatThread,
    renderChatEmpty
} from '../../renderers/chatsRenderer.js';

let chatsPollingInterval = null;

export async function loadChats(role) {
    try {
        chatState.isLoadingChats = true;

        renderChatsList();

        const response = await fetchChats(role);

        if (response.status !== 'success') {
            throw new Error(
                response.message || 'Chat load error'
            );
        }

        chatState.chats = response.chats || [];

    } catch (error) {
        console.error('loadChats error:', error);

        chatState.chats = [];

        tg.showAlert(
            'Не вдалося завантажити чати. Перевір Apps Script deployment і лист Chats.'
        );

    } finally {
        chatState.isLoadingChats = false;
        renderChatsList();
    }
}

export async function openChat(
    chatId,
    role
) {
    try {

        chatState.activeChatId =
            chatId;

        chatState.isLoadingMessages =
            true;

        renderChatThread();

        const response =
            await fetchMessages(chatId);

        if (response.status !== 'success') {
            throw new Error(
                response.message ||
                'Messages load error'
            );
        }

        chatState.activeMessages =
            response.messages || [];

        renderChatThread();

        await markChatRead(
            chatId,
            role
        );

        await refreshUnread(role);

    } catch (error) {

        console.error(
            'openChat error:',
            error
        );

        tg.showAlert(
            'Не вдалося відкрити чат'
        );

    } finally {

        chatState.isLoadingMessages =
            false;
    }
}

export async function openChatFromBooking(
    bookingId
) {
    try {

        const bookings = state.isAdmin
            ? state.adminBookings
            : state.clientBookings;

        const booking = bookings.find(
            item =>
                String(item.id) ===
                String(bookingId)
        );

        if (!booking) {
            return tg.showAlert(
                'Запис не знайдено'
            );
        }

        const clientId =
            String(
                booking.clientId || ''
            ).trim();

        const masterId =
            String(
                booking.masterId || ''
            ).trim();

        const chatId =
            `CHAT-${clientId}-${masterId}`;

        switchToMessagesTab();

        await loadChats(
            state.isAdmin
                ? 'admin'
                : 'client'
        );

        await openChat(
            chatId,
            state.isAdmin
                ? 'admin'
                : 'client'
        );

    } catch (error) {

        console.error(
            'openChatFromBooking error:',
            error
        );
    }
}

export async function submitChatMessage() {
    try {

        if (chatState.isSending) {
            return;
        }

        const input =
            document.getElementById(
                'chat-message-input'
            );

        if (!input) return;

        const text =
            String(input.value || '')
                .trim();

        if (!text) return;

        chatState.isSending = true;

        const allBookings = [
            ...(state.clientBookings || []),
            ...(state.adminBookings || [])
        ];

        const booking =
            allBookings.find(item => {

                const cId =
                    String(item.clientId || '')
                        .trim();

                const mId =
                    String(item.masterId || '')
                        .trim();

                return (
                    `CHAT-${cId}-${mId}` ===
                    chatState.activeChatId
                );
            });

        if (!booking) {
            throw new Error(
                'Booking not found'
            );
        }

        const response =
            await sendMessage({
                bookingId: booking.id,

                clientId:
                    booking.clientId,

                clientName:
                    booking.clientName,

                masterId:
                    booking.masterId,

                masterName:
                    booking.masterName || '',

                senderId:
                    state.user.id,

                senderRole:
                    state.isAdmin
                        ? 'master'
                        : 'client',

                text
            });

        if (response.status !== 'success') {
            throw new Error(
                response.message ||
                'Send error'
            );
        }

        input.value = '';

        await openChat(
            chatState.activeChatId,
            state.isAdmin
                ? 'admin'
                : 'client'
        );

        await loadChats(
            state.isAdmin
                ? 'admin'
                : 'client'
        );

    } catch (error) {

        console.error(
            'submitChatMessage error:',
            error
        );

        tg.showAlert(
            'Не вдалося надіслати повідомлення'
        );

    } finally {

        chatState.isSending = false;
    }
}

export async function refreshUnread(role) {
    try {

        const response =
            await fetchUnreadCounts(role);

        if (response.status !== 'success') {
            return;
        }

        chatState.unreadTotal =
            response.totalUnread || 0;

        chatState.unreadByChat =
            response.byChat || {};

        updateChatBadge();

    } catch (error) {

        console.error(
            'refreshUnread error:',
            error
        );
    }
}

export function updateChatBadge() {
    const badge =
        document.getElementById(
            'client-nav-messages-badge'
        );

    if (!badge) return;

    if (chatState.unreadTotal > 0) {

        badge.innerText =
            chatState.unreadTotal > 99
                ? '99+'
                : String(
                    chatState.unreadTotal
                );

        badge.classList.remove(
            'hidden'
        );

    } else {

        badge.classList.add(
            'hidden'
        );
    }
}

export function closeActiveChat() {
    resetActiveChat();

    renderChatEmpty();
}

export function startChatsPolling() {
    stopChatsPolling();

    chatsPollingInterval =
        setInterval(async () => {

            const role =
                state.isAdmin
                    ? 'admin'
                    : 'client';

            await refreshUnread(role);

            if (
                chatState.activeChatId
            ) {
                await openChat(
                    chatState.activeChatId,
                    role
                );
            }

        }, 15000);
}

export function stopChatsPolling() {
    if (chatsPollingInterval) {

        clearInterval(
            chatsPollingInterval
        );

        chatsPollingInterval = null;
    }
}

function switchToMessagesTab() {
    document
        .querySelectorAll(
            '.tab-content'
        )
        .forEach(el => {
            el.classList.add(
                'hidden-step'
            );
        });

    const messagesTab =
        document.getElementById(
            'tab-messages'
        );

    if (messagesTab) {
        messagesTab.classList.remove(
            'hidden-step'
        );
    }
}
import { state, tg } from '../../state.js';

import {
    fetchBookingMessages,
    sendBookingMessage,
    markBookingMessagesRead
} from '../../api/messagesApi.js';

import {
    messagesState,
    resetMessagesState
} from './messagesState.js';

import {
    ensureMessagesModal,
    openMessagesModal,
    closeMessagesModal,
    renderMessagesModalHeader,
    renderMessagesList
} from './messagesModal.js';

export async function openBookingMessages(booking) {

    if (!booking || !booking.id) {
        return tg.showAlert(
            'Запис не знайдено'
        );
    }

    ensureMessagesModal();

    messagesState.activeBookingId = booking.id;
    messagesState.activeBooking = booking;
    messagesState.messages = [];
    messagesState.isLoading = true;

    bindMessagesModalEvents();

    renderMessagesModalHeader();
    renderMessagesList();
    openMessagesModal();

    await loadBookingMessages();

    startMessagesPolling();
}

export function closeBookingMessages() {

    stopMessagesPolling();

    closeMessagesModal();

    resetMessagesState();
}

async function loadBookingMessages({
    silent = false
} = {}) {

    if (!messagesState.activeBookingId) {
        return;
    }

    try {

        if (!silent) {
            messagesState.isLoading = true;
        }

        const response =
            await fetchBookingMessages(
                messagesState.activeBookingId
            );

        if (response.status !== 'success') {
            throw new Error(
                response.message ||
                'Messages load error'
            );
        }

        const nextMessages =
            response.messages || [];

        const hasChanged =
            nextMessages.length !==
            messagesState.messages.length;

        messagesState.messages =
            nextMessages;

        if (hasChanged || !silent) {
            renderMessagesList();
        }

        await markBookingMessagesRead(
            messagesState.activeBookingId
        );

    } catch (error) {

        console.error(
            'loadBookingMessages error:',
            error
        );

        if (!silent) {
            tg.showAlert(
                'Не вдалося завантажити повідомлення'
            );
        }

    } finally {

        messagesState.isLoading = false;
    }
}

export async function submitBookingMessage() {

    if (
        messagesState.isSending ||
        !messagesState.activeBookingId
    ) {
        return;
    }

    const input =
        document.getElementById(
            'booking-chat-input'
        );

    if (!input) return;

    const text =
        String(input.value || '')
            .trim();

    if (!text) return;

    const tempMessage = {
        messageId:
            'LOCAL-' + Date.now(),

        bookingId:
            messagesState.activeBookingId,

        senderId:
            String(window.Telegram.WebApp.initDataUnsafe?.user?.id || ''),

        senderRole:
            'local',

        text,

        createdAt:
            new Date().toISOString(),

        readByClient:
            true,

        readByMaster:
            true,

        isLocal:
            true
    };

    try {

        messagesState.isSending = true;

        input.value = '';
        input.style.height = 'auto';

        messagesState.messages = [
            ...messagesState.messages,
            tempMessage
        ];

        renderMessagesList();

        await sendBookingMessage(
            messagesState.activeBookingId,
            text
        );

        await loadBookingMessages({
            silent: true
        });

    } catch (error) {

        console.error(
            'submitBookingMessage error:',
            error
        );

        messagesState.messages =
            messagesState.messages.filter(
                message =>
                    message.messageId !==
                    tempMessage.messageId
            );

        renderMessagesList();

        tg.showAlert(
            'Не вдалося надіслати повідомлення'
        );

    } finally {

        messagesState.isSending = false;
    }
}

function bindMessagesModalEvents() {

    const closeButton =
        document.getElementById(
            'booking-chat-close'
        );

    const backdrop =
        document.getElementById(
            'booking-chat-backdrop'
        );

    const sendButton =
        document.getElementById(
            'booking-chat-send'
        );

    const input =
        document.getElementById(
            'booking-chat-input'
        );

    if (closeButton) {
        closeButton.onclick =
            closeBookingMessages;
    }

    if (backdrop) {
        backdrop.onclick =
            closeBookingMessages;
    }

    if (sendButton) {
        sendButton.onclick =
            submitBookingMessage;
    }

    if (input) {
        input.onkeydown = event => {

            if (
                event.key === 'Enter' &&
                !event.shiftKey
            ) {
                event.preventDefault();

                submitBookingMessage();
            }
        };
    }
}

function startMessagesPolling() {

    stopMessagesPolling();

    messagesState.pollingInterval =
        setInterval(() => {

            if (
                messagesState.isOpen &&
                messagesState.activeBookingId
            ) {
                loadBookingMessages({
                    silent: true
                });
            }

        }, 5000);
}

function stopMessagesPolling() {

    if (messagesState.pollingInterval) {

        clearInterval(
            messagesState.pollingInterval
        );

        messagesState.pollingInterval = null;
    }
}
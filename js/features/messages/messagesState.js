export const messagesState = {
    activeBookingId: null,
    activeBooking: null,

    messages: [],

    isOpen: false,
    isLoading: false,
    isSending: false,

    pollingInterval: null,

    unreadTotal: 0,
    unreadByBooking: {}
};

export function resetMessagesState() {

    messagesState.activeBookingId = null;
    messagesState.activeBooking = null;

    messagesState.messages = [];

    messagesState.isOpen = false;
    messagesState.isLoading = false;
    messagesState.isSending = false;

    if (messagesState.pollingInterval) {

        clearInterval(
            messagesState.pollingInterval
        );

        messagesState.pollingInterval = null;
    }
}
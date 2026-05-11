export const chatState = {
    chats: [],
    activeChatId: null,
    activeBooking: null,
    activeMessages: [],
    unreadTotal: 0,
    unreadByChat: {},
    isLoadingChats: false,
    isLoadingMessages: false,
    isSending: false
};

export function resetActiveChat() {
    chatState.activeChatId = null;
    chatState.activeBooking = null;
    chatState.activeMessages = [];
}
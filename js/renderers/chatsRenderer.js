import { state } from '../state.js';

import {
    chatState
} from '../features/chat/chatState.js';

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatMessageTime(dateValue) {
    try {

        const date = new Date(dateValue);

        return date.toLocaleTimeString(
            'uk-UA',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        );

    } catch (error) {

        return '';
    }
}

function getChatDisplayName(chat) {
    if (state.isAdmin) {
        return chat.ClientName || 'Клієнт';
    }

    return (
        chat.MasterName ||
        'Майстер'
    );
}

export function renderChatsList() {
    const container =
        document.getElementById(
            'tab-messages'
        );

    if (!container) return;

    if (chatState.isLoadingChats) {

        container.innerHTML = `
            <div class="flex items-center justify-center py-20">
                <div class="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        `;

        return;
    }

    const chats =
        chatState.chats || [];

    if (!chats.length) {

        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-24 px-6 text-center">
                <div class="text-6xl mb-6">
                    💬
                </div>

                <h2 class="text-2xl font-black text-slate-900 mb-3">
                    Чатів поки немає
                </h2>

                <p class="text-slate-500 leading-relaxed">
                    Коли з'являться повідомлення,
                    вони будуть тут
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div class="flex flex-col h-full">

            <div class="px-5 pt-5 pb-3">
                <h2 class="text-2xl font-black text-slate-950">
                    Повідомлення
                </h2>
            </div>

            <div class="flex-1 overflow-y-auto px-4 pb-32">
                ${chats.map(renderChatCard).join('')}
            </div>

            <div id="chat-thread-container"></div>

        </div>
    `;
}

function renderChatCard(chat) {

    const chatId =
        String(chat.ChatID || '');

    const unread =
        chatState.unreadByChat[
            chatId
        ] || 0;

    return `
        <button
            onclick="window.appAPI.openChat('${chatId}')"
            class="
                w-full
                flex
                items-center
                gap-4
                p-4
                mb-3
                rounded-3xl
                bg-white
                border
                border-slate-100
                shadow-sm
                active:scale-[0.99]
                transition-all
                text-left
            "
        >

            <div class="
                w-14
                h-14
                rounded-full
                bg-blue-100
                flex
                items-center
                justify-center
                text-xl
                font-black
                text-blue-600
                shrink-0
            ">
                ${getChatDisplayName(chat)
                    .charAt(0)
                    .toUpperCase()}
            </div>

            <div class="flex-1 min-w-0">

                <div class="
                    flex
                    items-center
                    justify-between
                    gap-3
                    mb-1
                ">
                    <div class="
                        font-black
                        text-slate-950
                        truncate
                    ">
                        ${escapeHtml(
                            getChatDisplayName(chat)
                        )}
                    </div>

                    <div class="
                        text-[11px]
                        text-slate-400
                        font-bold
                        shrink-0
                    ">
                        ${formatMessageTime(
                            chat.CreatedAt
                        )}
                    </div>
                </div>

                <div class="
                    text-sm
                    text-slate-500
                    truncate
                ">
                    ${escapeHtml(
                        chat.Text || ''
                    )}
                </div>
            </div>

            ${
                unread > 0
                    ? `
                        <div class="
                            min-w-[22px]
                            h-[22px]
                            px-1
                            rounded-full
                            bg-red-500
                            text-white
                            text-[11px]
                            font-black
                            flex
                            items-center
                            justify-center
                            shrink-0
                        ">
                            ${
                                unread > 99
                                    ? '99+'
                                    : unread
                            }
                        </div>
                    `
                    : ''
            }

        </button>
    `;
}

export function renderChatThread() {
    const container =
        document.getElementById(
            'chat-thread-container'
        );

    if (!container) return;

    if (
        !chatState.activeChatId
    ) {
        renderChatEmpty();
        return;
    }

    if (
        chatState.isLoadingMessages
    ) {

        container.innerHTML = `
            <div class="
                fixed
                inset-0
                z-50
                bg-white
                flex
                items-center
                justify-center
            ">
                <div class="
                    w-12
                    h-12
                    border-4
                    border-slate-200
                    border-t-blue-500
                    rounded-full
                    animate-spin
                "></div>
            </div>
        `;

        return;
    }

    const messages =
        chatState.activeMessages || [];

    container.innerHTML = `
        <div class="
            fixed
            inset-0
            z-50
            bg-slate-50
            flex
            flex-col
        ">

            <div class="
                h-[74px]
                px-4
                border-b
                border-slate-200
                bg-white
                flex
                items-center
                gap-4
                shrink-0
            ">

                <button
                    onclick="window.appAPI.closeActiveChat()"
                    class="
                        w-11
                        h-11
                        rounded-full
                        bg-slate-100
                        flex
                        items-center
                        justify-center
                        text-lg
                        font-black
                        active:scale-95
                    "
                >
                    ←
                </button>

                <div>
                    <div class="
                        font-black
                        text-slate-950
                    ">
                        Чат
                    </div>

                    <div class="
                        text-xs
                        text-slate-400
                        font-medium
                    ">
                        ${
                            messages.length
                        } повідомлень
                    </div>
                </div>

            </div>

            <div class="
                flex-1
                overflow-y-auto
                px-4
                py-5
                space-y-3
            ">
                ${
                    messages
                        .map(renderMessageBubble)
                        .join('')
                }
            </div>

            <div class="
                p-4
                bg-white
                border-t
                border-slate-200
                shrink-0
            ">

                <div class="
                    flex
                    items-end
                    gap-3
                ">

                    <textarea
                        id="chat-message-input"
                        rows="1"
                        placeholder="Напишіть повідомлення..."
                        class="
                            flex-1
                            resize-none
                            rounded-2xl
                            border
                            border-slate-200
                            px-4
                            py-3
                            outline-none
                            text-sm
                            min-h-[52px]
                            max-h-[120px]
                        "
                    ></textarea>

                    <button
                        onclick="window.appAPI.submitChatMessage()"
                        class="
                            w-14
                            h-14
                            rounded-2xl
                            bg-blue-500
                            text-white
                            text-xl
                            font-black
                            shrink-0
                            active:scale-95
                        "
                    >
                        ↑
                    </button>

                </div>

            </div>

        </div>
    `;

    setTimeout(() => {

        const scrollable =
            container.querySelector(
                '.overflow-y-auto'
            );

        if (scrollable) {
            scrollable.scrollTop =
                scrollable.scrollHeight;
        }

    }, 50);
}

function renderMessageBubble(message) {

    const isMine =
        String(message.SenderID) ===
        String(state.user.id);

    return `
        <div class="
            flex
            ${isMine
                ? 'justify-end'
                : 'justify-start'}
        ">

            <div class="
                max-w-[82%]
                px-4
                py-3
                rounded-3xl
                shadow-sm
                ${
                    isMine
                        ? `
                            bg-blue-500
                            text-white
                            rounded-br-md
                        `
                        : `
                            bg-white
                            text-slate-900
                            rounded-bl-md
                            border
                            border-slate-100
                        `
                }
            ">

                <div class="
                    whitespace-pre-wrap
                    break-words
                    text-sm
                    leading-relaxed
                ">
                    ${escapeHtml(
                        message.Text || ''
                    )}
                </div>

                <div class="
                    mt-2
                    text-[10px]
                    font-bold
                    ${
                        isMine
                            ? 'text-blue-100'
                            : 'text-slate-400'
                    }
                ">
                    ${formatMessageTime(
                        message.CreatedAt
                    )}
                </div>

            </div>

        </div>
    `;
}

export function renderChatEmpty() {
    const container =
        document.getElementById(
            'chat-thread-container'
        );

    if (!container) return;

    container.innerHTML = '';
}
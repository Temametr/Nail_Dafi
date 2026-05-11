import { state } from '../../state.js';

import {
    messagesState
} from './messagesState.js';

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderMessage(message) {

    const isMine =
    message.isLocal ||
    String(message.senderId) ===
    String(state.user?.id || '');

    return `
        <div class="flex ${isMine ? 'justify-end' : 'justify-start'}">
            <div class="
                max-w-[82%]
                px-4
                py-3
                rounded-3xl
                text-sm
                font-medium
                leading-relaxed
                shadow-sm
                ${isMine
                    ? 'bg-blue-500 text-white rounded-br-lg'
                    : 'bg-white text-slate-800 rounded-bl-lg border border-slate-100'
                }
            ">
                ${escapeHtml(message.text)}
            </div>
        </div>
    `;
}

export function ensureMessagesModal() {

    if (
        document.getElementById(
            'booking-chat-modal'
        )
    ) {
        return;
    }

    const root = document.createElement('div');

    root.innerHTML = `
        <div
            id="booking-chat-modal"
            class="fixed inset-0 z-[120] hidden"
        >
            <div
                class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                id="booking-chat-backdrop"
            ></div>

            <div class="
                absolute
                inset-x-0
                bottom-0
                h-[92dvh]
                bg-rose-50
                rounded-t-[2.5rem]
                overflow-hidden
                flex
                flex-col
                shadow-2xl
                animate-in
            ">

                <div class="
                    shrink-0
                    px-5
                    pt-4
                    pb-4
                    bg-white/90
                    backdrop-blur-xl
                    border-b
                    border-slate-100
                    flex
                    items-center
                    gap-4
                ">

                    <button
                        id="booking-chat-close"
                        class="
                            w-11
                            h-11
                            rounded-full
                            bg-slate-100
                            flex
                            items-center
                            justify-center
                            active:scale-90
                            transition-all
                        "
                    >
                        ✕
                    </button>

                    <div class="min-w-0 flex-1">
                        <div
                            id="booking-chat-title"
                            class="
                                text-sm
                                font-black
                                text-slate-900
                                truncate
                            "
                        >
                            Чат
                        </div>

                        <div
                            id="booking-chat-subtitle"
                            class="
                                text-[11px]
                                font-medium
                                text-slate-400
                                mt-0.5
                            "
                        >
                            Завантаження...
                        </div>
                    </div>
                </div>

                <div
                    id="booking-chat-messages"
                    class="
                        flex-1
                        overflow-y-auto
                        px-4
                        py-5
                        space-y-3
                        hide-scrollbar
                    "
                ></div>

                <div class="
                    shrink-0
                    p-4
                    bg-white/90
                    backdrop-blur-xl
                    border-t
                    border-slate-100
                ">
                    <div class="flex items-end gap-3">

                        <textarea
                            id="booking-chat-input"
                            rows="1"
                            maxlength="1000"
                            placeholder="Напишіть повідомлення..."
                            class="
                                flex-1
                                resize-none
                                rounded-3xl
                                bg-slate-100
                                px-5
                                py-4
                                text-sm
                                font-medium
                                outline-none
                                max-h-32
                            "
                        ></textarea>

                        <button
                            id="booking-chat-send"
                            class="
                                w-14
                                h-14
                                rounded-full
                                bg-blue-500
                                text-white
                                text-xl
                                shadow-lg
                                shadow-blue-500/30
                                active:scale-90
                                transition-all
                            "
                        >
                            ➜
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(root);

    const textarea =
        document.getElementById(
            'booking-chat-input'
        );

    textarea.addEventListener('input', () => {

        textarea.style.height = 'auto';

        textarea.style.height =
            Math.min(
                textarea.scrollHeight,
                140
            ) + 'px';
    });
}

export function openMessagesModal() {

    const modal =
        document.getElementById(
            'booking-chat-modal'
        );

    if (!modal) return;

    modal.classList.remove('hidden');

    messagesState.isOpen = true;
}

export function closeMessagesModal() {

    const modal =
        document.getElementById(
            'booking-chat-modal'
        );

    if (!modal) return;

    modal.classList.add('hidden');

    messagesState.isOpen = false;
}

export function renderMessagesModalHeader() {

    const booking =
        messagesState.activeBooking;

    if (!booking) return;

    const title =
        document.getElementById(
            'booking-chat-title'
        );

    const subtitle =
        document.getElementById(
            'booking-chat-subtitle'
        );

    if (title) {
        title.innerText =
            booking.service || 'Чат';
    }

    if (subtitle) {

        subtitle.innerText =
            state.isAdmin
                ? booking.clientName || 'Клієнт'
                : 'Майстер';
    }
}

export function renderMessagesList() {

    const container =
        document.getElementById(
            'booking-chat-messages'
        );

    if (!container) return;

    if (
        !messagesState.messages.length
    ) {

        container.innerHTML = `
            <div class="
                h-full
                flex
                items-center
                justify-center
                text-center
                text-sm
                font-medium
                text-slate-400
            ">
                Напишіть перше повідомлення 💬
            </div>
        `;

        return;
    }

    container.innerHTML =
        messagesState.messages
            .map(renderMessage)
            .join('');

    requestAnimationFrame(() => {

        container.scrollTop =
            container.scrollHeight;
    });
}
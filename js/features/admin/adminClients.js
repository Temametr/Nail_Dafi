import { state, tg } from '../../state.js';

import {
    fetchClientsAPI,
    updateClientStatusAPI,
    deleteClientAPI
} from '../../api.js';

import {
    openTelegramChat
} from '../../utils/telegramChat.js';

let pendingClientActionId = null;

function normalize(value) {
    return String(value || '')
        .trim()
        .toLowerCase();
}

function sanitize(value) {
    return String(value || '')
        .replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
}

function isTelegramClient(client) {
    return (
        client.source === 'telegram' &&
        !String(client.id || '').startsWith('MANUAL-')
    );
}

function getFilteredClients() {
    const query = normalize(state.adminClientsSearchQuery);

    const clients = state.adminClients || [];

    if (!query) {
        return clients;
    }

    return clients.filter(client => {
        return (
            normalize(client.name).includes(query) ||
            normalize(client.phone).includes(query) ||
            normalize(client.telegram).includes(query) ||
            normalize(client.id).includes(query)
        );
    });
}

function renderEmptyClients(message = 'Клієнтів поки немає') {
    const container = document.getElementById('admin-clients-list');

    if (!container) return;

    container.innerHTML = `
        <div class="card-convex p-8 text-center">
            <div class="text-5xl mb-4">🌸</div>

            <div class="text-sm font-black text-slate-700">
                ${sanitize(message)}
            </div>

            <div class="text-xs font-medium text-slate-400 mt-2">
                Клієнти зʼявляться після першого запису
            </div>
        </div>
    `;
}

function renderSmallLoader() {
    return `
        <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
    `;
}

function getActionButtonClass(extra = '') {
    return `
        w-10 h-10 rounded-2xl flex items-center justify-center
        text-base font-black active:scale-90 transition-all
        disabled:opacity-60 disabled:active:scale-100
        ${extra}
    `;
}

export async function loadAdminClients(silent = false) {
    const container = document.getElementById('admin-clients-list');

    if (!silent && container) {
        container.innerHTML = `
            <div class="text-center text-sm font-medium text-slate-400 py-10">
                Завантажуємо клієнтів...
            </div>
        `;
    }

    try {
        const response = await fetchClientsAPI();

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося завантажити клієнтів');
        }

        state.adminClients = response.clients || [];

        renderAdminClients();

    } catch (error) {
        if (container) {
            container.innerHTML = `
                <div class="card-convex p-8 text-center">
                    <div class="text-4xl mb-3">⚠️</div>

                    <div class="text-sm font-black text-red-500">
                        Не вдалося завантажити клієнтів
                    </div>

                    <div class="text-xs font-medium text-slate-400 mt-2">
                        ${sanitize(error.message || '')}
                    </div>
                </div>
            `;
        }
    }
}

export function searchAdminClients(query) {
    state.adminClientsSearchQuery = query || '';
    renderAdminClients();
}

export function renderAdminClients() {
    const container = document.getElementById('admin-clients-list');

    if (!container) return;

    const clients = getFilteredClients();

    if (!clients.length) {
        renderEmptyClients(
            state.adminClientsSearchQuery
                ? 'За цим запитом клієнтів не знайдено'
                : 'Клієнтів поки немає'
        );

        return;
    }

    container.innerHTML = clients.map(client => {
        const hasTelegram = isTelegramClient(client);
        const blocked = Boolean(client.isBlocked);
        const isPending = pendingClientActionId === String(client.id);

        return `
            <div class="
                bg-white rounded-3xl border border-white shadow-sm
                px-4 py-4 transition-all
                ${blocked ? 'opacity-75' : ''}
            ">
                <div class="flex items-start justify-between gap-3">

                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="text-[15px] font-black text-slate-950 truncate">
                                ${sanitize(client.name || 'Клієнт')}
                            </div>

                            ${
                                hasTelegram
                                    ? `
                                        <span class="w-5 h-5 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center text-[11px] font-black shrink-0">
                                            ✈️
                                        </span>
                                    `
                                    : ''
                            }

                            ${
                                blocked
                                    ? `
                                        <span class="text-[9px] font-black px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 shrink-0">
                                            ЧС
                                        </span>
                                    `
                                    : ''
                            }
                        </div>

                        <div class="text-[12px] font-bold text-slate-400 mt-1 truncate">
                            ${hasTelegram ? 'Telegram-клієнт' : 'Ручний клієнт'}
                        </div>

                        <div class="mt-3 space-y-1.5">
                            <div class="text-[13px] font-bold text-slate-700 truncate">
                                📞 ${sanitize(client.phone || 'Телефон не вказано')}
                            </div>

                            ${
                                client.telegram
                                    ? `
                                        <div class="text-[13px] font-bold text-sky-600 truncate">
                                            @${sanitize(client.telegram)}
                                        </div>
                                    `
                                    : ''
                            }

                            ${
                                client.blockReason
                                    ? `
                                        <div class="inline-flex mt-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2">
                                            ${sanitize(client.blockReason)}
                                        </div>
                                    `
                                    : ''
                            }
                        </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">

                        ${
                            hasTelegram
                                ? `
                                    <button
                                        title="Написати"
                                        onclick="window.appAPI.openClientTelegram('${client.telegram || client.id}')"
                                        class="${getActionButtonClass('bg-sky-50 text-sky-600')}"
                                    >
                                        💬
                                    </button>
                                `
                                : `
                                    <a
                                        title="Подзвонити"
                                        href="tel:${sanitize(client.phone || '')}"
                                        class="${getActionButtonClass('bg-emerald-50 text-emerald-600')}"
                                    >
                                        📞
                                    </a>
                                `
                        }

                        <button
                            title="${blocked ? 'Прибрати з ЧС' : 'В ЧС'}"
                            onclick="window.appAPI.toggleClientBlocked('${client.id}', ${blocked ? 'false' : 'true'})"
                            class="${getActionButtonClass(blocked ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600')}"
                            ${isPending ? 'disabled' : ''}
                        >
                            ${
                                isPending
                                    ? renderSmallLoader()
                                    : blocked
                                        ? '✅'
                                        : '🚫'
                            }
                        </button>

                        <button
                            title="Видалити"
                            onclick="window.appAPI.deleteAdminClient('${client.id}')"
                            class="${getActionButtonClass('bg-red-50 text-red-600')}"
                            ${isPending ? 'disabled' : ''}
                        >
                            🗑
                        </button>

                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export function openClientTelegram(identifier) {
    if (!identifier) {
        return tg.showAlert('Telegram недоступний');
    }

    openTelegramChat(identifier);
}

export async function toggleClientBlocked(clientId, shouldBlock) {
    const client = state.adminClients.find(item =>
        String(item.id) === String(clientId)
    );

    if (!client) return;

    const reason = shouldBlock
        ? prompt('Причина додавання в ЧС:', '') || ''
        : '';

    const previousBlocked = Boolean(client.isBlocked);
    const previousReason = client.blockReason || '';

    try {
        pendingClientActionId = String(clientId);

        client.isBlocked = Boolean(shouldBlock);
        client.blockReason = reason;

        renderAdminClients();

        const response = await updateClientStatusAPI(
            clientId,
            Boolean(shouldBlock),
            reason
        );

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося оновити клієнта');
        }

    } catch (error) {
        client.isBlocked = previousBlocked;
        client.blockReason = previousReason;

        tg.showAlert(error.message || 'Помилка оновлення клієнта');

    } finally {
        pendingClientActionId = null;
        renderAdminClients();
    }
}

export async function deleteAdminClient(clientId) {
    const confirmed = confirm('Видалити клієнта зі списку?');

    if (!confirmed) return;

    const previousClients = [...state.adminClients];

    try {
        pendingClientActionId = String(clientId);

        state.adminClients = state.adminClients.filter(item =>
            String(item.id) !== String(clientId)
        );

        renderAdminClients();

        const response = await deleteClientAPI(clientId);

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося видалити клієнта');
        }

    } catch (error) {
        state.adminClients = previousClients;

        tg.showAlert(error.message || 'Помилка видалення клієнта');

    } finally {
        pendingClientActionId = null;
        renderAdminClients();
    }
}
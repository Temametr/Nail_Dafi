import { state, tg } from '../../state.js';

import {
    fetchClientsAPI,
    updateClientStatusAPI,
    deleteClientAPI
} from '../../api.js';

import {
    openTelegramChat
} from '../../utils/telegramChat.js';

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
    return client.source === 'telegram' && !String(client.id || '').startsWith('MANUAL-');
}

function getFilteredClients() {
    const query = normalize(state.adminClientsSearchQuery);

    let clients = state.adminClients || [];

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

        return `
            <div class="card-convex p-5 ${blocked ? 'opacity-70' : ''}">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <div class="text-base font-black text-slate-950 truncate">
                                ${sanitize(client.name || 'Клієнт')}
                            </div>

                            ${
                                hasTelegram
                                    ? `
                                        <span class="w-6 h-6 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center text-xs font-black shrink-0">
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

                        <div class="text-xs font-semibold text-slate-400 mt-1">
                            ${hasTelegram ? 'Telegram-клієнт' : 'Ручний клієнт'}
                        </div>

                        <div class="mt-4 space-y-2">
                            <div class="text-sm font-bold text-slate-600">
                                📞 ${sanitize(client.phone || 'Телефон не вказано')}
                            </div>

                            ${
                                client.telegram
                                    ? `
                                        <div class="text-sm font-bold text-sky-600">
                                            @${sanitize(client.telegram)}
                                        </div>
                                    `
                                    : ''
                            }

                            <div class="text-xs font-medium text-slate-400">
                                Візитів: <span class="font-black text-slate-600">${client.totalBookings || 0}</span>
                            </div>

                            ${
                                client.lastBookingAt
                                    ? `
                                        <div class="text-xs font-medium text-slate-400">
                                            Останній запис: ${sanitize(client.lastBookingAt)}
                                        </div>
                                    `
                                    : ''
                            }

                            ${
                                client.blockReason
                                    ? `
                                        <div class="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3">
                                            Причина ЧС: ${sanitize(client.blockReason)}
                                        </div>
                                    `
                                    : ''
                            }
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-100">
                    ${
                        hasTelegram
                            ? `
                                <button
                                    onclick="window.appAPI.openClientTelegram('${client.telegram || client.id}')"
                                    class="py-3 bg-sky-50 text-sky-700 rounded-xl text-xs font-black active:scale-95 transition-all"
                                >
                                    💬 Написати
                                </button>
                            `
                            : `
                                <a
                                    href="tel:${sanitize(client.phone || '')}"
                                    class="py-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black active:scale-95 transition-all text-center"
                                >
                                    📞 Подзвонити
                                </a>
                            `
                    }

                    <button
                        onclick="window.appAPI.toggleClientBlocked('${client.id}', ${blocked ? 'false' : 'true'})"
                        class="py-3 ${blocked ? 'bg-slate-50 text-slate-600' : 'bg-amber-50 text-amber-700'} rounded-xl text-xs font-black active:scale-95 transition-all"
                    >
                        ${blocked ? 'Прибрати з ЧС' : 'В ЧС'}
                    </button>

                    <button
                        onclick="window.appAPI.deleteAdminClient('${client.id}')"
                        class="col-span-2 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-black active:scale-95 transition-all"
                    >
                        Видалити
                    </button>
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
    const reason = shouldBlock
        ? prompt('Причина додавання в ЧС:', '') || ''
        : '';

    try {
        const response = await updateClientStatusAPI(
            clientId,
            Boolean(shouldBlock),
            reason
        );

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося оновити клієнта');
        }

        const client = state.adminClients.find(item =>
            String(item.id) === String(clientId)
        );

        if (client) {
            client.isBlocked = Boolean(shouldBlock);
            client.blockReason = reason;
        }

        renderAdminClients();

    } catch (error) {
        tg.showAlert(error.message || 'Помилка оновлення клієнта');
    }
}

export async function deleteAdminClient(clientId) {
    const confirmed = confirm('Видалити клієнта зі списку?');

    if (!confirmed) return;

    try {
        const response = await deleteClientAPI(clientId);

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося видалити клієнта');
        }

        state.adminClients = state.adminClients.filter(item =>
            String(item.id) !== String(clientId)
        );

        renderAdminClients();

    } catch (error) {
        tg.showAlert(error.message || 'Помилка видалення клієнта');
    }
}
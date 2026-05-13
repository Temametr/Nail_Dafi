import { state, tg } from '../../state.js';

import {
    fetchClientsAPI,
    updateClientStatusAPI,
    deleteClientAPI,
    fetchClientBookingsAPI
} from '../../api.js';

import {
    getCache,
    setCache
} from '../../core/cache/localCache.js';

import {
    openTelegramChat
} from '../../utils/telegramChat.js';

let pendingClientActionId = null;
let activeClientProfileId = null;
let activeClientBookings = [];
let activeClientBookingsLoading = false;
const CLIENTS_CACHE_KEY = 'nail_dafi_admin_clients';
const CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;

function areClientsEqual(currentClients, nextClients) {
    try {
        return JSON.stringify(currentClients || []) === JSON.stringify(nextClients || []);
    } catch (_) {
        return false;
    }
}

function applyClients(clients, forceRender = false) {
    const nextClients = Array.isArray(clients)
        ? clients
        : [];

    const hasChanged =
        !areClientsEqual(state.adminClients, nextClients);

    state.adminClients = nextClients;

    if (!hasChanged && !forceRender) {
        return;
    }

    renderAdminClients();
}

function hydrateClientsFromCache() {
    const cachedClients = getCache(CLIENTS_CACHE_KEY);

    if (!Array.isArray(cachedClients)) {
        return false;
    }

    applyClients(cachedClients, true);

    return true;
}

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

function getClientSourceLabel(client) {
    return isTelegramClient(client)
        ? 'Telegram-клієнт'
        : 'Клієнт від майстра';
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

    const usedCache = hydrateClientsFromCache();

    if (!silent && !usedCache && container) {
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

        const freshClients = response.clients || [];

        setCache(
            CLIENTS_CACHE_KEY,
            freshClients,
            CLIENTS_CACHE_TTL_MS
        );

        applyClients(
            freshClients,
            false
        );

    } catch (error) {
        if (!silent && !usedCache && container) {
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
           <div
    onclick="window.appAPI.openClientProfile('${client.id}')"
    class="
        bg-white rounded-3xl border border-white shadow-sm
        px-4 py-4 transition-all active:scale-[0.99]
        ${blocked ? 'opacity-75' : ''}
    "
>
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
                            ${getClientSourceLabel(client)}
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
                                        onclick="event.stopPropagation(); window.appAPI.openClientTelegram('${client.telegram || client.id}')"
                                        class="${getActionButtonClass('bg-sky-50 text-sky-600')}"
                                    >
                                        💬
                                    </button>
                                `
                                : `
                                    <a
                                          onclick="event.stopPropagation()"
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
                            onclick="event.stopPropagation(); window.appAPI.toggleClientBlocked('${client.id}', ${blocked ? 'false' : 'true'})"
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
                            onclick="event.stopPropagation(); window.appAPI.deleteAdminClient('${client.id}')"
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
    setCache(
        CLIENTS_CACHE_KEY,
        state.adminClients,
        CLIENTS_CACHE_TTL_MS
    );

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
    setCache(
        CLIENTS_CACHE_KEY,
        state.adminClients,
        CLIENTS_CACHE_TTL_MS
    );

    pendingClientActionId = null;
    renderAdminClients();
}
}

function getClientById(clientId) {
    return (state.adminClients || []).find(client =>
        String(client.id) === String(clientId)
    );
}

function setClientProfileText(id, value) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = value || '—';
}

function toggleClientProfileElement(id, shouldShow, displayClass = 'block') {
    const element = document.getElementById(id);

    if (!element) return;

    element.classList.toggle('hidden', !shouldShow);

    if (shouldShow) {
        element.classList.add(displayClass);
    } else {
        element.classList.remove(displayClass);
    }
}

export function openClientProfile(clientId) {
    const client = getClientById(clientId);
    const modal = document.getElementById('client-profile-modal');

    if (!client || !modal) return;

    activeClientProfileId = String(clientId);

    renderClientProfile(client);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    loadClientBookingsHistory(clientId);
}

export function closeClientProfile() {
    const modal = document.getElementById('client-profile-modal');

    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');

    activeClientProfileId = null;
}

export function renderClientProfile(client = null) {
    const currentClient =
        client ||
        getClientById(activeClientProfileId);

    if (!currentClient) return;

    const hasTelegram = isTelegramClient(currentClient);
    const blocked = Boolean(currentClient.isBlocked);

    setClientProfileText(
        'client-profile-name',
        currentClient.name || 'Клієнт'
    );

    setClientProfileText(
        'client-profile-source',
        getClientSourceLabel(currentClient)
    );

    setClientProfileText(
        'client-profile-phone',
        currentClient.phone || 'Телефон не вказано'
    );

    setClientProfileText(
        'client-profile-total',
        String(currentClient.totalBookings || 0)
    );

    setClientProfileText(
        'client-profile-source-card',
        hasTelegram ? 'Telegram' : 'Manual'
    );

    setClientProfileText(
        'client-profile-last-booking',
        currentClient.lastBookingAt || '—'
    );

    toggleClientProfileElement(
        'client-profile-telegram-badge',
        hasTelegram,
        'flex'
    );

    toggleClientProfileElement(
        'client-profile-blocked-badge',
        blocked,
        'inline-flex'
    );

    toggleClientProfileElement(
        'client-profile-telegram-row',
        Boolean(currentClient.telegram)
    );

    setClientProfileText(
        'client-profile-telegram',
        currentClient.telegram
            ? '@' + currentClient.telegram
            : ''
    );

    toggleClientProfileElement(
        'client-profile-block-reason-card',
        Boolean(currentClient.blockReason)
    );

    setClientProfileText(
        'client-profile-block-reason',
        currentClient.blockReason || ''
    );

    const contactButton =
        document.getElementById('client-profile-contact-btn');

    if (contactButton) {
        contactButton.textContent = hasTelegram ? '💬' : '📞';
    }

    const blockButton =
        document.getElementById('client-profile-block-btn');

    if (blockButton) {
        blockButton.textContent = blocked ? '✅' : '🚫';
        blockButton.className = blocked
            ? 'py-4 bg-slate-100 text-slate-600 rounded-2xl text-sm font-black active:scale-95 transition-all'
            : 'py-4 bg-amber-50 text-amber-700 rounded-2xl text-sm font-black active:scale-95 transition-all';
    }
}

export function contactClientFromProfile() {
    const client = getClientById(activeClientProfileId);

    if (!client) return;

    if (isTelegramClient(client)) {
        return openClientTelegram(client.telegram || client.id);
    }

    if (client.phone) {
        window.location.href = `tel:${client.phone}`;
    }
}

export async function toggleClientBlockedFromProfile() {
    const client = getClientById(activeClientProfileId);

    if (!client) return;

    await toggleClientBlocked(
        client.id,
        !Boolean(client.isBlocked)
    );

    renderClientProfile();
}

export async function deleteClientFromProfile() {
    const client = getClientById(activeClientProfileId);

    if (!client) return;

    await deleteAdminClient(client.id);

    closeClientProfile();
}

function getClientHistoryContainer() {
    return document.getElementById('client-profile-history');
}

function getStatusLabel(status) {
    if (status === 'В очереди') return 'Очікує';
    if (status === 'Подтверждено') return 'Підтверджено';
    if (status === 'Выполнено') return 'Виконано';
    if (status === 'Отменено') return 'Скасовано';

    return status || 'Невідомо';
}

function getStatusClass(status) {
    if (status === 'В очереди') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (status === 'Подтверждено') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (status === 'Выполнено') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (status === 'Отменено') return 'bg-red-50 text-red-700 border-red-100';

    return 'bg-slate-50 text-slate-600 border-slate-100';
}

function renderClientBookingsHistory() {
    const container = getClientHistoryContainer();
    const count = document.getElementById('client-profile-history-count');

    if (!container) return;

    if (count) {
        count.textContent = String(activeClientBookings.length || 0);
    }

    if (activeClientBookingsLoading) {
        container.innerHTML = `
            <div class="text-sm font-medium text-slate-400 text-center py-4">
                Завантажуємо історію...
            </div>
        `;
        return;
    }

    if (!activeClientBookings.length) {
        container.innerHTML = `
            <div class="text-sm font-medium text-slate-400 text-center py-4">
                Історії візитів поки немає
            </div>
        `;
        return;
    }

    container.innerHTML = activeClientBookings.map(booking => `
        <div class="rounded-2xl bg-rose-50/70 border border-rose-100 p-4">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="text-sm font-black text-slate-950 truncate">
                        ${sanitize(booking.service || 'Послуга')}
                    </div>

                    <div class="text-xs font-bold text-slate-500 mt-1">
                        ${sanitize(booking.date || '')} • ${sanitize(booking.time || '')}
                    </div>

                    <div class="text-xs font-semibold text-slate-400 mt-2 truncate">
                        ${sanitize(booking.masterName || 'Майстер')}
                    </div>
                </div>

                <span class="text-[9px] font-black px-2.5 py-1.5 rounded-full border shrink-0 ${getStatusClass(booking.status)}">
                    ${sanitize(getStatusLabel(booking.status))}
                </span>
            </div>

            ${
                booking.cancelReason
                    ? `
                        <div class="mt-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            ${sanitize(booking.cancelReason)}
                        </div>
                    `
                    : ''
            }
        </div>
    `).join('');
}

async function loadClientBookingsHistory(clientId) {
    activeClientBookingsLoading = true;
    activeClientBookings = [];

    renderClientBookingsHistory();

    try {
        const response = await fetchClientBookingsAPI(clientId);

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося завантажити історію');
        }

        activeClientBookings = response.bookings || [];

    } catch (error) {
        const container = getClientHistoryContainer();

        if (container) {
            container.innerHTML = `
                <div class="text-sm font-bold text-red-500 text-center py-4">
                    Не вдалося завантажити історію
                </div>
            `;
        }

        return;

    } finally {
        activeClientBookingsLoading = false;
        renderClientBookingsHistory();
    }
}
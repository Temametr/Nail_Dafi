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

import {
    renderListSkeleton
} from '../../renderers/skeletonRenderer.js';

import {
    showBackButton,
    hideBackButton
} from '../../core/telegram/backButton.js';

let pendingClientActionId = null;
let activeClientProfileId = null;
let activeClientBookings = [];
let activeClientBookingsLoading = false;
const CLIENTS_CACHE_KEY = 'nail_dafi_admin_clients';
const CLIENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const CLIENT_HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;

function getClientHistoryCacheKey(clientId) {
    return `nail_dafi_client_history_${clientId}`;
}

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

    const container = document.getElementById('admin-clients-list');

    const shouldRenderBecauseContainerIsInitial =
        container &&
        (
            container.textContent.includes('Завантажуємо') ||
            container.innerHTML.trim() === ''
        );

    if (
        !hasChanged &&
        !forceRender &&
        !shouldRenderBecauseContainerIsInitial
    ) {
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
    <div class="bg-white rounded-[1.5rem] px-5 py-10 text-center">
        <div class="text-4xl mb-3">👥</div>
        <div class="text-[15px] font-semibold text-slate-800">
            ${sanitize(message)}
        </div>
        <div class="text-[12px] text-slate-400 mt-2">
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

function ensureClientProfileModalMounted() {
    if (document.getElementById('client-profile-modal')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="client-profile-modal" class="fixed inset-0 bg-rose-50 z-[88] hidden flex-col w-full max-w-md mx-auto h-[100dvh] overflow-hidden">
            <div class="flex-1 overflow-y-auto hide-scrollbar pb-32">
                <div class="w-full h-64 relative bg-gradient-to-br from-rose-100 via-pink-50 to-blue-100 flex items-center justify-center">
                    <div id="client-profile-avatar" class="w-28 h-28 rounded-[2rem] bg-white shadow-floating flex items-center justify-center text-5xl">
                        👤
                    </div>

                    <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-rose-50 via-rose-50/80 to-transparent"></div>
                </div>

                <div class="px-6 -mt-8 relative z-10">
                    <div class="mb-6">
                        <div class="flex items-center gap-2">
                            <h2 id="client-profile-name" class="text-3xl font-black text-slate-900 tracking-tight leading-none">
                                Клієнт
                            </h2>

                            <span id="client-profile-telegram-badge" class="hidden w-7 h-7 rounded-full bg-sky-50 text-sky-500 items-center justify-center text-xs font-black">
                                ✈️
                            </span>

                            <span id="client-profile-blocked-badge" class="hidden text-[10px] font-black px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                                ЧС
                            </span>
                        </div>

                        <p id="client-profile-source" class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-2">
                            Профіль клієнта
                        </p>
                    </div>

                    <div class="space-y-4">
                        <div class="card-convex p-5">
                            <div class="space-y-3">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                        📞
                                    </div>

                                    <div class="min-w-0">
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                            Телефон
                                        </div>

                                        <div id="client-profile-phone" class="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                                            —
                                        </div>
                                    </div>
                                </div>

                                <div id="client-profile-telegram-row" class="hidden items-center gap-3">
                                    <div class="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                        ✈️
                                    </div>

                                    <div class="min-w-0">
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                            Telegram
                                        </div>

                                        <div id="client-profile-telegram" class="text-sm font-extrabold text-sky-600 mt-0.5 truncate">
                                            —
                                        </div>
                                    </div>
                                </div>

                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                        💅
                                    </div>

                                    <div class="min-w-0">
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                            Візити
                                        </div>

                                        <div class="text-sm font-extrabold text-slate-900 mt-0.5">
                                            <span id="client-profile-total">0</span> всього
                                        </div>
                                    </div>
                                </div>

                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                        🕒
                                    </div>

                                    <div class="min-w-0">
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                            Останній запис
                                        </div>

                                        <div id="client-profile-last-booking" class="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
                                            —
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="client-profile-block-reason-card" class="card-convex p-4 hidden border border-red-100">
                            <div class="text-[10px] font-bold text-red-400 uppercase tracking-wide">
                                Причина ЧС
                            </div>

                            <div id="client-profile-block-reason" class="text-sm font-bold text-red-600 mt-1">
                                —
                            </div>
                        </div>

                        <div class="card-convex p-5">
                            <div class="flex items-center justify-between mb-4">
                                <div>
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                        Історія візитів
                                    </div>

                                    <div class="text-xs font-medium text-slate-400 mt-1">
                                        Останні записи клієнта
                                    </div>
                                </div>

                                <div id="client-profile-history-count" class="text-xs font-black text-slate-400">
                                    0
                                </div>
                            </div>

                            <div id="client-profile-history" class="space-y-3">
                                <div class="text-sm font-medium text-slate-400 text-center py-4">
                                    Завантажуємо історію...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="absolute bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-slate-100 pb-8 z-20">
                <div class="grid grid-cols-3 gap-3">
                    <button
                        id="client-profile-contact-btn"
                        onclick="window.appAPI.contactClientFromProfile()"
                        class="py-4 bg-slate-950 text-white rounded-2xl text-sm font-black shadow-lg active:scale-95 transition-all"
                    >
                        💬
                    </button>

                    <button
                        id="client-profile-block-btn"
                        onclick="window.appAPI.toggleClientBlockedFromProfile()"
                        class="py-4 bg-amber-50 text-amber-700 rounded-2xl text-sm font-black active:scale-95 transition-all"
                    >
                        🚫
                    </button>

                    <button
                        onclick="window.appAPI.deleteClientFromProfile()"
                        class="py-4 bg-red-50 text-red-600 rounded-2xl text-sm font-black active:scale-95 transition-all"
                    >
                        🗑
                    </button>
                </div>
            </div>
        </div>
    `);
}

export async function loadAdminClients(silent = false) {
    const container = document.getElementById('admin-clients-list');

    const usedCache = hydrateClientsFromCache();

    if (!silent && !usedCache && container) {
    container.innerHTML = renderListSkeleton(5);
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
    !silent
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

    let clients = [];

    try {
        clients = getFilteredClients();
    } catch (error) {
        console.error('getFilteredClients failed:', error);
        clients = [];
    }

    if (!clients.length) {
        renderEmptyClients(
            state.adminClientsSearchQuery
                ? 'За цим запитом клієнтів не знайдено'
                : 'Клієнтів поки немає'
        );

        return;
    }

    try {
        container.innerHTML = clients.map(client => {
            const blocked = Boolean(client.isBlocked);

            const clientId = sanitize(client.id || '');
            const clientName = sanitize(client.name || 'Клієнт');
            const clientPhone = sanitize(client.phone || 'Номер не вказано');

            const firstLetter = sanitize(
                String(client.name || 'К')
                    .trim()
                    .charAt(0)
                    .toUpperCase() || 'К'
            );

            const sourceLabel = isTelegramClient(client)
                ? 'Telegram'
                : 'Від майстра';

            return `
                <div
                    onclick="window.appAPI.openClientProfile('${clientId}')"
                    class="
                        flex items-center gap-3 px-3 py-3
                        border-b border-slate-100 last:border-b-0
                        active:bg-slate-50
                        transition-colors duration-150
                        ${blocked ? 'opacity-70' : ''}
                    "
                >
                    <div class="shrink-0">
                        <div class="
                            w-12 h-12 rounded-full overflow-hidden
                            bg-slate-100 border border-slate-200
                            flex items-center justify-center
                        ">
                            <span class="text-slate-500 text-sm font-bold">
                                ${firstLetter}
                            </span>
                        </div>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="text-[15px] font-semibold text-slate-900 truncate leading-tight">
                            ${clientName}
                        </div>

                        <div class="mt-1 text-[12px] text-slate-400 truncate">
                            ${clientPhone}
                        </div>

                        ${
                            blocked
                                ? `
                                    <div class="mt-1 text-[11px] font-medium text-red-500 truncate">
                                        У чорному списку
                                    </div>
                                `
                                : ''
                        }
                    </div>

                    <div class="shrink-0 pl-2">
                        <div class="text-[12px] font-medium text-slate-400 whitespace-nowrap">
                            ${sourceLabel}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('renderAdminClients failed:', error);

        container.innerHTML = `
            <div class="bg-white rounded-[1.5rem] px-5 py-10 text-center">
                <div class="text-4xl mb-3">⚠️</div>

                <div class="text-[15px] font-semibold text-red-500">
                    Помилка відображення клієнтів
                </div>

                <div class="text-[12px] text-slate-400 mt-2">
                    ${sanitize(error.message || '')}
                </div>
            </div>
        `;
    }
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
    ensureClientProfileModalMounted();

    const client = getClientById(clientId);
    const modal = document.getElementById('client-profile-modal');

    if (!client || !modal) return;

    activeClientProfileId = String(clientId);

    renderClientProfile(client);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    showBackButton();

    loadClientBookingsHistory(clientId);
}

export function closeClientProfile() {
    const modal = document.getElementById('client-profile-modal');

    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    activeClientProfileId = null;

    hideBackButton();
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
    '...'
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
    Boolean(currentClient.telegram),
    'flex'
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
    
    const profileTotal = document.getElementById('client-profile-total');

if (profileTotal) {
    profileTotal.textContent = String(activeClientBookings.length || 0);
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
    const cacheKey = getClientHistoryCacheKey(clientId);

    const cachedHistory = getCache(cacheKey);

    if (Array.isArray(cachedHistory)) {
        activeClientBookings = cachedHistory;
        activeClientBookingsLoading = false;

        renderClientBookingsHistory();
    } else {
        activeClientBookingsLoading = true;
        activeClientBookings = [];

        renderClientBookingsHistory();
    }

    try {
        const response = await fetchClientBookingsAPI(clientId);

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося завантажити історію');
        }

        const freshHistory = response.bookings || [];

        const changed =
            JSON.stringify(activeClientBookings || []) !== JSON.stringify(freshHistory || []);

        activeClientBookings = freshHistory;

        setCache(
            cacheKey,
            freshHistory,
            CLIENT_HISTORY_CACHE_TTL_MS
        );

        if (changed || !Array.isArray(cachedHistory)) {
            renderClientBookingsHistory();
        }

    } catch (error) {
        if (!Array.isArray(cachedHistory)) {
            const container = getClientHistoryContainer();

            if (container) {
                container.innerHTML = `
                    <div class="text-sm font-bold text-red-500 text-center py-4">
                        Не вдалося завантажити історію
                    </div>
                `;
            }
        }

        return;

    } finally {
        activeClientBookingsLoading = false;
        renderClientBookingsHistory();
    }
}
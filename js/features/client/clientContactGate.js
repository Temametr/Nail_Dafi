import { state, tg } from '../../state.js';

import {
    fetchClientContactAPI
} from '../../api/bookingsApi.js';

const PHONE_CACHE_PREFIX = 'nail_dafi_client_phone_';
const CONTACT_SHARED_PREFIX = 'nail_dafi_contact_shared_';

function getClientId() {
    return state.user?.id
        ? String(state.user.id)
        : '';
}

function getPhoneCacheKey(clientId) {
    return `${PHONE_CACHE_PREFIX}${clientId}`;
}

function getContactSharedKey(clientId) {
    return `${CONTACT_SHARED_PREFIX}${clientId}`;
}

function normalizePhone(phone) {
    return String(phone || '')
        .replace(/[^\d+]/g, '')
        .trim();
}

function isValidPhone(phone) {
    const normalized = normalizePhone(phone);

    return normalized.replace(/\D/g, '').length >= 10;
}

function setGateLoading(isLoading) {
    const button =
        document.getElementById(
            'client-contact-share-button'
        );

    if (!button) return;

    button.disabled = isLoading;
    button.textContent = isLoading
        ? 'Очікуємо підтвердження...'
        : 'Поділитися номером';
}

export function hasVerifiedClientPhone() {
    return Boolean(
        state.clientPhoneStatus === 'verified' &&
        isValidPhone(state.clientPhone)
    );
}

export function showClientContactGate() {
    const gate =
        document.getElementById(
            'client-contact-gate'
        );

    const clientScreen =
        document.getElementById(
            'client-screen'
        );

    const clientNav =
        document.getElementById(
            'client-bottom-nav'
        );

    const loader =
        document.getElementById(
            'loader'
        );

    if (loader) {
        loader.classList.add('hidden-step');
    }

    if (clientScreen) {
        clientScreen.classList.add('hidden-step');
    }

    if (clientNav) {
        clientNav.classList.add('hidden-step');
    }

    if (gate) {
        gate.classList.remove('hidden-step');
    }
}

export function hideClientContactGate() {
    const gate =
        document.getElementById(
            'client-contact-gate'
        );

    if (gate) {
        gate.classList.add('hidden-step');
    }
}

export async function checkClientPhoneFast() {
    const clientId = getClientId();

    if (!clientId) {
        state.clientPhoneStatus = 'required';
        return false;
    }

    const cachedPhone =
        localStorage.getItem(
            getPhoneCacheKey(clientId)
        );

    if (isValidPhone(cachedPhone)) {
        state.clientPhone = normalizePhone(cachedPhone);
        state.clientPhoneStatus = 'verified';

        return true;
    }

    try {
        const response =
            await fetchClientContactAPI(clientId);

        if (
            response.status === 'success' &&
            isValidPhone(response.phone)
        ) {
            const phone =
                normalizePhone(response.phone);

            state.clientPhone = phone;
            state.clientPhoneStatus = 'verified';

            localStorage.setItem(
                getPhoneCacheKey(clientId),
                phone
            );

            return true;
        }

        if (
            response.status === 'success' &&
            response.isBlocked
        ) {
            state.clientPhoneStatus = 'denied';

            tg.showAlert(
                response.blockReason ||
                'Ваш профіль обмежено для запису.'
            );

            return false;
        }

    } catch (error) {
        console.warn(
            'checkClientPhoneFast error:',
            error
        );
    }

    state.clientPhoneStatus = 'required';

    return false;
}

async function waitForPhoneFromBackend(
    clientId,
    attempts = 8,
    delayMs = 700
) {
    for (let i = 0; i < attempts; i++) {
        try {
            const response =
                await fetchClientContactAPI(clientId);

            if (
                response.status === 'success' &&
                isValidPhone(response.phone)
            ) {
                return normalizePhone(response.phone);
            }
        } catch (error) {
            console.warn(
                'waitForPhoneFromBackend:',
                error
            );
        }

        await new Promise(resolve =>
            setTimeout(resolve, delayMs)
        );
    }

    return '';
}

export async function syncClientPhoneInBackground() {
    const clientId = getClientId();

    if (!clientId || state.clientPhoneSyncing) {
        return;
    }

    state.clientPhoneSyncing = true;

    try {
        const phone =
            await waitForPhoneFromBackend(
                clientId,
                20,
                1000
            );

        if (!phone) {
            state.clientPhoneStatus = 'syncing';
            return;
        }

        state.clientPhone = phone;
        state.clientPhoneStatus = 'verified';

        localStorage.setItem(
            getPhoneCacheKey(clientId),
            phone
        );

    } finally {
        state.clientPhoneSyncing = false;
    }
}

export async function requestClientContactAtLaunch(onSuccess) {
    const webApp =
        window.Telegram?.WebApp || tg;

    const clientId = getClientId();

    if (!clientId) {
        tg.showAlert(
            'Не вдалося визначити Telegram ID. Відкрийте додаток через Telegram.'
        );

        return;
    }

    if (
        !webApp ||
        typeof webApp.requestContact !== 'function'
    ) {
        tg.showAlert(
            'Ваш Telegram не підтримує швидку передачу номера. Оновіть Telegram або спробуйте пізніше.'
        );

        return;
    }

    setGateLoading(true);

    try {
        webApp.requestContact(async (shared) => {
            setGateLoading(false);

            if (!shared) {
                state.clientPhoneStatus = 'denied';

                tg.showAlert(
                    'Без номера телефону запис через додаток недоступний.'
                );

                return;
            }

            localStorage.setItem(
                getContactSharedKey(clientId),
                'true'
            );

            state.clientPhoneStatus = 'syncing';

            hideClientContactGate();

            if (typeof onSuccess === 'function') {
                onSuccess();
            }

            syncClientPhoneInBackground();
        });

    } catch (error) {
        setGateLoading(false);

        tg.showAlert(
            'Не вдалося запросити номер. Спробуйте ще раз.'
        );
    }
}

export async function ensureClientPhoneBeforeBooking() {
    if (hasVerifiedClientPhone()) {
        return state.clientPhone;
    }

    const clientId = getClientId();

    if (!clientId) {
        throw new Error(
            'Telegram user не визначений.'
        );
    }

    const phone =
        await waitForPhoneFromBackend(
            clientId,
            6,
            500
        );

    if (phone) {
        state.clientPhone = phone;
        state.clientPhoneStatus = 'verified';

        localStorage.setItem(
            getPhoneCacheKey(clientId),
            phone
        );

        return phone;
    }

    throw new Error(
        'Номер телефону ще синхронізується. Спробуйте створити запис ще раз за кілька секунд.'
    );
}
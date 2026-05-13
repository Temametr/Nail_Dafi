import { state } from '../../state.js';

import { fetchInitialData } from '../../api/bootstrapApi.js';

import {
    renderHomeMasters,
    renderServices
} from '../../client.js';

import {
    logError,
    showNetworkError
} from '../ui/notify.js';

import {
    getById,
    showStepElement
} from '../ui/dom.js';

import { APP_CONFIG } from '../../config/appConfig.js';

import {
    getCache,
    setCache
} from '../cache/localCache.js';

export async function loadInitialData() {
    try {
        const cachedData = getCache(APP_CONFIG.cache.initDataKey);

        if (cachedData) {
            applyInitialData(cachedData);

            refreshInitialDataInBackground();

            return {
                fromCache: true
            };
        }

        const freshData = await fetchInitialData();

        applyInitialData(freshData);

        setCache(
            APP_CONFIG.cache.initDataKey,
            freshData,
            APP_CONFIG.cache.initDataTtlMs
        );

        return {
            fromCache: false
        };

    } catch (error) {
        logError('Помилка завантаження даних', error);

        if (!state.services.length || !state.masters.length) {
            showNetworkError();
        }

        return {
            fromCache: false,
            error
        };
    }
}

async function refreshInitialDataInBackground() {
    try {
        const freshData = await fetchInitialData();

        applyInitialData(freshData);

        setCache(
            APP_CONFIG.cache.initDataKey,
            freshData,
            APP_CONFIG.cache.initDataTtlMs
        );

    } catch (error) {
        logError('Фонове оновлення даних не вдалося', error);
    }
}

function applyInitialData(data) {
    state.services = data.services || [];
    state.masters = data.masters || [];

    if (state.user && state.user.id) {
        const masterData = state.masters.find(
            master =>
                String(master.id).trim() ===
                String(state.user.id).trim()
        );

        if (masterData) {
            state.isAdmin = true;
            state.adminMasterInfo = masterData;
        }
    }
}

export async function bootstrapClient() {
    showStepElement(getById('client-screen'));
    showStepElement(getById('client-bottom-nav'));

    renderHomeMasters();
    renderServices();
}

export async function bootstrapAdmin() {
    showStepElement(getById('admin-screen'));
    showStepElement(getById('admin-bottom-nav'));
}

export function hideLoader() {
    const loader = getById('loader');

    if (!loader) return;

    loader.style.opacity = '0';
    loader.style.transform = 'scale(0.98)';
    loader.style.transition = 'opacity 180ms ease, transform 180ms ease';

    setTimeout(() => {
        loader.classList.add('hidden-step');
    }, 180);
}
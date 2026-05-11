import { state, tg } from '../../state.js';

import {
    fetchInitialData
} from '../../api.js';

import {
    renderHomeMasters,
    renderServices
} from '../../client.js';

import {
    logError,
    showNetworkError
} from '../ui/notify.js';

export async function loadInitialData() {
    try {
        const data = await fetchInitialData();

        state.services = data.services || [];
        state.masters = data.masters || [];

        if (state.user && state.user.id) {
            const masterData = state.masters.find(
                master =>
                    master.id.toString() ===
                    state.user.id.toString()
            );

            if (masterData) {
                state.isAdmin = true;
                state.adminMasterInfo = masterData;
            }
        }
    } catch (error) {
        logError(
            'Помилка завантаження даних',
            error
        );

        showNetworkError();
    }
}

export async function bootstrapClient() {
    document
        .getElementById('client-screen')
        .classList.remove('hidden-step');

    document
        .getElementById('client-bottom-nav')
        .classList.remove('hidden-step');

    renderHomeMasters();

    renderServices();
}

export async function bootstrapAdmin() {
    document
        .getElementById('admin-screen')
        .classList.remove('hidden-step');

    document
        .getElementById('admin-bottom-nav')
        .classList.remove('hidden-step');
}

export function hideLoader() {
    const loader =
        document.getElementById('loader');

    if (loader) {
        loader.classList.add('hidden');
    }
}
import { state } from '../../state.js';

import { fetchInitialData } from '../../api.js';

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

export async function loadInitialData() {
    try {
        const data = await fetchInitialData();

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
    } catch (error) {
        logError('Помилка завантаження даних', error);
        showNetworkError();
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

    if (loader) {
        loader.classList.add('hidden');
    }
}
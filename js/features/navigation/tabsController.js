import { state } from '../../state.js';

import {
    renderHomeMasters,
    renderClientBookings,
    renderUserProfile
} from '../../client.js';

import {
    renderAdminBookings
} from '../../admin.js';

import {
    hideMainButton
} from '../../core/telegram/mainButton.js';

import {
    hideBackButton
} from '../../core/telegram/backButton.js';

import {
    startPolling as startPollingManager,
    stopPolling
} from '../../core/polling/pollingManager.js';

import {
    setActiveNav,
    updateHeaderTitle
} from './navigationState.js';

import {
    loadAdminClients
} from '../admin/adminClients.js';

export function switchTab({
    role,
    tabId,
    loadBookings
}) {
    const screenPrefix = role === 'admin' ? 'admin-' : '';

    document
        .querySelectorAll(
            role === 'admin'
                ? '.admin-tab-content'
                : '.tab-content'
        )
        .forEach(element => {
            element.classList.add('hidden-step');
        });

    const target = document.getElementById(
        `${screenPrefix}tab-${tabId}`
    );

    if (target) {
        target.classList.remove('hidden-step');
    }

    setActiveNav(role, tabId);
    updateHeaderTitle(role, tabId);

    hideBackButton();
    hideMainButton();

    stopPolling();

    state.editingBookingId = null;

    if (role === 'client') {
        if (tabId === 'home') {
            renderHomeMasters();

        } else if (tabId === 'bookings') {
            loadBookings('client');

            startPollingManager(() => {
                loadBookings('client', true);
            });

        } else if (tabId === 'profile') {
            renderUserProfile();
        }

        return;
    }

    if (tabId === 'home') {
        loadBookings('admin', false, true);

        startPollingManager(() => {
            loadBookings('admin', true, true);
        });

    } else if (tabId === 'bookings') {
        loadBookings('admin');

        startPollingManager(() => {
            loadBookings('admin', true);
        });
    } else if (tabId === 'clients') {
    loadAdminClients();

    startPollingManager(() => {
        loadAdminClients(true);
    }, 60000);
}
}

const BOOKING_FILTER_LABELS = {
    all: 'Всі',
    pending: 'Очікують',
    confirmed: 'Підтверджені',
    cancelled: 'Скасовані',
    done: 'Виконані'
};

export function switchBookingTab({
    filter,
    role
}) {
    state.currentBookingFilter = filter || 'all';

    updateBookingFilterTitle(role);
    closeBookingFilterMenu(role);

    role === 'admin'
        ? renderAdminBookings()
        : renderClientBookings();
}

export function toggleBookingFilterMenu(role) {
    const menu = document.getElementById(
        `${role}-booking-filter-menu`
    );

    if (!menu) return;

    menu.classList.toggle('hidden');
}

export function closeBookingFilterMenu(role) {
    const menu = document.getElementById(
        `${role}-booking-filter-menu`
    );

    if (!menu) return;

    menu.classList.add('hidden');
}

export function updateBookingFilterTitle(role) {
    const title = document.getElementById(
        `${role}-booking-filter-title`
    );

    if (!title) return;

    title.textContent =
        BOOKING_FILTER_LABELS[state.currentBookingFilter] ||
        BOOKING_FILTER_LABELS.all;
}
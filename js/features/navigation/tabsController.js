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
}
}

export function switchBookingTab({
    filter,
    role
}) {
    state.currentBookingFilter = filter;

    const filters = [
        'pending',
        'confirmed',
        'cancelled',
        'done'
    ];

    filters.forEach(item => {
        const button = document.getElementById(
            `${role}-subtab-${item}`
        );

        if (!button) return;

        const isActive = item === filter;

        button.className = isActive
            ? 'shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300'
            : getInactiveBookingTabClass(item);
    });

    role === 'admin'
        ? renderAdminBookings()
        : renderClientBookings();
}

function getInactiveBookingTabClass(filter) {
    const borderMap = {
        pending: 'border-amber-100',
        confirmed: 'border-blue-100',
        cancelled: 'border-rose-100',
        done: 'border-emerald-100'
    };

    return `shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border ${borderMap[filter] || 'border-slate-100'}`;
}
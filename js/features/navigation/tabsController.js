import { state } from '../../state.js';

import {
    renderHomeMasters,
    renderClientBookings,
    renderUserProfile,
    renderMessagesTab
} from '../../client.js';

import {
    loadChats
} from '../chat/chatController.js';

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

        } else if (tabId === 'messages') {

    renderMessagesTab();

    loadChats('client');
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
    }
}

export function switchBookingTab({
    filter,
    role
}) {
    state.currentBookingFilter = filter;

    const activeButton = document.getElementById(
        `${role}-subtab-active`
    );

    const cancelledButton = document.getElementById(
        `${role}-subtab-cancelled`
    );

    if (!activeButton || !cancelledButton) return;

    if (filter === 'active') {
        activeButton.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300';

        cancelledButton.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100';

    } else {
        cancelledButton.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300';

        activeButton.className =
            'flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100';
    }

    role === 'admin'
        ? renderAdminBookings()
        : renderClientBookings();
}
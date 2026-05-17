import { state } from '../../state.js';

import { fetchBookings } from '../../api/bookingsApi.js';

import {
    renderClientBookings
} from '../../client.js';

import {
    renderAdminStats,
    renderAdminBookings
} from '../../admin.js';

import {
    renderLoading,
    renderError
} from '../../core/ui/loadingManager.js';

import {
    renderBookingSkeleton
} from '../../renderers/skeletonRenderer.js';

import {
    logError
} from '../../core/ui/notify.js';

import {
    getCache,
    setCache
} from '../../core/cache/localCache.js';

const BOOKINGS_CACHE_TTL_MS = 2 * 60 * 1000;

function getBookingsCacheKey(role) {
    return `nail_dafi_${role}_bookings`;
}

function areBookingsEqual(currentBookings, nextBookings) {
    try {
        return JSON.stringify(currentBookings || []) === JSON.stringify(nextBookings || []);
    } catch (_) {
        return false;
    }
}

function renderBookingsSkeleton(containerId, role) {
    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = renderBookingSkeleton(
        role === 'admin' ? 5 : 4
    );
}

function applyBookings(role, bookings, dash = false, forceRender = false) {
    if (role === 'admin') {
        const hasChanged = !areBookingsEqual(state.adminBookings, bookings);

        state.adminBookings = bookings || [];

        if (!hasChanged && !forceRender) {
            return;
        }

        if (dash) {
            renderAdminStats(state.adminStatsPeriod || 'today');
        } else {
            renderAdminBookings();
        }

        return;
    }

    const hasChanged = !areBookingsEqual(state.clientBookings, bookings);

    state.clientBookings = bookings || [];

    if (!hasChanged && !forceRender) {
        return;
    }

    renderClientBookings();
}

function hydrateFromCache(role, dash = false) {
    const cachedBookings = getCache(
        getBookingsCacheKey(role)
    );

    if (!cachedBookings || !Array.isArray(cachedBookings)) {
        return false;
    }

    applyBookings(role, cachedBookings, dash, true);

    return true;
}

export async function loadBookings(
    role,
    silent = false,
    dash = false
) {
    const containerId = role === 'admin'
        ? dash
            ? null
            : 'admin-bookings-list'
        : 'my-bookings-list';

    const usedCache = hydrateFromCache(role, dash);

    if (!silent && !usedCache && containerId) {
    renderBookingsSkeleton(containerId, role);
}

    try {
        const data = await fetchBookings(role);
        const freshBookings = data.bookings || [];

        setCache(
            getBookingsCacheKey(role),
            freshBookings,
            BOOKINGS_CACHE_TTL_MS
        );

        applyBookings(
    role,
    freshBookings,
    dash,
    !silent
);

    } catch (error) {
        logError(
            'Помилка завантаження записів',
            error
        );

        if (!silent && !usedCache && containerId) {
            renderError(containerId);
        }
    }
}
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
    logError
} from '../../core/ui/notify.js';

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

    if (!silent && containerId) {
        renderLoading(containerId, {
            color: role === 'admin'
                ? 'border-t-teal-500'
                : 'border-t-blue-500'
        });
    }

    try {
        const data = await fetchBookings(role);

        if (role === 'admin') {
            state.adminBookings = data.bookings || [];

            if (dash) {
                renderAdminStats('day');
            } else {
                renderAdminBookings();
            }
        } else {
            state.clientBookings = data.bookings || [];

            renderClientBookings();
        }
    } catch (error) {
        logError(
            'Помилка завантаження записів',
            error
        );

        if (!silent && containerId) {
            renderError(containerId);
        }
    }
}
import { polling } from '../../state.js';

export function startPolling(callback, intervalMs = 15000) {
    stopPolling();

    polling.interval = setInterval(callback, intervalMs);
}

export function stopPolling() {
    if (!polling.interval) return;

    clearInterval(polling.interval);
    polling.interval = null;
}
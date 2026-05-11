import { polling } from '../../state.js';
import { APP_CONFIG } from '../../config/appConfig.js';

export function startPolling(callback, intervalMs = APP_CONFIG.polling.bookingsInterval) {
    stopPolling();

    polling.interval = setInterval(callback, intervalMs);
}

export function stopPolling() {
    if (!polling.interval) return;

    clearInterval(polling.interval);
    polling.interval = null;
}
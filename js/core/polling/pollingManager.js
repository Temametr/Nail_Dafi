import { polling } from '../../state.js';
import { APP_CONFIG } from '../../config/appConfig.js';

let currentCallback = null;
let currentIntervalMs = APP_CONFIG.polling.bookingsInterval;

function canPoll() {
    if (document.hidden) {
        return false;
    }

    const tg = window.Telegram?.WebApp;

    if (tg && tg.isActive === false) {
        return false;
    }

    return true;
}

function runPollingTick() {
    if (!currentCallback || !canPoll()) {
        return;
    }

    currentCallback();
}

export function startPolling(
    callback,
    intervalMs = APP_CONFIG.polling.bookingsInterval
) {
    stopPolling();

    currentCallback = callback;
    currentIntervalMs = intervalMs;

    polling.interval = setInterval(
        runPollingTick,
        currentIntervalMs
    );
}

export function stopPolling() {
    if (polling.interval) {
        clearInterval(polling.interval);
        polling.interval = null;
    }

    currentCallback = null;
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        runPollingTick();
    }
});
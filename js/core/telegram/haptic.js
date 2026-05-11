import { tg } from '../../state.js';

export function notifySuccess() {
    try {
        tg.HapticFeedback.notificationOccurred('success');
    } catch (e) {
        console.error('Haptic success error:', e);
    }
}

export function notifyError() {
    try {
        tg.HapticFeedback.notificationOccurred('error');
    } catch (e) {
        console.error('Haptic error:', e);
    }
}

export function impactLight() {
    try {
        tg.HapticFeedback.impactOccurred('light');
    } catch (e) {
        console.error('Haptic impact error:', e);
    }
}
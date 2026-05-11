import { tg } from '../../state.js';

export function showError(message = 'Сталася помилка') {
    tg.showAlert(message);
}

export function showSuccess(message = 'Успішно') {
    tg.showAlert(message);
}

export function logError(context, error) {
    console.error(`[${context}]`, error);
}

export function showNetworkError() {
    showError('Помилка мережі 🌐');
}

export function showValidationError(message) {
    showError(message);
}
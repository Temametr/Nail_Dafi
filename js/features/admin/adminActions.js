import { updateBookingStatusAPI } from '../../api.js';

import {
    showError,
    logError
} from '../../core/ui/notify.js';

export async function changeBookingStatusAction(id, status, onSuccess) {
    try {
        const response = await updateBookingStatusAPI(id, status);

        if (response.status === 'success') {
            if (typeof onSuccess === 'function') {
                onSuccess();
            }

            return;
        }

        showError(
            'Помилка: ' +
            (response.message || 'невідома помилка')
        );
    } catch (error) {
        logError('Помилка зміни статусу', error);

        showError(
            error.message ||
            'Не вдалося змінити статус.'
        );
    }
}
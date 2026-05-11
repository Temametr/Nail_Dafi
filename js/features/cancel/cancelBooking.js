import { state, modalState } from '../../state.js';

import { updateBookingStatusAPI } from '../../api/bookingsApi.js';

import {
    showModal,
    hideModal,
    setInputValue,
    setText,
    setPlaceholder,
    getInputValue
} from '../../core/ui/modalManager.js';

import {
    showError,
    showValidationError,
    logError
} from '../../core/ui/notify.js';

export function openCancelModal(id, role) {
    modalState.currentCancelBookingId = id;
    modalState.currentCancelRole = role;

    setText('cancel-modal-title', 'Скасувати?');

    setPlaceholder(
        'cancel-reason',
        role === 'client'
            ? 'Напишіть причину скасування для майстра...'
            : 'Напишіть клієнту, чому візит скасовано...'
    );

    showModal('cancel-modal');
}

export function closeCancelModal() {
    hideModal('cancel-modal');
    setInputValue('cancel-reason', '');
}

export async function confirmCancel(onSuccess) {
    const reason = getInputValue('cancel-reason').trim();

    if (!reason) {
        return showValidationError('Будь ласка, вкажіть причину.');
    }

    try {
        const response = await updateBookingStatusAPI(
            modalState.currentCancelBookingId,
            'Отменено',
            reason
        );

        if (response.status === 'success') {
            if (typeof onSuccess === 'function') {
                onSuccess(state.isAdmin ? 'admin' : 'client');
            }
        } else {
            showError(
                'Помилка: ' +
                (response.message || 'невідома помилка')
            );
        }
    } catch (error) {
        logError('Помилка скасування', error);

        showError(
            error.message ||
            'Не вдалося скасувати запис.'
        );
    } finally {
        closeCancelModal();
    }
}
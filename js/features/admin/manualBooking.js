import { state, tg } from '../../state.js';

import {
    createBookingAPI
} from '../../api.js';

import {
    loadBookings
} from '../bookings/bookingsLoader.js';

import {
    renderAdminStats
} from '../../admin.js';

export function openManualBookingModal() {

    const modal =
        document.getElementById(
            'manual-booking-modal'
        );

    if (!modal) return;

    fillManualBookingData();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function closeManualBookingModal() {

    const modal =
        document.getElementById(
            'manual-booking-modal'
        );

    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function fillManualBookingData() {

    const masterSelect =
        document.getElementById(
            'manual-booking-master'
        );

    const serviceSelect =
        document.getElementById(
            'manual-booking-service'
        );

    if (masterSelect) {

        masterSelect.innerHTML =
            (state.masters || []).map(master => `

                <option value="${master.id}">
                    ${master.name}
                </option>

            `).join('');
    }

    if (serviceSelect) {

        serviceSelect.innerHTML =
            (state.services || []).map(service => `

                <option value="${service.name}">
                    ${service.name}
                </option>

            `).join('');
    }
}

export async function createManualBooking() {

    const name =
        document.getElementById(
            'manual-booking-name'
        )?.value?.trim();

    const phone =
        document.getElementById(
            'manual-booking-phone'
        )?.value?.trim();

    const masterId =
        document.getElementById(
            'manual-booking-master'
        )?.value;

    const service =
        document.getElementById(
            'manual-booking-service'
        )?.value;

    const date =
        document.getElementById(
            'manual-booking-date'
        )?.value;

    const time =
        document.getElementById(
            'manual-booking-time'
        )?.value;

    const comment =
        document.getElementById(
            'manual-booking-comment'
        )?.value?.trim() || '';

    const button =
        document.getElementById(
            'manual-booking-submit'
        );

    if (!name) {
        return tg.showAlert(
            'Введіть імʼя клієнта'
        );
    }

    if (!phone) {
        return tg.showAlert(
            'Введіть номер телефону'
        );
    }

    if (!masterId) {
        return tg.showAlert(
            'Оберіть майстра'
        );
    }

    if (!service) {
        return tg.showAlert(
            'Оберіть послугу'
        );
    }

    if (!date) {
        return tg.showAlert(
            'Оберіть дату'
        );
    }

    if (!time) {
        return tg.showAlert(
            'Оберіть час'
        );
    }

    const normalizedPhone =
        phone.replace(/\D/g, '');

    const manualClientId =
        `MANUAL-${normalizedPhone}`;

    try {

        if (button) {
            button.disabled = true;
            button.textContent =
                'Створюємо...';
        }

        const response =
            await createBookingAPI({

                clientId: manualClientId,

                clientName: name,

                clientPhone: phone,

                masterId,

                service,

                date,

                time,

                comment
            });

        if (
            response.status !== 'success'
        ) {
            throw new Error(
                response.message ||
                'Не вдалося створити запис'
            );
        }

        await loadBookings(
            'admin',
            state.adminMasterInfo.id,
            true
        );

        renderAdminStats(
            state.adminStatsPeriod
        );

        closeManualBookingModal();

        clearManualBookingForm();

        tg.showAlert(
            'Запис створено ✅'
        );

    } catch (error) {

        tg.showAlert(
            error.message ||
            'Помилка створення запису'
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent =
                'Створити запис';
        }
    }
}

function clearManualBookingForm() {

    [
        'manual-booking-name',
        'manual-booking-phone',
        'manual-booking-date',
        'manual-booking-time',
        'manual-booking-comment'
    ].forEach(id => {

        const element =
            document.getElementById(id);

        if (!element) return;

        element.value = '';
    });
}
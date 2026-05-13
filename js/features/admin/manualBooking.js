import { state, tg } from '../../state.js';

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
    tg.showAlert(
        'Наступним кроком підключимо створення запису ✨'
    );
}
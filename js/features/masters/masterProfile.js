import { state, tg } from '../../state.js';

import { renderServices } from '../../client.js';

import {
    showBackButton,
    hideBackButton
} from '../../core/telegram/backButton.js';

import {
    resetDateTimeSelection,
    showStep
} from '../booking/bookingFlow.js';

export function openMasterProfile(id) {
    try {
        state.viewedMasterId = id;

        const master = state.masters.find(
            item => item.id.toString() === id.toString()
        );

        if (!master) {
            return;
        }

        const originalIndex = state.masters.indexOf(master);

        document.getElementById('mp-image').src =
            originalIndex === 0
                ? 'media/IMG_0222.jpeg'
                : 'media/IMG_0223.jpeg';

        document.getElementById('mp-name').innerText =
            master.name
                .replace(/^(Майстер|Мастер)\s+/i, '')
                .trim();

        const phone = master.phone
            ? String(master.phone)
            : null;

        document.getElementById('mp-phone').innerText =
            phone || 'Не вказано';

        document.getElementById('mp-phone-link').href =
            phone
                ? `tel:${phone.replace(/[^0-9+]/g, '')}`
                : '#';

        document.getElementById('mp-description').innerText =
            master.about ||
            'Найкращий майстер нашого салону!';

        document
            .getElementById('master-profile-modal')
            .classList
            .remove('hidden');

        document
            .getElementById('master-profile-modal')
            .classList
            .add('flex');

        showBackButton();
    } catch (error) {
        console.error(
            'Помилка профілю майстра:',
            error
        );
    }
}

export function closeMasterProfile() {
    document
        .getElementById('master-profile-modal')
        .classList
        .add('hidden');

    document
        .getElementById('master-profile-modal')
        .classList
        .remove('flex');

    state.viewedMasterId = null;

    hideBackButton();
}

export function bookFromProfile() {
    if (!state.viewedMasterId) {
        return;
    }

    state.selectedMaster = state.masters.find(
        item =>
            item.id.toString() ===
            state.viewedMasterId.toString()
    );

    if (!state.selectedMaster) {
        return tg.showAlert(
            'Майстра не знайдено'
        );
    }

    resetDateTimeSelection();

    document
        .getElementById('master-profile-modal')
        .classList
        .add('hidden');

    document
        .getElementById('tab-home')
        .classList
        .add('hidden-step');

    document
        .getElementById('tab-booking-flow')
        .classList
        .remove('hidden-step');

    ['home', 'bookings', 'messages', 'profile']
        .forEach(nav => {
            const btn = document.getElementById(
                `client-nav-${nav}`
            );

            if (!btn) return;

            if (nav === 'home') {
                btn.classList.remove(
                    'text-slate-400'
                );

                btn.classList.add(
                    'text-blue-500',
                    'bg-blue-50'
                );
            } else {
                btn.classList.remove(
                    'text-blue-500',
                    'bg-blue-50'
                );

                btn.classList.add(
                    'text-slate-400'
                );
            }
        });

    renderServices();

    showStep('step-booking');

    showBackButton();
}
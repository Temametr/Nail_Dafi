import { state, tg } from '../../state.js';
import { APP_CONFIG } from '../../config/appConfig.js';

import {
    fetchOccupiedSlotsAPI,
    submitBookingAPI
} from '../../api/bookingsApi.js';

import {
    renderServices,
    renderMasters,
    renderCalendar,
    renderTimeSlots
} from '../../client.js';

import {
    showMainButton,
    hideMainButton,
    enableMainButton,
    disableMainButton,
    showMainButtonProgress,
    hideMainButtonProgress,
    setMainButtonHandler
} from '../../core/telegram/mainButton.js';

import { showBackButton } from '../../core/telegram/backButton.js';

import { notifySuccess } from '../../core/telegram/haptic.js';

import {
    setText,
    setHtml
} from '../../core/ui/modalManager.js';

let currentSubmitHandler = null;
let isSubmittingBooking = false;
let lastDateRequestId = 0;
let onBookingSuccessCallback = null;

export function setBookingSuccessHandler(callback) {
    onBookingSuccessCallback = callback;
}

export function resetDateTimeSelection() {
    state.selectedDate = null;
    state.selectedTime = null;

    lastDateRequestId++;

    setHtml('time-slots', '');
    hideMainButton();
}

export function showStep(stepId) {
    document
        .querySelectorAll('.step-content')
        .forEach(el => el.classList.add('hidden-step'));

    const target = document.getElementById(stepId);

    if (target) {
        target.classList.remove('hidden-step');
    }

    if (stepId === 'step-booking') {
        hideMainButton();
    }
}

export function startClientBookingFlow() {
    state.editingBookingId = null;
    state.selectedMaster = null;
    state.viewedMasterId = null;
    state.clientPhone = '';

    isSubmittingBooking = false;

    resetDateTimeSelection();

    document
        .querySelectorAll('.tab-content')
        .forEach(el => el.classList.add('hidden-step'));

    document
        .getElementById('tab-booking-flow')
        .classList.remove('hidden-step');

    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);

        if (!btn) return;

        if (nav === 'bookings') {
            btn.classList.remove('text-slate-400');
            btn.classList.add('text-blue-500', 'bg-blue-50');
        } else {
            btn.classList.remove('text-blue-500', 'bg-blue-50');
            btn.classList.add('text-slate-400');
        }
    });

    renderServices();

    showStep('step-booking');

    showBackButton();
}

export function startReschedule(id) {
    const booking = state.clientBookings.find(
        item => String(item.id).trim() === String(id).trim()
    );

    if (!booking) {
        return tg.showAlert('Запис не знайдено');
    }

    state.editingBookingId = id;

    const bookingServiceName = String(
        booking.service || ''
    ).trim().toLowerCase();

    const bookingMasterId = String(
        booking.masterId || ''
    ).trim();

    state.selectedService = state.services.find(service =>
        String(service.name || '')
            .trim()
            .toLowerCase() === bookingServiceName
    );

    state.selectedMaster = state.masters.find(master =>
        String(master.id || '').trim() === bookingMasterId
    );

    /*
    ==========================================
    SERVICE FALLBACK
    ==========================================
    */

    if (!state.selectedService) {
        state.selectedService = {
            id: `legacy-service-${booking.id}`,
            name: booking.service || 'Послуга',
            duration:
    Number(booking.duration) ||
    APP_CONFIG.booking.defaultDuration,
            price: booking.price || ''
        };

        console.warn(
            'Fallback service used:',
            state.selectedService
        );
    }

    /*
    ==========================================
    MASTER FALLBACK
    ==========================================
    */

    if (!state.selectedMaster) {
        state.selectedMaster = state.masters[0];

        console.warn(
            'Fallback master used:',
            {
                booking,
                selectedMaster: state.selectedMaster
            }
        );
    }

    /*
    ==========================================
    FINAL VALIDATION
    ==========================================
    */

    if (!state.selectedMaster) {
        return tg.showAlert(
            'Не вдалося знайти майстра.'
        );
    }

    isSubmittingBooking = false;

    resetDateTimeSelection();

    document
        .querySelectorAll('.tab-content')
        .forEach(el => el.classList.add('hidden-step'));

    document
        .getElementById('tab-booking-flow')
        .classList.remove('hidden-step');

    ['home', 'bookings', 'profile']
        .forEach(nav => {
            const btn = document.getElementById(
                `client-nav-${nav}`
            );

            if (!btn) return;

            if (nav === 'bookings') {
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

    renderCalendar();

    showStep('step-date');

    showBackButton();
}

export function selectService(id) {
    state.selectedService = state.services.find(
        s => s.id.toString() === id.toString()
    );

    if (!state.selectedService) {
        return tg.showAlert('Послугу не знайдено');
    }

    if (state.selectedMaster) {
    showStep('step-phone');
} else {
        renderMasters();
        showStep('step-master');
    }
}

export function confirmClientPhone() {
    const input = document.getElementById('client-phone-input');

    const phone = String(input?.value || '')
        .replace(/[^\d+]/g, '')
        .trim();

    if (!phone || phone.length < 10) {
        return tg.showAlert('Будь ласка, вкажіть коректний номер телефону.');
    }

    state.clientPhone = phone;

    renderCalendar();

    showStep('step-date');
}

export function selectMaster(id) {
    resetDateTimeSelection();

    state.selectedMaster = state.masters.find(
        m => m.id.toString() === id.toString()
    );

    if (!state.selectedMaster) {
        return tg.showAlert('Майстра не знайдено');
    }

    showStep('step-phone');
}

export async function selectDate(date, btn) {
    const requestId = ++lastDateRequestId;

    state.selectedDate = date;
    state.selectedTime = null;

    hideMainButton();

    document.querySelectorAll('.date-btn').forEach(button => {
        button.classList.remove(
            'selected-item',
            'shadow-blue-300',
            'border-transparent'
        );
    });

    btn.classList.add(
        'selected-item',
        'shadow-blue-300',
        'border-transparent'
    );

    const d = new Date(date);

    const formattedDate = d.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long'
    });

    setText(
        'time-step-title',
        `Час на ${formattedDate}`
    );

    showStep('step-time');

    const loader = document.getElementById('time-loader');

    if (loader) {
        loader.classList.remove('hidden');
    }

    setHtml('time-slots', '');

    try {
        const data = await fetchOccupiedSlotsAPI(
            date,
            state.selectedMaster.id,
            state.editingBookingId
        );

        if (requestId !== lastDateRequestId) {
            return;
        }

        renderTimeSlots(data.occupiedSlots || []);
    } catch (error) {
        if (requestId !== lastDateRequestId) {
            return;
        }

        console.error(
            'Помилка завантаження слотів:',
            error
        );

        setHtml(
            'time-slots',
            `
            <div class="col-span-4 text-center text-red-500 py-6 font-medium bg-white rounded-2xl border border-red-100 shadow-convex-sm">
                Не вдалося завантажити час. Спробуйте ще раз.
            </div>
            `
        );
    } finally {
        if (
            requestId === lastDateRequestId &&
            loader
        ) {
            loader.classList.add('hidden');
        }
    }
}

export function selectTime(time, btn) {
    state.selectedTime = time;

    document.querySelectorAll('.time-btn').forEach(button => {
        button.classList.remove(
            'selected-item',
            'shadow-blue-300',
            'border-transparent'
        );
    });

    btn.classList.add(
        'selected-item',
        'shadow-blue-300',
        'border-transparent'
    );

    const buttonText = state.editingBookingId
        ? `Перенести на ${time}`
        : `Записатися на ${time}`;

    showMainButton(buttonText);

    currentSubmitHandler = setMainButtonHandler(
        async () => {
            if (isSubmittingBooking) {
                return;
            }

            isSubmittingBooking = true;

            disableMainButton();

            showMainButtonProgress();

            try {
                const clientName =
                    state.user?.first_name || 'Гість';

                const clientId =
                    state.user?.id?.toString() || '';

                if (!clientId) {
                    throw new Error(
                        'Telegram user не визначений'
                    );
                }

                const response = await submitBookingAPI({
                    action: state.editingBookingId
                        ? 'rescheduleBooking'
                        : 'createBooking',

                    date: state.selectedDate,
                    time: state.selectedTime,

                    masterId: state.selectedMaster.id,

                    clientId,
                    clientName,
                     clientTelegram: state.user?.username || '',
                    clientPhone: state.clientPhone,

                    service: state.selectedService.name,

                    bookingId: state.editingBookingId
                });

                if (response.status === 'success') {
    notifySuccess();

    tg.showAlert(
        state.editingBookingId
            ? 'Запит на перенесення надіслано!'
            : 'Ура! Ти записалася на манікюр 🎉',
        () => {
            if (typeof onBookingSuccessCallback === 'function') {
                onBookingSuccessCallback();
            }
        }
    );
} else {
                    tg.showAlert(
                        'Помилка: ' +
                            (
                                response.message ||
                                'невідома помилка'
                            )
                    );
                }
            } catch (error) {
                console.error(
                    'Помилка створення запису:',
                    error
                );

                tg.showAlert(
                    error.message ||
                    'Не вдалося створити запис.'
                );
            } finally {
                hideMainButtonProgress();

                enableMainButton();

                isSubmittingBooking = false;
            }
        },
        currentSubmitHandler
    );
}
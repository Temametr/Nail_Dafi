import { state, tg } from '../../state.js';

import {
    createBookingAPI,
    fetchOccupiedSlotsAPI
} from '../../api.js';

import {
    loadBookings
} from '../bookings/bookingsLoader.js';

import {
    renderAdminStats
} from '../../admin.js';

const manualState = {
    clientName: '',
    clientPhone: '',
    comment: '',
    selectedService: null,
    selectedMaster: null,
    selectedDate: null,
    selectedTime: null,
    requestId: 0,
    isSubmitting: false
};

function normalizePhone(value) {
    return String(value || '')
        .replace(/[^\d+]/g, '')
        .trim();
}

function cleanPhoneForId(value) {
    return String(value || '')
        .replace(/\D/g, '')
        .trim();
}

function setHtml(id, html) {
    const element = document.getElementById(id);

    if (!element) return;

    element.innerHTML = html;
}

function setText(id, text) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = text;
}

function showManualStep(stepId) {
    document
        .querySelectorAll('.manual-step')
        .forEach(element => element.classList.add('hidden-step'));

    const target = document.getElementById(stepId);

    if (target) {
        target.classList.remove('hidden-step');
    }

    const footer = document.getElementById('manual-booking-footer');

    if (footer) {
        footer.classList.toggle(
            'hidden',
            stepId !== 'manual-step-time' || !manualState.selectedTime
        );
    }
}

function resetManualState() {
    manualState.clientName = '';
    manualState.clientPhone = '';
    manualState.comment = '';
    manualState.selectedService = null;
    manualState.selectedMaster = null;
    manualState.selectedDate = null;
    manualState.selectedTime = null;
    manualState.requestId++;
    manualState.isSubmitting = false;
}

function resetManualForm() {
    [
        'manual-booking-name',
        'manual-booking-phone',
        'manual-booking-comment'
    ].forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.value = '';
        }
    });

    setHtml('manual-services-list', '');
    setHtml('manual-masters-list', '');
    setHtml('manual-date-scroll', '');
    setHtml('manual-time-slots', '');
}

function getTodayYmd(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function createDateString(date) {
    return new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString().split('T')[0];
}

function getManualAvailableTimes() {
    const workHours =
        String(manualState.selectedMaster?.workHours || '10:00-20:00');

    const match =
        workHours.match(/(\d{1,2}):?(\d{2})?\s*[-–]\s*(\d{1,2}):?(\d{2})?/);

    let startHour = 10;
    let startMinute = 0;
    let endHour = 20;
    let endMinute = 0;

    if (match) {
        startHour = Number(match[1]) || 10;
        startMinute = Number(match[2]) || 0;
        endHour = Number(match[3]) || 20;
        endMinute = Number(match[4]) || 0;
    }

    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;

    const times = [];

    for (let total = startTotal; total < endTotal; total += 30) {
        const hour = Math.floor(total / 60);
        const minute = total % 60;

        times.push(
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        );
    }

    return times;
}

function isManualWorkDay(dateYmd) {
    const master = manualState.selectedMaster;

    if (!master) return false;

    const date = new Date(dateYmd);
    const day = date.getDay();

    return (master.workDays || []).includes(day);
}

function renderManualServices() {
    setHtml(
        'manual-services-list',
        (state.services || []).map((service, index) => `
            <div
                onclick="window.appAPI.selectManualService('${service.id}')"
                class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 transition-all shadow-convex animate-pop-in border border-white"
                style="animation-delay: ${index * 40}ms"
            >
                <div class="flex items-center gap-4 flex-1 min-w-0 pr-2">
                    <div class="shrink-0 w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 text-2xl border border-blue-100">
                        💅
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="font-extrabold text-slate-950 text-lg leading-tight break-words tracking-tight">
                            ${service.name}
                        </div>

                        <div class="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                            🕒 ${service.duration || 60} хв
                        </div>
                    </div>
                </div>

                <div class="text-slate-950 font-black text-xl whitespace-nowrap">
                    ${service.price || ''} ₴
                </div>
            </div>
        `).join('')
    );
}

function renderManualMasters() {
    setHtml(
        'manual-masters-list',
        (state.masters || []).map((master, index) => `
            <button
                onclick="window.appAPI.selectManualMaster('${master.id}')"
                class="card-convex p-5 w-full text-left active:scale-95 transition-all animate-pop-in"
                style="animation-delay: ${index * 35}ms"
            >
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm">
                        <img
                            src="${index === 1 ? 'media/IMG_0223.jpeg' : 'media/IMG_0222.jpeg'}"
                            class="w-full h-full object-cover object-top"
                            loading="lazy"
                            decoding="async"
                        >
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="text-base font-black text-slate-950 truncate">
                            ${master.name}
                        </div>

                        <div class="text-xs font-semibold text-slate-400 mt-1">
                            ${master.workHours || ''}
                        </div>
                    </div>
                </div>
            </button>
        `).join('')
    );
}

function renderManualCalendar() {
    const days = [];

    for (let i = 0; i < 21; i++) {
        const dateYmd = getTodayYmd(i);
        const date = new Date(dateYmd);
        const isWorkDay = isManualWorkDay(dateYmd);

        const dayName = date.toLocaleDateString('uk-UA', {
            weekday: 'short'
        });

        const dayNumber = date.getDate();

        days.push(`
            <button
                ${isWorkDay ? `onclick="window.appAPI.selectManualDate('${dateYmd}', this)"` : 'disabled'}
                class="manual-date-btn rounded-2xl py-3 text-center border text-xs font-black transition-all ${
                    isWorkDay
                        ? 'bg-white text-slate-700 border-white shadow-sm active:scale-95'
                        : 'bg-slate-100 text-slate-300 border-slate-100 opacity-60'
                }"
            >
                <div class="uppercase text-[9px] opacity-60">
                    ${dayName}
                </div>
                <div class="text-base mt-1">
                    ${dayNumber}
                </div>
            </button>
        `);
    }

    setHtml('manual-date-scroll', days.join(''));
}

function renderManualTimeSlots(occupiedSlots = []) {
    const occupied = new Set(occupiedSlots || []);
    const times = getManualAvailableTimes();

    const now = new Date();
    const todayStr = createDateString(now);

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const requiredBlocks = Math.ceil(
        (manualState.selectedService?.duration || 30) / 30
    );

    let availableCount = 0;

    if (!times.length) {
        setHtml(
            'manual-time-slots',
            `
            <div class="col-span-4 text-center text-slate-400 py-6 font-medium bg-white rounded-2xl">
                Немає доступного часу
            </div>
            `
        );
        return;
    }

    setHtml(
        'manual-time-slots',
        times.map((time, index) => {
            let available = true;

            if (index + requiredBlocks > times.length) {
                available = false;
            } else {
                for (let i = 0; i < requiredBlocks; i++) {
                    if (occupied.has(times[index + i])) {
                        available = false;
                        break;
                    }
                }
            }

            if (available && manualState.selectedDate === todayStr) {
                const [hour, minute] = time.split(':').map(Number);

                if (
                    hour < currentHour ||
                    (hour === currentHour && minute <= currentMinute)
                ) {
                    available = false;
                }
            }

            if (available) {
                availableCount++;
            }

            return available
                ? `
                    <button
                        onclick="window.appAPI.selectManualTime('${time}', this)"
                        class="manual-time-btn card-convex-sm shadow-convex-sm py-3.5 bg-white text-slate-950 text-[13px] font-black active:scale-90 transition-all duration-300 animate-pop-in"
                        style="animation-delay: ${index * 10}ms"
                    >
                        ${time}
                    </button>
                `
                : `
                    <button
                        disabled
                        class="py-3.5 rounded-xl bg-slate-100 text-slate-300 line-through text-[13px] font-bold cursor-not-allowed border border-slate-200"
                    >
                        ${time}
                    </button>
                `;
        }).join('')
    );

    if (availableCount === 0) {
        setHtml(
            'manual-time-slots',
            `
            <div class="col-span-4 text-center text-slate-500 py-6 font-medium bg-white rounded-2xl border border-slate-100 shadow-convex-sm">
                На жаль, вільного часу немає 😔
            </div>
            `
        );
    }
}

export function openManualBookingModal() {
    const modal = document.getElementById('manual-booking-modal');

    if (!modal) return;

    resetManualState();
    resetManualForm();

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    showManualStep('manual-step-client');
}

export function closeManualBookingModal() {
    const modal = document.getElementById('manual-booking-modal');

    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');

    resetManualState();
}

export function manualBookingNextFromClient() {
    const name = String(
        document.getElementById('manual-booking-name')?.value || ''
    ).trim();

    const phone = normalizePhone(
        document.getElementById('manual-booking-phone')?.value
    );

    const comment = String(
        document.getElementById('manual-booking-comment')?.value || ''
    ).trim();

    if (!name) {
        return tg.showAlert('Введіть імʼя клієнта');
    }

    if (!phone || phone.length < 10) {
        return tg.showAlert('Введіть коректний номер телефону');
    }

    manualState.clientName = name;
    manualState.clientPhone = phone;
    manualState.comment = comment;

    renderManualServices();
    showManualStep('manual-step-service');
}

export function selectManualService(serviceId) {
    manualState.selectedService = (state.services || []).find(
        service => String(service.id) === String(serviceId)
    );

    if (!manualState.selectedService) {
        return tg.showAlert('Послугу не знайдено');
    }

    renderManualMasters();
    showManualStep('manual-step-master');
}

export function selectManualMaster(masterId) {
    manualState.selectedMaster = (state.masters || []).find(
        master => String(master.id) === String(masterId)
    );

    if (!manualState.selectedMaster) {
        return tg.showAlert('Майстра не знайдено');
    }

    manualState.selectedDate = null;
    manualState.selectedTime = null;
    manualState.requestId++;

    renderManualCalendar();
    showManualStep('manual-step-date');
}

export async function selectManualDate(dateYmd, button) {
    const requestId = ++manualState.requestId;

    manualState.selectedDate = dateYmd;
    manualState.selectedTime = null;

    document.querySelectorAll('.manual-date-btn').forEach(item => {
        item.classList.remove('selected-item');
    });

    if (button) {
        button.classList.add('selected-item');
    }

    const date = new Date(dateYmd);

    setText(
        'manual-time-step-title',
        `Час на ${date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long'
        })}`
    );

    showManualStep('manual-step-time');

    const loader = document.getElementById('manual-time-loader');

    if (loader) {
        loader.classList.remove('hidden');
    }

    setHtml('manual-time-slots', '');

    try {
        const data = await fetchOccupiedSlotsAPI(
            dateYmd,
            manualState.selectedMaster.id,
            ''
        );

        if (requestId !== manualState.requestId) {
            return;
        }

        renderManualTimeSlots(data.occupiedSlots || []);

    } catch (error) {
        setHtml(
            'manual-time-slots',
            `
            <div class="col-span-4 text-center text-red-500 py-6 font-medium bg-white rounded-2xl border border-red-100">
                Не вдалося завантажити час
            </div>
            `
        );

    } finally {
        if (requestId === manualState.requestId && loader) {
            loader.classList.add('hidden');
        }
    }
}

export function selectManualTime(time, button) {
    manualState.selectedTime = time;

    document.querySelectorAll('.manual-time-btn').forEach(item => {
        item.classList.remove('selected-item');
    });

    if (button) {
        button.classList.add('selected-item');
    }

    const footer = document.getElementById('manual-booking-footer');

    if (footer) {
        footer.classList.remove('hidden');
    }
}

export async function createManualBooking() {
    if (manualState.isSubmitting) return;

    if (
        !manualState.clientName ||
        !manualState.clientPhone ||
        !manualState.selectedService ||
        !manualState.selectedMaster ||
        !manualState.selectedDate ||
        !manualState.selectedTime
    ) {
        return tg.showAlert('Заповніть всі дані запису');
    }

    const button = document.getElementById('manual-booking-submit');

    const manualClientId =
        `MANUAL-${cleanPhoneForId(manualState.clientPhone)}`;

    try {
        manualState.isSubmitting = true;

        if (button) {
            button.disabled = true;
            button.textContent = 'Створюємо...';
        }

        const response = await createBookingAPI({
    createdByRole: 'admin',
    clientId: manualClientId,
    clientName: manualState.clientName,
    clientPhone: manualState.clientPhone,
    masterId: manualState.selectedMaster.id,
    service: manualState.selectedService.name,
    date: manualState.selectedDate,
    time: manualState.selectedTime,
    comment: manualState.comment
});

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося створити запис');
        }

        await loadBookings('admin', true);

        renderAdminStats(state.adminStatsPeriod || 'today');

        closeManualBookingModal();

        tg.showAlert('Запис створено ✅');

    } catch (error) {
        tg.showAlert(error.message || 'Помилка створення запису');

    } finally {
        manualState.isSubmitting = false;

        if (button) {
            button.disabled = false;
            button.textContent = 'Створити запис';
        }
    }
}
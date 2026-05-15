import { state } from '../state.js';

const monthNames = [
    'Січень',
    'Лютий',
    'Березень',
    'Квітень',
    'Травень',
    'Червень',
    'Липень',
    'Серпень',
    'Вересень',
    'Жовтень',
    'Листопад',
    'Грудень'
];

const dayLabels = [
    'Пн',
    'Вт',
    'Ср',
    'Чт',
    'Пт',
    'Сб',
    'Нд'
];

function createDateString(date) {
    return new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString().split('T')[0];
}

function isWorkingDay(dayOfWeek) {
    return (
        dayOfWeek !== 1 &&
        state.selectedMaster &&
        state.selectedMaster.workDays.includes(dayOfWeek)
    );
}

function isPastDate(date) {
    return date < new Date().setHours(0, 0, 0, 0);
}

export function renderCalendar() {
    const container = document.getElementById('date-scroll');

    if (!container) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const maxMonthOffset = 11 - currentMonth;

    if (
        state.calendarMonthOffset === undefined ||
        state.calendarMonthOffset === null
    ) {
        state.calendarMonthOffset = 0;
    }

    state.calendarMonthOffset = Math.max(
        0,
        Math.min(maxMonthOffset, Number(state.calendarMonthOffset) || 0)
    );

    const firstOfMonth = new Date(
        currentYear,
        currentMonth + state.calendarMonthOffset,
        1
    );

    let html = '';

    html += `
    <div class="calendar-month-toolbar">
        <button
            id="calendar-arrow-left"
            type="button"
            onclick="window.appAPI.moveCalendarMonth(-1)"
            class="calendar-month-arrow"
            aria-label="Попередній місяць"
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M15 19l-7-7 7-7"
                ></path>
            </svg>
        </button>

        <div class="calendar-month-title">
            <span class="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                ${monthNames[firstOfMonth.getMonth()]} ${firstOfMonth.getFullYear()}
            </span>
        </div>

        <button
            id="calendar-arrow-right"
            type="button"
            onclick="window.appAPI.moveCalendarMonth(1)"
            class="calendar-month-arrow"
            aria-label="Наступний місяць"
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M9 5l7 7-7 7"
                ></path>
            </svg>
        </button>
    </div>
`;

    dayLabels.forEach(label => {
        html += `
            <div class="text-[9px] font-black text-rose-400 text-center pb-2 uppercase">
                ${label}
            </div>
        `;
    });

    const firstDayIdx = firstOfMonth.getDay();

    const offset = firstDayIdx === 0
        ? 6
        : firstDayIdx - 1;

    for (let i = 0; i < offset; i++) {
        html += `<div class="w-full aspect-square"></div>`;
    }

    const lastDay = new Date(
        firstOfMonth.getFullYear(),
        firstOfMonth.getMonth() + 1,
        0
    ).getDate();

    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(
            firstOfMonth.getFullYear(),
            firstOfMonth.getMonth(),
            day
        );

        const dayOfWeek = date.getDay();

        const canBook =
            !isPastDate(date) &&
            isWorkingDay(dayOfWeek);

        const dateString = createDateString(date);
        const isSelected =
            state.selectedDate === dateString;

        if (canBook) {
            html += `
                <button
                    onclick="window.appAPI.selectDate('${dateString}', this)"
                    class="date-btn w-full aspect-square rounded-xl bg-white text-slate-950 flex items-center justify-center transition-all shadow-sm border border-slate-100 active:scale-90 ${isSelected ? 'selected-item shadow-blue-300 border-transparent' : ''}"
                >
                    <span class="text-[15px] font-black">${day}</span>
                </button>
            `;
        } else {
            html += `
                <div class="w-full aspect-square rounded-xl flex items-center justify-center bg-rose-100/80 text-rose-500 border border-rose-200/80">
                    <span class="text-[15px] font-black">${day}</span>
                </div>
            `;
        }
    }

    container.innerHTML = html;

    updateCalendarArrows(maxMonthOffset);
}

function updateCalendarArrows(maxMonthOffset) {
    const left = document.getElementById('calendar-arrow-left');
    const right = document.getElementById('calendar-arrow-right');

    const offset = Number(state.calendarMonthOffset) || 0;

    if (left) {
        left.classList.toggle(
            'is-hidden',
            offset <= 0
        );
    }

    if (right) {
        right.classList.toggle(
            'is-hidden',
            offset >= maxMonthOffset
        );
    }
}

export function moveCalendarMonth(direction) {
    const now = new Date();
    const maxMonthOffset = 11 - now.getMonth();

    const currentOffset =
        Number(state.calendarMonthOffset) || 0;

    const nextOffset = Math.max(
        0,
        Math.min(
            maxMonthOffset,
            currentOffset + Number(direction || 0)
        )
    );

    if (nextOffset === currentOffset) {
        updateCalendarArrows(maxMonthOffset);
        return;
    }

    state.calendarMonthOffset = nextOffset;

    renderCalendar();
}

export function renderTimeSlots(occupiedSlots = []) {
    const container = document.getElementById('time-slots');

    if (!container) return;

    const slots = [];

    for (let hour = 10; hour <= 19; hour++) {
        slots.push(`${hour}:00`);
        slots.push(`${hour}:30`);
    }

    const now = new Date();

    const todayStr = createDateString(now);

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const requiredBlocks = Math.ceil(
        (state.selectedService?.duration || 30) / 30
    );

    let availableCount = 0;

    container.innerHTML = slots.map((time, index) => {
        let available = true;

        if (index + requiredBlocks > slots.length) {
            available = false;
        } else {
            for (let i = 0; i < requiredBlocks; i++) {
                if (occupiedSlots.includes(slots[index + i])) {
                    available = false;
                    break;
                }
            }
        }

        if (available && state.selectedDate === todayStr) {
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
                    onclick="window.appAPI.selectTime('${time}', this)"
                    class="time-btn card-convex-sm shadow-convex-sm py-3.5 bg-white text-slate-950 text-[13px] font-black active:scale-90 transition-all duration-300 animate-pop-in"
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
    }).join('');

    if (availableCount === 0) {
        container.innerHTML = `
            <div class="col-span-4 text-center text-slate-500 py-6 font-medium bg-white rounded-2xl border border-slate-100 shadow-convex-sm">
                На жаль, вільного часу немає 😔
            </div>
        `;
    }
}
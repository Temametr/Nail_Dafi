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

    container.innerHTML = '';

    const now = new Date();

    const monthsToShow = [
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 1)
    ];

    let html = '';

    monthsToShow.forEach(firstOfMonth => {
        html += `
            <div class="col-span-7 text-center text-[11px] font-black text-slate-800 mt-4 mb-2 uppercase tracking-[0.2em] bg-white/50 py-2 rounded-xl border border-white/60 shadow-sm">
                ${monthNames[firstOfMonth.getMonth()]} ${firstOfMonth.getFullYear()}
            </div>
        `;

        dayLabels.forEach(label => {
            html += `
                <div class="text-[9px] font-bold text-rose-300 text-center pb-2 uppercase">
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

            if (canBook) {
                html += `
                    <button
                        onclick="window.appAPI.selectDate('${createDateString(date)}', this)"
                        class="date-btn w-full aspect-square rounded-xl bg-white text-slate-950 flex items-center justify-center transition-all shadow-sm border border-slate-100 active:scale-90"
                    >
                        <span class="text-[15px] font-black">${day}</span>
                    </button>
                `;
            } else {
                html += `
                    <div class="w-full aspect-square rounded-xl flex items-center justify-center text-slate-300 opacity-40">
                        <span class="text-[15px] font-bold">${day}</span>
                    </div>
                `;
            }
        }
    });

    container.innerHTML = html;
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
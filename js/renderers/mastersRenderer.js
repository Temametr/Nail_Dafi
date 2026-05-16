import { state } from '../state.js';
import { sanitizeHtml } from '../utils.js';

function getMasterImage(index) {
    return index === 0
        ? 'media/IMG_0222.jpeg'
        : 'media/IMG_0223.jpeg';
}

function cleanMasterName(name) {
    return sanitizeHtml(
        String(name || '')
            .replace(/^(Майстер|Мастер)\s+/i, '')
            .trim()
    );
}

function formatMasterWorkDays(workDays) {
    const daysMap = {
        0: 'Нд',
        1: 'Пн',
        2: 'Вт',
        3: 'Ср',
        4: 'Чт',
        5: 'Пт',
        6: 'Сб'
    };

    const days = Array.isArray(workDays)
        ? workDays
        : String(workDays || '')
            .match(/\d+/g)
            ?.map(Number) || [];

    const uniqueDays = [...new Set(days)]
        .filter(day => daysMap[day] !== undefined)
        .sort((a, b) => a - b);

    if (!uniqueDays.length) {
        return 'Дні не вказані';
    }

    return uniqueDays
        .map(day => daysMap[day])
        .join(', ');
}

export function renderHomeMasters() {
    const list = document.getElementById('home-masters-list');

    if (!list) return;

    const reversedMasters = [...state.masters].reverse();

    list.innerHTML = reversedMasters.map((master, index) => {
        const originalIndex = state.masters.indexOf(master);

        return `
            <div
                onclick="window.appAPI.openMasterProfile('${master.id}')"
                class="cursor-pointer relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-convex animate-pop-in border-2 border-white/60"
                style="animation-delay: ${index * 50}ms"
            >
                <img
                    src="${getMasterImage(originalIndex)}"
                    alt="${cleanMasterName(master.name)}"
                     loading="lazy"
                     decoding="async"
                    class="absolute inset-0 w-full h-full object-cover object-top"
                >

                <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-rose-950/60 via-rose-900/20 to-transparent"></div>

                <div class="absolute bottom-2.5 left-2.5 right-2.5 bg-white/85 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-white/60 text-center flex flex-col justify-center items-center">
                    <h3 class="font-black text-slate-900 text-sm tracking-tight leading-none mb-1 truncate w-full">
                        ${cleanMasterName(master.name)}
                    </h3>

                    <p class="text-[8px] font-bold text-rose-500 uppercase tracking-widest">
                        Топ-майстер
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

export function renderMasters() {
    const list = document.getElementById('masters-list');

    if (!list) return;

    list.innerHTML = state.masters.map((master, index) => {
        return `
            <button
                type="button"
                onclick="window.appAPI.selectMaster('${master.id}')"
                class="cursor-pointer relative w-full aspect-[2/3] rounded-3xl overflow-hidden shadow-convex animate-pop-in border-2 border-white/70 active:scale-[0.98] transition-all text-left"
                style="animation-delay: ${index * 45}ms"
            >
                <img
                    src="${getMasterImage(index)}"
                    alt="${cleanMasterName(master.name)}"
                    loading="lazy"
                    decoding="async"
                    class="absolute inset-0 w-full h-full object-cover object-top"
                >

                <div class="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-slate-950/70 via-slate-950/24 to-transparent"></div>

                <div class="absolute bottom-2.5 left-2.5 right-2.5 bg-white/88 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-white/70">
                    <div class="text-center">
                        <h3 class="font-white text-slate-950 text-sm tracking-tight leading-tight truncate">
                            ${cleanMasterName(master.name)}
                        </h3>

                    </div>

                    <div class="mt-2 rounded-xl bg-slate-50/90 border border-slate-100 px-2.5 py-2 text-center space-y-1">
    <div class="text-[8px] font-bold text-slate-500 leading-tight truncate">
        <span class="text-slate-400">Графік:</span>
        ${sanitizeHtml(master.workHours || 'Не вказано')}
    </div>

    <div class="text-[8px] font-bold text-slate-500 leading-tight truncate">
        <span class="text-slate-400">Дні:</span>
        ${sanitizeHtml(formatMasterWorkDays(master.workDays))}
    </div>
</div>
                </div>
            </button>
        `;
    }).join('');
}
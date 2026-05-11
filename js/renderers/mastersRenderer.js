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
            <div
                onclick="window.appAPI.selectMaster('${master.id}')"
                class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 shadow-convex animate-pop-in border border-white"
                style="animation-delay: ${index * 40}ms"
            >
                <div class="flex items-center gap-4 flex-1">
                    <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm">
                        <img
                            src="${getMasterImage(index)}"
                            class="w-full h-full object-cover object-top"
                        >
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="font-extrabold text-slate-950 text-lg truncate">
                            ${cleanMasterName(master.name)}
                        </div>

                        <div class="text-[10px] font-bold text-slate-500 mt-1">
                            Графік: ${sanitizeHtml(master.workHours)}
                        </div>
                    </div>
                </div>

                <div class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                    ➡️
                </div>
            </div>
        `;
    }).join('');
}
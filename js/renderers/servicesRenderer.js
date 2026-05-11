import { state } from '../state.js';
import { sanitizeHtml } from '../utils.js';

export function renderServices() {
    const list = document.getElementById('services-list');

    if (!list) return;

    list.innerHTML = state.services.map((service, index) => {
        const name = sanitizeHtml(service.name);
        const price = sanitizeHtml(service.price);
        const duration = sanitizeHtml(service.duration);

        return `
            <div
                onclick="window.appAPI.selectService('${service.id}')"
                class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 transition-all shadow-convex animate-pop-in border border-white"
                style="animation-delay: ${index * 40}ms"
            >
                <div class="flex items-center gap-4 flex-1 min-w-0 pr-2">
                    <div class="shrink-0 w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 text-2xl border border-blue-100">
                        💅
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="font-extrabold text-slate-950 text-lg leading-tight break-words tracking-tight">
                            ${name}
                        </div>

                        <div class="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                            🕒 ${duration} хв
                        </div>
                    </div>
                </div>

                <div class="text-slate-950 font-black text-xl whitespace-nowrap">
                    ${price} ₴
                </div>
            </div>
        `;
    }).join('');
}
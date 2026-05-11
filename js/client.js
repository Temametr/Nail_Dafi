import { state } from './state.js';

import { renderServices } from './renderers/servicesRenderer.js';
import { renderClientBookings } from './renderers/clientBookingsRenderer.js';

import {
    renderHomeMasters,
    renderMasters
} from './renderers/mastersRenderer.js';

import {
    renderCalendar,
    renderTimeSlots
} from './renderers/calendarRenderer.js';

export {
    renderServices,
    renderClientBookings,
    renderHomeMasters,
    renderMasters,
    renderCalendar,
    renderTimeSlots
};

export function renderUserProfile() {
    const container = document.getElementById('tab-profile');

    if (!container) return;

    const user = state.user || {};
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Гість';
    const initial = fullName.charAt(0).toUpperCase();

    container.innerHTML = `
        <h3 class="font-bold text-xs px-2 text-rose-400 uppercase tracking-[0.15em] mb-4 text-center">
            Особисті дані
        </h3>

        <div class="card-convex p-6 flex flex-col items-center text-center mx-1 animate-pop-in">
            <div class="relative w-24 h-24 mb-4 bg-blue-50 rounded-full border border-blue-100 flex items-center justify-center text-4xl font-black text-blue-500 shadow-inner">
                ${
                    user.photo_url
                        ? `<img src="${user.photo_url}" class="w-full h-full rounded-full object-cover">`
                        : initial
                }

                ${
                    user.is_premium
                        ? `<div class="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm text-[12px]">⭐</div>`
                        : ''
                }
            </div>

            <div class="font-extrabold text-slate-950 text-2xl tracking-tight mb-1">
                ${fullName}
            </div>

            ${
                user.username
                    ? `<div class="text-sm font-bold text-blue-500 mb-3">@${user.username}</div>`
                    : ''
            }

            <div class="text-[10px] font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                Telegram ID: ${user.id || '---'}
            </div>
        </div>

        <p class="text-center text-[10px] font-bold text-slate-400 mt-12 uppercase tracking-widest">
            NailBar Dafi v1.3
        </p>
    `;
}

export function renderMessagesTab() {
    const container = document.getElementById('tab-messages');

    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in-up">
            <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner border border-blue-100">
                💬
            </div>

            <h2 class="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                Розділ чатів
            </h2>

            <p class="text-slate-500 font-medium leading-relaxed mb-8">
                Ми працюємо над тим, щоб ви могли спілкуватися з майстрами прямо в додатку!
            </p>

            <div class="inline-block px-6 py-3 bg-blue-500/10 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest">
                Незабаром з'явиться
            </div>
        </div>
    `;
}
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

function ensureMasterProfileModalMounted() {
    if (document.getElementById('master-profile-modal')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="master-profile-modal" class="fixed inset-0 bg-rose-50 z-[80] hidden flex-col w-full max-w-md mx-auto h-[100dvh] overflow-hidden">

            <div class="flex-1 overflow-y-auto hide-scrollbar pb-32">
                <div class="w-full aspect-[3/4] shrink-0 relative">
                    <img
                        id="mp-image"
                        src=""
                        alt="Master"
                        class="w-full h-full object-cover object-top"
                        loading="lazy"
                        decoding="async"
                    >
                    <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-rose-50 via-rose-50/80 to-transparent"></div>
                </div>

                <div class="px-6 -mt-10 relative z-10">
                    <h2 id="mp-name" class="text-3xl font-black text-slate-900 tracking-tight leading-none"></h2>

                    <p class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-2 mb-6">
                        Топ-майстер
                    </p>

                    <a id="mp-phone-link" href="#" class="card-convex p-4 mb-5 flex items-center gap-4 active:scale-95 transition-all">
                        <div class="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center border border-green-100 shrink-0 text-lg shadow-inner">
                            📞
                        </div>

                        <div>
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                Телефон
                            </div>

                            <div id="mp-phone" class="text-sm font-extrabold text-slate-900 mt-0.5"></div>
                        </div>
                    </a>

                    <div class="card-convex p-5">
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                            Про майстра
                        </h4>

                        <p id="mp-description" class="text-sm font-medium text-slate-600 leading-relaxed"></p>
                    </div>
                </div>
            </div>

            <div class="absolute bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-slate-100 pb-8 z-20">
                <button
                    onclick="window.appAPI.bookFromProfile()"
                    class="w-full py-4 bg-blue-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                >
                    ЗАПИСАТИСЯ ДО МАЙСТРА
                </button>
            </div>
        </div>
    `);
}

export function openMasterProfile(id) {
    try {
        ensureMasterProfileModalMounted();

        state.viewedMasterId = id;

        const master = state.masters.find(
            item => item.id.toString() === id.toString()
        );

        if (!master) {
            return;
        }

        const originalIndex = state.masters.indexOf(master);

const image = document.getElementById('mp-image');
const name = document.getElementById('mp-name');
const phoneText = document.getElementById('mp-phone');
const phoneLink = document.getElementById('mp-phone-link');
const description = document.getElementById('mp-description');

if (image) {
    image.src =
        originalIndex === 0
            ? 'media/IMG_0222.jpeg'
            : 'media/IMG_0223.jpeg';
}

if (name) {
    name.innerText = master.name
        .replace(/^(Майстер|Мастер)\s+/i, '')
        .trim();
}

const phone = master.phone
    ? String(master.phone)
    : null;

if (phoneText) {
    phoneText.innerText = phone || 'Не вказано';
}

if (phoneLink) {
    phoneLink.href = phone
        ? `tel:${phone.replace(/[^0-9+]/g, '')}`
        : '#';
}

if (description) {
    description.innerText =
        master.about ||
        'Найкращий майстер нашого салону!';
}

        const modal = document.getElementById('master-profile-modal');

if (!modal) {
    return;
}

modal.classList.remove('hidden');
modal.classList.add('flex');

        showBackButton();
    } catch (error) {
        console.error(
            'Помилка профілю майстра:',
            error
        );
    }
}

export function closeMasterProfile() {
    const modal = document.getElementById('master-profile-modal');

    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

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

    const modal = document.getElementById('master-profile-modal');

if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

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
import { state } from '../state.js';
import { sanitizeHtml } from '../utils.js';

let serviceFocusTimer = null;

function setFocusedService(serviceId) {
    state.focusedServiceId = serviceId;

    document
        .querySelectorAll('.booking-service-card')
        .forEach(card => {
            card.classList.toggle(
                'is-focused',
                String(card.dataset.serviceId) === String(serviceId)
            );
        });
}

function getClosestServiceToCenter(container) {
    const cards = Array.from(
        container.querySelectorAll('.booking-service-card')
    );

    if (!cards.length) return null;

    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;

    let closest = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(centerX - cardCenterX);

        if (distance < closestDistance) {
            closestDistance = distance;
            closest = card;
        }
    });

    return closest;
}

function updateFocusedServiceFromScroll(container) {
    const closest = getClosestServiceToCenter(container);

    if (!closest) return;

    setFocusedService(closest.dataset.serviceId);
}

export function renderServices() {
    const list = document.getElementById('services-list');

    if (!list) return;

    if (!state.services.length) {
        list.innerHTML = `
            <div class="px-6 text-center text-sm font-bold text-slate-400 py-12">
                Послуги поки не завантажені.
            </div>
        `;
        return;
    }

    if (!state.focusedServiceId) {
        state.focusedServiceId = state.services[0].id;
    }

    list.innerHTML = state.services.map((service, index) => {
        const name = sanitizeHtml(service.name);
        const price = sanitizeHtml(service.price);
        const duration = sanitizeHtml(service.duration);
        const isFocused =
            String(state.focusedServiceId) === String(service.id);

        return `
            <button
                type="button"
                data-service-id="${sanitizeHtml(service.id)}"
                onclick="window.appAPI.focusService('${sanitizeHtml(service.id)}')"
                class="booking-service-card ${isFocused ? 'is-focused' : ''} card-convex p-5 flex flex-col justify-between text-left border border-white animate-pop-in"
                style="animation-delay: ${index * 45}ms"
            >
                <div>
                    <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl border border-blue-100 shadow-inner">
                        💅
                    </div>

                    <div class="font-black text-slate-950 text-lg leading-tight tracking-tight mt-5">
                        ${name}
                    </div>

                    <div class="text-xs font-bold text-slate-400 mt-2">
                        🕒 ${duration} хв
                    </div>
                </div>

                <div class="flex items-end justify-between gap-3">
                    <div class="text-2xl font-black text-slate-950">
                        ${price} ₴
                    </div>

                    <div class="w-9 h-9 rounded-full bg-slate-950 text-white flex items-center justify-center text-sm">
                        ✓
                    </div>
                </div>
            </button>
        `;
    }).join('');

    requestAnimationFrame(() => {
        const activeCard = list.querySelector(
            `[data-service-id="${state.focusedServiceId}"]`
        );

        if (activeCard) {
            activeCard.scrollIntoView({
                behavior: 'instant',
                inline: 'center',
                block: 'nearest'
            });
        }

        updateFocusedServiceFromScroll(list);
    });

    list.onscroll = () => {
        clearTimeout(serviceFocusTimer);

        serviceFocusTimer = setTimeout(() => {
            updateFocusedServiceFromScroll(list);
        }, 80);
    };
}

export function focusService(serviceId) {
    const list = document.getElementById('services-list');

    state.focusedServiceId = serviceId;

    const card = list
        ? list.querySelector(`[data-service-id="${serviceId}"]`)
        : null;

    if (card) {
        card.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest'
        });
    }

    setFocusedService(serviceId);
}
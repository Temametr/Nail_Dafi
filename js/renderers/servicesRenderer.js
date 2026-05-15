import { state } from '../state.js';
import { sanitizeHtml } from '../utils.js';

let serviceFocusTimer = null;

function setFocusedService(serviceId) {
    state.focusedServiceId = serviceId;

    const cards = Array.from(
        document.querySelectorAll('.booking-service-card')
    );

    const focusedIndex = cards.findIndex(card =>
        String(card.dataset.serviceId) === String(serviceId)
    );

    cards.forEach((card, index) => {
        const isFocused = index === focusedIndex;
        const distance = index - focusedIndex;

        card.classList.toggle('is-focused', isFocused);
        card.classList.toggle('is-side-left', distance === -1);
        card.classList.toggle('is-side-right', distance === 1);
        card.classList.toggle('is-far', Math.abs(distance) > 1);

        if (isFocused) {
            card.style.transform =
                'translateX(0) translateY(0) scale(1) rotateY(0deg)';
        } else {
            card.style.transform = '';
        }

        const check = card.querySelector('.service-check');

        if (check) {
            check.classList.toggle('hidden', !isFocused);
            check.classList.toggle('flex', isFocused);
        }
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

function applyCoverflowGeometry(container) {
    const cards = Array.from(
        container.querySelectorAll('.booking-service-card')
    );

    if (!cards.length) return;

    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;

    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const rawDistance = (cardCenterX - centerX) / rect.width;
        const clamped = Math.max(-2, Math.min(2, rawDistance));
        const abs = Math.abs(clamped);

        const scale = 1 - Math.min(abs * 0.18, 0.32);
        const translateX = clamped * -42;
        const translateY = abs * 12;
        const rotateY = clamped * -10;
        const blur = Math.min(abs * 4.5, 7);
        const opacity = Math.max(1 - abs * 0.42, 0.18);

        card.style.transform =
            `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotateY(${rotateY}deg)`;

        card.style.filter =
            `blur(${blur}px)`;

        card.style.opacity =
            String(opacity);

        card.style.zIndex =
            String(100 - Math.round(abs * 40));
    });
}

function updateFocusedServiceFromScroll(container) {
    applyCoverflowGeometry(container);

    const closest = getClosestServiceToCenter(container);

    if (!closest) return;

    setFocusedService(closest.dataset.serviceId);
    applyCoverflowGeometry(container);
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
                class="booking-service-card ${isFocused ? 'is-focused' : ''} card-convex p-5 flex flex-col justify-between text-center border border-white"
                style="animation-delay: ${index * 45}ms"
            >
                <div>
                    <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl border border-blue-100 shadow-inner">
                        💅
                    </div>

                    <div class="font-black text-slate-950 text-2xl leading-tight tracking-tight mt-6 text-center">
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

    <div
        class="service-check w-9 h-9 rounded-full bg-slate-950 text-white items-center justify-center text-sm ${isFocused ? 'flex' : 'hidden'}"
    >
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
    const listRect = list.getBoundingClientRect();
    const cardRect = activeCard.getBoundingClientRect();

    const listCenter = listRect.width / 2;
    const cardCenter =
        activeCard.offsetLeft + cardRect.width / 2;

    list.scrollTo({
        left: cardCenter - listCenter,
        behavior: 'auto'
    });
}

        updateFocusedServiceFromScroll(list);
        applyCoverflowGeometry(list);
    });

    list.onscroll = () => {
    applyCoverflowGeometry(list);

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

    if (card && list) {
    const listRect = list.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const listCenter = listRect.width / 2;
    const cardCenter =
        card.offsetLeft + cardRect.width / 2;

    list.scrollTo({
        left: cardCenter - listCenter,
        behavior: 'smooth'
    });
}

    setFocusedService(serviceId);
}
import { state } from '../state.js';
import { sanitizeHtml } from '../utils.js';

let serviceFocusTimer = null;
let coverflowFrame = null;

function setFocusedService(serviceId) {
    if (String(state.focusedServiceId) === String(serviceId)) {
        return;
    }

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

        const scale = 1 - Math.min(abs * 0.14, 0.24);
const translateX = clamped * -34;
const translateY = abs * 8;
const rotateY = clamped * -6;
const blur = Math.min(abs * 1.6, 3);
const opacity = Math.max(1 - abs * 0.28, 0.36);

        const transformValue =
    `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale}) rotateY(${rotateY}deg)`;

const filterValue =
    blur > 0.2 ? `blur(${blur}px)` : 'none';

const opacityValue =
    String(opacity.toFixed(3));

const zIndexValue =
    String(100 - Math.round(abs * 40));

if (card.style.transform !== transformValue) {
    card.style.transform = transformValue;
}

if (card.style.filter !== filterValue) {
    card.style.filter = filterValue;
}

if (card.style.opacity !== opacityValue) {
    card.style.opacity = opacityValue;
}

if (card.style.zIndex !== zIndexValue) {
    card.style.zIndex = zIndexValue;
}
    });
}

function scheduleCoverflowGeometry(container) {
    if (coverflowFrame) {
        cancelAnimationFrame(coverflowFrame);
    }

    coverflowFrame = requestAnimationFrame(() => {
        applyCoverflowGeometry(container);
        coverflowFrame = null;
    });
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
    class="booking-service-card ${isFocused ? 'is-focused' : ''} card-convex p-5 flex flex-col justify-between text-center border border-white"
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

                <div class="flex items-end justify-center gap-3">
    <div class="text-2xl font-black text-slate-950">
        ${price} ₴
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
    scheduleCoverflowGeometry(list);

    clearTimeout(serviceFocusTimer);

    serviceFocusTimer = setTimeout(() => {
        updateFocusedServiceFromScroll(list);
        scheduleCoverflowGeometry(list);
    }, 120);
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
    scheduleCoverflowGeometry(list);
}
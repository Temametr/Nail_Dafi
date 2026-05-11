import { setHtml } from './modalManager.js';

export function renderLoading(containerId, options = {}) {
    const {
        color = 'border-t-blue-500',
        text = 'Завантажуємо дані...'
    } = options;

    setHtml(containerId, `
        <div class="flex flex-col items-center justify-center py-16 animate-pulse">
            <div class="w-12 h-12 border-4 border-slate-100 rounded-full ${color} animate-spin mb-4 shadow-sm"></div>
            <p class="text-slate-400 font-medium text-sm">${text}</p>
        </div>
    `);
}

export function renderError(containerId, message = 'Помилка мережі 🌐') {
    setHtml(
        containerId,
        `<div class="text-center py-12 text-red-500 font-medium">${message}</div>`
    );
}
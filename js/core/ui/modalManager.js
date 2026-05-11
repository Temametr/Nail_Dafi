import {
    getById
} from './dom.js';

export function showModal(id) {
    const modal = getById(id);

    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function hideModal(id) {
    const modal = getById(id);

    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

export function setInputValue(id, value = '') {
    const input = getById(id);

    if (!input) return;

    input.value = value;
}

export function setText(id, text = '') {
    const element = getById(id);

    if (!element) return;

    element.innerText = text;
}

export function setHtml(id, html = '') {
    const element = getById(id);

    if (!element) return;

    element.innerHTML = html;
}

export function setPlaceholder(id, text = '') {
    const input = getById(id);

    if (!input) return;

    input.placeholder = text;
}

export function getInputValue(id) {
    const input = getById(id);

    if (!input) return '';

    return input.value || '';
}
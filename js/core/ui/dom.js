export function getById(id) {
    return document.getElementById(id);
}

export function query(selector) {
    return document.querySelector(selector);
}

export function queryAll(selector) {
    return document.querySelectorAll(selector);
}

export function addClass(element, ...classes) {
    if (!element) return;

    element.classList.add(...classes);
}

export function removeClass(element, ...classes) {
    if (!element) return;

    element.classList.remove(...classes);
}

export function show(element, displayClass = 'flex') {
    if (!element) return;

    element.classList.remove('hidden');
    element.classList.add(displayClass);
}

export function hide(element, displayClass = 'flex') {
    if (!element) return;

    element.classList.add('hidden');
    element.classList.remove(displayClass);
}

export function showStepElement(element) {
    if (!element) return;

    element.classList.remove('hidden-step');
}

export function hideStepElement(element) {
    if (!element) return;

    element.classList.add('hidden-step');
}
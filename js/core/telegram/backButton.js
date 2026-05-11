import { tg } from '../../state.js';

export function showBackButton() {
    tg.BackButton.show();
}

export function hideBackButton() {
    tg.BackButton.hide();
}

export function setBackButtonHandler(handler) {
    tg.BackButton.onClick(handler);
}
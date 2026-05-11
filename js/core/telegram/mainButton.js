import { tg } from '../../state.js';

export function showMainButton(text) {
    tg.MainButton.text = text;
    tg.MainButton.show();
}

export function hideMainButton() {
    tg.MainButton.hide();
}

export function enableMainButton() {
    tg.MainButton.enable();
}

export function disableMainButton() {
    tg.MainButton.disable();
}

export function showMainButtonProgress() {
    tg.MainButton.showProgress();
}

export function hideMainButtonProgress() {
    tg.MainButton.hideProgress();
}

export function setMainButtonHandler(handler, currentHandler = null) {
    if (currentHandler) {
        tg.MainButton.offClick(currentHandler);
    }

    tg.MainButton.onClick(handler);

    return handler;
}
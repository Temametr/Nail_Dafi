import { tg } from '../../state.js';

import {
    publishWorkPhotosAPI
} from '../../api/bookingsApi.js';

import {
    compressWorkPhotos,
    formatBytes
} from './workPhotoCompressor.js';

let currentBooking = null;
let compressedPhotos = [];
let isPublishing = false;
let previewUrls = [];

function ensureWorkPhotosModalMounted() {
    if (document.getElementById('work-photos-modal')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div
            id="work-photos-modal"
            class="hidden fixed inset-0 z-[120] bg-slate-950/40 backdrop-blur-sm flex items-end justify-center"
        >
            <div class="w-full max-w-md bg-rose-50 rounded-t-[2.25rem] p-5 pb-8 shadow-2xl animate-pop-in">
                <div class="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-5"></div>

                <div class="flex items-start justify-between gap-4 mb-5">
                    <div class="min-w-0">
                        <div class="text-[11px] font-black text-rose-400 uppercase tracking-[0.2em]">
                            Галерея робіт
                        </div>

                        <h2 class="text-2xl font-black text-slate-950 tracking-tight mt-1">
                            Додати фото роботи
                        </h2>

                        <p
                            id="work-photos-booking-title"
                            class="text-sm font-black text-slate-700 mt-2 truncate"
                        ></p>

                        <p
                            id="work-photos-booking-subtitle"
                            class="text-xs font-bold text-slate-400 mt-1"
                        ></p>
                    </div>

                    <button
                        type="button"
                        onclick="window.appAPI.closeWorkPhotosModal()"
                        class="w-11 h-11 rounded-full bg-white text-slate-500 flex items-center justify-center shadow-sm border border-white active:scale-90 transition-all shrink-0"
                        aria-label="Закрити"
                    >
                        ✕
                    </button>
                </div>

                <label
                    for="work-photos-input"
                    class="block rounded-[2rem] bg-white border border-white shadow-sm p-5 active:scale-[0.98] transition-all cursor-pointer"
                >
                    <div class="w-16 h-16 rounded-[1.4rem] bg-blue-50 text-blue-500 flex items-center justify-center text-3xl border border-blue-100 shadow-inner mx-auto">
                        📸
                    </div>

                    <div class="text-center mt-4">
                        <div class="text-sm font-black text-slate-950">
                            Обрати фото
                        </div>

                        <div class="text-xs font-bold text-slate-400 mt-1">
                            До 5 фото · JPEG 0.8 · 1280px
                        </div>
                    </div>
                </label>

                <input
                    id="work-photos-input"
                    type="file"
                    accept="image/*"
                    multiple
                    class="hidden"
                    onchange="window.appAPI.handleWorkPhotoInputChange(this)"
                >

                <div
                    id="work-photos-preview"
                    class="grid grid-cols-3 gap-2 mt-4"
                ></div>

                <div
                    id="work-photos-status"
                    class="text-center text-[11px] font-bold text-slate-400 mt-4 leading-relaxed"
                >
                    Оберіть від 1 до 5 фото.
                </div>

                <button
                    id="work-photos-publish-button"
                    type="button"
                    onclick="window.appAPI.publishCurrentWorkPhotos()"
                    disabled
                    class="w-full py-4 bg-slate-950 text-white rounded-3xl text-sm font-black shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 mt-5"
                >
                    Оберіть фото
                </button>
            </div>
        </div>
    `);
}

export function openWorkPhotosModal(booking) {
    ensureWorkPhotosModalMounted();

    currentBooking = booking;
    compressedPhotos = [];
    isPublishing = false;

    const modal = document.getElementById('work-photos-modal');

    if (!modal) return;

    modal.classList.remove('hidden');

    resetWorkPhotosModal();

    setWorkPhotosBookingInfo(booking);
}

function revokePreviewUrls() {
    previewUrls.forEach(url => {
        try {
            URL.revokeObjectURL(url);
        } catch (e) {}
    });

    previewUrls = [];
}

export function closeWorkPhotosModal() {
    const modal = document.getElementById('work-photos-modal');

    if (modal) {
        modal.classList.add('hidden');
    }
    
    revokePreviewUrls();

    currentBooking = null;
    compressedPhotos = [];
    isPublishing = false;
}

export async function handleWorkPhotoInputChange(input) {
    try {
        const files = Array.from(input?.files || []);

        if (!files.length) {
            return;
        }

        setWorkPhotosStatus('Оптимізуємо фото...', true);

        compressedPhotos = await compressWorkPhotos(files);

        renderWorkPhotoPreview(files, compressedPhotos);

        const totalSize = compressedPhotos.reduce(
            (sum, photo) => sum + Number(photo.size || 0),
            0
        );

        setWorkPhotosStatus(
            `${compressedPhotos.length} фото готово · ${formatBytes(totalSize)} після оптимізації`,
            false
        );

        updatePublishButton();

    } catch (error) {
        compressedPhotos = [];

        renderWorkPhotoPreview([], []);

        setWorkPhotosStatus(
            error.message || 'Не вдалося обробити фото',
            false
        );

        updatePublishButton();

        tg.showAlert(error.message || 'Не вдалося обробити фото');
    }
}

export async function publishCurrentWorkPhotos() {
    if (isPublishing) return;

    if (!currentBooking) {
        return tg.showAlert('Запис не знайдено');
    }

    if (!compressedPhotos.length) {
        return tg.showAlert('Додайте хоча б одне фото');
    }

    isPublishing = true;
    updatePublishButton('Публікуємо...');

    try {
        const response = await publishWorkPhotosAPI({
            bookingId: currentBooking.id,
            masterId: currentBooking.masterId,
            masterName: currentBooking.masterName || '',
            clientId: currentBooking.clientId || '',
            service: currentBooking.service || '',
            workDate: currentBooking.date || currentBooking.rawDate || '',
            photos: compressedPhotos
        });

        if (response.status !== 'success') {
            throw new Error(response.message || 'Не вдалося опублікувати фото');
        }

        tg.showAlert('Фото роботи опубліковано в галерею ✅');

        closeWorkPhotosModal();

        if (response.postUrl) {
            try {
                tg.openTelegramLink(response.postUrl);
            } catch (e) {}
        }

    } catch (error) {
        console.error('publishCurrentWorkPhotos failed:', error);

        tg.showAlert(
            error.message ||
            'Не вдалося опублікувати фото'
        );

    } finally {
        isPublishing = false;
        updatePublishButton();
    }
}

function resetWorkPhotosModal() {
    const input = document.getElementById('work-photos-input');

    if (input) {
        input.value = '';
    }

    renderWorkPhotoPreview([], []);

    setWorkPhotosStatus(
        'Оберіть від 1 до 5 фото. Ми автоматично стиснемо їх перед публікацією.',
        false
    );

    updatePublishButton();
}

function setWorkPhotosBookingInfo(booking) {
    const title = document.getElementById('work-photos-booking-title');
    const subtitle = document.getElementById('work-photos-booking-subtitle');

    if (title) {
        title.textContent = booking?.service || 'Фото роботи';
    }

    if (subtitle) {
        const master = booking?.masterName || '';
        const date = booking?.date || booking?.rawDate || '';
        const time = booking?.time || '';

        subtitle.textContent = [master, date, time]
            .filter(Boolean)
            .join(' · ');
    }
}

function renderWorkPhotoPreview(files, photos) {
    const container = document.getElementById('work-photos-preview');

    if (!container) return;

    revokePreviewUrls();

    if (!photos.length) {
        container.innerHTML = `
            <div class="col-span-3 rounded-3xl bg-slate-50 border border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                Фото ще не обрані
            </div>
        `;

        return;
    }

    const originalFiles = Array.from(files || []);

    container.innerHTML = photos.map((photo, index) => {
        const file = originalFiles[index];
        const previewUrl = file
    ? URL.createObjectURL(file)
    : '';

if (previewUrl) {
    previewUrls.push(previewUrl);
}

        return `
            <div class="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 border border-white shadow-sm">
                ${
                    previewUrl
                        ? `<img src="${previewUrl}" class="w-full h-full object-cover" loading="lazy">`
                        : `<div class="w-full h-full flex items-center justify-center text-slate-400 text-xs">Фото</div>`
                }

                <div class="absolute left-2 right-2 bottom-2 rounded-2xl bg-white/85 backdrop-blur px-2 py-1 text-[9px] font-black text-slate-700 text-center">
                    ${formatBytes(photo.size)}
                </div>
            </div>
        `;
    }).join('');
}

function setWorkPhotosStatus(text, loading) {
    const status = document.getElementById('work-photos-status');

    if (!status) return;

    status.textContent = text || '';

    status.classList.toggle('text-blue-500', Boolean(loading));
    status.classList.toggle('text-slate-400', !loading);
}

function updatePublishButton(customText) {
    const button = document.getElementById('work-photos-publish-button');

    if (!button) return;

    button.disabled =
        isPublishing ||
        !compressedPhotos.length;

    button.textContent =
        customText ||
        (
            compressedPhotos.length
                ? 'Опублікувати в галерею'
                : 'Оберіть фото'
        );
}
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

export function openWorkPhotosModal(booking) {
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
    

    if (!photos.length) {
        container.innerHTML = `
            <div class="col-span-3 rounded-3xl bg-slate-50 border border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                Фото ще не обрані
            </div>
        `;
        revokePreviewUrls();

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
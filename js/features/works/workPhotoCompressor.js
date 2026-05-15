const MAX_WIDTH = 1280;
const MAX_HEIGHT = 1280;
const JPEG_QUALITY = 0.8;

export async function compressWorkPhotos(files) {
    const list = Array.from(files || []);

    if (!list.length) {
        throw new Error('Додайте хоча б одне фото');
    }

    if (list.length > 5) {
        throw new Error('Можна додати максимум 5 фото');
    }

    const result = [];

    for (const file of list) {
        if (!file.type.startsWith('image/')) {
            throw new Error('Можна завантажувати тільки фото');
        }

        const compressed = await compressImageFile(file);

        result.push(compressed);
    }

    return result;
}

async function compressImageFile(file) {
    const imageDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(imageDataUrl);

    let width = image.width;
    let height = image.height;

    const ratio = Math.min(
        MAX_WIDTH / width,
        MAX_HEIGHT / height,
        1
    );

    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
        canvas.toBlob(
            resolve,
            'image/jpeg',
            JPEG_QUALITY
        );
    });

    if (!blob) {
        throw new Error('Не вдалося стиснути фото');
    }

    const dataUrl = await blobToBase64(blob);

    return {
        name: normalizePhotoName(file.name),
        mimeType: 'image/jpeg',
        size: blob.size,
        base64: dataUrl.split(',')[1]
    };
}

function normalizePhotoName(name) {
    const baseName = String(name || 'work-photo')
        .replace(/\.[^.]+$/, '')
        .replace(/[^\wа-яА-ЯіІїЇєЄґҐ-]+/g, '-')
        .slice(0, 40);

    return `${baseName || 'work-photo'}.jpg`;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = reject;

        image.src = src;
    });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(blob);
    });
}
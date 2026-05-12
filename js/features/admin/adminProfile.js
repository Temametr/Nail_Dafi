import { state, tg } from '../../state.js';

let currentEditField = null;

const FIELD_LABELS = {
    name: 'Імʼя',
    phone: 'Телефон',
    telegram: 'Telegram',
    workHours: 'Графік',
    about: 'Опис'
};

function getAdminMaster() {
    return state.adminMasterInfo || null;
}

function getAdminImage() {
    const master = getAdminMaster();

    if (!master) {
        return 'media/IMG_0222.jpeg';
    }

    const index = state.masters.findIndex(item =>
        String(item.id) === String(master.id)
    );

    return index === 1
        ? 'media/IMG_0223.jpeg'
        : 'media/IMG_0222.jpeg';
}

function cleanMasterName(name) {
    return String(name || 'Майстер')
        .replace(/^(Майстер|Мастер)\s+/i, '')
        .trim();
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = value || '—';
}

export function openAdminProfile() {
    const modal = document.getElementById('admin-profile-modal');

    if (!modal) return;

    renderAdminProfile();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

export function closeAdminProfile() {
    const modal = document.getElementById('admin-profile-modal');

    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

export function renderAdminProfile() {
    const master = getAdminMaster();

    if (!master) {
        return tg.showAlert('Профіль майстра не знайдено');
    }

    const image = document.getElementById('admin-profile-image');

    if (image) {
        image.src = getAdminImage();
    }

    setText(
        'admin-profile-name',
        cleanMasterName(master.name)
    );

    setText(
        'admin-profile-id',
        master.id
    );

    setText(
        'admin-profile-field-name',
        master.name
    );

    setText(
        'admin-profile-field-phone',
        master.phone
    );

    setText(
        'admin-profile-field-telegram',
        master.telegram
            ? '@' + String(master.telegram).replace('@', '')
            : ''
    );

    setText(
        'admin-profile-field-workHours',
        master.workHours
    );

    setText(
        'admin-profile-field-about',
        master.about
    );
}

export function openAdminProfileEdit(field) {
    const master = getAdminMaster();

    if (!master) return;

    currentEditField = field;

    const modal = document.getElementById('admin-profile-edit-modal');
    const title = document.getElementById('admin-profile-edit-title');
    const input = document.getElementById('admin-profile-edit-input');

    if (!modal || !title || !input) return;

    title.textContent =
        `Змінити: ${FIELD_LABELS[field] || 'Поле'}`;

    input.value = master[field] || '';

    if (field === 'telegram' && master.telegram) {
        input.value = '@' + String(master.telegram).replace('@', '');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
        input.focus();
    }, 150);
}

export function closeAdminProfileEdit() {
    const modal = document.getElementById('admin-profile-edit-modal');

    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');

    currentEditField = null;
}

export function saveAdminProfileField() {
    const master = getAdminMaster();
    const input = document.getElementById('admin-profile-edit-input');

    if (!master || !input || !currentEditField) {
        return;
    }

    let value = String(input.value || '').trim();

    if (!value) {
        return tg.showAlert('Поле не може бути порожнім');
    }

    if (currentEditField === 'telegram') {
        value = value.replace('@', '').trim();
    }

    master[currentEditField] = value;

    state.adminMasterInfo = {
        ...state.adminMasterInfo,
        [currentEditField]: value
    };

    const masterIndex = state.masters.findIndex(item =>
        String(item.id) === String(master.id)
    );

    if (masterIndex !== -1) {
        state.masters[masterIndex] = {
            ...state.masters[masterIndex],
            [currentEditField]: value
        };
    }

    renderAdminProfile();
    closeAdminProfileEdit();

    tg.showAlert('Збережено локально ✅\nНаступним кроком підключимо запис у таблицю.');
}
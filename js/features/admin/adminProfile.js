import { state, tg } from '../../state.js';

import {
    updateMasterProfileFieldAPI
} from '../../api.js';

import {
    showBackButton,
    hideBackButton
} from '../../core/telegram/backButton.js';

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

function ensureAdminProfileModalMounted() {
    if (document.getElementById('admin-profile-modal')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="admin-profile-modal" class="fixed inset-0 bg-rose-50 z-[85] hidden flex-col w-full max-w-md mx-auto h-[100dvh] overflow-hidden">

            <div class="flex-1 overflow-y-auto hide-scrollbar pb-32">
                <div class="w-full aspect-[3/4] shrink-0 relative">
                    <img
                        id="admin-profile-image"
                        src="media/IMG_0222.jpeg"
                        alt="Master"
                        class="w-full h-full object-cover object-top"
                        loading="lazy"
                        decoding="async"
                    >
                    <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-rose-50 via-rose-50/80 to-transparent"></div>
                </div>

                <div class="px-6 -mt-10 relative z-10">
                    <div class="mb-6">
                        <h2 id="admin-profile-name" class="text-3xl font-black text-slate-900 tracking-tight leading-none">
                            Майстер
                        </h2>

                        <p class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-2">
                            Профіль майстра
                        </p>
                    </div>

                    <div class="space-y-3">
                        <div class="card-convex p-4 flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                    Ідентифікатор
                                </div>

                                <div id="admin-profile-id" class="text-sm font-extrabold text-slate-900 mt-1 break-all">
                                    —
                                </div>
                            </div>
                        </div>

                        <div class="card-convex p-4 flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                    Імʼя
                                </div>

                                <div id="admin-profile-field-name" class="text-sm font-extrabold text-slate-900 mt-1">
                                    —
                                </div>
                            </div>

                            <button onclick="window.appAPI.openAdminProfileEdit('name')" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                                ✏️
                            </button>
                        </div>

                        <div class="card-convex p-4 flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                    Телефон
                                </div>

                                <div id="admin-profile-field-phone" class="text-sm font-extrabold text-slate-900 mt-1">
                                    —
                                </div>
                            </div>

                            <button onclick="window.appAPI.openAdminProfileEdit('phone')" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                                ✏️
                            </button>
                        </div>

                        <div class="card-convex p-4 flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                    Telegram
                                </div>

                                <div id="admin-profile-field-telegram" class="text-sm font-extrabold text-slate-900 mt-1">
                                    —
                                </div>
                            </div>

                            <button onclick="window.appAPI.openAdminProfileEdit('telegram')" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                                ✏️
                            </button>
                        </div>

                        <div class="card-convex p-4 flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                    Графік
                                </div>

                                <div id="admin-profile-field-workHours" class="text-sm font-extrabold text-slate-900 mt-1">
                                    —
                                </div>
                            </div>

                            <button onclick="window.appAPI.openAdminProfileEdit('workHours')" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                                ✏️
                            </button>
                        </div>

                        <div class="card-convex p-5">
                            <div class="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                        Опис
                                    </div>
                                </div>

                                <button onclick="window.appAPI.openAdminProfileEdit('about')" class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center active:scale-90 transition-all">
                                    ✏️
                                </button>
                            </div>

                            <p id="admin-profile-field-about" class="text-sm font-medium text-slate-600 leading-relaxed">
                                —
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
}

function ensureAdminProfileEditModalMounted() {
    if (document.getElementById('admin-profile-edit-modal')) {
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="admin-profile-edit-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm hidden items-center justify-center p-5 z-[95]">
            <div class="bg-white rounded-[2.5rem] p-7 w-full max-w-sm space-y-5 shadow-floating animate-pop-in">
                <div>
                    <h3 id="admin-profile-edit-title" class="font-black text-xl text-center text-slate-900">
                        Змінити дані
                    </h3>

                    <p id="admin-profile-edit-subtitle" class="text-xs font-medium text-slate-400 text-center mt-2">
                        Оновлення профілю майстра
                    </p>
                </div>

                <textarea
                    id="admin-profile-edit-input"
                    class="w-full p-4 bg-rose-50 border border-rose-100 rounded-2xl outline-none h-32 text-sm placeholder:text-slate-400 resize-none font-medium"
                    placeholder="Введіть нове значення..."
                ></textarea>

                <div class="flex gap-3">
                    <button onclick="window.appAPI.closeAdminProfileEdit()" class="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-600 font-bold active:scale-95 text-sm">
                        Назад
                    </button>

                    <button
                        id="admin-profile-save-button"
                        onclick="window.appAPI.saveAdminProfileField()"
                        class="flex-1 py-4 rounded-2xl bg-slate-950 text-white font-bold shadow-lg active:scale-95 text-sm disabled:opacity-60 disabled:active:scale-100"
                    >
                        Зберегти
                    </button>
                </div>
            </div>
        </div>
    `);
}

export function openAdminProfile() {
    ensureAdminProfileModalMounted();

    const modal = document.getElementById('admin-profile-modal');

    if (!modal) return;

    renderAdminProfile();

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    showBackButton();
}

export function closeAdminProfile() {
    const modal = document.getElementById('admin-profile-modal');

    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    hideBackButton();
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
    ensureAdminProfileEditModalMounted();

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

    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    currentEditField = null;
}

function setProfileSaving(isSaving) {
    const button = document.getElementById('admin-profile-save-button');

    if (!button) return;

    button.disabled = isSaving;
    button.textContent = isSaving
        ? 'Зберігаємо...'
        : 'Зберегти';
}

export async function saveAdminProfileField() {
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
    
    setProfileSaving(true);

    try {
    const response = await updateMasterProfileFieldAPI(
        master.id,
        currentEditField,
        value
    );

    if (response.status !== 'success') {
        throw new Error(response.message || 'Не вдалося зберегти');
    }

    renderAdminProfile();
    closeAdminProfileEdit();

    tg.showAlert('Збережено ✅');

} catch (error) {
    tg.showAlert(error.message || 'Помилка збереження');
} finally {
    setProfileSaving(false);
}
}
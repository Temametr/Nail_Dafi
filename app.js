// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand(); // Расширяем на весь экран

// URL твоего развернутого Google Apps Script (замени на свой!)
const API_URL = "https://script.google.com/macros/s/AKfycbxlQQ5e4FzxLUyAX6OSxfKMdjLqU_1nbfTwMpxC_3Tm-Ga_VvnVScIklojzwdoQ-6VBIw/exec";

// Состояние приложения
let state = {
    user: tg.initDataUnsafe?.user || { id: "12345", first_name: "Тест" }, // Для тестов вне TG
    services: [],
    masters: [],
    selectedService: null,
    selectedMaster: null,
    selectedDate: null,
    selectedTime: null,
    isAdmin: false
};

// Запуск при загрузке страницы
window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('user-name').innerText = state.user.first_name;
    
    // Проверяем, не мастер ли это (ID берем из бэкенда или задаем вручную)
    // В реальности лучше получать isAdmin из getInitialData
    await loadInitialData();
});

/**
 * Загрузка услуг и мастеров из Google Sheets
 */
async function loadInitialData() {
    try {
        const response = await fetch(`${API_URL}?action=getInitData`);
        const data = await response.json();
        
        state.services = data.services;
        state.masters = data.masters;

        // Простая проверка на админа (сравниваем ID из TG с ID мастеров в базе)
        state.isAdmin = state.masters.some(m => m.id.toString() === state.user.id.toString());

        renderApp();
    } catch (e) {
        alert("Ошибка загрузки данных: " + e.message);
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
}

/**
 * Отрисовка интерфейса в зависимости от роли
 */
function renderApp() {
    if (state.isAdmin) {
        document.getElementById('admin-screen').classList.remove('hidden-step');
        loadAdminBookings();
    } else {
        document.getElementById('client-screen').classList.remove('hidden-step');
        renderServices();
    }
}

/**
 * Отрисовка списка услуг
 */
function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map(s => `
        <div onclick="selectService(${s.id})" class="glass p-4 rounded-2xl flex justify-between items-center active:scale-95 transition-all cursor-pointer">
            <div>
                <div class="font-bold">${s.name}</div>
                <div class="text-xs text-slate-500">${s.duration} мин</div>
            </div>
            <div class="text-rose-600 font-bold">${s.price} ₽</div>
        </div>
    `).join('');
}

/**
 * Логика переключения шагов
 */
function showStep(stepId) {
    // Скрываем все шаги внутри клиентского экрана
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    // Показываем нужный
    document.getElementById(stepId).classList.remove('hidden-step');

    // Настройка кнопки BackButton в Telegram
    if (stepId === 'step-booking') {
        tg.BackButton.hide();
    } else {
        tg.BackButton.show();
        tg.BackButton.onClick(() => showStep('step-booking'));
    }
}

/**
 * Выбор услуги и переход к мастерам
 */
function selectService(id) {
    state.selectedService = state.services.find(s => s.id === id);
    renderMasters();
    showStep('step-master');
}

function renderMasters() {
    const list = document.getElementById('masters-list');
    list.innerHTML = state.masters.map(m => `
        <div onclick="selectMaster(${m.id})" class="glass p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all cursor-pointer">
            <div class="w-12 h-12 bg-rose-200 rounded-full flex items-center justify-center font-bold text-rose-600">
                ${m.name.charAt(0)}
            </div>
            <div>
                <div class="font-bold">${m.name}</div>
                <div class="text-xs text-slate-500">Доступен: ${m.workHours}</div>
            </div>
        </div>
    `).join('');
}

// Функции для работы с датами и слотами будут в следующем блоке...

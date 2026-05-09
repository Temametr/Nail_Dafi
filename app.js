// Ініціалізація Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand(); // Розширюємо на весь екран
tg.ready();

// УВАГА: Встав сюди свій URL від Google Apps Script (який закінчується на /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbxlQQ5e4FzxLUyAX6OSxfKMdjLqU_1nbfTwMpxC_3Tm-Ga_VvnVScIklojzwdoQ-6VBIw/exec";

// Глобальний стан додатку
let state = {
    user: tg.initDataUnsafe?.user || { id: "12345", first_name: "Тестовий Користувач" },
    services: [],
    masters: [],
    selectedService: null,
    selectedMaster: null,
    selectedDate: null,
    selectedTime: null,
    isAdmin: false
};

// Запуск при завантаженні сторінки
window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('user-name').innerText = state.user.first_name;
    
    // Налаштування кольору кнопки Telegram під дизайн
    tg.MainButton.color = "#f43f5e"; 
    
    await loadInitialData();
});

/**
 * Завантаження послуг та майстрів з бази
 */
async function loadInitialData() {
    try {
        const response = await fetch(`${API_URL}?action=getInitData`);
        const data = await response.json();
        
        state.services = data.services;
        state.masters = data.masters;

        // Перевіряємо, чи є користувач майстром (адміном)
        state.isAdmin = state.masters.some(m => m.id.toString() === state.user.id.toString());

        renderApp();
    } catch (e) {
        tg.showAlert("Помилка завантаження даних: " + e.message);
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
}

/**
 * Відображення інтерфейсу залежно від ролі
 */
function renderApp() {
    if (state.isAdmin) {
        document.getElementById('admin-screen').classList.remove('hidden-step');
        // loadAdminBookings(); // Цю функцію додамо на наступних етапах для адмінки
        document.getElementById('admin-bookings-list').innerHTML = "<p class='text-slate-500'>Список записів з'явиться тут.</p>";
    } else {
        document.getElementById('client-screen').classList.remove('hidden-step');
        renderServices();
    }
}

/**
 * Навігація по кроках
 */
function showStep(stepId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    document.getElementById(stepId).classList.remove('hidden-step');

    // Керування кнопкою "Назад" від Telegram
    if (stepId === 'step-booking') {
        tg.BackButton.hide();
        tg.MainButton.hide(); // Ховаємо головну кнопку на першому кроці
        state.selectedService = null;
        state.selectedMaster = null;
        state.selectedDate = null;
        state.selectedTime = null;
    } else {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            if (stepId === 'step-master') showStep('step-booking');
            else if (stepId === 'step-datetime') showStep('step-master');
            else showStep('step-booking');
            tg.MainButton.hide();
        });
    }
}

/**
 * КРОК 1: Відображення послуг
 */
function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map(s => `
        <div onclick="selectService(${s.id})" class="glass p-4 rounded-2xl flex justify-between items-center active:scale-95 transition-all cursor-pointer">
            <div>
                <div class="font-bold text-slate-800">${s.name}</div>
                <div class="text-xs text-slate-500">${s.duration} хв</div>
            </div>
            <div class="text-rose-600 font-bold">${s.price} ₴</div>
        </div>
    `).join('');
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id === id);
    renderMasters();
    showStep('step-master');
}

/**
 * КРОК 2: Відображення майстрів
 */
function renderMasters() {
    const list = document.getElementById('masters-list');
    list.innerHTML = state.masters.map(m => `
        <div onclick="selectMaster(${m.id})" class="glass p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all cursor-pointer">
            <div class="w-12 h-12 bg-rose-200 rounded-full flex items-center justify-center font-bold text-rose-600 shadow-sm">
                ${m.name.charAt(0)}
            </div>
            <div>
                <div class="font-bold text-slate-800">${m.name}</div>
                <div class="text-xs text-slate-500">Працює: ${m.workHours}</div>
            </div>
        </div>
    `).join('');
}

function selectMaster(id) {
    state.selectedMaster = state.masters.find(m => m.id === id);
    renderCalendar();
    showStep('step-datetime');
}

/**
 * КРОК 3: Розумний календар (генерація дат)
 */
function renderCalendar() {
    const container = document.getElementById('date-scroll');
    container.innerHTML = '';
    document.getElementById('time-slots').innerHTML = ''; // Очищаємо час
    state.selectedDate = null;
    state.selectedTime = null;
    tg.MainButton.hide();

    const today = new Date();
    let datesHTML = '';

    // Генеруємо наступні 14 днів
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        
        const dayOfWeek = d.getDay(); // 0 - Нд, 1 - Пн ... 6 - Сб
        
        // Бізнес-правило: Пн (1) завжди вихідний + графік конкретного майстра
        const isWorkingDay = dayOfWeek !== 1 && state.selectedMaster.workDays.includes(dayOfWeek);
        
        const dateStr = d.toISOString().split('T')[0]; // Формат YYYY-MM-DD
        const dayNames = ['Нд', 'Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб'];
        const dayName = dayNames[dayOfWeek];
        const dayNum = d.getDate();

        // Якщо день робочий - кнопка активна, якщо ні - сіра і заблокована
        if (isWorkingDay) {
            datesHTML += `
                <button onclick="selectDate('${dateStr}', this)" class="date-btn flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all glass active:scale-95 text-slate-800 border-2 border-transparent">
                    <span class="text-xs uppercase font-medium">${dayName}</span>
                    <span class="text-xl font-bold">${dayNum}</span>
                </button>
            `;
        } else {
            datesHTML += `
                <button disabled class="flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center bg-slate-200 text-slate-400 opacity-60 cursor-not-allowed">
                    <span class="text-xs uppercase">${dayName}</span>
                    <span class="text-xl font-bold">${dayNum}</span>
                </button>
            `;
        }
    }
    container.innerHTML = datesHTML;
}

/**
 * Обробка вибору дати та запит вільних слотів
 */
async function selectDate(dateStr, btnElement) {
    state.selectedDate = dateStr;
    state.selectedTime = null;
    tg.MainButton.hide();

    // Візуально виділяємо обрану дату
    document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('selected-item'));
    btnElement.classList.add('selected-item');

    // Показуємо лоадер часу
    const timeSlotsContainer = document.getElementById('time-slots');
    const timeLoader = document.getElementById('time-loader');
    timeSlotsContainer.innerHTML = '';
    timeLoader.classList.remove('hidden');

    try {
        // Запитуємо у бэкенда зайняті слоти
        const response = await fetch(`${API_URL}?action=getOccupiedSlots&date=${dateStr}&masterId=${state.selectedMaster.id}`);
        const data = await response.json();
        const occupiedSlots = data.occupiedSlots || [];

        renderTimeSlots(occupiedSlots);
    } catch (e) {
        tg.showAlert("Не вдалося завантажити розклад.");
    } finally {
        timeLoader.classList.add('hidden');
    }
}

/**
 * Генерація слотів часу (від 10:00 до 18:00)
 */
function renderTimeSlots(occupiedSlots) {
    const container = document.getElementById('time-slots');
    let timeHTML = '';
    
    // Стандартні слоти часу
    const slots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    slots.forEach(time => {
        // Перевіряємо, чи повернув Google Sheets цей час як зайнятий
        const isOccupied = occupiedSlots.some(occTime => {
            // Форматуємо час з бази (може прийти як повна дата), беремо тільки HH:mm
            const dateObj = new Date(occTime);
            if (!isNaN(dateObj)) {
                const h = dateObj.getUTCHours().toString().padStart(2, '0');
                const m = dateObj.getUTCMinutes().toString().padStart(2, '0');
                return `${h}:${m}` === time;
            }
            return occTime.includes(time); // Запасний варіант, якщо текст
        });

        if (isOccupied) {
            timeHTML += `
                <button disabled class="py-3 rounded-xl bg-slate-200 text-slate-400 line-through text-sm font-semibold cursor-not-allowed">
                    ${time}
                </button>
            `;
        } else {
            timeHTML += `
                <button onclick="selectTime('${time}', this)" class="time-btn py-3 rounded-xl glass text-slate-800 text-sm font-semibold active:scale-95 transition-all border-2 border-transparent">
                    ${time}
                </button>
            `;
        }
    });

    container.innerHTML = timeHTML;
}

/**
 * Вибір часу та активація кнопки Telegram
 */
function selectTime(time, btnElement) {
    state.selectedTime = time;

    // Виділяємо обраний час
    document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('selected-item'));
    btnElement.classList.add('selected-item');

    // Показуємо головну кнопку підтвердження від Telegram
    tg.MainButton.text = `Підтвердити запис на ${time}`;
    tg.MainButton.show();
    tg.MainButton.onClick(submitBooking);
}

/**
 * Відправка даних на бэкенд
 */
async function submitBooking() {
    tg.MainButton.showProgress(); // Анімація завантаження на кнопці

    const bookingData = {
        action: 'createBooking',
        date: state.selectedDate,
        time: state.selectedTime,
        masterId: state.selectedMaster.id,
        clientId: state.user.id.toString(),
        clientName: state.user.first_name,
        service: state.selectedService.name,
        comment: ""
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
        const result = await response.json();

        if (result.status === 'success') {
            tg.showAlert('Супер! Ваш запис успішно створено 🎉', () => {
                tg.close(); // Закриваємо міні-апп після успішного запису
            });
        } else {
            tg.showAlert('Помилка: ' + result.message);
        }
    } catch (e) {
        tg.showAlert('Помилка підключення. Спробуйте ще раз.');
    } finally {
        tg.MainButton.hideProgress();
    }
}

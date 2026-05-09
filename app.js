// ==========================================
// НАЛАШТУВАННЯ ТА СТАН
// ==========================================
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// УВАГА: Встав сюди свій URL від Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbxlQQ5e4FzxLUyAX6OSxfKMdjLqU_1nbfTwMpxC_3Tm-Ga_VvnVScIklojzwdoQ-6VBIw/exec";

let state = {
    user: tg.initDataUnsafe?.user || { id: "12345", first_name: "Тестовий Користувач" },
    services: [],
    masters: [],
    selectedService: null,
    selectedMaster: null,
    selectedDate: null,
    selectedTime: null,
    isAdmin: false,
    adminMasterInfo: null,
    
    clientBookings: [], 
    adminBookings: [],
    
    currentBookingFilter: 'active',
    chartInstance: null
};

let currentCancelBookingId = null;
let pollingInterval = null; 

// ==========================================
// ІНІЦІАЛІЗАЦІЯ
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    tg.MainButton.color = "#f43f5e"; 
    document.getElementById('confirm-cancel-btn').addEventListener('click', confirmCancelAdmin);
    await loadInitialData();
});

async function loadInitialData() {
    try {
        const response = await fetch(`${API_URL}?action=getInitData`);
        const data = await response.json();
        
        state.services = data.services;
        state.masters = data.masters;
        
        const masterData = state.masters.find(m => m.id.toString() === state.user.id.toString());
        if (masterData) {
            state.isAdmin = true;
            state.adminMasterInfo = masterData;
        }

        renderApp();
    } catch (e) {
        tg.showAlert("Помилка завантаження даних.");
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
}

function renderApp() {
    if (state.isAdmin) {
        document.getElementById('admin-screen').classList.remove('hidden-step');
        document.getElementById('admin-bottom-nav').classList.remove('hidden-step');
        
        const cleanName = state.adminMasterInfo.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        document.getElementById('admin-header-name').innerText = cleanName;
        document.getElementById('admin-header-name-2').innerText = cleanName;
        document.getElementById('admin-header-name-3').innerText = cleanName;
        document.getElementById('admin-profile-avatar').innerText = cleanName.charAt(0);
        document.getElementById('admin-profile-name').innerText = cleanName;
        
        switchTab('admin', 'home');
    } else {
        document.getElementById('client-screen').classList.remove('hidden-step');
        document.getElementById('client-bottom-nav').classList.remove('hidden-step'); 
        
        document.getElementById('user-name').innerText = state.user.first_name;
        document.getElementById('profile-avatar').innerText = state.user.first_name.charAt(0);
        document.getElementById('profile-name').innerText = state.user.first_name;
        document.getElementById('profile-id').innerText = `ID: ${state.user.id}`;

        renderServices();
        switchTab('client', 'home'); 
    }
}

// ==========================================
// НАВІГАЦІЯ ТА ПОЛІНГ
// ==========================================
function switchTab(role, tabId) {
    document.querySelectorAll(role === 'admin' ? '.admin-tab-content' : '.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById(role === 'admin' ? `admin-tab-${tabId}` : `tab-${tabId}`).classList.remove('hidden-step');

    const activeColor = role === 'admin' ? 'text-teal-600' : 'text-rose-500';
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`${role}-nav-${nav}`);
        if (nav === tabId) {
            btn.classList.remove('text-slate-400');
            btn.classList.add(activeColor);
        } else {
            btn.classList.remove(activeColor);
            btn.classList.add('text-slate-400');
        }
    });

    tg.BackButton.hide();
    tg.MainButton.hide();
    stopPolling();

    if (role === 'client') {
        if (tabId === 'home') showStep('step-booking'); 
        else if (tabId === 'bookings') { loadBookings('client'); startPolling('client'); }
    } else {
        if (tabId === 'home') { loadBookings('admin', false, true); startPolling('admin', true); } 
        else if (tabId === 'bookings') { loadBookings('admin'); startPolling('admin'); }
    }
}

function startPolling(role, forDashboard = false) {
    stopPolling(); 
    pollingInterval = setInterval(() => {
        loadBookings(role, true, forDashboard);
    }, 10000); 
}

function stopPolling() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
}

function switchBookingTab(filter, role) {
    state.currentBookingFilter = filter;
    
    const btnActive = document.getElementById(`${role}-subtab-active`);
    const btnCancelled = document.getElementById(`${role}-subtab-cancelled`);
    const activeColor = role === 'admin' ? 'border-teal-500 text-teal-600' : 'border-rose-500 text-rose-600';
    
    if (filter === 'active') {
        btnActive.className = `flex-1 py-3 text-sm font-bold border-b-2 ${activeColor} transition-colors`;
        btnCancelled.className = "flex-1 py-3 text-sm font-bold border-b-2 border-transparent text-slate-400 transition-colors";
    } else {
        btnCancelled.className = `flex-1 py-3 text-sm font-bold border-b-2 ${activeColor} transition-colors`;
        btnActive.className = "flex-1 py-3 text-sm font-bold border-b-2 border-transparent text-slate-400 transition-colors";
    }
    
    if (role === 'admin') renderAdminBookings();
    else renderClientBookings(); 
}

// ==========================================
// МЕРЕЖА ТА ДАНІ ЗАПИСІВ
// ==========================================
async function loadBookings(role, isSilent = false, forDashboard = false) {
    const containerId = role === 'admin' ? (forDashboard ? null : 'admin-bookings-list') : 'my-bookings-list';
    
    if (!isSilent && containerId) {
        document.getElementById(containerId).innerHTML = '<div class="text-center py-4 text-slate-500 animate-pulse">Завантаження...</div>';
    }
    
    try {
        const response = await fetch(`${API_URL}?action=getBookings&userId=${state.user.id}&role=${role}`);
        const data = await response.json();
        
        if (role === 'admin') {
            state.adminBookings = data.bookings || [];
            if (forDashboard) renderAdminStats('day'); 
            else renderAdminBookings();
        } else {
            state.clientBookings = data.bookings || [];
            renderClientBookings();
        }
    } catch (e) {
        if (!isSilent && containerId) document.getElementById(containerId).innerHTML = '<div class="text-center py-4 text-red-500">Помилка мережі.</div>';
    }
}

async function changeBookingStatus(bookingId, newStatus, reason = "") {
    tg.MainButton.showProgress();
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateStatus', bookingId, newStatus, reason }) });
        const result = await response.json();
        if (result.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success'); 
            loadBookings(state.isAdmin ? 'admin' : 'client'); 
        } else tg.showAlert('Помилка: ' + result.message);
    } catch (e) { tg.showAlert('Помилка з\'єднання. Спробуйте ще раз.');
    } finally { tg.MainButton.hideProgress(); }
}

// ==========================================
// ЛОГІКА МАЙСТРА (АДМІНА) - СТАТИСТИКА
// ==========================================

// Хелпер для безпечного парсингу дат з Google Таблиць
function parseSafeDate(dateStr) {
    if (!dateStr) return new Date(0);
    const str = String(dateStr);
    if (str.includes('-')) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    } else if (str.includes('.')) {
        let [d, m, y] = str.split('.').map(Number);
        if (y < 2000) y += 2000;
        return new Date(y, m - 1, d);
    }
    return new Date(str);
}

function renderAdminStats(period) {
    // Підсвітка активної кнопки періоду
    ['day', 'week', 'month'].forEach(p => {
        const btn = document.getElementById(`stat-btn-${p}`);
        if (p === period) {
            btn.classList.remove('text-slate-500');
            btn.classList.add('bg-white', 'shadow-sm', 'text-slate-800');
        } else {
            btn.classList.add('text-slate-500');
            btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-800');
        }
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Обнуляємо час для точного порівняння дат
    
    let startDate = new Date(now);
    if (period === 'week') startDate.setDate(now.getDate() - 6); // Останні 7 днів
    else if (period === 'month') startDate.setDate(now.getDate() - 29); // Останні 30 днів

    let totalCount = 0;
    let totalRevenue = 0;

    // Створюємо структуру з пустими датами (щоб графік не стрибав, якщо в якісь дні не було записів)
    const groupedByDate = {};
    if (period !== 'day') {
        for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
            const dateKey = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            groupedByDate[dateKey] = 0;
        }
    }

    // Зберігаємо статистику по конкретних послугах для "Сьогодні"
    const servicesCount = {};

    state.adminBookings.forEach(b => {
        // Рахуємо тільки успішні та активні записи
        if (b.status === 'Выполнено' || b.status === 'В очереди') {
            const bDate = parseSafeDate(b.date);
            bDate.setHours(0, 0, 0, 0);

            const s = state.services.find(srv => srv.name === b.service);
            const price = s ? Number(s.price) : 0;

            if (period === 'day') {
                // Тільки сьогоднішні записи
                if (bDate.getTime() === now.getTime()) {
                    totalCount++;
                    totalRevenue += price;
                    servicesCount[b.service] = (servicesCount[b.service] || 0) + 1;
                }
            } else {
                // Записи за період (тиждень/місяць)
                if (bDate >= startDate && bDate <= now) {
                    totalCount++;
                    totalRevenue += price;
                    const dateKey = `${bDate.getDate().toString().padStart(2, '0')}.${(bDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    if (groupedByDate[dateKey] !== undefined) {
                        groupedByDate[dateKey]++;
                    }
                }
            }
        }
    });

    // Оновлюємо цифри на екрані
    document.getElementById('stat-count').innerText = totalCount;
    document.getElementById('stat-revenue').innerText = `${totalRevenue} ₴`;

    // Формуємо дані для красивого графіка
    let chartLabels = [];
    let chartData = [];
    let chartType = 'line';

    if (period === 'day') {
        // Якщо вибрано "Сьогодні", малюємо стовпці з переліком послуг
        chartType = 'bar';
        chartLabels = Object.keys(servicesCount);
        chartData = Object.values(servicesCount);
        if (chartLabels.length === 0) { 
            chartLabels = ['Немає записів']; 
            chartData = [0]; 
        }
    } else {
        // Для тижня/місяця малюємо лінію динаміки
        chartLabels = Object.keys(groupedByDate);
        chartData = Object.values(groupedByDate);
    }

    drawChart(chartLabels, chartData, chartType);
}

// Функція малювання преміум-графіка Chart.js
function drawChart(labels, data, type) {
    const ctx = document.getElementById('statsChart').getContext('2d');
    
    // Видаляємо старий графік, якщо він існує, щоб уникнути багів накладання
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }

    // Створюємо красивий градієнт під лінією
    let gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(20, 184, 166, 0.4)'); // Напівпрозорий Teal (смарагдовий)
    gradient.addColorStop(1, 'rgba(20, 184, 166, 0.0)');

    state.chartInstance = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Записів',
                data: data,
                borderColor: '#14b8a6', // teal-500
                backgroundColor: type === 'line' ? gradient : '#14b8a6',
                borderWidth: 3,
                tension: 0.4, // Плавні вигини лінії
                fill: type === 'line',
                pointBackgroundColor: '#fff',
                pointBorderColor: '#14b8a6',
                pointBorderWidth: 2,
                pointRadius: type === 'line' ? 4 : 0,
                pointHoverRadius: 6,
                borderRadius: type === 'bar' ? 8 : 0 // Заокруглені стовпці для Bar chart
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#14b8a6',
                    bodyFont: { weight: 'bold' },
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) { return ` ${context.parsed.y} записів`; }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1, color: '#94a3b8', font: { family: 'sans-serif' } },
                    border: { display: false },
                    grid: { color: '#f1f5f9', drawBorder: false }
                },
                x: { 
                    ticks: { 
                        color: '#94a3b8', 
                        font: { family: 'sans-serif' },
                        maxTicksLimit: 7 // Не показувати більше 7 дат, щоб не злипалося
                    },
                    border: { display: false },
                    grid: { display: false, drawBorder: false }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            }
        }
    });
}

function renderAdminBookings() {
    const container = document.getElementById('admin-bookings-list');
    
    const filtered = state.adminBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });

    if (filtered.length === 0) {
        container.innerHTML = "<div class='text-center py-4 text-slate-500 mt-10'>У цій категорії записів немає.</div>";
        return;
    }

    container.innerHTML = filtered.map(b => {
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        return `
            <div class="glass p-5 rounded-2xl mb-4 border-l-4 ${isPending ? 'border-yellow-400' : 'border-transparent'} shadow-sm">
                <div class="flex justify-between items-start mb-3">
                    <div class="w-full pr-3">
                        <div class="font-bold text-slate-800 text-base mb-3 leading-tight">Запис на ${b.service}</div>
                        <div class="text-sm text-slate-600 mb-1">Обрана дата: <span class="font-semibold text-slate-800">${b.date}</span></div>
                        <div class="text-sm text-slate-600 mb-3">Обраний час: <span class="font-semibold text-slate-800">${formatDisplayTime(b.time)}</span></div>
                        <div class="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">👤</span>${b.clientName}
                        </div>
                    </div>
                    <span class="text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                <a href="tg://user?id=${b.clientId}" class="flex items-center justify-center w-full py-2 bg-teal-50 text-teal-700 rounded-xl text-sm font-bold mt-2 active:scale-95 transition-all">✉️ Написати клієнту</a>
                ${b.cancelReason ? `<div class="text-xs text-red-500 mt-3 bg-red-50 p-2 rounded-lg">Причина: ${b.cancelReason}</div>` : ''}
                ${isPending ? `<div class="flex gap-2 mt-3 pt-3 border-t border-slate-200/50">
                        <button onclick="changeBookingStatus('${b.id}', 'Выполнено')" class="flex-1 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm">Підтвердити</button>
                        <button onclick="openCancelModal('${b.id}')" class="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold active:scale-95 transition-all">Скасувати</button>
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

// ==========================================
// ЛОГІКА КЛІЄНТА - ВІЗИТИ ТА СТВОРЕННЯ
// ==========================================

function renderClientBookings() {
    const container = document.getElementById('my-bookings-list');
    
    const filtered = state.clientBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });

    if (filtered.length === 0) {
        container.innerHTML = "<div class='text-center py-4 text-slate-500 mt-10'>У цій категорії записів немає.</div>";
        return;
    }

    container.innerHTML = filtered.map(b => {
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        
        const masterObj = state.masters.find(m => m.id.toString() === (b.masterId || '').toString());
        let masterName = masterObj ? masterObj.name : 'Майстра не знайдено';
        masterName = masterName.replace(/^(Майстер|Мастер)\s+/i, '').trim();

        return `
            <div class="glass p-5 rounded-2xl mb-4 border-l-4 ${isPending ? 'border-yellow-400' : 'border-transparent'} shadow-sm">
                <div class="flex justify-between items-start mb-3">
                    <div class="w-full pr-3">
                        <div class="font-bold text-slate-800 text-base mb-3 leading-tight">Запис на ${b.service}</div>
                        <div class="text-sm text-slate-600 mb-1">Обрана дата: <span class="font-semibold text-slate-800">${b.date}</span></div>
                        <div class="text-sm text-slate-600 mb-3">Обраний час: <span class="font-semibold text-slate-800">${formatDisplayTime(b.time)}</span></div>
                        <div class="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center text-xs shadow-sm">💅</span>Майстер: ${masterName}
                        </div>
                    </div>
                    <span class="text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                ${b.cancelReason ? `<div class="text-xs text-red-500 mt-3 bg-red-50 p-2 rounded-lg">Причина: ${b.cancelReason}</div>` : ''}
                ${isPending ? `
                    <div class="mt-3 pt-3 border-t border-slate-200/50">
                        <button onclick="changeBookingStatus('${b.id}', 'Отменено', 'Скасовано клієнтом')" class="w-full py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm border border-slate-200/60">
                            Скасувати візит
                        </button>
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

function showStep(stepId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    document.getElementById(stepId).classList.remove('hidden-step');

    if (stepId === 'step-booking') {
        tg.BackButton.hide();
        tg.MainButton.hide();
        state.selectedService = null; state.selectedMaster = null; state.selectedDate = null; state.selectedTime = null;
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

function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map(s => `
        <div onclick="selectService(${s.id})" class="group bg-white/80 backdrop-blur-md p-4 rounded-3xl mb-4 flex justify-between items-center active:scale-95 transition-all duration-300 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
            <div class="flex items-center gap-3 flex-1 min-w-0 pr-2">
                <div class="shrink-0 w-12 h-12 bg-rose-100/60 rounded-2xl flex items-center justify-center text-rose-500 text-xl shadow-inner">💅</div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-slate-800 text-base leading-tight break-words">${s.name}</div>
                    <div class="flex items-center gap-1 text-xs text-slate-500 mt-1 font-medium">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${s.duration} хв
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <div class="text-rose-600 font-extrabold text-lg whitespace-nowrap">${s.price} ₴</div>
                <div class="text-slate-300"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div>
            </div>
        </div>
    `).join('');
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id === id);
    renderMasters();
    showStep('step-master');
}

function renderMasters() {
    const list = document.getElementById('masters-list');
    list.innerHTML = state.masters.map(m => {
        const cleanName = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        return `
        <div onclick="selectMaster('${m.id}')" class="group bg-white/80 backdrop-blur-md p-5 rounded-3xl mb-4 flex items-center justify-between active:scale-95 transition-all duration-300 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
            <div class="flex items-center gap-4 flex-1 min-w-0 pr-2">
                <div class="relative shrink-0">
                    <div class="w-14 h-14 bg-gradient-to-br from-rose-100 to-teal-50 rounded-full flex items-center justify-center font-bold text-teal-700 text-2xl shadow-inner border border-white">${cleanName.charAt(0)}</div>
                    <div class="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-white rounded-full shadow-sm"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-slate-800 text-lg leading-tight truncate">${cleanName}</div>
                    <div class="text-[11px] text-slate-500 mt-1 font-medium bg-slate-100 px-2 py-1 rounded-lg inline-block truncate max-w-full">Працює: ${m.workHours}</div>
                </div>
            </div>
            <div class="text-slate-300 shrink-0"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div>
        </div>
    `}).join('');
}

function selectMaster(id) {
    state.selectedMaster = state.masters.find(m => m.id.toString() === id.toString());
    renderCalendar();
    showStep('step-datetime');
}

function renderCalendar() {
    const container = document.getElementById('date-scroll');
    container.innerHTML = ''; document.getElementById('time-slots').innerHTML = ''; 
    state.selectedDate = null; state.selectedTime = null;
    tg.MainButton.hide();

    const now = new Date(); const currentHour = now.getHours();
    let datesHTML = '';

    for (let i = 0; i < 14; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i);
        const dayOfWeek = d.getDay(); 
        
        let isWorkingDay = dayOfWeek !== 1 && state.selectedMaster.workDays.includes(dayOfWeek);
        if (i === 0 && currentHour >= 18) isWorkingDay = false;

        const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]; 
        const dayNames = ['Нд', 'Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб'];
        const dayName = dayNames[dayOfWeek];
        const dayNum = d.getDate();

        if (isWorkingDay) {
            datesHTML += `<button onclick="selectDate('${dateStr}', this)" class="date-btn flex-shrink-0 w-16 h-22 py-3 rounded-3xl flex flex-col items-center justify-center transition-all bg-white/80 backdrop-blur-sm active:scale-95 text-slate-700 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/80"><span class="text-[10px] uppercase font-bold text-slate-400 mb-1">${dayName}</span><span class="text-2xl font-extrabold text-slate-800">${dayNum}</span></button>`;
        } else {
            datesHTML += `<button disabled class="flex-shrink-0 w-16 h-22 py-3 rounded-3xl flex flex-col items-center justify-center bg-slate-100/50 text-slate-400 opacity-50 cursor-not-allowed border border-transparent"><span class="text-[10px] uppercase font-bold mb-1">${dayName}</span><span class="text-2xl font-extrabold">${dayNum}</span></button>`;
        }
    }
    container.innerHTML = datesHTML;
}

async function selectDate(dateStr, btnElement) {
    state.selectedDate = dateStr; state.selectedTime = null; tg.MainButton.hide();
    
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('bg-rose-500', 'text-white', 'border-rose-500', 'shadow-md', 'shadow-rose-200');
        btn.classList.add('bg-white/80', 'text-slate-700');
        const d = btn.querySelector('span:first-child'); const n = btn.querySelector('span:last-child');
        if(d) d.classList.replace('text-rose-100', 'text-slate-400');
        if(n) n.classList.replace('text-white', 'text-slate-800');
    });
    
    btnElement.classList.remove('bg-white/80', 'text-slate-700');
    btnElement.classList.add('bg-rose-500', 'text-white', 'border-rose-500', 'shadow-md', 'shadow-rose-200');
    btnElement.querySelector('span:first-child').classList.replace('text-slate-400', 'text-rose-100');
    btnElement.querySelector('span:last-child').classList.replace('text-slate-800', 'text-white');

    const timeLoader = document.getElementById('time-loader');
    document.getElementById('time-slots').innerHTML = ''; timeLoader.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}?action=getOccupiedSlots&date=${dateStr}&masterId=${state.selectedMaster.id}`);
        const data = await response.json();
        renderTimeSlots(data.occupiedSlots || []);
    } catch (e) { tg.showAlert("Не вдалося завантажити розклад."); } 
    finally { timeLoader.classList.add('hidden'); }
}

function renderTimeSlots(occupiedSlots) {
    const container = document.getElementById('time-slots');
    let timeHTML = '';
    const slots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const currentHour = now.getHours(); const currentMinute = now.getMinutes();
    const requiredSlotsCount = Math.ceil(state.selectedService.duration / 60);
    let availableSlotsCount = 0;

    slots.forEach((time) => {
        let isAvailable = true;
        const startHourNum = parseInt(time.split(':')[0]);

        for (let i = 0; i < requiredSlotsCount; i++) {
            const targetHourNum = startHourNum + i;
            const targetTimeStr = `${targetHourNum.toString().padStart(2, '0')}:00`;

            if (targetHourNum >= 20 || occupiedSlots.includes(targetTimeStr)) { isAvailable = false; break; }
            if (state.selectedDate === todayStr && i === 0 && (startHourNum < currentHour || (startHourNum === currentHour && 0 <= currentMinute))) { isAvailable = false; break; }
        }

        if (!isAvailable) {
            timeHTML += `<button disabled class="py-3.5 rounded-2xl bg-slate-100/60 text-slate-400 line-through text-sm font-bold cursor-not-allowed border border-transparent">${time}</button>`;
        } else {
            availableSlotsCount++;
            timeHTML += `<button onclick="selectTime('${time}', this)" class="time-btn py-3.5 rounded-2xl bg-white/80 backdrop-blur-sm text-slate-700 text-sm font-bold active:scale-95 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/80">${time}</button>`;
        }
    });

    if (availableSlotsCount === 0) container.innerHTML = '<div class="col-span-3 text-center text-slate-500 py-4 font-medium">На обрану дату немає "вікна" потрібного розміру 😔</div>';
    else container.innerHTML = timeHTML;
}

function selectTime(time, btnElement) {
    state.selectedTime = time;
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('bg-rose-500', 'text-white', 'border-rose-500', 'shadow-md', 'shadow-rose-200');
        btn.classList.add('bg-white/80', 'text-slate-700');
    });
    
    btnElement.classList.remove('bg-white/80', 'text-slate-700');
    btnElement.classList.add('bg-rose-500', 'text-white', 'border-rose-500', 'shadow-md', 'shadow-rose-200');
    
    tg.MainButton.text = `Підтвердити запис на ${time}`; tg.MainButton.show(); tg.MainButton.onClick(submitBooking);
}

async function submitBooking() {
    tg.MainButton.showProgress();
    const bookingData = {
        action: 'createBooking', date: state.selectedDate, time: state.selectedTime,
        masterId: state.selectedMaster.id, clientId: state.user.id.toString(), clientName: state.user.first_name,
        service: state.selectedService.name, comment: ""
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(bookingData) });
        const result = await response.json();

        if (result.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
            tg.showAlert('Супер! Ваш запис успішно створено 🎉', () => { switchTab('client', 'bookings'); });
        } else tg.showAlert('Помилка: ' + result.message);
    } catch (e) { tg.showAlert('Помилка підключення.'); } 
    finally { tg.MainButton.hideProgress(); }
}

// ==========================================
// ХЕЛПЕРИ ДЛЯ АДМІН-МОДАЛКИ
// ==========================================
function openCancelModal(bookingId) {
    currentCancelBookingId = bookingId;
    document.getElementById('cancel-modal').classList.remove('hidden'); document.getElementById('cancel-modal').classList.add('flex');
}
function closeCancelModal() {
    currentCancelBookingId = null;
    document.getElementById('cancel-modal').classList.add('hidden'); document.getElementById('cancel-modal').classList.remove('flex');
    document.getElementById('cancel-reason').value = '';
}
function confirmCancelAdmin() {
    const reason = document.getElementById('cancel-reason').value.trim();
    if (!reason) return tg.showAlert("Вкажіть причину.");
    changeBookingStatus(currentCancelBookingId, 'Отменено', reason);
    closeCancelModal();
}
function formatDisplayTime(timeStr) {
    const str = String(timeStr);
    if (str.includes('T')) { const d = new Date(str); return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'); }
    return str;
}
function getStatusData(dbStatus) {
    if (dbStatus === 'В очереди') return { text: 'Очікує', color: 'text-yellow-600 bg-yellow-100' };
    if (dbStatus === 'Выполнено') return { text: 'Підтверджено', color: 'text-teal-600 bg-teal-100' };
    return { text: 'Скасовано', color: 'text-red-600 bg-red-100' };
}

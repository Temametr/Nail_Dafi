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
    editingBookingId: null, // Зберігає ID при перенесенні запису
    isAdmin: false,
    adminMasterInfo: null,
    clientBookings: [],
    adminBookings: [],
    currentBookingFilter: 'active'
};

let currentCancelBookingId = null;
let currentCancelRole = null;
let pollingInterval = null;

// ==========================================
// ІНІЦІАЛІЗАЦІЯ ТА КНОПКА НАЗАД
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
    tg.MainButton.color = "#3b82f6"; // Блакитна кнопка для клієнта за замовчуванням

    // Єдиний глобальний обробник кнопки "Назад" у Telegram
    tg.BackButton.onClick(() => {
        if (!document.getElementById('client-screen').classList.contains('hidden-step')) {
            // Якщо ми переносимо запис
            if (state.editingBookingId && !document.getElementById('step-datetime').classList.contains('hidden-step')) {
                state.editingBookingId = null;
                switchTab('client', 'bookings');
                return;
            }
            // Стандартна навігація клієнта
            if (!document.getElementById('step-datetime').classList.contains('hidden-step')) {
                showStep('step-master');
            } else if (!document.getElementById('step-master').classList.contains('hidden-step')) {
                showStep('step-booking');
            }
        }
    });

    await loadInitialData();
});

async function loadInitialData() {
    try {
        const response = await fetch(`${API_URL}?action=getInitData`);
        const data = await response.json();
        
        state.services = data.services;
        state.masters = data.masters;
        
        // Перевіряємо чи поточний користувач є майстром
        const masterData = state.masters.find(m => m.id.toString() === state.user.id.toString());
        if (masterData) {
            state.isAdmin = true;
            state.adminMasterInfo = masterData;
        }
        renderApp();
    } catch (e) {
        console.error("Init Error:", e);
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
        
        // Встановлюємо аватар у новій блакитній шапці адміна
        const adminAvatar = document.getElementById('admin-header-avatar');
        if(adminAvatar) adminAvatar.innerText = cleanName.charAt(0);
        
        tg.MainButton.color = "#14b8a6"; // Бірюзова кнопка для майстра
        switchTab('admin', 'home');
    } else {
        document.getElementById('client-screen').classList.remove('hidden-step');
        document.getElementById('client-bottom-nav').classList.remove('hidden-step');
        
        // Встановлюємо аватари для клієнта
        const clientAvatarHeader = document.getElementById('client-header-avatar');
        const profileAvatar = document.getElementById('profile-avatar');
        if(clientAvatarHeader) clientAvatarHeader.innerText = state.user.first_name.charAt(0);
        if(profileAvatar) profileAvatar.innerText = state.user.first_name.charAt(0);
        
        document.getElementById('profile-name').innerText = state.user.first_name;
        document.getElementById('profile-id').innerText = state.user.id;

        renderServices();
        switchTab('client', 'home');
    }
}

// ==========================================
// НАВІГАЦІЯ ТА ДИНАМІЧНА ШАПКА
// ==========================================
function switchTab(role, tabId) {
    document.querySelectorAll(role === 'admin' ? '.admin-tab-content' : '.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById(role === 'admin' ? `admin-tab-${tabId}` : `tab-${tabId}`).classList.remove('hidden-step');
    document.getElementById(`${role}-bottom-nav`).classList.remove('hidden-step');

    // Оновлення кольорів кнопок у нижньому навбарі
    const activeColor = role === 'admin' ? 'text-teal-600' : 'text-blue-500';
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`${role}-nav-${nav}`);
        if (btn) {
            if (nav === tabId) {
                btn.classList.remove('text-slate-400');
                btn.classList.add(activeColor, role === 'admin' ? 'bg-teal-50' : 'bg-blue-50');
            } else {
                btn.classList.remove(activeColor, 'bg-teal-50', 'bg-blue-50');
                btn.classList.add('text-slate-400');
            }
        }
    });

    // ДИНАМІЧНА ШАПКА: змінюємо текст залежно від відкритої вкладки
    if (role === 'client') {
        const title = document.getElementById('client-header-title');
        if (title) {
            if (tabId === 'home') {
                title.innerHTML = `Привіт, <span class="font-black text-blue-600">${state.user.first_name}</span> 👋`;
            } else if (tabId === 'bookings') {
                title.innerHTML = `Твої візити 💅`;
            } else if (tabId === 'profile') {
                title.innerHTML = `Мій кабінет ⚙️`;
            }
        }
    } else {
        const title = document.getElementById('admin-header-title');
        if (title) {
            const cleanName = state.adminMasterInfo.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
            if (tabId === 'home') {
                title.innerHTML = `Панель: <span class="font-black text-teal-600">${cleanName}</span> 📊`;
            } else if (tabId === 'bookings') {
                title.innerHTML = `Розклад 📅`;
            }
        }
    }

    tg.BackButton.hide();
    tg.MainButton.hide();
    stopPolling();
    state.editingBookingId = null;

    if (role === 'client') {
        if (tabId === 'home') renderHomeMasters(); // Рендеримо картки майстрів 3:4
        else if (tabId === 'bookings') { loadBookings('client'); startPolling('client'); }
    } else {
        if (tabId === 'home') { loadBookings('admin', false, true); startPolling('admin', true); }
        else if (tabId === 'bookings') { loadBookings('admin'); startPolling('admin'); }
    }
}

function showStep(stepId) {
    document.querySelectorAll('.step-content').forEach(s => s.classList.add('hidden-step'));
    document.getElementById(stepId).classList.remove('hidden-step');

    if (stepId === 'step-booking') {
        tg.MainButton.hide();
        state.selectedService = null; state.selectedMaster = null; state.selectedDate = null; state.selectedTime = null;
    }
}

// ==========================================
// ПОЛІНГ ТА ВКЛАДКИ ЗАПИСІВ
// ==========================================
function startPolling(role, forDashboard = false) {
    stopPolling();
    pollingInterval = setInterval(() => { loadBookings(role, true, forDashboard); }, 15000); 
}

function stopPolling() {
    if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
}

function switchBookingTab(filter, role) {
    state.currentBookingFilter = filter;
    const btnActive = document.getElementById(`${role}-subtab-active`);
    const btnCancelled = document.getElementById(`${role}-subtab-cancelled`);
    
    if (filter === 'active') {
        btnActive.className = `flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300`;
        btnCancelled.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100";
    } else {
        btnCancelled.className = `flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-slate-950 text-white rounded-xl shadow-lg transition-all duration-300`;
        btnActive.className = "flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white text-slate-500 rounded-xl transition-all duration-300 border border-rose-100";
    }
    
    if (role === 'admin') renderAdminBookings();
    else renderClientBookings();
}

// ==========================================
// МЕРЕЖЕВІ ЗАПИТИ (API)
// ==========================================
async function loadBookings(role, isSilent = false, forDashboard = false) {
    const containerId = role === 'admin' ? (forDashboard ? null : 'admin-bookings-list') : 'my-bookings-list';
    if (!isSilent && containerId) document.getElementById(containerId).innerHTML = '<div class="text-center py-12 text-slate-400 font-medium animate-pulse">Оновлюємо записи...</div>';
    
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
        console.error("Load Bookings Error:", e);
        if (!isSilent && containerId) document.getElementById(containerId).innerHTML = '<div class="text-center py-12 text-red-500 font-medium">Помилка мережі 🌐</div>';
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
        } else tg.showAlert('Помилка сервера: ' + result.message);
    } catch (e) { 
        tg.showAlert('Помилка з\'єднання з сервером.');
    } finally { tg.MainButton.hideProgress(); }
}

async function submitBooking() {
    tg.MainButton.showProgress();
    const action = state.editingBookingId ? 'rescheduleBooking' : 'createBooking';
    
    const bookingData = {
        action: action, 
        date: state.selectedDate, 
        time: state.selectedTime,
        masterId: state.selectedMaster.id, 
        clientId: state.user.id.toString(), 
        clientName: state.user.first_name,
        service: state.selectedService.name, 
        comment: "",
        bookingId: state.editingBookingId
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(bookingData) });
        const result = await response.json();

        if (result.status === 'success') {
            tg.HapticFeedback.notificationOccurred('success');
            const msg = state.editingBookingId ? 'Запит на перенесення надіслано!' : 'Ура! Ти записалася на манікюр 🎉';
            state.editingBookingId = null;
            tg.showAlert(msg, () => { switchTab('client', 'bookings'); });
        } else tg.showAlert('Помилка: ' + result.message);
    } catch (e) { tg.showAlert('Помилка мережі при створенні запису.'); } 
    finally { tg.MainButton.hideProgress(); }
}

// ==========================================
// ХЕЛПЕРИ ДАТ І СТАТУСІВ
// ==========================================
function parseSafeDate(dateStr) {
    if (!dateStr) return new Date(0);
    const str = String(dateStr);
    if (str.includes('-')) {
        const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d);
    } else if (str.includes('.')) {
        let [d, m, y] = str.split('.').map(Number);
        if (y < 2000) y += 2000; return new Date(y, m - 1, d);
    }
    return new Date(str);
}

function formatDisplayTime(timeStr) {
    const str = String(timeStr);
    if (str.includes('T')) {
        const d = new Date(str); return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    }
    return str;
}

function getStatusData(dbStatus) {
    if (dbStatus === 'В очереди') return { text: 'Очікує', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (dbStatus === 'Выполнено') return { text: 'Підтверджено', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    return { text: 'Скасовано', color: 'text-red-700 bg-red-50 border-red-200' };
}

// ==========================================
// ЛОГІКА МАЙСТРА (АДМІН)
// ==========================================
function renderAdminStats(period) {
    ['day', 'week', 'month'].forEach(p => {
        const btn = document.getElementById(`stat-btn-${p}`);
        if (p === period) {
            btn.classList.remove('text-slate-500'); btn.classList.add('bg-white', 'shadow-md', 'text-slate-950');
        } else {
            btn.classList.add('text-slate-500'); btn.classList.remove('bg-white', 'shadow-md', 'text-slate-950');
        }
    });

    const now = new Date(); now.setHours(0, 0, 0, 0); 
    let startDate = new Date(now);
    if (period === 'week') startDate.setDate(now.getDate() - 6); 
    else if (period === 'month') startDate.setDate(now.getDate() - 29); 

    let totalCount = 0; let totalRevenue = 0; let cancelledCount = 0;

    state.adminBookings.forEach(b => {
        const bDate = parseSafeDate(b.date); bDate.setHours(0, 0, 0, 0);
        const s = state.services.find(srv => srv.name === b.service);
        const price = s ? Number(s.price) : 0;
        let isMatch = false;

        if (period === 'day') { if (bDate.getTime() === now.getTime()) isMatch = true; } 
        else { if (bDate >= startDate && bDate <= now) isMatch = true; }

        if (isMatch) {
            if (b.status === 'Выполнено' || b.status === 'В очереди') { totalCount++; totalRevenue += price; } 
            else if (b.status === 'Отменено') cancelledCount++;
        }
    });

    document.getElementById('stat-count').innerText = totalCount;
    document.getElementById('stat-revenue').innerText = `${totalRevenue} ₴`;
    document.getElementById('stat-cancelled').innerText = cancelledCount;
}

function renderAdminBookings() {
    const container = document.getElementById('admin-bookings-list');
    const filtered = state.adminBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });

    if (filtered.length === 0) { container.innerHTML = "<div class='text-center py-12 text-slate-400 font-medium'>Немає записів у цій категорії.</div>"; return; }

    container.innerHTML = filtered.map((b, i) => {
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        const delay = i * 40;

        return `
            <div class="card-convex p-5 mb-5 shadow-convex animate-pop-in border border-white" style="animation-delay: ${delay}ms;">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-full pr-3">
                        <div class="font-extrabold text-slate-950 text-lg mb-4 tracking-tight leading-tight">${b.service}</div>
                        <div class="space-y-2">
                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5"><span class="w-7 h-7 rounded-full bg-slate-100 flex justify-center items-center text-slate-500">📅</span> ${b.date} о ${formatDisplayTime(b.time)}</div>
                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5"><span class="w-7 h-7 rounded-full bg-slate-100 flex justify-center items-center text-slate-500">👤</span> ${b.clientName}</div>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                
                <a href="tg://user?id=${b.clientId}" class="card-convex-sm shadow-convex-sm flex items-center justify-center w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-sm font-bold mt-5 active:scale-95 transition-all">💬 Написати клієнту</a>
                
                ${b.cancelReason ? `<div class="text-xs text-red-700 mt-4 bg-red-50 p-4 rounded-2xl border border-red-100 font-medium leading-relaxed">Причина скасування: ${b.cancelReason}</div>` : ''}
                
                ${isPending ? `<div class="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                        <button onclick="changeBookingStatus('${b.id}', 'Выполнено')" class="card-convex-sm flex-1 py-3.5 bg-slate-950 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-950/20 active:scale-95 transition-all">Підтвердити</button>
                        <button onclick="openCancelModal('${b.id}', 'admin')" class="card-convex-sm flex-1 py-3.5 bg-white text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200">Відмовити</button>
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

// ==========================================
// ЛОГІКА РЕНДЕРУ ТА ФЛОУ (КЛІЄНТ)
// ==========================================

// ✅ ОНОВЛЕНО: Вітрина майстрів на головній сторінці (прямокутник 3:4)
function renderHomeMasters() {
    const list = document.getElementById('home-masters-list');
    list.innerHTML = state.masters.map((m, i) => {
        const cleanName = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        const imgSrc = i === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
        
        return `
        <div class="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden mb-6 shadow-convex animate-pop-in border-4 border-white/40" style="animation-delay: ${i*50}ms">
            <img src="${imgSrc}" alt="${cleanName}" class="absolute inset-0 w-full h-full object-cover">
            
            <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-rose-900/40 via-transparent to-transparent"></div>
            
            <div class="absolute bottom-4 left-4 right-4 bg-white/85 backdrop-blur-md rounded-3xl p-5 shadow-lg border border-white/60 text-center flex flex-col justify-center items-center">
                <h3 class="font-black text-slate-900 text-2xl tracking-tight leading-none mb-1">${cleanName}</h3>
                <p class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1">Топ-майстер</p>
            </div>
        </div>
        `;
    }).join('');
}

function startClientBookingFlow() {
    state.editingBookingId = null;
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    
    const title = document.getElementById('client-header-title');
    if (title) title.innerHTML = `Оформлення <span class="text-blue-600">візиту</span> 📝`;

    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);
        if(btn) {
            if (nav === 'bookings') { btn.classList.remove('text-slate-400'); btn.classList.add('text-blue-500', 'bg-blue-50'); }
            else { btn.classList.remove('text-blue-500', 'bg-blue-50'); btn.classList.add('text-slate-400'); }
        }
    });

    renderServices();
    showStep('step-booking');
    tg.BackButton.show();
}

function renderClientBookings() {
    const container = document.getElementById('my-bookings-list');
    const filtered = state.clientBookings.filter(b => {
        if (state.currentBookingFilter === 'active') return b.status === 'В очереди' || b.status === 'Выполнено';
        else return b.status === 'Отменено';
    });

    if (filtered.length === 0) { container.innerHTML = "<div class='text-center py-12 text-slate-400 font-medium'>У тебе поки немає записів.</div>"; return; }

    container.innerHTML = filtered.map((b, i) => {
        const isConfirmed = b.status === 'Выполнено';
        const isPending = b.status === 'В очереди';
        const statusData = getStatusData(b.status);
        
        const masterObj = state.masters.find(m => m.id.toString() === (b.masterId || '').toString());
        let masterName = masterObj ? masterObj.name : 'Майстра не знайдено';
        masterName = masterName.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        const delay = i * 40;

        return `
            <div class="card-convex p-5 mb-5 shadow-convex animate-pop-in border border-white" style="animation-delay: ${delay}ms;">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-full pr-3">
                        <div class="font-extrabold text-slate-950 text-lg mb-4 tracking-tight leading-tight">${b.service}</div>
                        <div class="space-y-2">
                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5"><span class="w-7 h-7 rounded-full bg-slate-100 flex justify-center items-center text-slate-500">📅</span> ${b.date} о ${formatDisplayTime(b.time)}</div>
                            <div class="text-sm font-semibold text-slate-600 flex items-center gap-2.5"><span class="w-7 h-7 rounded-full bg-blue-50 flex justify-center items-center text-blue-500">💅</span> Майстер: ${masterName}</div>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${statusData.color}">${statusData.text}</span>
                </div>
                ${b.cancelReason ? `<div class="text-xs text-red-700 mt-4 bg-red-50 p-4 rounded-2xl border border-red-100 font-medium leading-relaxed">Коментар майстра: ${b.cancelReason}</div>` : ''}
                
                ${(isPending || isConfirmed) ? `
                    <div class="mt-4 pt-4 border-t border-slate-100 space-y-3.5">
                        ${isConfirmed ? `
                            <button onclick="tg.showAlert('Ця функція скоро з\\'явиться! Поки пишіть у приватні повідомлення 💬')" class="card-convex-sm flex items-center justify-center w-full py-3.5 bg-slate-950 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all">
                                Написати майстру 💬
                            </button>
                            <div class="flex gap-3">
                                <button onclick="startReschedule('${b.id}')" class="card-convex-sm flex-1 py-3 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200">
                                    Перенести
                                </button>
                                <button onclick="openCancelModal('${b.id}', 'client')" class="card-convex-sm flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold active:scale-95 transition-all border border-red-100">
                                    Скасувати
                                </button>
                            </div>
                        ` : `
                            <button onclick="openCancelModal('${b.id}', 'client')" class="card-convex-sm w-full py-3.5 bg-white text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold active:scale-95 transition-all border border-slate-200">
                                Скасувати візит
                            </button>
                        `}
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

function startReschedule(bookingId) {
    const booking = state.clientBookings.find(b => b.id === bookingId);
    if (!booking) return;

    state.editingBookingId = bookingId;
    state.selectedService = state.services.find(s => s.name === booking.service);
    state.selectedMaster = state.masters.find(m => m.id.toString() === booking.masterId.toString());

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById('tab-booking-flow').classList.remove('hidden-step');
    
    const title = document.getElementById('client-header-title');
    if (title) title.innerHTML = `Зміна <span class="text-blue-600">дати</span> 📅`;

    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`client-nav-${nav}`);
        if(btn) {
            if (nav === 'bookings') { btn.classList.remove('text-slate-400'); btn.classList.add('text-blue-500', 'bg-blue-50'); }
            else { btn.classList.remove('text-blue-500', 'bg-blue-50'); btn.classList.add('text-slate-400'); }
        }
    });

    stopPolling();
    renderCalendar();
    showStep('step-datetime');
    tg.BackButton.show(); 
}

function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map((s, i) => `
        <div onclick="selectService('${s.id}')" class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 transition-all duration-300 cursor-pointer shadow-convex animate-pop-in border border-white" style="animation-delay: ${i*40}ms">
            <div class="flex items-center gap-4 flex-1 min-w-0 pr-2">
                <div class="shrink-0 w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shadow-inner border border-blue-100">💅</div>
                <div class="flex-1 min-w-0">
                    <div class="font-extrabold text-slate-950 text-lg leading-tight break-words tracking-tight">${s.name}</div>
                    <div class="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5"><span class="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">🕒</span> ${s.duration} хв</div>
                </div>
            </div>
            <div class="flex flex-col items-end shrink-0">
                <div class="text-slate-950 font-black text-xl whitespace-nowrap tracking-tight">${s.price} ₴</div>
            </div>
        </div>
    `).join('');
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id.toString() === id.toString());
    renderMasters();
    showStep('step-master');
}

function renderMasters() {
    const list = document.getElementById('masters-list');
    list.innerHTML = state.masters.map((m, i) => {
        const cleanName = m.name.replace(/^(Майстер|Мастер)\s+/i, '').trim();
        const imgSrc = i === 0 ? 'media/IMG_0222.jpeg' : 'media/IMG_0223.jpeg';
        
        return `
        <div onclick="selectMaster('${m.id}')" class="card-convex p-5 mb-4 flex justify-between items-center active:scale-95 transition-all duration-300 cursor-pointer shadow-convex animate-pop-in border border-white" style="animation-delay: ${i*40}ms">
            <div class="flex items-center gap-4 flex-1 min-w-0">
                <div class="relative shrink-0">
                    <div class="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center font-black text-teal-600 text-2xl shadow-inner border border-teal-100 overflow-hidden">
                        <img src="${imgSrc}" alt="${cleanName}" class="w-full h-full object-cover">
                    </div>
                    <div class="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full shadow-sm"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-extrabold text-slate-950 text-lg truncate tracking-tight">${cleanName}</div>
                    <div class="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Графік: ${m.workHours}</div>
                </div>
            </div>
            <div class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
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
            datesHTML += `<button onclick="selectDate('${dateStr}', this)" class="date-btn flex-shrink-0 w-[4.5rem] h-[5.5rem] card-convex-sm flex flex-col items-center justify-center transition-all duration-300 shadow-convex-sm active:scale-90"><span class="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">${dayName}</span><span class="text-3xl font-black text-slate-950 tracking-tighter">${dayNum}</span></button>`;
        } else {
            datesHTML += `<button disabled class="flex-shrink-0 w-[4.5rem] h-[5.5rem] card-convex-sm flex flex-col items-center justify-center bg-slate-100/50 text-slate-400 opacity-50 cursor-not-allowed"><span class="text-[10px] font-bold mb-1.5 uppercase tracking-wide">${dayName}</span><span class="text-3xl font-black tracking-tighter">${dayNum}</span></button>`;
        }
    }
    container.innerHTML = datesHTML;
}

async function selectDate(dateStr, btnElement) {
    state.selectedDate = dateStr; state.selectedTime = null; tg.MainButton.hide();
    
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('selected-item', 'shadow-blue-300');
        btn.classList.add('bg-white', 'text-slate-700', 'shadow-convex-sm');
        const d = btn.querySelector('span:first-child'); const n = btn.querySelector('span:last-child');
        if(d) d.classList.replace('text-blue-100', 'text-slate-400');
        if(n) n.classList.replace('text-white', 'text-slate-950');
    });
    
    btnElement.classList.remove('bg-white', 'text-slate-700', 'shadow-convex-sm');
    btnElement.classList.add('selected-item', 'shadow-blue-300');
    btnElement.querySelector('span:first-child').classList.replace('text-slate-400', 'text-blue-100');
    btnElement.querySelector('span:last-child').classList.replace('text-slate-950', 'text-white');

    const timeLoader = document.getElementById('time-loader');
    document.getElementById('time-slots').innerHTML = ''; timeLoader.classList.remove('hidden');

    try {
        const ignoreParam = state.editingBookingId ? `&ignoreBookingId=${state.editingBookingId}` : '';
        const response = await fetch(`${API_URL}?action=getOccupiedSlots&date=${dateStr}&masterId=${state.selectedMaster.id}${ignoreParam}`);
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

    slots.forEach((time, i) => {
        let isAvailable = true;
        const startHourNum = parseInt(time.split(':')[0]);

        for (let j = 0; j < requiredSlotsCount; j++) {
            const targetHourNum = startHourNum + j;
            const targetTimeStr = `${targetHourNum.toString().padStart(2, '0')}:00`;

            if (targetHourNum >= 20 || occupiedSlots.includes(targetTimeStr)) { isAvailable = false; break; }
            if (state.selectedDate === todayStr && j === 0 && (startHourNum < currentHour || (startHourNum === currentHour && 0 <= currentMinute))) { isAvailable = false; break; }
        }

        if (!isAvailable) {
            timeHTML += `<button disabled class="py-4 rounded-xl bg-slate-100 text-slate-400 line-through text-sm font-bold cursor-not-allowed border border-slate-200">${time}</button>`;
        } else {
            availableSlotsCount++;
            timeHTML += `<button onclick="selectTime('${time}', this)" class="time-btn card-convex-sm shadow-convex-sm py-4 bg-white text-slate-950 text-sm font-black active:scale-90 transition-all duration-300 animate-pop-in" style="animation-delay: ${i*20}ms">${time}</button>`;
        }
    });

    if (availableSlotsCount === 0) container.innerHTML = '<div class="col-span-3 text-center text-slate-500 py-6 font-medium bg-white rounded-2xl border border-slate-100 shadow-convex-sm">На жаль, на цю дату вільного часу немає 😔</div>';
    else container.innerHTML = timeHTML;
}

function selectTime(time, btnElement) {
    state.selectedTime = time;
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('selected-item', 'shadow-blue-300');
        btn.classList.add('bg-white', 'text-slate-950', 'shadow-convex-sm');
    });
    
    btnElement.classList.remove('bg-white', 'text-slate-950', 'shadow-convex-sm');
    btnElement.classList.add('selected-item', 'shadow-blue-300');
    
    if (state.editingBookingId) tg.MainButton.text = `Перенести візит на ${time}`;
    else tg.MainButton.text = `Підтвердити запис на ${time}`;
    
    tg.MainButton.show(); tg.MainButton.onClick(submitBooking);
}

// ==========================================
// МОДАЛЬНЕ ВІКНО СКАСУВАННЯ
// ==========================================
function openCancelModal(bookingId, role) {
    currentCancelBookingId = bookingId;
    currentCancelRole = role;
    const title = document.getElementById('cancel-modal-title');
    const input = document.getElementById('cancel-reason');
    if (role === 'client') {
        title.innerText = 'Скасувати?';
        input.placeholder = 'Напишіть причину скасування для майстра...';
    } else {
        title.innerText = 'Скасувати?';
        input.placeholder = 'Напишіть клієнту, чому візит скасовано...';
    }
    document.getElementById('cancel-modal').classList.remove('hidden'); 
    document.getElementById('cancel-modal').classList.add('flex');
}

function closeCancelModal() {
    currentCancelBookingId = null;
    currentCancelRole = null;
    document.getElementById('cancel-modal').classList.add('hidden'); 
    document.getElementById('cancel-modal').classList.remove('flex');
    document.getElementById('cancel-reason').value = '';
}

function confirmCancel() {
    const reason = document.getElementById('cancel-reason').value.trim();
    if (!reason) return tg.showAlert("Будь ласка, вкажіть причину для іншої сторони.");
    changeBookingStatus(currentCancelBookingId, 'Отменено', reason);
    closeCancelModal();
}
function confirmCancelAdmin() { confirmCancel(); }

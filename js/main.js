window.addEventListener('DOMContentLoaded', async () => {
    
    // ЄДИНИЙ глобальний обробник кнопки Назад
    tg.BackButton.onClick(() => {
        if (!document.getElementById('client-screen').classList.contains('hidden-step')) {
            // Якщо ми переносимо запис
            if (state.editingBookingId && !document.getElementById('step-datetime').classList.contains('hidden-step')) {
                state.editingBookingId = null;
                switchTab('client', 'bookings');
                return;
            }
            // Звичайна навігація клієнта
            if (!document.getElementById('step-datetime').classList.contains('hidden-step')) {
                showStep('step-master');
            } else if (!document.getElementById('step-master').classList.contains('hidden-step')) {
                showStep('step-booking');
            }
        }
    });

    await loadInitialData();
});

// НАСПРАВДІ ЦЬОГО БЛОКУ НЕ ВИСТАЧАЛО! 👇
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
        console.error("Init Error:", e);
        tg.showAlert("Помилка завантаження даних. Перевірте підключення до Інтернету.");
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
        
        tg.MainButton.color = "#14b8a6"; 
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

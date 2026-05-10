function switchTab(role, tabId) {
    document.querySelectorAll(role === 'admin' ? '.admin-tab-content' : '.tab-content').forEach(el => el.classList.add('hidden-step'));
    document.getElementById(role === 'admin' ? `admin-tab-${tabId}` : `tab-${tabId}`).classList.remove('hidden-step');
    
    document.getElementById(`${role}-bottom-nav`).classList.remove('hidden-step');

    const activeColor = role === 'admin' ? 'text-teal-600' : 'text-rose-500';
    ['home', 'bookings', 'profile'].forEach(nav => {
        const btn = document.getElementById(`${role}-nav-${nav}`);
        if(btn) {
            if (nav === tabId) {
                btn.classList.remove('text-slate-400');
                btn.classList.add(activeColor);
            } else {
                btn.classList.remove(activeColor);
                btn.classList.add('text-slate-400');
            }
        }
    });

    tg.BackButton.hide();
    tg.MainButton.hide();
    stopPolling();
    state.editingBookingId = null;

    if (role === 'client') {
        if (tabId === 'home') showStep('step-booking'); 
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
        tg.BackButton.hide();
        tg.MainButton.hide();
        state.selectedService = null; state.selectedMaster = null; state.selectedDate = null; state.selectedTime = null;
    } else {
        tg.BackButton.show();
    }
}

function startPolling(role, forDashboard = false) {
    stopPolling(); 
    pollingInterval = setInterval(() => { loadBookings(role, true, forDashboard); }, 10000); 
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

// Модальне вікно
function openCancelModal(bookingId, role) {
    currentCancelBookingId = bookingId;
    currentCancelRole = role;
    const title = document.getElementById('cancel-modal-title');
    const input = document.getElementById('cancel-reason');
    if (role === 'client') {
        title.innerText = 'Чому ви скасовуєте запис?';
        input.placeholder = 'Напишіть коментар для майстра...';
    } else {
        title.innerText = 'Причина скасування';
        input.placeholder = 'Напишіть клієнту, чому не виходить прийняти...';
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
    if (!reason) return tg.showAlert("Будь ласка, вкажіть причину.");
    changeBookingStatus(currentCancelBookingId, 'Отменено', reason);
    closeCancelModal();
}
function confirmCancelAdmin() { confirmCancel(); }

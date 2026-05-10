async function loadBookings(role, isSilent = false, forDashboard = false) {
    const containerId = role === 'admin' ? (forDashboard ? null : 'admin-bookings-list') : 'my-bookings-list';
    if (!isSilent && containerId) document.getElementById(containerId).innerHTML = '<div class="text-center py-4 text-slate-500 animate-pulse">Завантаження...</div>';
    
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
        if (!isSilent && containerId) document.getElementById(containerId).innerHTML = '<div class="text-center py-4 text-red-500">Помилка завантаження.</div>';
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
    } catch (e) { tg.showAlert('Помилка з\'єднання.');
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
            const msg = state.editingBookingId ? 'Час візиту успішно змінено! Запис очікує підтвердження майстром.' : 'Супер! Ваш запис успішно створено 🎉';
            state.editingBookingId = null; 
            tg.showAlert(msg, () => { switchTab('client', 'bookings'); });
        } else tg.showAlert('Помилка: ' + result.message);
    } catch (e) { tg.showAlert('Помилка підключення.'); } 
    finally { tg.MainButton.hideProgress(); }
}

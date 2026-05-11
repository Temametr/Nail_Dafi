import { state } from '../../state.js';

import {
    getById
} from '../../core/ui/dom.js';

export function setActiveNav(role, tabId) {
    const activeColor = role === 'admin'
        ? 'text-teal-600'
        : 'text-blue-500';

    ['home', 'bookings', 'messages', 'profile'].forEach(nav => {
        const btn = getById((`${role}-nav-${nav}`);

        if (!btn) return;

        if (nav === tabId) {
            btn.classList.remove('text-slate-400');
            btn.classList.add(activeColor, 'bg-white/50');
        } else {
            btn.classList.remove(activeColor, 'bg-white/50');
            btn.classList.add('text-slate-400');
        }
    });
}

export function updateHeaderTitle(role, tabId) {
    const title = getById((
        role === 'client'
            ? 'client-header-title'
            : 'admin-header-title'
    );

    if (!title) return;

    const firstName =
        state.user && state.user.first_name
            ? state.user.first_name
            : 'Гість';

    if (role === 'client') {
        const titles = {
            home: `Привіт, <span class="text-blue-600">${firstName}</span> 👋`,
            bookings: 'Твої візити 💅',
            messages: 'Мої чати 💬',
            profile: 'Мій кабінет ⚙️'
        };

        title.innerHTML = titles[tabId] || titles.home;
        return;
    }

    const adminName =
        state.adminMasterInfo && state.adminMasterInfo.name
            ? state.adminMasterInfo.name
            : 'Майстер';

    const cleanName = adminName
        .replace(/^(Майстер|Мастер)\s+/i, '')
        .trim();

    title.innerHTML = tabId === 'home'
        ? `Панель: <span class="text-teal-600">${cleanName}</span> 📊`
        : 'Розклад 📅';
}
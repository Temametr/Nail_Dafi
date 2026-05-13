import { state } from '../../state.js';

import {
    getById
} from '../../core/ui/dom.js';

export function setActiveNav(role, tabId) {
    const activeColor = role === 'admin'
        ? 'text-teal-600'
        : 'text-blue-500';

    const navItems = role === 'admin'
    ? ['home', 'bookings', 'clients']
    : ['home', 'bookings', 'profile'];

navItems.forEach(nav => {
        const btn = getById(`${role}-nav-${nav}`);

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
    const title = getById(
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

    if (tabId === 'clients') {
    title.innerHTML = `
        <div class="flex flex-col leading-tight">
            <span class="text-[20px] font-black text-slate-900 truncate">
                Клієнти
            </span>
            <span class="text-[12px] font-bold text-slate-400">
                База клієнтів салону
            </span>
        </div>
    `;
} else {
    title.innerHTML = `
        <div class="flex flex-col leading-tight">
            <span class="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                Привітик 👋
            </span>
            <span class="text-[20px] font-black text-slate-900 truncate">
                ${cleanName}
            </span>
        </div>
    `;
}
updateAdminAvatar();
}
function getAdminAvatarImage() {
    const masters = state.masters || [];
    const admin = state.adminMasterInfo;

    if (!admin) {
        return 'media/IMG_0222.jpeg';
    }

    const index = masters.findIndex(master =>
        String(master.id) === String(admin.id)
    );

    return index === 1
        ? 'media/IMG_0223.jpeg'
        : 'media/IMG_0222.jpeg';
}

function updateAdminAvatar() {
    const avatar = getById('admin-avatar-img');

    if (!avatar) return;

    avatar.src = getAdminAvatarImage();
}
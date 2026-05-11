export function openTelegramChat(username) {

    if (!username) {

        return window.Telegram.WebApp.showAlert(
            'Telegram не підключений'
        );
    }

    const cleanUsername =
        String(username)
            .replace('@', '')
            .trim();

    if (!cleanUsername) {

        return window.Telegram.WebApp.showAlert(
            'Некоректний Telegram username'
        );
    }

    window.Telegram.WebApp.openTelegramLink(
        `https://t.me/${cleanUsername}`
    );
}
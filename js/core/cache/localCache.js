export function getCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);

        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            localStorage.removeItem(key);
            return null;
        }

        return parsed.value;
    } catch (error) {
        console.error('[localCache:getCache]', error);
        return null;
    }
}

export function setCache(key, value, ttlMs = 300000) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify({
                value,
                expiresAt: Date.now() + ttlMs
            })
        );
    } catch (error) {
        console.error('[localCache:setCache]', error);
    }
}

export function removeCache(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('[localCache:removeCache]', error);
    }
}
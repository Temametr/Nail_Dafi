const locks = new Set();

export async function runLocked(key, action) {
    if (locks.has(key)) {
        return null;
    }

    locks.add(key);

    try {
        return await action();
    } finally {
        locks.delete(key);
    }
}

export function isLocked(key) {
    return locks.has(key);
}
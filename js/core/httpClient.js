export class ApiRequestError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'ApiRequestError';
        this.details = details;
    }
}

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_RETRY_COUNT = 1;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildUrl(baseUrl, params = {}) {
    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });

    return url.toString();
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function parseJsonResponse(response) {
    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new ApiRequestError('Сервер повернув некоректну JSON-відповідь', {
            status: response.status,
            bodyPreview: text.slice(0, 300)
        });
    }
}

export async function requestJson(url, options = {}) {
    const {
        method = 'GET',
        params = {},
        body = null,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        retryCount = DEFAULT_RETRY_COUNT
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            const targetUrl = buildUrl(url, params);

            const response = await fetchWithTimeout(targetUrl, {
                method,
                headers: body
                    ? { 'Content-Type': 'text/plain;charset=utf-8' }
                    : undefined,
                body: body ? JSON.stringify(body) : undefined
            }, timeoutMs);

            const payload = await parseJsonResponse(response);

            if (!response.ok) {
                throw new ApiRequestError('HTTP-помилка запиту', {
                    status: response.status,
                    payload
                });
            }

            return payload;
        } catch (error) {
            lastError = error.name === 'AbortError'
                ? new ApiRequestError('Сервер не відповів вчасно. Спробуйте ще раз.', { timeoutMs })
                : error;

            if (attempt < retryCount) {
                await sleep(350 * (attempt + 1));
            }
        }
    }

    throw lastError;
}
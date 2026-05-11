import { API_URL, state } from '../state.js';

function buildUrl(params = {}) {

    const url = new URL(API_URL);

    Object.entries(params).forEach(([key, value]) => {

        if (

            value !== undefined &&

            value !== null

        ) {

            url.searchParams.append(key, value);

        }

    });

    return url.toString();

}

async function safeJson(response) {

    const text = await response.text();

    try {

        return JSON.parse(text);

    } catch (error) {

        console.error('CHAT API JSON ERROR:', text);

        return {

            status: 'error',

            message: 'Invalid JSON response'

        };

    }

}

function getUserId() {

    return state.user?.id

        ? String(state.user.id)

        : '';

}

export async function fetchChats(role) {

    try {

        const response = await fetch(

            buildUrl({

                action: 'getChats',

                userId: getUserId(),

                role

            })

        );

        return safeJson(response);

    } catch (error) {

        console.error(

            'fetchChats error:',

            error

        );

        return {

            status: 'error',

            message: error.message

        };

    }

}

export async function fetchMessages(chatId) {

    try {

        const response = await fetch(

            buildUrl({

                action: 'getMessages',

                chatId,

                userId: getUserId()

            })

        );

        return safeJson(response);

    } catch (error) {

        console.error(

            'fetchMessages error:',

            error

        );

        return {

            status: 'error',

            message: error.message

        };

    }

}

export async function fetchUnreadCounts(role) {

    try {

        const response = await fetch(

            buildUrl({

                action: 'getUnreadCounts',

                userId: getUserId(),

                role

            })

        );

        return safeJson(response);

    } catch (error) {

        console.error(

            'fetchUnreadCounts error:',

            error

        );

        return {

            status: 'error',

            message: error.message

        };

    }

}

export async function markChatRead(

    chatId,

    role

) {

    try {

        const response = await fetch(

            API_URL,

            {

                method: 'POST',

                headers: {

                    'Content-Type': 'application/json'

                },

                body: JSON.stringify({

                    action: 'markChatRead',

                    chatId,

                    role,

                    userId: getUserId()

                })

            }

        );

        return safeJson(response);

    } catch (error) {

        console.error(

            'markChatRead error:',

            error

        );

        return {

            status: 'error',

            message: error.message

        };

    }

}

export async function sendMessage(payload) {

    try {

        const response = await fetch(

            API_URL,

            {

                method: 'POST',

                headers: {

                    'Content-Type': 'application/json'

                },

                body: JSON.stringify({

                    action: 'sendMessage',

                    ...payload

                })

            }

        );

        return safeJson(response);

    } catch (error) {

        console.error(

            'sendMessage error:',

            error

        );

        return {

            status: 'error',

            message: error.message

        };

    }

}
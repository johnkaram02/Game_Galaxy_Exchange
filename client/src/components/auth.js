export const setTokens = ({ token, tokenExpiration, refreshToken, refreshTokenExpiration }) => {
    const tokenExpiresAt = new Date(tokenExpiration).getTime();
    const refreshTokenExpiresAt = new Date(refreshTokenExpiration).getTime();

    localStorage.setItem('token', token);
    localStorage.setItem('tokenExpiresAt', tokenExpiresAt.toString());
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('refreshTokenExpiresAt', refreshTokenExpiresAt.toString());
    localStorage.setItem('isAuthenticated', 'true');
};

export const clearTokens = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiresAt');
    localStorage.removeItem('isAuthenticated');
};

export const getToken = async () => {
    const tokenExpiresAt = localStorage.getItem('tokenExpiresAt');
    const now = new Date().getTime();

    if (!tokenExpiresAt || now > parseInt(tokenExpiresAt, 10)) {
        try {
            await refreshAccessToken();
        } catch (error) {
            clearTokens();
            return null;
        }
    }

    return localStorage.getItem('token');
};

export const refreshAccessToken = async () => {
    const refreshTokenExpiresAt = localStorage.getItem('refreshTokenExpiresAt');
    const now = new Date().getTime();

    if (!refreshTokenExpiresAt || now > parseInt(refreshTokenExpiresAt, 10)) {
        clearTokens();
        throw new Error('Refresh token expired.');
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        clearTokens();
        throw new Error('No refresh token available.');
    }

    const response = await fetch('https://localhost:7041/Game_Galaxy/user/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
        clearTokens();
        throw new Error('Failed to refresh token.');
    }

    const data = await response.json();
    setTokens({
        token: data.token,
        tokenExpiration: data.tokenExpiration,
        refreshToken: data.refreshToken,
        refreshTokenExpiration: data.refreshTokenExpiration
    });

    return data.token;
};

export const isAuthenticated = () => {
    return localStorage.getItem('isAuthenticated') === 'true' && localStorage.getItem('token') != null;
};

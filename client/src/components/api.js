import axios from 'axios';
import { setTokens, clearTokens, getToken, getRefreshToken } from './auth';

const api = axios.create({
    baseURL: 'https://localhost:7041/Game_Galaxy',
});

api.interceptors.request.use(config => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = getRefreshToken();
            if (refreshToken) {
                try {
                    const response = await axios.post('https://localhost:7041/Game_Galaxy/refresh-token', {
                        refreshToken,
                    });

                    if (response.status === 200) {
                        const { token, refreshToken: newRefreshToken } = response.data;
                        setTokens(token, newRefreshToken);
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axios(originalRequest);
                    }
                } catch (e) {
                    clearTokens();
                    window.location.href = '/login';
                    return Promise.reject(e);
                }
            } else {
                clearTokens();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);



export default api;

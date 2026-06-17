import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
});
// Retry logic
apiClient.interceptors.response.use((response) => response, async (error) => {
    const config = error.config;
    const retryConfig = config;
    if (!retryConfig.retryCount) {
        retryConfig.retryCount = 0;
    }
    if (retryConfig.retryCount < 3 && error.response?.status !== 422) {
        retryConfig.retryCount += 1;
        const delay = Math.pow(2, retryConfig.retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return apiClient(config);
    }
    return Promise.reject(error);
});
export class ApiError extends Error {
    constructor(status, message, originalError) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: status
        });
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: message
        });
        Object.defineProperty(this, "originalError", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: originalError
        });
        this.name = 'ApiError';
    }
}

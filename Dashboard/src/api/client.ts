import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Retry logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config
    const retryConfig = config as any

    if (!retryConfig.retryCount) {
      retryConfig.retryCount = 0
    }

    if (retryConfig.retryCount < 3 && error.response?.status !== 422) {
      retryConfig.retryCount += 1
      const delay = Math.pow(2, retryConfig.retryCount) * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
      return apiClient(config!)
    }

    return Promise.reject(error)
  }
)

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

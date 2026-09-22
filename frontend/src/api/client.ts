import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = [];

const redirectToLogin = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  const path = window.location.pathname;
  const loginPath = path.startsWith('/traveler')
    ? '/traveler/login'
    : path.startsWith('/services')
      ? '/traveler/login'
      : '/login';
  if (path !== loginPath) {
    window.location.href = loginPath;
  }
};

const onRefreshed = (token: string) => {
  pendingQueue.forEach((callback) => callback(token));
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && config && !config._retry) {
      const isAuthCall =
        config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh');
      if (isAuthCall) {
        redirectToLogin();
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      config._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(config));
          });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh/`,
          { refresh: refreshToken }
        );
        const newToken = data.data.access_token;
        localStorage.setItem('access_token', newToken);
        onRefreshed(newToken);
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      } catch (refreshError) {
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 401) {
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
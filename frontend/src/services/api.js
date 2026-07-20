import axios from 'axios';
import { clearAuth, getRefreshToken, saveAuth } from '../utils/authStorage.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === '1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截：刷新接口用 refresh_token，其余用 access_token
api.interceptors.request.use(
  (config) => {
    const isRefresh = config.url?.includes('/auth/refresh');
    const token = isRefresh ? getRefreshToken() : localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截：统一信封 + 401 处理
api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && data.success === false) {
      const error = new Error(data.message || '请求失败');
      error.code = data.code;
      error.data = data.data;
      return Promise.reject(error);
    }
    return response;
  },
  async (error) => {
    if (error.response) {
      const { status, data, config } = error.response;
      const isRefreshCall = config?.url?.includes('/auth/refresh');

      // 401 且非刷新接口：尝试刷新 Token 一次
      if (status === 401 && !isRefreshCall && getRefreshToken() && !config._retry) {
        config._retry = true;
        try {
          const refreshRes = await api.post('/auth/refresh');
          const body = refreshRes.data;
          if (body?.success && body.data) {
            saveAuth(body.data);
            config.headers.Authorization = `Bearer ${body.data.access_token}`;
            return api.request(config);
          }
        } catch {
          /* 刷新失败则走下方登出逻辑 */
        }
      }

      if (status === 401 && !AUTH_DISABLED) {
        clearAuth();
        const onLogin = window.location.hash.includes('/login');
        if (!onLogin) {
          window.location.href = '/#/login';
        }
      }
      error.message = data?.message || `请求失败 (${status})`;
    } else if (error.request) {
      error.message = '网络连接失败，请检查后端服务是否运行';
    }
    return Promise.reject(error);
  },
);

export const request = async (method, url, data = null, config = {}) => {
  const response = await api.request({ method, url, data, ...config });
  return response.data;
};

export const get = (url, params = {}, config = {}) =>
  request('GET', url, null, { params, ...config });

export const post = (url, data = {}, config = {}) =>
  request('POST', url, data, config);

export const put = (url, data = {}, config = {}) =>
  request('PUT', url, data, config);

export const del = (url, config = {}) =>
  request('DELETE', url, null, config);

export const uploadFile = async (url, file, extraData = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(extraData).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return request('POST', url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadFiles = async (url, files, extraData = {}) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  Object.entries(extraData).forEach(([key, value]) => formData.append(key, value));
  return request('POST', url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;

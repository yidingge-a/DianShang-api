import { post, get } from '../api.js';
import { getRefreshToken } from '../../utils/authStorage.js';

export const authApi = {
  register: (data) => post('/auth/register', data),

  login: (data) => post('/auth/login', data),

  /** 刷新 Token：请求头携带 refresh_token（见 api.js 拦截器） */
  refresh: () => {
    if (!getRefreshToken()) {
      return Promise.reject(new Error('无 Refresh Token'));
    }
    return post('/auth/refresh');
  },

  me: () => get('/auth/me'),
};

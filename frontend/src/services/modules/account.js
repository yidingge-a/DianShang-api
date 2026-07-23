import { get } from '../api.js';

export const accountApi = {
  me: () => get('/account/me'),
  history: (params = {}) => get('/account/history', params),
};

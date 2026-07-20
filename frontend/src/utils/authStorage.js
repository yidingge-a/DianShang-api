/** 登录态本地存储（与 api.js 拦截器配合） */

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user_info';

/** 登录成功后写入 Token 与用户信息 */
export function saveAuth(tokenData) {
  if (tokenData?.access_token) {
    localStorage.setItem(ACCESS_KEY, tokenData.access_token);
  }
  if (tokenData?.refresh_token) {
    localStorage.setItem(REFRESH_KEY, tokenData.refresh_token);
  }
  if (tokenData?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(tokenData.user));
  }
}

/** 退出登录时清除 */
export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getUserInfo() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getAccessToken());
}

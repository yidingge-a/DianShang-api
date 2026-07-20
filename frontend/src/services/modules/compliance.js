import { post, get } from '../api.js';

export const complianceApi = {
  // 生成平台专属详情页文案
  generateDetailPage: (data) => post('/compliance/detail-page/generate', data),
  
  // 获取平台文案规范
  getPlatformGuidelines: (platform) => get(`/compliance/platforms/${platform}/guidelines`),
  
  // 生成营销文案
  generateAdCopy: (data) => post('/compliance/ad-copy/generate', data),
  
  // 违禁词检测
  checkForbiddenWords: (data) => post('/compliance/forbidden-words/check', data),
  
  // 获取违禁词库
  getForbiddenWords: (params) => get('/compliance/forbidden-words', params),
};

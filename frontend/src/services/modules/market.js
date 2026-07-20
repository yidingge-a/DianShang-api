import { post, get } from '../api.js';

export const marketApi = {
  // 匹配产业链资源
  matchIndustryChain: (data) => post('/market/industry-chain/match', data),
  
  // 生成市场分析报告
  generateReport: (data) => post('/market/analysis/report', data),
  
  // 获取数据趋势
  getTrends: (params) => get('/market/trends', params),
  
  // 获取市场数据预览
  getOverview: (keyword) => get('/market/overview', { keyword }),
};

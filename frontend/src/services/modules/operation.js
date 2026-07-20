import { post, get } from '../api.js';

export const operationApi = {
  // 生成营销方案
  generateStrategies: (data) => post('/operation/marketing/strategies', data),
  
  // 获取推广效果预估
  estimateEffect: (data) => post('/operation/promotion/effect-estimate', data),
  
  // 接入数据监控
  setupMonitor: (data) => post('/operation/monitor/setup', data),
  
  // 获取监控数据
  getMonitorData: (monitorId, timeRange) => get(`/operation/monitor/${monitorId}/data`, { time_range: timeRange }),
  
  // 生成优化建议
  generateOptimization: (data) => post('/operation/monitor/optimize', data),
};

import { useState, useEffect, useCallback } from 'react';
import { get } from '../services/api.js';

/**
 * 轮询任务状态的自定义Hook
 * @param {string} taskId - 任务ID
 * @param {string} taskUrl - 查询任务状态的API路径
 * @param {number} interval - 轮询间隔（毫秒），默认3000
 * @param {number} maxAttempts - 最大轮询次数，默认100
 */
export function useTaskPolling(taskId, taskUrl, interval = 3000, maxAttempts = 100) {
  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const stopPolling = useCallback(() => {
    setStatus('stopped');
  }, []);

  useEffect(() => {
    if (!taskId || status === 'stopped') return;

    let timer = null;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      
      try {
        const response = await get(taskUrl.replace('{taskId}', taskId));
        const data = response.data;
        
        if (!isMounted) return;
        
        setStatus(data.status);
        setProgress(data.progress || 0);
        
        if (data.status === 'completed') {
          setResult(data);
          return;
        }
        
        if (data.status === 'failed') {
          setError(data.error_message || '任务处理失败');
          return;
        }
        
        setAttempts(prev => prev + 1);
        
        if (attempts >= maxAttempts) {
          setError('任务处理超时，请稍后查看结果');
          return;
        }
        
        timer = setTimeout(poll, interval);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || '查询任务状态失败');
        timer = setTimeout(poll, interval);
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [taskId, taskUrl, interval, maxAttempts, status, attempts]);

  return { status, progress, result, error, stopPolling };
}

/**
 * 文件上传进度Hook
 */
export function useUploadProgress() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const startUpload = () => {
    setProgress(0);
    setUploading(true);
    setError(null);
  };

  const updateProgress = (percent) => {
    setProgress(percent);
  };

  const finishUpload = () => {
    setProgress(100);
    setUploading(false);
  };

  const failUpload = (err) => {
    setError(err);
    setUploading(false);
  };

  return { progress, uploading, error, startUpload, updateProgress, finishUpload, failUpload };
}

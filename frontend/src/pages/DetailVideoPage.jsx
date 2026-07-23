import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, FileImage, Upload, X, Loader2, Check, Download, FileImage as FileImageIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { smartDesignApi, uploadApi } from '../services/index.js';
import { Progress } from '@/components/ui/progress';


function toAssetPath(url) {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const idx = url.indexOf('/uploads/');
  if (idx >= 0) return url.slice(idx);
  try {
    const u = new URL(url, window.location.origin);
    if (u.pathname.startsWith('/uploads')) return `${u.pathname}${u.search || ''}`;
  } catch { /* ignore */ }
  return url;
}

const UPLOAD_STORAGE_KEY = 'smart-design-detail-uploads-v1';
const OPTIONS_STORAGE_KEY = 'smart-design-detail-options-v4';
const ACTIVE_TASK_STORAGE_KEY = 'smart-design-detail-active-task-v1';
const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
const DETAIL_STYLE_LABELS = {
  modern: '现代简约',
  minimal: '极简风格',
  luxury: '奢华风格',
  cute: '可爱风格',
};

function loadStoredUploads() {
  try {
    const raw = localStorage.getItem(UPLOAD_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((f) => f && f.file_id && (f.file_url || f.previewUrl))
      .map((f) => ({
        file_id: f.file_id,
        file_name: f.file_name || 'image',
        file_url: f.file_url || '',
        previewUrl: (f.previewUrl && String(f.previewUrl).startsWith('blob:')) ? f.previewUrl : toAssetPath(f.file_url || f.previewUrl || ''),
        mime_type: f.mime_type,
        file_size: f.file_size,
      }));
  } catch {
    return [];
  }
}


function loadActiveTask() {
  try {
    const raw = localStorage.getItem(ACTIVE_TASK_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !o.taskId) return null;
    return o;
  } catch {
    return null;
  }
}

function saveActiveTask(payload) {
  try {
    if (!payload?.taskId) {
      localStorage.removeItem(ACTIVE_TASK_STORAGE_KEY);
      return;
    }
    localStorage.setItem(ACTIVE_TASK_STORAGE_KEY, JSON.stringify({
      ...payload,
      updatedAt: Date.now(),
    }));
  } catch { /* ignore */ }
}

function clearActiveTask() {
  try {
    localStorage.removeItem(ACTIVE_TASK_STORAGE_KEY);
  } catch { /* ignore */ }
}

function persistUploads(files) {
  try {
    const slim = files.map((f) => ({
      file_id: f.file_id,
      file_name: f.file_name,
      file_url: f.file_url || f.previewUrl || '',
      mime_type: f.mime_type,
      file_size: f.file_size,
    })).filter((f) => f.file_id && f.file_url);
    localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* ignore quota */
  }
}

const DetailVideoPage = () => {
  const [activeTab, setActiveTab] = useState('detail');
  const [uploadedFiles, setUploadedFiles] = useState(() => loadStoredUploads());
  const [isUploading, setIsUploading] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [activeDetailTaskId, setActiveDetailTaskId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [detailPageOptions, setDetailPageOptions] = useState(() => {
    try {
      const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        const style = DETAIL_STYLE_LABELS[o.style] ? o.style : 'modern';
        return {
          product_name: o.product_name || '',
          product_description: o.product_description || '',
          style,
          section_count: [4, 6, 9].includes(Number(o.section_count)) ? Number(o.section_count) : 9,
          image_model: DEFAULT_IMAGE_MODEL,
        };
      }
    } catch { /* ignore */ }
    return {
      product_name: '',
      product_description: '',
      style: 'modern',
      section_count: 9,
      image_model: DEFAULT_IMAGE_MODEL,
    };
  });
  const [videoOptions, setVideoOptions] = useState({
    product_name: '', duration: 15, style: 'dynamic',
  });

  useEffect(() => {
    persistUploads(uploadedFiles);
  }, [uploadedFiles]);

  useEffect(() => {
    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(detailPageOptions));
    } catch { /* ignore */ }
  }, [detailPageOptions]);


  // 刷新后恢复进行中的详情页任务
  useEffect(() => {
    const saved = loadActiveTask();
    if (!saved?.taskId || saved.kind !== 'detail-page') return;
    let cancelled = false;
    const expected = Number(saved.expectedCount) || 9;
    setActiveDetailTaskId(saved.taskId);
    if (saved.snapshot?.resultData) setResultData(saved.snapshot.resultData);
    if (saved.snapshot?.taskStatus) setTaskStatus(saved.snapshot.taskStatus);
    setActiveTab('detail');
    if (saved.status !== 'completed') {
      setProcessingTask('detail-page');
      toast.message('已恢复进行中的详情页任务，继续同步进度…');
    } else if (saved.snapshot?.resultData) {
      setResultData(saved.snapshot.resultData);
      setTaskStatus(saved.snapshot.taskStatus || { status: 'completed', progress: 100 });
      toast.message('已恢复上次生成结果');
    }

    (async () => {
      try {
        const response = await smartDesignApi.getTaskStatus(saved.taskId);
        if (cancelled) return;
        const data = response.data || {};
        if (data.status === 'completed') {
          const pages = data.preview_images || data.result?.preview_images || saved.snapshot?.resultData?.preview_images || [];
          const zip = data.download_zip_url || data.result?.download_zip_url
            || `/uploads/generated/detail_${saved.taskId}_pages.zip`;
          setResultData({
            ...data,
            download_zip_url: zip,
            html_url: data.html_url || data.result?.html_url || '',
            preview_images: pages,
            pages_total: expected,
            pages_done: pages.length,
            pages_count: pages.length,
          });
          setTaskStatus({
            status: 'completed',
            progress: 100,
            message: `已完成 ${pages.length}/${expected} 屏`,
            pages_total: expected,
            pages_done: pages.length,
          });
          setProcessingTask(null);
              saveActiveTask({
            kind: 'detail-page',
            taskId: saved.taskId,
            expectedCount: expected,
            status: 'completed',
            snapshot: {
              taskStatus: { status: 'completed', progress: 100, pages_total: expected, pages_done: pages.length },
              resultData: {
                product_name: data.product_name,
                preview_images: pages,
                download_zip_url: zip,
                html_url: data.html_url || data.result?.html_url || '',
              },
            },
          });
        } else if (data.status === 'failed') {
          clearActiveTask();
          setProcessingTask(null);
          setTaskStatus({
            status: 'failed',
            progress: data.progress || 0,
            message: data.error_message || data.message || '生成失败',
          });
          toast.error('恢复的任务已失败: ' + (data.error_message || data.message || '未知错误'));
        } else {
          // 仍在进行：恢复预览并继续轮询
          const total = Number(data.pages_total || expected) || expected;
          const done = Number(data.pages_done || (data.preview_images || []).length || 0);
          setTaskStatus({
            status: data.status || 'processing',
            progress: data.progress ?? 0,
            message: data.message || `正在生成 ${done}/${total} 屏`,
            pages_total: total,
            pages_done: done,
            current_title: data.current_title,
          });
          if (Array.isArray(data.preview_images) && data.preview_images.length > 0) {
            setResultData((prev) => ({
              ...(prev || {}),
              product_name: data.product_name || prev?.product_name,
              pages_total: total,
              pages_done: done,
              preview_images: data.preview_images,
              download_zip_url: data.download_zip_url || prev?.download_zip_url || '',
              html_url: data.html_url || prev?.html_url || '',
            }));
          }
          pollDetailTaskStatus(saved.taskId, expected);
        }
      } catch (err) {
        if (cancelled) return;
        // 查不到任务则清理
        clearActiveTask();
        setProcessingTask(null);
        toast.warning('无法恢复任务进度，请重新生成');
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length > 0) await handleUpload(files);
  }, []);

  const handleUpload = async (files) => {
    setIsUploading(true);
    const newFiles = [];
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} 超过10MB限制`); continue; }
        const response = await uploadApi.upload(file, 'image', 'smart-design');
        if (response.success) {
          const data = response.data || {};
          const fileUrl = data.file_url || '';
          newFiles.push({
            ...data,
            previewUrl: fileUrl || URL.createObjectURL(file),
          });
          toast.success(`${file.name} 上传成功`);
        }
      }
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      toast.error('上传失败: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) handleUpload(files);
  };
  const removeFile = (fileId) => setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId));

  const handleGenerateDetailPage = async () => {
    const hasText = detailPageOptions.product_name.trim() || detailPageOptions.product_description.trim();
    if (!hasText && uploadedFiles.length === 0) {
      toast.warning('请上传产品图，或填写产品名称/描述');
      return;
    }
    try {
      const sectionCount = [4, 6, 9].includes(Number(detailPageOptions.section_count))
        ? Number(detailPageOptions.section_count)
        : 9;
      setDetailPageOptions((prev) => ({ ...prev, section_count: sectionCount }));
      setProcessingTask('detail-page');
      setActiveDetailTaskId(null);
      clearActiveTask();
      setResultData({
        preview_images: [],
        pages_total: sectionCount,
        pages_done: 0,
        download_zip_url: '',
        html_url: '',
      });
      setTaskStatus({
        status: 'processing',
        progress: 5,
        message: `任务提交中，将生成 ${sectionCount} 屏…`,
        pages_total: sectionCount,
        pages_done: 0,
      });
      toast.message(`已提交任务：固定生成 ${sectionCount} 屏，请勿中途关闭`);
      const styleId = DETAIL_STYLE_LABELS[detailPageOptions.style]
        ? detailPageOptions.style
        : 'modern';
      const sellingPoints = (detailPageOptions.product_description || '').trim();
      const response = await smartDesignApi.generateDetailPage({
        product_name: (detailPageOptions.product_name || '').trim(),
        product_description: sellingPoints,
        selling_points: sellingPoints,
        style: styleId,
        style_label: DETAIL_STYLE_LABELS[styleId],
        section_count: sectionCount,
        pages_count: sectionCount,
        image_model: DEFAULT_IMAGE_MODEL,
        product_images: uploadedFiles.map(f => f.file_id),
        use_product_reference: uploadedFiles.length > 0,
        skill: 'goods-images',
      });
      if (response.success && response.data?.task_id) {
        setActiveDetailTaskId(response.data.task_id);
        const initialStatus = {
          status: 'processing',
          progress: response.data.progress || 5,
          message: response.data.message || `任务已创建，目标 ${sectionCount} 屏`,
          pages_total: sectionCount,
          pages_done: response.data.pages_done || 0,
        };
        setTaskStatus(initialStatus);
        saveActiveTask({
          kind: 'detail-page',
          taskId: response.data.task_id,
          expectedCount: sectionCount,
          status: 'processing',
          snapshot: {
            taskStatus: initialStatus,
            resultData: {
              product_name: detailPageOptions.product_name,
              pages_total: sectionCount,
              pages_done: 0,
              preview_images: [],
            },
          },
        });
        pollDetailTaskStatus(response.data.task_id, sectionCount);
      } else if (response.success) {
        // 兼容旧同步返回
        toast.success('详情页生成完成');
        setResultData(response.data);
          setTaskStatus({ status: 'completed', progress: 100, message: '完成' });
        setProcessingTask(null);
      }
    } catch (error) {
      toast.error('生成失败: ' + error.message);
      setTaskStatus(null);
      setProcessingTask(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoOptions.product_name) { toast.warning('请输入产品名称'); return; }
    try {
      setProcessingTask('video');
      const response = await smartDesignApi.generateVideo({
        ...videoOptions,
        product_images: uploadedFiles.map(f => f.file_id),
      });
      if (response.success) {
        toast.success('视频生成任务已提交');
        pollTaskStatus(response.data.task_id);
      }
    } catch (error) {
      toast.error('生成失败: ' + error.message);
      setProcessingTask(null);
    }
  };

  const pollDetailTaskStatus = async (taskId, expectedCount = 9) => {
    let attempts = 0;
    const maxAttempts = 900; // GPT 较慢，最长约 30 分钟
    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        toast.error('任务处理超时，请稍后重试（刷新页面可继续尝试同步进度）');
        setProcessingTask(null);
        // 保留 taskId，刷新后仍可恢复
        return;
      }
      try {
        const response = await smartDesignApi.getTaskStatus(taskId);
        const data = response.data || {};
        const total = Number(data.pages_total || expectedCount) || expectedCount;
        const done = Number(data.pages_done || (data.preview_images || []).length || 0);
        setTaskStatus({
          status: data.status,
          progress: data.progress ?? 0,
          message: data.message || `正在生成 ${done}/${total} 屏`,
          pages_total: total,
          pages_done: done,
          current_title: data.current_title,
        });
        if (Array.isArray(data.preview_images) && data.preview_images.length > 0) {
          setResultData((prev) => {
            const next = {
              ...(prev || {}),
              product_name: data.product_name || prev?.product_name,
              pages_total: total,
              pages_done: done,
              preview_images: data.preview_images,
              // 进行中不要带上空 zip 覆盖
              download_zip_url: data.download_zip_url || prev?.download_zip_url || '',
              html_url: data.html_url || prev?.html_url || '',
            };
            saveActiveTask({
              kind: 'detail-page',
              taskId,
              expectedCount: total,
              status: 'processing',
              snapshot: {
                taskStatus: {
                  status: data.status,
                  progress: data.progress ?? 0,
                  message: data.message || `正在生成 ${done}/${total} 屏`,
                  pages_total: total,
                  pages_done: done,
                  current_title: data.current_title,
                },
                resultData: next,
              },
            });
            return next;
          });
        } else {
          saveActiveTask({
            kind: 'detail-page',
            taskId,
            expectedCount: total,
            status: 'processing',
            snapshot: {
              taskStatus: {
                status: data.status,
                progress: data.progress ?? 0,
                message: data.message || `正在生成 ${done}/${total} 屏`,
                pages_total: total,
                pages_done: done,
                current_title: data.current_title,
              },
            },
          });
        }
        if (data.status === 'completed') {
          const zip = data.download_zip_url || data.result?.download_zip_url
            || `/uploads/generated/detail_${taskId}_pages.zip`;
          const pages = data.preview_images || data.result?.preview_images || [];
          const finalCount = pages.length || data.pages_count || done;
          if (finalCount < expectedCount) {
            toast.error(`只生成了 ${finalCount}/${expectedCount} 屏，未达所选屏数`);
          } else {
            toast.success(`详情页 ${finalCount} 屏已完成`);
          }
          setResultData({
            ...data,
            download_zip_url: zip,
            html_url: data.html_url || data.result?.html_url || '',
            preview_images: pages,
            pages_total: expectedCount,
            pages_done: finalCount,
            pages_count: finalCount,
          });
          setActiveDetailTaskId(taskId);
              setTaskStatus({
            status: 'completed',
            progress: 100,
            message: `已完成 ${finalCount}/${expectedCount} 屏`,
            pages_total: expectedCount,
            pages_done: finalCount,
          });
          setProcessingTask(null);
          saveActiveTask({
            kind: 'detail-page',
            taskId,
            expectedCount,
            status: 'completed',
            snapshot: {
              taskStatus: {
                status: 'completed',
                progress: 100,
                message: `已完成 ${finalCount}/${expectedCount} 屏`,
                pages_total: expectedCount,
                pages_done: finalCount,
              },
              resultData: {
                product_name: data.product_name,
                preview_images: pages,
                download_zip_url: zip,
                html_url: data.html_url || data.result?.html_url || '',
                pages_total: expectedCount,
                pages_done: finalCount,
                pages_count: finalCount,
              },
            },
          });
        } else if (data.status === 'failed') {
          toast.error('生成失败: ' + (data.error_message || data.message || '未知错误'));
          setProcessingTask(null);
          clearActiveTask();
        } else {
          attempts += 1;
          setTimeout(checkStatus, 2000);
        }
      } catch (error) {
        toast.error('查询进度失败: ' + error.message + '（将自动重试）');
        attempts += 1;
        setTimeout(checkStatus, 3000);
      }
    };
    checkStatus();
  };

  const pollTaskStatus = async (taskId) => {
    let attempts = 0;
    const checkStatus = async () => {
      if (attempts >= 60) { toast.error('任务处理超时'); setProcessingTask(null); return; }
      try {
        const response = await smartDesignApi.getTaskStatus(taskId);
        const data = response.data;
        setTaskStatus(data);
        if (data.status === 'completed') {
          toast.success('任务完成！');
          setResultData(data);
              setProcessingTask(null);
        } else if (data.status === 'failed') {
          toast.error('任务失败: ' + (data.error_message || '未知错误'));
          setProcessingTask(null);
        } else {
          attempts++;
          setTimeout(checkStatus, 3000);
        }
      } catch (error) {
        toast.error('查询状态失败: ' + error.message);
        setProcessingTask(null);
      }
    };
    checkStatus();
  };


  const downloadZipPackage = async () => {
    const raw = resultData?.download_zip_url
      || resultData?.result?.download_zip_url
      || zipUrl;
    if (!raw) {
      toast.warning('暂无压缩包，请等待生成完成后再下载');
      return;
    }
    const asset = toAssetPath(raw);
    try {
      toast.message('正在下载完整详情页压缩包…');
      const resp = await fetch(asset, { credentials: 'same-origin' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      if (!blob || blob.size < 100) throw new Error('压缩包为空或损坏');
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      const name = (resultData?.product_name || 'detail-pages').replace(/[\\/:*?"<>|]/g, '_');
      a.download = `${name}-详情页-${previewImages.length || ''}屏.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      toast.success('压缩包下载已开始');
    } catch (error) {
      // 回退：直接打开链接
      try {
        window.open(asset, '_blank');
        toast.message('已在新窗口打开压缩包链接');
      } catch {
        toast.error('压缩包下载失败: ' + error.message);
      }
    }
  };

  const previewImages = (resultData?.preview_images
    || resultData?.result?.preview_images
    || []).map((u) => toAssetPath(u));
  const htmlUrl = toAssetPath(resultData?.html_url || resultData?.result?.html_url);
  const zipUrl = toAssetPath(
    resultData?.download_zip_url
    || resultData?.result?.download_zip_url
    || (activeDetailTaskId ? `/uploads/generated/detail_${activeDetailTaskId}_pages.zip` : '')
  );
  const expectedPages = Number(taskStatus?.pages_total || resultData?.pages_total || detailPageOptions.section_count || 9);
  const isDetailDone = taskStatus?.status === 'completed' && previewImages.length > 0;
  const isDetailRunning = processingTask === 'detail-page' || taskStatus?.status === 'processing';

  const detailStyles = [
    { id: 'modern', name: '现代简约', description: '简洁大方，突出产品' },
    { id: 'minimal', name: '极简风格', description: '留白多，高级感' },
    { id: 'luxury', name: '奢华风格', description: '金色元素，高端质感' },
    { id: 'cute', name: '可爱风格', description: '色彩丰富，活泼可爱' },
  ];

  const videoStyles = [
    { id: 'dynamic', name: '动感节奏', description: '快节奏，适合促销' },
    { id: 'elegant', name: '优雅精致', description: '慢节奏，适合高端产品' },
    { id: 'simple', name: '简洁明了', description: '直接展示，信息清晰' },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} /><span>返回首页</span>
            </Link>
            <span className="text-gray-400">/</span>
            <Link to="/smart-design" className="text-gray-600 hover:text-blue-600 transition-colors">智能美工</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">详情页与视频生成</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">详情页与视频生成</h1>
            <p className="text-gray-600 text-lg">上传图片或填写文案，一键生成多屏电商详情页并可下载</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload size={20} className="mr-2 text-blue-600" />上传产品图（可选，有图会先识图再出详情）
          </h3>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
            <Upload size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">拖拽文件到此处，或</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {isUploading
                ? <span className="flex items-center"><Loader2 size={16} className="mr-2 animate-spin" />上传中...</span>
                : '选择文件'}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            <p className="text-xs text-gray-400 mt-2">支持图片（推荐），最大 10MB</p>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">已上传 {uploadedFiles.length} 个文件</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {uploadedFiles.map(file => (
                  <div key={file.file_id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {(file.previewUrl || file.file_url)
                        ? <img src={file.previewUrl?.startsWith('blob:') ? file.previewUrl : toAssetPath(file.previewUrl || file.file_url)} alt={file.file_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-400"><FileImageIcon size={32} /></div>}
                    </div>
                    <button
                      onClick={() => removeFile(file.file_id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{file.file_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-1 mb-8">
          {[
            { id: 'detail', label: '生成详情页', icon: <FileImageIcon size={18} /> },
            { id: 'video', label: '生成视频', icon: <Video size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all border-b-2 flex-1 justify-center ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'detail' && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">详情页生成设置</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品名称（可空，有图可自动识别）</label>
                <input
                  type="text"
                  value={detailPageOptions.product_name}
                  onChange={(e) => setDetailPageOptions(prev => ({ ...prev, product_name: e.target.value }))}
                  placeholder="例如：304不锈钢保温杯"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品描述 / 卖点</label>
                <textarea
                  value={detailPageOptions.product_description}
                  onChange={(e) => setDetailPageOptions(prev => ({ ...prev, product_description: e.target.value }))}
                  placeholder="描述产品特点、卖点…（可只填文字、不上传图）"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">页面风格（必选，将与 Skill / 卖点一起传给 AI）</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {detailStyles.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setDetailPageOptions(prev => ({ ...prev, style: style.id }))}
                      className={`p-4 rounded-lg border text-left transition-all ${detailPageOptions.style === style.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <p className="font-medium text-gray-900 text-sm">{style.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">详情屏数量（默认 9 屏，与 Skill 一致）</label>
                <div className="flex space-x-3">
                  {[4, 6, 9].map(n => (
                    <button
                      key={n}
                      onClick={() => setDetailPageOptions(prev => ({ ...prev, section_count: n }))}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${detailPageOptions.section_count === n ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {n} 屏
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  默认 9 屏，可选 4 / 6 / 9。固定使用 GPT 生图；选几屏就生成几屏。请务必上传产品原图以保证外观保真
                </p>
              </div>
              <button
                onClick={handleGenerateDetailPage}
                disabled={processingTask === 'detail-page'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {processingTask === 'detail-page'
                  ? <><Loader2 size={18} className="mr-2 animate-spin" />生成中，请稍候…</>
                  : <><FileImageIcon size={18} className="mr-2" />生成详情页</>}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">视频生成设置</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
                <input
                  type="text"
                  value={videoOptions.product_name}
                  onChange={(e) => setVideoOptions(prev => ({ ...prev, product_name: e.target.value }))}
                  placeholder="例如：304不锈钢保温杯"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">视频时长: {videoOptions.duration} 秒</label>
                <input
                  type="range" min="5" max="60" step="5" value={videoOptions.duration}
                  onChange={(e) => setVideoOptions(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">视频风格</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {videoStyles.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setVideoOptions(prev => ({ ...prev, style: style.id }))}
                      className={`p-4 rounded-lg border text-left transition-all ${videoOptions.style === style.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <p className="font-medium text-gray-900 text-sm">{style.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateVideo}
                disabled={processingTask === 'video'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {processingTask === 'video'
                  ? <><Loader2 size={18} className="mr-2 animate-spin" />生成中...</>
                  : <><Video size={18} className="mr-2" />生成视频</>}
              </button>
            </div>
          </div>
        )}

        {processingTask && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">处理进度</h3>
              <span className="text-sm text-gray-500">
                {taskStatus?.status === 'completed'
                  ? '已完成'
                  : (taskStatus?.pages_total
                    ? `${taskStatus.pages_done || 0}/${taskStatus.pages_total} 屏`
                    : '处理中')}
              </span>
            </div>
            <Progress value={Number(taskStatus?.progress) || 0} className="mb-2" />
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span className="truncate pr-4">{taskStatus?.message || '请稍候…'}</span>
              <span className="shrink-0 font-medium text-gray-700">{Number(taskStatus?.progress) || 0}%</span>
            </div>
          </div>
        )}

        {/* 生成完成后的下载入口：始终醒目展示 */}
        {isDetailDone && activeTab === 'detail' && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 shadow-sm mt-8">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Check size={22} className="mr-2 text-green-600" />
                  详情页已生成完成（{previewImages.length}/{expectedPages} 屏）
                  {resultData?.product_name ? ` · ${resultData.product_name}` : ''}
                </h3>
                <p className="text-sm text-gray-600 mt-1">下载下方压缩包即可获得全部详情图 PNG</p>
              </div>
              <button
                type="button"
                onClick={downloadZipPackage}
                className="w-full md:w-auto md:min-w-[280px] inline-flex items-center justify-center px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold shadow"
              >
                <Download size={22} className="mr-2" />
                下载完整详情页压缩包（ZIP）
              </button>
            </div>
          </div>
        )}

        {/* 页面内常驻预览区 */}
        {previewImages.length > 0 && activeTab === 'detail' && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isDetailRunning
                  ? `详情页生成中（${taskStatus?.pages_done || previewImages.length}/${expectedPages}）`
                  : `详情页预览（${previewImages.length} 屏）`}
                {resultData?.product_name ? ` · ${resultData.product_name}` : ''}
              </h3>
              <div className="flex flex-wrap gap-2">
                {isDetailDone && (
                  <button
                    type="button"
                    onClick={downloadZipPackage}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                  >
                    <Download size={14} className="mr-1" />下载全部压缩包
                  </button>
                )}
                {htmlUrl && (
                  <a
                    href={htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                  >
                    <ExternalLink size={14} className="mr-1" />打开 HTML
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewImages.map((url, i) => (
                <div key={url + i} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b bg-white flex justify-between">
                    <span>第 {i + 1} 屏</span>
                    <a href={url} download className="text-blue-600 hover:underline">下载</a>
                  </div>
                  <img src={url} alt={`详情屏 ${i + 1}`} className="w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default DetailVideoPage;

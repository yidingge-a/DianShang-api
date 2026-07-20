import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wand2, Upload, Crop, Palette, Scissors, RotateCcw, X, Loader2, FileImage, Check } from 'lucide-react';
import { toast } from 'sonner';
import { smartDesignApi, uploadApi } from '../services/index.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DesignToolsPage = () => {
  const [activeTool, setActiveTool] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const fileInputRef = useRef(null);

  const [mergeMode, setMergeMode] = useState('horizontal');
  const [processType, setProcessType] = useState('resize');

  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) await handleUpload(files);
  }, []);

  const handleUpload = async (files) => {
    setIsUploading(true);
    const newFiles = [];
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} 超过10MB限制`); continue; }
        const response = await uploadApi.upload(file, 'image', 'smart-design');
        if (response.success) { newFiles.push({ ...response.data, originalFile: file, previewUrl: URL.createObjectURL(file) }); toast.success(`${file.name} 上传成功`); }
      }
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) { toast.error('上传失败: ' + error.message); } finally { setIsUploading(false); }
  };

  const handleFileSelect = (e) => { const files = Array.from(e.target.files); if (files.length > 0) handleUpload(files); };
  const removeFile = (fileId) => { setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId)); };

  // 双图合并
  const handleMergeImages = async () => {
    if (uploadedFiles.length < 2) { toast.warning('请至少上传2张图片'); return; }
    setIsProcessing(true);
    try {
      const response = await smartDesignApi.mergeImages({
        image_ids: uploadedFiles.slice(0, 2).map(f => f.file_id),
        merge_mode: mergeMode,
      });
      if (response.success) { setResultUrl(response.data.result_url); setShowResult(true); toast.success('图片合并成功！'); }
    } catch (error) { toast.error('合并失败: ' + error.message); } finally { setIsProcessing(false); }
  };

  // 尺寸裁剪/批量处理
  const handleCropResize = async () => {
    if (uploadedFiles.length === 0) { toast.warning('请先上传图片'); return; }
    setIsProcessing(true);
    try {
      const response = await smartDesignApi.cropResize({
        image_ids: uploadedFiles.map(f => f.file_id),
        operation: processType,
      });
      if (response.success) { setResultUrl(response.data.result_url); setShowResult(true); toast.success('处理成功！'); }
    } catch (error) { toast.error('处理失败: ' + error.message); } finally { setIsProcessing(false); }
  };

  // 添加元素（文字水印）- 简化版，只支持文字
  const handleAddElements = async () => {
    if (uploadedFiles.length === 0) { toast.warning('请先上传图片'); return; }
    setIsProcessing(true);
    try {
      const response = await smartDesignApi.addElements({
        image_id: uploadedFiles[0].file_id,
        elements: [{ type: 'text', content: '样品展示', position: { x: 10, y: 10 }, font_size: 24, color: '#FFFFFF', background: '#000000', opacity: 0.5 }],
      });
      if (response.success) { setResultUrl(response.data.result_url); setShowResult(true); toast.success('元素添加成功！'); }
    } catch (error) { toast.error('添加失败: ' + error.message); } finally { setIsProcessing(false); }
  };

  const tools = [
    { id: 'merge', name: '双图合并', icon: <Crop size={24} />, desc: '左右拼接、上下拼接，快速合成对比图', action: 'merge', handler: handleMergeImages, minFiles: 2 },
    { id: 'elements', name: '添加元素', icon: <Palette size={24} />, desc: '文字、水印、贴纸，丰富图片内容', action: 'elements', handler: handleAddElements, minFiles: 1 },
    { id: 'crop', name: '尺寸裁剪', icon: <Scissors size={24} />, desc: '批量修改尺寸，适配各平台要求', action: 'crop', handler: handleCropResize, minFiles: 1 },
    { id: 'batch', name: '批量处理', icon: <RotateCcw size={24} />, desc: '统一格式、调色、压缩，高效处理', action: 'batch', handler: handleCropResize, minFiles: 1 },
  ];

  const currentTool = tools.find(t => t.id === activeTool);

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"><ArrowLeft size={20} /><span>返回首页</span></Link>
            <span className="text-gray-400">/</span>
            <Link to="/smart-design" className="text-gray-600 hover:text-blue-600 transition-colors">智能美工</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">便捷美工工具集</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">便捷美工工具集</h1>
            <p className="text-gray-600 text-lg">常用图片处理工具，快速完成图片编辑</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        {!activeTool && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tools.map(tool => (
              <div key={tool.id} onClick={() => { setActiveTool(tool.id); setResultUrl(null); setShowResult(false); }}
                className="p-6 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-center bg-white">
                <div className="text-blue-600 mx-auto mb-3">{tool.icon}</div>
                <h4 className="font-medium text-gray-900 mb-1">{tool.name}</h4>
                <p className="text-sm text-gray-500 mb-4">{tool.desc}</p>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">使用工具</button>
              </div>
            ))}
          </div>
        )}

        {activeTool && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                {currentTool?.icon}
                <span className="ml-2">{currentTool?.name}</span>
              </h3>
              <button onClick={() => setActiveTool(null)} className="text-gray-500 hover:text-gray-700 text-sm">返回工具列表</button>
            </div>

            {activeTool === 'merge' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">合并方式</label>
                <div className="flex space-x-3">
                  {[{ id: 'horizontal', name: '左右拼接' }, { id: 'vertical', name: '上下拼接' }].map(m => (
                    <button key={m.id} onClick={() => setMergeMode(m.id)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${mergeMode === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(activeTool === 'crop' || activeTool === 'batch') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">处理方式</label>
                <div className="flex space-x-3">
                  {[{ id: 'resize', name: '调整尺寸' }, { id: 'crop', name: '裁剪' }, { id: 'fit', name: '适配填充' }].map(m => (
                    <button key={m.id} onClick={() => setProcessType(m.id)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${processType === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all mb-6 ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
              <Upload size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">拖拽图片到此处，或</p>
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50">
                {isUploading ? <span className="flex items-center"><Loader2 size={16} className="mr-2 animate-spin" />上传中...</span> : '选择文件'}
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
              <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG、GIF，最大 10MB</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">已上传 {uploadedFiles.length} 个文件</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {uploadedFiles.map(file => (
                    <div key={file.file_id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {file.previewUrl ? <img src={file.previewUrl} alt={file.file_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><FileImage size={32} /></div>}
                      </div>
                      <button onClick={() => removeFile(file.file_id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                      <p className="text-xs text-gray-500 mt-1 truncate">{file.file_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={currentTool?.handler} disabled={isProcessing || uploadedFiles.length < (currentTool?.minFiles || 1)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
              {isProcessing ? <><Loader2 size={18} className="mr-2 animate-spin" />处理中...</> : <><Wand2 size={18} className="mr-2" />{currentTool?.name}</>}
            </button>
          </div>
        )}
      </div>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center"><Check size={20} className="mr-2 text-green-600" />处理完成</DialogTitle></DialogHeader>
          {resultUrl && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border border-gray-200"><img src={resultUrl} alt="处理结果" className="w-full" /></div>
              <div className="flex gap-3">
                <a href={resultUrl} download className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium text-center transition-all">下载结果</a>
                <button onClick={() => setShowResult(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all">关闭</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DesignToolsPage;

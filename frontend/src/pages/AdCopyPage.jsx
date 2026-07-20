import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Shield, Check, X, Loader2, Copy, AlertTriangle, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { complianceApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';

const AdCopyPage = () => {
  const [activeTab, setActiveTab] = useState('generate'); // generate | check

  const [adCopyForm, setAdCopyForm] = useState({
    product_name: '', product_description: '', target_platform: 'taobao', copy_type: 'all', count: 3, style: 'professional', max_length: 60, keywords: '',
  });
  const [adCopyResults, setAdCopyResults] = useState(null);
  const [isGeneratingAdCopy, setIsGeneratingAdCopy] = useState(false);

  const [checkContent, setCheckContent] = useState('');
  const [checkPlatform, setCheckPlatform] = useState('taobao');
  const [checkResult, setCheckResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [forbiddenWords, setForbiddenWords] = useState([]);
  const [isLoadingWords, setIsLoadingWords] = useState(false);
  const [showWordList, setShowWordList] = useState(false);

  const platforms = [
    { id: 'taobao', name: '淘宝' }, { id: 'tmall', name: '天猫' }, { id: 'jd', name: '京东' },
    { id: 'pdd', name: '拼多多' }, { id: 'douyin', name: '抖音' }, { id: 'xiaohongshu', name: '小红书' },
    { id: 'kuaishou', name: '快手' }, { id: 'amazon', name: 'Amazon' }, { id: 'ebay', name: 'eBay' },
  ];

  const copyTypes = [{ id: 'title', name: '标题' }, { id: 'slogan', name: '广告语' }, { id: 'description', name: '描述' }, { id: 'all', name: '全部' }];
  const tones = [
    { id: 'professional', name: '专业正式' }, { id: 'casual', name: '轻松亲切' },
    { id: 'luxury', name: '高端奢华' }, { id: 'cute', name: '可爱活泼' }, { id: 'aggressive', name: '促销激进' },
  ];

  const handleGenerateAdCopy = async () => {
    if (!adCopyForm.product_name) { toast.warning('请输入产品名称'); return; }
    setIsGeneratingAdCopy(true);
    try {
      const response = await complianceApi.generateAdCopy({ ...adCopyForm, keywords: adCopyForm.keywords.split(',').map(s => s.trim()).filter(Boolean) });
      if (response.success) { setAdCopyResults(response.data.copies); toast.success(`生成 ${response.data.copies.length} 条文案成功！`); }
    } catch (error) { toast.error('生成失败: ' + error.message); } finally { setIsGeneratingAdCopy(false); }
  };

  const handleCheckForbidden = async () => {
    if (!checkContent.trim()) { toast.warning('请输入要检测的内容'); return; }
    setIsChecking(true); setShowWordList(false);
    try {
      const response = await complianceApi.checkForbiddenWords({ content: checkContent, platform: checkPlatform });
      if (response.success) {
        setCheckResult(response.data);
        if (response.data.passed) toast.success('✅ 未检测到违禁词！');
        else toast.error(`❌ 检测到 ${response.data.total_words} 个违禁词`);
      }
    } catch (error) { toast.error('检测失败: ' + error.message); } finally { setIsChecking(false); }
  };

  const handleLoadForbiddenWords = async () => {
    setIsLoadingWords(true);
    try {
      const response = await complianceApi.getForbiddenWords({ platform: checkPlatform, page: 1, page_size: 50 });
      if (response.success) { setForbiddenWords(response.data.items); setShowWordList(true); }
    } catch (error) { toast.error('加载失败: ' + error.message); } finally { setIsLoadingWords(false); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(() => toast.success('已复制到剪贴板')); };

  return (
    <div className="pt-20 min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"><ArrowLeft size={20} /><span>返回首页</span></Link>
            <span className="text-gray-400">/</span>
            <Link to="/compliance-content" className="text-gray-600 hover:text-blue-600 transition-colors">合规文案</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">智能广告词生成</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">智能广告词生成</h1>
            <p className="text-gray-600 text-lg">生成营销文案并自动检测违禁词，确保合规发布</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex border-b">
            {[{ id: 'generate', label: '文案生成', icon: <Sparkles size={18} /> }, { id: 'check', label: '违禁词检测', icon: <Shield size={18} /> }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all border-b-2 flex-1 justify-center ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                {tab.icon}<span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Sparkles size={20} className="mr-2 text-blue-600" />文案生成设置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
                  <input type="text" value={adCopyForm.product_name} onChange={(e) => setAdCopyForm(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="产品名称" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品描述</label>
                  <textarea value={adCopyForm.product_description} onChange={(e) => setAdCopyForm(prev => ({ ...prev, product_description: e.target.value }))}
                    placeholder="简要描述产品..." rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">目标平台</label>
                    <select value={adCopyForm.target_platform} onChange={(e) => setAdCopyForm(prev => ({ ...prev, target_platform: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      {platforms.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">文案类型</label>
                    <select value={adCopyForm.copy_type} onChange={(e) => setAdCopyForm(prev => ({ ...prev, copy_type: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      {copyTypes.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">生成数量</label>
                    <input type="number" min="1" max="10" value={adCopyForm.count} onChange={(e) => setAdCopyForm(prev => ({ ...prev, count: parseInt(e.target.value) || 3 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">最大长度</label>
                    <input type="number" value={adCopyForm.max_length} onChange={(e) => setAdCopyForm(prev => ({ ...prev, max_length: parseInt(e.target.value) || 60 }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">文案风格</label>
                  <select value={adCopyForm.style} onChange={(e) => setAdCopyForm(prev => ({ ...prev, style: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {tones.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">必须包含的关键词（用逗号分隔）</label>
                  <input type="text" value={adCopyForm.keywords} onChange={(e) => setAdCopyForm(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="例如：包邮, 正品, 新款" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <button onClick={handleGenerateAdCopy} disabled={isGeneratingAdCopy}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                  {isGeneratingAdCopy ? <><Loader2 size={18} className="mr-2 animate-spin" />生成中...</> : <><Sparkles size={18} className="mr-2" />生成营销文案</>}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><BookOpen size={20} className="mr-2 text-blue-600" />生成结果</h3>
              {!adCopyResults && (
                <div className="text-center py-16 text-gray-400">
                  <Sparkles size={48} className="mx-auto mb-4 opacity-50" /><p>填写左侧信息后点击生成</p><p className="text-sm mt-2">AI 将为您生成多条合规营销文案</p>
                </div>
              )}
              {adCopyResults && (
                <div className="space-y-4">
                  {adCopyResults.map((copy, i) => (
                    <div key={copy.id || i} className={`border rounded-lg p-4 ${copy.forbidden_check?.passed ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={copy.forbidden_check?.passed ? 'success' : 'warning'} className={copy.forbidden_check?.passed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {copy.forbidden_check?.passed ? '✅ 合规' : '⚠️ 需修改'}
                          </Badge>
                          <span className="text-xs text-gray-500">{copy.type}</span>
                          <span className="text-xs text-gray-400">评分: {copy.score}</span>
                        </div>
                        <button onClick={() => copyToClipboard(copy.content)} className="text-blue-600 hover:text-blue-800 text-xs flex items-center"><Copy size={12} className="mr-1" />复制</button>
                      </div>
                      <p className="text-gray-800 text-sm">{copy.content}</p>
                      {copy.forbidden_check?.warnings?.length > 0 && (
                        <div className="mt-2 text-xs text-yellow-700">{copy.forbidden_check.warnings.map((w, j) => (<span key={j} className="inline-block mr-2">⚠️ {w}</span>))}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'check' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Shield size={20} className="mr-2 text-blue-600" />违禁词检测</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">检测平台</label>
                  <select value={checkPlatform} onChange={(e) => setCheckPlatform(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {platforms.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">检测内容</label>
                  <textarea value={checkContent} onChange={(e) => setCheckContent(e.target.value)} placeholder="输入要检测的文案内容..." rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                </div>
                <button onClick={handleCheckForbidden} disabled={isChecking}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                  {isChecking ? <><Loader2 size={18} className="mr-2 animate-spin" />检测中...</> : <><Search size={18} className="mr-2" />开始检测</>}
                </button>
                <button onClick={handleLoadForbiddenWords} disabled={isLoadingWords}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                  {isLoadingWords ? <><Loader2 size={18} className="mr-2 animate-spin" />加载中...</> : <><BookOpen size={18} className="mr-2" />查看违禁词库</>}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><AlertTriangle size={20} className="mr-2 text-blue-600" />检测结果</h3>
              {!checkResult && !showWordList && (
                <div className="text-center py-16 text-gray-400">
                  <Shield size={48} className="mx-auto mb-4 opacity-50" /><p>输入文案后点击检测</p><p className="text-sm mt-2">系统将自动识别违禁词并给出修改建议</p>
                </div>
              )}
              {checkResult && (
                <div className="space-y-4">
                  <div className={`rounded-lg p-4 ${checkResult.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center">
                      {checkResult.passed ? <><Check size={20} className="text-green-600 mr-2" /><span className="text-green-800 font-medium">未检测到违禁词</span></>
                        : <><AlertTriangle size={20} className="text-red-600 mr-2" /><span className="text-red-800 font-medium">检测到 {checkResult.total_words} 个违禁词</span></>}
                    </div>
                  </div>
                  {checkResult.violations?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">违规详情</h4>
                      {checkResult.violations.map((v, i) => (
                        <div key={i} className="border border-red-200 rounded-lg p-3 bg-red-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-red-700 text-sm">&quot;{v.word}&quot;</span>
                            <Badge variant="destructive" className="text-xs">{v.severity}</Badge>
                          </div>
                          <p className="text-xs text-gray-600">类型: {v.type}</p>
                          <p className="text-xs text-gray-600 mt-1">建议: {v.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {checkResult.suggested_content && (
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <h4 className="font-medium text-green-900 mb-2">建议修改后内容</h4>
                      <p className="text-sm text-green-800">{checkResult.suggested_content}</p>
                      <button onClick={() => copyToClipboard(checkResult.suggested_content)} className="mt-2 text-blue-600 hover:text-blue-800 text-xs flex items-center"><Copy size={12} className="mr-1" />复制建议内容</button>
                    </div>
                  )}
                </div>
              )}
              {showWordList && forbiddenWords.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">违禁词列表</h4>
                    <button onClick={() => setShowWordList(false)} className="text-gray-500 hover:text-gray-700"><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">{forbiddenWords.map((word, i) => (<div key={i} className="border border-gray-200 rounded-lg p-2 text-sm"><span className="font-medium text-red-600">{word.word}</span><span className="text-xs text-gray-500 ml-2">{word.category}</span></div>))}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdCopyPage;

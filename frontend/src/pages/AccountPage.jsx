import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Download, ExternalLink, Loader2, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';
import { accountApi } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';

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

const statusLabel = {
  completed: '已完成',
  processing: '进行中',
  failed: '失败',
  pending: '等待中',
};

function HistoryItemCard({ item, onDownloadZip }) {
  const previews = (item.preview_images || []).map(toAssetPath);
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">
            {item.task_type_label || item.task_type}
            {item.product_name ? ` · ${item.product_name}` : ''}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {statusLabel[item.status] || item.status}
            {item.pages_count ? ` · ${item.pages_count} 屏` : ''}
            {item.image_model ? ` · ${item.image_model}` : ''}
            {item.created_at ? ` · ${new Date(item.created_at).toLocaleString()}` : ''}
          </p>
          {item.error_message && (
            <p className="text-xs text-red-500 mt-1 line-clamp-2">{item.error_message}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {item.download_zip_url && (
            <button
              type="button"
              onClick={() => onDownloadZip(item)}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
            >
              <Download size={14} className="mr-1" />下载 ZIP
            </button>
          )}
          {item.result_url && (
            <a
              href={toAssetPath(item.result_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-sm"
            >
              <ExternalLink size={14} className="mr-1" />查看结果
            </a>
          )}
          {item.html_url && (
            <a
              href={toAssetPath(item.html_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-sm"
            >
              <ExternalLink size={14} className="mr-1" />HTML
            </a>
          )}
          {item.task_type === 'detail_page' && (
            <Link
              to="/smart-design/detail-video"
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-sm"
            >
              再生成
            </Link>
          )}
        </div>
      </div>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
          {previews.map((url, i) => (
            <a key={url + i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt={`预览${i + 1}`} className="w-full aspect-[3/4] object-cover rounded border border-gray-100" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const { user, loggedIn, openAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [limitPerFeature, setLimitPerFeature] = useState(10);
  /** 每个功能分类是否展开：key = task_type */
  const [expanded, setExpanded] = useState({});

  const loadHistory = useCallback(async () => {
    if (!loggedIn) return;
    setLoading(true);
    try {
      const res = await accountApi.history({ limit: 10 });
      const data = res.data || {};
      let nextCats = [];
      if (data.mode === 'grouped' && Array.isArray(data.categories)) {
        nextCats = data.categories;
        setLimitPerFeature(data.limit_per_feature || 10);
      } else {
        const items = data.items || [];
        nextCats = items.length ? [{ task_type: 'all', label: '全部', count: items.length, items }] : [];
        setLimitPerFeature(10);
      }
      setCategories(nextCats);
      // 默认全部展开，方便查看；用户可手动收起
      setExpanded((prev) => {
        const map = { ...prev };
        nextCats.forEach((cat, idx) => {
          if (map[cat.task_type] === undefined) {
            map[cat.task_type] = idx === 0;
          }
        });
        return map;
      });
    } catch (err) {
      toast.error(err.message || '加载历史失败');
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn) {
      openAuth('login');
      setLoading(false);
      return;
    }
    loadHistory();
  }, [loggedIn, openAuth, loadHistory]);

  const toggleCategory = (taskType) => {
    setExpanded((prev) => ({ ...prev, [taskType]: !prev[taskType] }));
  };

  const expandAll = () => {
    const map = {};
    categories.forEach((cat) => {
      map[cat.task_type] = true;
    });
    setExpanded(map);
  };

  const collapseAll = () => {
    const map = {};
    categories.forEach((cat) => {
      map[cat.task_type] = false;
    });
    setExpanded(map);
  };

  const downloadZip = async (item) => {
    const raw = item.download_zip_url;
    if (!raw) {
      toast.warning('该记录暂无压缩包');
      return;
    }
    const asset = toAssetPath(raw);
    try {
      const resp = await fetch(asset, { credentials: 'same-origin' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${(item.product_name || 'detail').replace(/[\\/:*?"<>|]/g, '_')}-详情页.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch {
      window.open(asset, '_blank');
    }
  };

  if (!loggedIn) {
    return (
      <div className="pt-24 min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录后查看个人后台</p>
          <button
            type="button"
            onClick={() => openAuth('login')}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white"
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

  const totalItems = categories.reduce((sum, c) => sum + (c.items?.length || 0), 0);

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-blue-600">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <User size={22} className="mr-2" />
              个人后台
            </h1>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600"
          >
            <RefreshCw size={14} className="mr-1" />刷新
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
          <p className="text-sm text-gray-500">当前账号</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {user?.username || user?.email}
          </p>
          {user?.email && (
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">使用历史</h2>
            <div className="flex items-center gap-3">
              {totalItems > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={expandAll} className="text-blue-600 hover:underline">
                    全部展开
                  </button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={collapseAll} className="text-blue-600 hover:underline">
                    全部收起
                  </button>
                </div>
              )}
              <span className="text-xs text-gray-400">每个功能最多 {limitPerFeature} 条</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <Loader2 className="mx-auto mb-2 animate-spin" />加载中…
            </div>
          ) : totalItems === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p>暂无历史记录</p>
              <Link to="/smart-design/detail-video" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                去生成详情页
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => {
                const isOpen = !!expanded[cat.task_type];
                return (
                  <section key={cat.task_type} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.task_type)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown
                          size={18}
                          className={`text-gray-500 flex-shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                        />
                        <h3 className="text-base font-semibold text-gray-800 truncate">{cat.label}</h3>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {isOpen ? '收起' : '展开'} · {cat.count} / {limitPerFeature}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="space-y-3 p-4 border-t border-gray-100 bg-white">
                        {(cat.items || []).map((item) => (
                          <HistoryItemCard key={item.task_id} item={item} onDownloadZip={downloadZip} />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

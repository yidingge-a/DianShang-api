import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/** 未登录：弹出登录框，并显示引导页（不硬跳 /login） */
export default function ProtectedRoute({ children }) {
  const { loggedIn, openAuth } = useAuth();

  useEffect(() => {
    if (!loggedIn) openAuth('login');
  }, [loggedIn, openAuth]);

  if (loggedIn) return children;

  return (
    <div className="pt-24 min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">请先登录</h2>
        <p className="text-sm text-gray-600 mb-6">
          使用平台功能前需要登录。登录后可使用智能美工、合规文案、定价成本、上架发布等全部能力。
        </p>
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          打开登录窗口
        </button>
      </div>
    </div>
  );
}

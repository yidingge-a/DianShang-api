import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, Menu, ChevronDown, LogIn, LogOut, User } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loggedIn, logout } = useAuth();

  const navItems = [
    { name: '首页', path: '/' },
    { 
      name: '智能美工', 
      path: '/smart-design',
      subItems: [
        { name: '图片智能优化', path: '/smart-design/image-optimize' },
        { name: '详情页&视频生成', path: '/smart-design/detail-video' },
        { name: '便捷美工工具集', path: '/smart-design/tools' }
      ]
    },
    { 
      name: '合规文案', 
      path: '/compliance-content',
      subItems: [
        { name: '分平台详情页定制', path: '/compliance-content/detail-page' },
        { name: '智能广告词生成', path: '/compliance-content/ad-copy' }
      ]
    },
    { 
      name: '定价成本', 
      path: '/pricing-cost',
      subItems: [
        { name: '多平台比价&智能定价', path: '/pricing-cost/price-compare' },
        { name: 'BOM成本分析', path: '/pricing-cost/bom' }
      ]
    },
    { 
      name: '市场分析', 
      path: '/market-analysis',
      subItems: [
        { name: '产业链智能推荐', path: '/market-analysis/industry' },
        { name: '市场分析报告', path: '/market-analysis/report' }
      ]
    },
    { 
      name: '上架发布', 
      path: '/publish',
      subItems: [
        { name: '平台推荐', path: '/publish/platform' },
        { name: '一键上架', path: '/publish/publish-action' }
      ]
    },
    { 
      name: '数据运营', 
      path: '/data-operation',
      subItems: [
        { name: '营销策略推算', path: '/data-operation/marketing' },
        { name: '推广效果分析', path: '/data-operation/promotion' },
        { name: '数据优化建议', path: '/data-operation/monitor' }
      ]
    }
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 transition-all duration-300 ${
        isNavHovered ? 'py-4' : 'py-1'
      }`}
      onMouseEnter={() => setIsNavHovered(true)}
      onMouseLeave={() => {
        setIsNavHovered(false);
        setHoveredMenu(null);
      }}
    >
      <div className="max-w-[1300px] mx-auto px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 whitespace-nowrap">
            <span className={`text-blue-600 font-bold transition-all duration-300 ${
              isNavHovered ? 'text-xl' : 'text-lg'
            }`}>全链路</span>
            <span className={`text-gray-900 font-bold transition-all duration-300 ${
              isNavHovered ? 'text-xl' : 'hidden'
            }`}>电商智能系统</span>
          </Link>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center justify-center space-x-6 transition-all duration-300 ${
            isNavHovered ? 'opacity-100' : 'opacity-70'
          }`}>
            {navItems.map((item) => (
              <div 
                key={item.path}
                className="relative"
                onMouseEnter={() => setHoveredMenu(item.name)}
                onMouseLeave={() => setHoveredMenu(null)}
              >
                <Link
                  to={item.path}
                  className={`flex items-center space-x-1 hover:text-blue-600 transition-colors duration-300 font-medium whitespace-nowrap ${
                    isActive(item.path) ? 'text-blue-600' : 'text-gray-700'
                  } ${
                    isNavHovered ? 'text-base' : 'text-sm'
                  }`}
                >
                  <span>{item.name}</span>
                  {item.subItems && <ChevronDown size={isNavHovered ? 16 : 12} />}
                </Link>

                {/* Dropdown Menu */}
                {isNavHovered && hoveredMenu === item.name && item.subItems && (
                  <div 
                    className="absolute top-full left-0 pt-2 w-56 z-50"
                    onMouseEnter={() => setHoveredMenu(item.name)}
                    onMouseLeave={() => setHoveredMenu(null)}
                  >
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                      {item.subItems.map((subItem, index) => (
                      <Link
                        key={index}
                        to={subItem.path}
                        className={`block px-4 py-3 text-sm transition-colors duration-200 border-b border-gray-100 last:border-b-0 ${
                          location.pathname === subItem.path ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        onClick={() => {
                          setHoveredMenu(null);
                          setIsNavHovered(false);
                        }}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 用户区：登录 / 退出 */}
          <div className="hidden md:flex items-center space-x-3 ml-4">
            {loggedIn ? (
              <>
                <span className="text-sm text-gray-600 flex items-center">
                  <User size={16} className="mr-1" />
                  {user?.username || user?.email}
                </span>
                <button
                  type="button"
                  onClick={() => { logout(); navigate('/login'); }}
                  className="text-sm text-gray-600 hover:text-blue-600 flex items-center"
                >
                  <LogOut size={16} className="mr-1" />退出
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium">
                <LogIn size={16} className="mr-1" />登录
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="py-4 space-y-2">
              {navItems.map((item) => (
                <div key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block w-full text-left px-4 py-3 transition-colors duration-300 ${
                      isActive(item.path) ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </Link>
                  {/* Mobile Submenu */}
                  {item.subItems && (
                    <div className="pl-8 space-y-1 pb-2">
                      {item.subItems.map((subItem, index) => (
                        <Link
                          key={index}
                          to={subItem.path}
                          onClick={() => setIsMenuOpen(false)}
                          className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-300 ${
                            location.pathname === subItem.path ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 px-4">
                {loggedIn ? (
                  <button
                    type="button"
                    onClick={() => { logout(); setIsMenuOpen(false); navigate('/login'); }}
                    className="text-sm text-gray-600"
                  >
                    退出 ({user?.username})
                  </button>
                ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-sm text-blue-600">登录</Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

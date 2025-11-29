import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Home, 
  PackagePlus, 
  PackageMinus, 
  Warehouse
} from 'lucide-react'

const Navigation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 手机端底部导航（只显示主要功能）
  const mobileNavItems = [
    { id: 'dashboard', path: '/dashboard', label: '快速操作', icon: Home },
    { id: 'stock-in', path: '/stock-in', label: '入库', icon: PackagePlus },
    { id: 'stock-out', path: '/stock-out', label: '出库', icon: PackageMinus },
    { id: 'inventory', path: '/inventory', label: '库存', icon: Warehouse }
  ]

  const handleMobileNavClick = (item) => {
    navigate(item.path)
  }

  if (isMobile) {
    return (
      <>
        {/* 手机端底部导航栏 */}
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'white',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0',
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
        }}>
          {mobileNavItems.map(item => {
            const isActive = location.pathname === item.path
            const IconComponent = item.icon
            
            return (
              <button
                key={item.id}
                onClick={() => handleMobileNavClick(item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? '#2196F3' : '#666',
                  fontSize: '12px',
                  fontWeight: isActive ? '600' : '400',
                  minWidth: '60px',
                  minHeight: '50px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <IconComponent size={20} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </>
    )
  }

  // 桌面端不显示导航
  return null
}

export default Navigation
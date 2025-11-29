import React, { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 检测是否为iOS设备
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))
    
    // 检测是否已安装为PWA
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || 
                   window.navigator.standalone)

    // 检查是否应该显示安装提示
    if (isIOS && !isStandalone) {
      // 延迟显示，避免干扰用户体验
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isIOS, isStandalone])

  const handleClose = () => {
    setShowPrompt(false)
    // 将选择存储在localStorage中，避免重复提示
    localStorage.setItem('pwaPromptDismissed', 'true')
  }

  if (!showPrompt || isStandalone) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #2196F3, #1976D2)',
      color: 'white',
      padding: '16px',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
      animation: 'slideDown 0.5s ease-out'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1
        }}>
          <Smartphone size={24} />
          <div>
            <div style={{
              fontWeight: '600',
              fontSize: '16px',
              marginBottom: '4px'
            }}>
              添加到主屏幕
            </div>
            <div style={{
              fontSize: '14px',
              opacity: 0.9
            }}>
              点击分享按钮，然后选择"添加到主屏幕"获得更好的使用体验
            </div>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            知道了
          </button>
          
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '50%',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.target.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
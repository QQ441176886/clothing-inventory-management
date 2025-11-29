import React, { useState, useEffect } from 'react'
import './OfflineIndicator.css'

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowIndicator(true)
      setTimeout(() => setShowIndicator(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowIndicator(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showIndicator) return null

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      <div className="indicator-content">
        <span className="indicator-icon">
          {isOnline ? '📶' : '📵'}
        </span>
        <span className="indicator-text">
          {isOnline ? '网络已连接' : '网络已断开 - 离线模式'}
        </span>
        {isOnline && (
          <button 
            className="close-btn"
            onClick={() => setShowIndicator(false)}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export default OfflineIndicator
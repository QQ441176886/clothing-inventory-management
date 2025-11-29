import React, { useEffect, useState } from 'react'

const Alert = ({ message, type = 'success', onClose, autoClose = true }) => {
  const [isVisible, setIsVisible] = useState(!!message)

  useEffect(() => {
    if (message) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [message])

  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, autoClose, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          borderColor: '#45a049'
        }
      case 'error':
        return {
          backgroundColor: '#f44336',
          borderColor: '#d32f2f'
        }
      case 'warning':
        return {
          backgroundColor: '#ff9800',
          borderColor: '#f57c00'
        }
      case 'info':
        return {
          backgroundColor: '#2196F3',
          borderColor: '#1976D2'
        }
      default:
        return {
          backgroundColor: '#4CAF50',
          borderColor: '#45a049'
        }
    }
  }

  if (!isVisible || !message) return null

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: getTypeStyles().backgroundColor,
      color: 'white',
      padding: '20px 32px',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      zIndex: 9999,
      maxWidth: '80%',
      width: 'auto',
      textAlign: 'center',
      fontSize: '18px',
      fontWeight: '600',
      // 使用简单的CSS过渡效果
      transition: 'opacity 0.3s ease-out'
    }}
    key={message + type + Date.now()}>
      {message}
    </div>
  )
}

export default Alert
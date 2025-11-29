import React from 'react'

const Header = () => {
  return (
    <header style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '16px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      position: 'relative',
      zIndex: 100
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '12px',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <img 
            src="/蝴蝶结.svg" 
            alt="Logo" 
            style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: '600',
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            符小姐女装
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            opacity: '0.9',
            fontSize: 'clamp(12px, 3vw, 14px)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            穿一身浪漫，赴一场生活！
          </p>
        </div>
      </div>
    </header>
  )
}

export default Header
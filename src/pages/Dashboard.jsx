import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, TrendingUp, Warehouse, Shirt, BarChart3, Database, Users, Settings, Zap } from 'lucide-react'

const Dashboard = () => {
  const navigate = useNavigate()
  // 系统仅在手机上使用，固定为移动端
  const isMobile = true
  
  // 组件卸载检测引用
  const isMountedRef = useRef(true)
  
  // 组件卸载时设置标志
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])
  
  // 使用lucide-react图标组件
  const PackageIcon = Package
  const TrendingUpIcon = TrendingUp

  const quickActions = [
    {
      title: '商品管理',
      description: '管理商品信息',
      icon: Shirt,
      path: '/clothing',
      color: '#9C27B0'
    },
    {
      title: '统计报表',
      description: '查看库存统计报表',
      icon: BarChart3,
      path: '/reports',
      color: '#F44336'
    },
    {      title: '数据查看',      description: '查看和导出数据',      icon: Database,      path: '/data-viewer',      color: '#00BCD4'    },    {
      title: '系统设置',
      description: '配置系统参数',
      icon: Settings,
      path: '/settings',
      color: '#FFC107'
    }
  ]

  return (
    <div className="container">

      {/* 统计卡片已移除，按照需求不显示服装品类总数、库存总价值和低库存预警 */}

      {/* 快速操作 */}
      <div className="card">
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Zap size={20} />
          快速操作
        </h2>
        <div style={{          display: 'grid',          gridTemplateColumns: 'repeat(2, 1fr)',          gap: '16px'        }}>
          {quickActions.map((action, index) => {
            const IconComponent = action.icon
            return (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                style={{
                  background: 'white',
                  border: `2px solid ${action.color}20`,
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  minHeight: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{
                    background: `${action.color}20`,
                    borderRadius: '10px',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px' // 微调图标位置，与文字顶部对齐
                  }}>
                    <IconComponent size={'24'} color={action.color} />
                  </div>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: action.color,
                    // 控制四个字标题的换行显示
                    width: action.title.length === 4 ? '45px' : 'auto',
                    wordBreak: 'break-word',
                    lineHeight: '1.2'
                  }}>
                    {action.title}
                  </span>
                </div>
                {/* 移除功能名称下方的诠释 */}
              </button>
            )
          })}
        </div>
      </div>


    </div>
  )
}

// 所有图标已通过lucide-react导入并使用

export default Dashboard
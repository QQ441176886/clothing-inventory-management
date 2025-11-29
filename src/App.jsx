import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import ClothingManagement from './pages/ClothingManagement'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import DataViewer from './pages/DataViewer'
import OfflineIndicator from './components/OfflineIndicator'
import { db, setupNetworkListeners, cleanupNetworkListeners, ClothingInventoryDB } from './db/database'

// 路由切换时滚动到页面顶部的组件
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

function App() {
  // Active tab state removed as menu is no longer needed
  const [inventoryStats, setInventoryStats] = useState({
    totalClothes: 0,
    totalValue: 0,
    lowStockItems: 0
  })
  
  // 统计报表刷新触发器
  const [reportsRefreshTrigger, setReportsRefreshTrigger] = useState(0)
  
  // 组件卸载检测引用
  const isMountedRef = useRef(true)
  
  // 数据库初始化状态
  const [dbInitialized, setDbInitialized] = useState(false)
  const [dbError, setDbError] = useState(null)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('开始初始化数据库...');
        
        // 初始化数据库并创建示例数据（如果需要）
        await db.initialize();
        
        // 检查数据库连接
        const isConnected = await db.checkConnection();
        if (isConnected) {
          console.log('数据库初始化成功');
          setDbInitialized(true);
          setDbError(null);
          
          // 加载库存统计
          loadInventoryStats();
        } else {
          throw new Error('数据库连接失败');
        }
      } catch (error) {
        console.error('应用初始化失败:', error);
        setDbError(`数据库初始化失败: ${error.message}`);
        
        // 尝试重建数据库作为最后的手段
        try {
          console.log('尝试重建数据库...');
          await ClothingInventoryDB.recreateDatabase();
          console.log('数据库重建成功，重新初始化应用...');
          
          // 数据库重建后，原始db实例应该可以正常工作了
          await db.initialize();
          setDbInitialized(true);
          setDbError(null);
          loadInventoryStats();
        } catch (recreateError) {
          console.error('数据库重建失败:', recreateError);
          setDbError(`数据库重建失败: ${recreateError.message}`);
        }
      }
    };
    
    initializeApp();
    
    // 设置网络状态监听器
    setupNetworkListeners()
    
    // 组件卸载时清理资源
    return () => {
      isMountedRef.current = false
      cleanupNetworkListeners()
    }
  }, [])

  const loadInventoryStats = async () => {
    try {
      // 首先检查组件是否仍在挂载和数据库是否已初始化
      if (!isMountedRef.current || !dbInitialized) return
      
      // 使用Promise.all并行获取数据，提高性能
      const [clothesCount, inventoryItems, clothes] = await Promise.all([
        db.clothes.count(),
        db.inventory.toArray(),
        db.clothes.toArray()
      ])
      
      // 再次检查组件是否仍在挂载
      if (!isMountedRef.current) return
      
      let totalValue = 0
      let lowStockCount = 0
      
      // 优化数据处理逻辑
      inventoryItems.forEach(inv => {
        const clothing = clothes.find(c => c.id === inv.clothingId)
        if (clothing) {
          totalValue += inv.quantity * clothing.purchasePrice
          if (inv.quantity < 10) { // 库存低于10件视为低库存
            lowStockCount++
          }
        }
      })
      
      // 安全地更新状态，只有在组件挂载时才执行
      if (isMountedRef.current) {
        setInventoryStats({
          totalClothes: clothesCount,
          totalValue: totalValue,
          lowStockItems: lowStockCount
        })
      }
    } catch (error) {
      // 只在组件挂载时记录错误
      if (isMountedRef.current) {
        console.error('加载库存统计失败:', error)
        // 显示数据库错误状态
        setDbError(`加载库存统计失败: ${error.message}`)
      }
    }
  }

  const refreshStats = () => {
    loadInventoryStats()
    // 触发统计报表刷新
    setReportsRefreshTrigger(prev => prev + 1)
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ScrollToTop />
      <div className="app">
        <OfflineIndicator />
        <Header />
        <div className="app-content">
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route 
                path="/" 
                element={<Navigate to="/stock-out" replace />} 
              />
              <Route 
                path="/dashboard" 
                element={
                  <Dashboard />
                } 
              />
              <Route 
                path="/clothing" 
                element={
                  <ClothingManagement 
                    refreshStats={refreshStats} 
                  />
                } 
              />
              <Route 
                path="/stock-in" 
                element={
                  <StockIn 
                    refreshStats={refreshStats} 
                  />
                } 
              />
              <Route 
                path="/stock-out" 
                element={
                  <StockOut 
                    refreshStats={refreshStats} 
                  />
                } 
              />
              <Route 
                path="/inventory" 
                element={
                  <Inventory 
                    refreshStats={refreshStats} 
                  />
                } 
              />
              <Route 
                path="/reports" 
                element={<Reports refreshTrigger={reportsRefreshTrigger} />} 
              />
              <Route 
                path="/settings" 
                element={<Settings />} 
              />
              <Route 
                path="/data-viewer" 
                element={<DataViewer />} 
              />
              <Route 
                path="/members" 
                element={
                  <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ 
                      maxWidth: '500px', 
                      margin: '0 auto',
                      background: 'white',
                      borderRadius: '16px',
                      padding: '40px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚧</div>
                      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '12px' }}>
                        开发中...
                      </h1>
                      <p style={{ fontSize: '16px', color: '#666', margin: '0' }}>
                        会员系统功能正在紧张开发中，敬请期待！
                      </p>
                    </div>
                  </div>
                } 
              />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
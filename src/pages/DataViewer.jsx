import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Package, ShoppingCart, TrendingUp, RefreshCw, Download, Trash2, ChevronDown, ChevronUp, Eye, FileText } from 'lucide-react'
import { db } from '../db/database'
import Alert from '../components/Alert'

const DataViewer = () => {
  const navigate = useNavigate()
  const [selectedDataType, setSelectedDataType] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedCards, setExpandedCards] = useState(new Set())
  const [selectedRecords, setSelectedRecords] = useState(new Set())
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('')
  // 日期范围查询状态
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  // 数据卡片配置
  const dataCards = [
    {
      id: 'stockIn',
      title: '入库记录',
      icon: Package,
      color: '#10b981',
      description: '查看所有入库操作记录'
    },
    {
      id: 'stockOut',
      title: '出库记录',
      icon: ShoppingCart,
      color: '#3b82f6',
      description: '查看所有销售出库记录'
    }
    // 已删除服装信息和库存信息卡片
  ]

  // 加载数据
  const loadData = async (dataType) => {
    setLoading(true)
    setAlertMessage('')
    
    try {
      // 检查数据库连接
      if (!db.isOpen()) {
        await db.open()
      }

      let tableData = []
      
      // 根据数据类型加载相应数据
      switch (dataType) {
        case 'stockIn':
          tableData = await db.stockIn.toArray()
          // 关联服装信息
          const clothesForStockIn = await db.clothes.toArray()
          const clothesMap = new Map(clothesForStockIn.map(cloth => [cloth.id, cloth]))
          tableData = tableData.map(record => ({
            ...record,
            clothingInfo: clothesMap.get(record.clothingId) || null,
            // 确保码数和颜色字段存在，优先使用入库记录中的值，否则使用服装信息中的值
            size: record.size || (clothesMap.get(record.clothingId)?.size || '未设置'),
            color: record.color || (clothesMap.get(record.clothingId)?.color || '未设置')
          }))
          break
          
        case 'stockOut':
          tableData = await db.stockOut.toArray()
          // 关联服装信息
          const clothesForStockOut = await db.clothes.toArray()
          const clothesMapOut = new Map(clothesForStockOut.map(cloth => [cloth.id, cloth]))
          tableData = tableData.map(record => ({
            ...record,
            clothingInfo: clothesMapOut.get(record.clothingId) || null,
            // 确保码数和颜色字段存在，优先使用出库记录中的值，否则使用服装信息中的值
            size: record.size || (clothesMapOut.get(record.clothingId)?.size || '未设置'),
            color: record.color || (clothesMapOut.get(record.clothingId)?.color || '未设置')
          }))
          break
          
        // 已删除服装信息和库存信息的加载逻辑
        
        default:
          tableData = []
      }

      // 日期范围筛选
      let filteredData = [...tableData]
      if (dateRange.startDate || dateRange.endDate) {
        filteredData = filteredData.filter(record => {
          // 优先使用用户输入的date字段，而不是系统生成的createdAt字段
          const recordDate = new Date(record.date || record.createdAt)
          
          // 只比较日期部分，不考虑时间和时区
          const getDateOnly = (dateString) => {
            if (!dateString) return null
            // 处理不同日期格式：YYYY-MM-DD HH:mm:ss 或 ISO格式
            const date = new Date(dateString)
            // 返回日期的字符串表示，避免时区问题
            return date.toISOString().split('T')[0]
          }
          
          const recordDateOnly = getDateOnly(record.date || record.createdAt)
          const startDateOnly = getDateOnly(dateRange.startDate)
          const endDateOnly = getDateOnly(dateRange.endDate)
          
          const isAfterStart = !startDateOnly || recordDateOnly >= startDateOnly
          const isBeforeEnd = !endDateOnly || recordDateOnly <= endDateOnly
          
          return isAfterStart && isBeforeEnd
        })
      }
      
      setRecords(filteredData)
      
      if (filteredData.length === 0) {
        const dateFilterMsg = dateRange.startDate || dateRange.endDate ? '在此日期范围内' : ''
        setAlertMessage(`暂无${dataCards.find(card => card.id === dataType)?.title || '数据'}${dateFilterMsg}`)
        setAlertType('info')
      }
      
    } catch (error) {
      console.error('加载数据失败:', error)
      setAlertMessage(`加载数据失败: ${error.message}`)
      setAlertType('error')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  // 点击卡片处理
  const handleCardClick = (dataType) => {
    setSelectedDataType(dataType)
    loadData(dataType)
  }

  // 返回卡片视图
  const handleBackToCards = () => {
    setSelectedDataType(null)
    setRecords([])
    setAlertMessage('')
  }

  // 切换卡片展开状态
  const toggleCard = (recordId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }

  // 切换记录选择状态
  const toggleRecordSelection = (recordId) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set())
    } else {
      setSelectedRecords(new Set(records.map(record => record.id)))
    }
  }

  // 删除选中的记录
  const deleteSelectedRecords = async () => {
    if (selectedRecords.size === 0) {
      setAlertMessage('请先选择要删除的记录')
      setAlertType('warning')
      return
    }

    try {
      for (const recordId of selectedRecords) {
        await db[selectedDataType].delete(recordId)
      }

      // 重新加载数据
      await loadData(selectedDataType)
      // 清空选中状态
      setSelectedRecords(new Set())
      
      setAlertMessage(`成功删除 ${selectedRecords.size} 条记录`)
      setAlertType('success')
    } catch (error) {
      console.error('删除记录失败:', error)
      setAlertMessage(`删除失败: ${error.message}`)
      setAlertType('error')
    }
  }

  // 导出数据为JSON
  const exportToJson = () => {
    const dataStr = JSON.stringify(records, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const cardTitle = dataCards.find(card => card.id === selectedDataType)?.title || '数据'
    const exportFileDefaultName = `${cardTitle}-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }



  // 格式化字段显示
  const formatField = (value, fieldName) => {
    if (value === null || value === undefined) return '无'
    
    // 处理日期字段
    if (fieldName.includes('date') || fieldName.includes('Date') || fieldName.includes('time') || fieldName.includes('Time')) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          // 手动格式化日期和时间，避免时区问题
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          const seconds = String(date.getSeconds()).padStart(2, '0')
          
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        }
      } catch (e) {
        // 如果日期解析失败，返回原始值
      }
    }
    
    // 处理金额字段
    if (typeof value === 'number' && (fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('Price') || fieldName.includes('Amount'))) {
      return `¥${value.toFixed(2)}`
    }
    
    // 处理数量字段
    if (typeof value === 'number' && (fieldName.includes('quantity') || fieldName.includes('Quantity'))) {
      return value.toString()
    }
    
    // 处理布尔值
    if (typeof value === 'boolean') {
      return value ? '是' : '否'
    }
    
    // 处理对象
    if (typeof value === 'object') {
      return '[对象数据]'
    }
    
    // 处理字符串，去除引号
    if (typeof value === 'string') {
      // 去除JSON字符串中的引号
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1)
      }
      return value
    }
    
    return String(value)
  }

  // 获取字段中文标签
  const getFieldLabel = (fieldName) => {
    const labels = {
      id: 'ID',
      code: '编码',
      name: '名称',
      category: '分类',
      size: '尺码',
      color: '颜色',
      quantity: '数量',
      purchasePrice: '进货价',
      sellingPrice: '售价',
      totalAmount: '总金额',
      date: '日期',
      operator: '操作员',
      clothingId: '服装ID',
      clothingInfo: '服装信息',
      description: '描述',
      createdAt: '创建时间',
      updatedAt: '更新时间',
      // 入库记录字段
      inQuantity: '入库数量',
      inDate: '入库日期',
      inOperator: '入库操作员',
      inRemark: '入库备注',
      // 出库记录字段
      outQuantity: '出库数量',
      outDate: '出库日期',
      outOperator: '出库操作员',
      outRemark: '出库备注',
      // 库存信息字段
      stockQuantity: '库存数量',
      minStock: '最小库存',
      maxStock: '最大库存',
      stockLocation: '库存位置',
      stockStatus: '库存状态',
      // 新增字段映射
      notes: '备注',
      categoryCustom: '自定义分类',
      remark: '备注信息'
    }
    return labels[fieldName] || fieldName
  }

  // 获取记录基础信息
  const getBaseInfo = (record) => {
    switch (selectedDataType) {
      case 'stockIn':
        return {
          title: record.clothingInfo ? `${record.clothingInfo.name} (${record.clothingInfo.code})` : '未知服装',
          subtitle: `数量: ${record.quantity} | 总金额: ¥${record.totalAmount}`
        }
      case 'stockOut':
        return {
          title: record.clothingInfo ? `${record.clothingInfo.name} (${record.clothingInfo.code})` : '未知服装',
          subtitle: `数量: ${record.quantity} | 总金额: ¥${record.totalAmount}`
        }
      case 'clothes':
        return {
          title: `${record.name} (${record.code})`,
          subtitle: `分类: ${record.category} | 颜色: ${record.color} | 尺码: ${record.size}`
        }
      case 'inventory':
        return {
          title: record.clothingInfo ? `${record.clothingInfo.name} (${record.clothingInfo.code})` : '未知服装',
          subtitle: `库存数量: ${record.quantity}`
        }
      default:
        return { title: '未知记录', subtitle: '' }
    }
  }

  // 渲染卡片视图
  const renderCardView = () => (
    <div style={{
      padding: '16px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: 'calc(100vh - 80px)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        position: 'relative'
      }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            position: 'absolute',
            left: '0',
            padding: '8px 16px',
            background: '#f8f9fa',
            color: '#6c757d',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          ← 返回
        </button>
        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: '600',
          color: '#1f2937',
          padding: '0 16px'
        }}>
          数据查看器
        </h1>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
        gap: '12px',
        marginBottom: '20px',
        padding: '0 8px'
      }}>
        {dataCards.map(card => {
          const IconComponent = card.icon
          return (
            <div
               key={card.id}
               onClick={() => handleCardClick(card.id)}
               style={{
                 background: 'white',
                 borderRadius: '12px',
                 padding: 'clamp(16px, 4vw, 24px)',
                 border: '2px solid #e5e7eb',
                 cursor: 'pointer',
                 transition: 'all 0.3s ease',
                 boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                 display: 'flex',
                 flexDirection: 'column',
                 alignItems: 'center',
                 textAlign: 'center',
                 minHeight: '140px',
                 justifyContent: 'center'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.transform = 'translateY(-4px)'
                 e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
                 e.currentTarget.style.borderColor = card.color
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.transform = 'translateY(0)'
                 e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                 e.currentTarget.style.borderColor = '#e5e7eb'
               }}
             >
               <div style={{
                 width: 'clamp(48px, 12vw, 64px)',
                 height: 'clamp(48px, 12vw, 64px)',
                 borderRadius: '50%',
                 background: `${card.color}20`,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 marginBottom: 'clamp(12px, 3vw, 16px)'
               }}>
                 <IconComponent size={24} color={card.color} />
               </div>
               
               <h3 style={{
                 fontSize: 'clamp(16px, 4vw, 20px)',
                 fontWeight: '600',
                 color: '#1f2937',
                 marginBottom: 'clamp(4px, 1vw, 8px)'
               }}>
                 {card.title}
               </h3>
               
               <p style={{
                 color: '#6b7280',
                 fontSize: 'clamp(12px, 3vw, 14px)',
                 lineHeight: '1.5',
                 display: '-webkit-box',
                 WebkitLineClamp: 2,
                 WebkitBoxOrient: 'vertical',
                 overflow: 'hidden'
               }}>
                 {card.description}
               </p>
             </div>
          )
        })}
      </div>
    </div>
  )

  // 渲染数据详情视图
  const renderDataView = () => {
    const currentCard = dataCards.find(card => card.id === selectedDataType)
    const IconComponent = currentCard?.icon
    
    return (
      <div style={{
        padding: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 80px)'
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleBackToCards}
              style={{
                background: 'none',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                minWidth: '60px'
              }}
            >
              ← 返回
            </button>
            
            {IconComponent && (
              <div style={{
                width: 'clamp(36px, 8vw, 40px)',
                height: 'clamp(36px, 8vw, 40px)',
                borderRadius: '50%',
                background: `${currentCard.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <IconComponent size={18} color={currentCard.color} />
              </div>
            )}
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <h2 style={{
                fontSize: 'clamp(18px, 4vw, 24px)',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                {currentCard?.title || '数据详情'}
              </h2>
              
              <span style={{
                background: '#f3f4f6',
                color: '#6b7280',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                whiteSpace: 'nowrap'
              }}>
                {records.length} 条记录
              </span>
            </div>
          </div>
          
          {/* 日期范围筛选 */}
          {(selectedDataType === 'stockIn' || selectedDataType === 'stockOut') && (
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>开始日期</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minWidth: '140px'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>结束日期</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minWidth: '140px'
                  }}
                />
              </div>
              
              <button
                onClick={() => {
                  // 重置日期范围
                  setDateRange({ startDate: '', endDate: '' })
                  // 重新加载数据
                  loadData(selectedDataType)
                }}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  alignSelf: 'flex-end'
                }}
              >
                重置
              </button>
              
              <button
                onClick={() => loadData(selectedDataType)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  alignSelf: 'flex-end',
                  opacity: loading ? 0.6 : 1
                }}
              >
                筛选
              </button>
            </div>
          )}
          
          <div style={{
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => loadData(selectedDataType)}
              disabled={loading}
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: loading ? 0.6 : 1,
                minWidth: '60px'
              }}
            >
              <RefreshCw size={16} />
              刷新
            </button>
            
            <button
              onClick={exportToJson}
              disabled={records.length === 0}
              style={{
                background: '#10b981',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: records.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: records.length === 0 ? 0.6 : 1,
                minWidth: '60px'
              }}
            >
              <Download size={16} />
              导出
            </button>
            

            
            {selectedRecords.size > 0 && (
              <button
                onClick={deleteSelectedRecords}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '80px'
                }}
              >
                <Trash2 size={16} />
                删除选中 ({selectedRecords.size})
              </button>
            )}
          </div>
        </div>

        {/* 全选控制 */}
        {records.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '6px'
          }}>
            <input
              type="checkbox"
              checked={selectedRecords.size === records.length && records.length > 0}
              onChange={toggleSelectAll}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              全选 ({selectedRecords.size}/{records.length})
            </span>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280'
          }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
            <div>正在加载数据...</div>
          </div>
        )}

        {/* 数据卡片列表 */}
        {!loading && records.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {records.map((record, index) => {
              const isExpanded = expandedCards.has(record.id)
              const isSelected = selectedRecords.has(record.id)
              const baseInfo = getBaseInfo(record)
              
              return (
                <div
                  key={record.id || index}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: `4px solid ${currentCard.color}`,
                    boxShadow: isExpanded 
                      ? '0 4px 12px rgba(0, 0, 0, 0.1)' 
                      : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transform: isExpanded ? 'translateY(-2px)' : 'none'
                  }}
                  onClick={() => toggleRecordSelection(record.id || index)}
                >
                  {/* 卡片头部 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: isExpanded ? '10px' : '0',
                    gap: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleRecordSelection(record.id || index)
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      />
                      
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        minWidth: 0,
                        flex: 1
                      }}>
                        <span style={{
                          fontSize: 'clamp(13px, 3vw, 14px)',
                          fontWeight: '500',
                          color: '#1f2937',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {baseInfo.title}
                        </span>
                        
                        <span style={{
                          fontSize: 'clamp(11px, 2.5vw, 12px)',
                          color: '#6b7280',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {baseInfo.subtitle}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0
                    }}>
                      <span style={{
                        fontSize: 'clamp(10px, 2.5vw, 12px)',
                        color: '#6b7280',
                        background: '#f3f4f6',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap'
                      }}>
                        ID: {record.id || index}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCard(record.id || index)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6c757d',
                          padding: '4px'
                        }}
                      >
                        <span style={{
                          fontSize: 'clamp(16px, 3.5vw, 20px)',
                          color: '#9ca3af',
                          transition: 'transform 0.2s',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          flexShrink: 0
                        }}>
                          ▼
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  {/* 展开的详情内容 */}
              {isExpanded && (
                <div style={{
                  borderTop: '1px solid #f3f4f6',
                  paddingTop: '12px'
                }}>
                  {(() => {
                    // 根据数据类型显示不同的详情内容
                    if (selectedDataType === 'stockIn') {
                      // 入库记录详情 - 简化显示
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>数量:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.quantity}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>进货价:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>¥{record.purchasePrice?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>销售价:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#4CAF50' }}>¥{record.clothingInfo?.sellingPrice?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>总金额:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>¥{record.totalAmount?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>日期:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{formatField(record.date, 'date')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>操作员:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.operator || '无'}</span>
                          </div>
                          {record.notes && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '13px', color: '#6b7280' }}>备注:</span>
                              <span style={{ fontSize: '13px', fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{record.notes}</span>
                            </div>
                          )}
                          
                          {/* 服装信息 */}
                          {record.clothingInfo && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                              <div style={{ fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '6px' }}>服装信息</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>编码:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#f44336' }}>{record.clothingInfo.code}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>名称:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.clothingInfo.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>分类:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.clothingInfo.category}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>尺码:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.size || record.clothingInfo.size || '未设置'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>颜色:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.color || record.clothingInfo.color || '未设置'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    } else if (selectedDataType === 'stockOut') {
                      // 出库记录详情 - 简化显示
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>数量:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.quantity}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>单价:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>¥{record.sellingPrice?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>进货价:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#2196F3' }}>¥{record.clothingInfo?.purchasePrice?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>总金额:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>¥{record.totalAmount?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>日期:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{formatField(record.date, 'date')}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>操作员:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.operator || '无'}</span>
                          </div>
                          {record.notes && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '13px', color: '#6b7280' }}>备注:</span>
                              <span style={{ fontSize: '13px', fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{record.notes}</span>
                            </div>
                          )}
                          
                          {/* 服装信息 - 简化显示 */}
                          {record.clothingInfo && (
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                              <div style={{ fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '6px' }}>服装信息</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>编码:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#f44336' }}>{record.clothingInfo.code}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>名称:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.clothingInfo.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>分类:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.clothingInfo.category}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>尺码:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.size || record.clothingInfo.size || '未设置'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>颜色:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.color || record.clothingInfo.color || '未设置'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    } else if (selectedDataType === 'clothes') {
                      // 服装信息详情 - 专门显示逻辑
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>编码:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#f44336' }}>{record.code}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>名称:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.name}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>分类:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.category}</span>
                          </div>
                          {record.categoryCustom && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: '#6b7280' }}>自定义分类:</span>
                              <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.categoryCustom}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>进货价:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>¥{record.purchasePrice?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>售价:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>¥{record.sellingPrice?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>颜色:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.color}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>尺码:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.size}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>创建时间:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>{formatField(record.createdAt, 'date')}</span>
                          </div>
                          {record.updatedAt && record.updatedAt !== record.createdAt && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: '#6b7280' }}>更新时间:</span>
                              <span style={{ fontSize: '13px', fontWeight: '500' }}>{formatField(record.updatedAt, 'date')}</span>
                            </div>
                          )}
                        </div>
                      )
                    } else if (selectedDataType === 'inventory') {
                      // 库存信息详情 - 专门显示逻辑，移除ID和创建时间
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* 服装基本信息 */}
                          {record.clothingInfo && (
                            <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
                              <div style={{ fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '6px' }}>服装信息</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>编码:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#f44336' }}>{record.clothingInfo.code}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>名称:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.clothingInfo.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>分类:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.clothingInfo.category}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>颜色:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.clothingInfo.color}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>尺码:</span>
                                  <span style={{ fontSize: '12px', fontWeight: '500' }}>{record.clothingInfo.size}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* 库存信息 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>库存数量:</span>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#2196F3' }}>{record.quantity}</span>
                          </div>
                          
                          {/* 库存位置信息 */}
                          {record.location && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: '#6b7280' }}>库存位置:</span>
                              <span style={{ fontSize: '13px', fontWeight: '500' }}>{record.location}</span>
                            </div>
                          )}
                          
                          {/* 库存状态 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>库存状态:</span>
                            <span style={{ 
                              fontSize: '13px', 
                              fontWeight: '500',
                              color: record.quantity === 0 ? '#f44336' : record.quantity <= 10 ? '#FF9800' : '#4CAF50'
                            }}>
                              {record.quantity === 0 ? '缺货' : record.quantity <= 10 ? '低库存' : '正常'}
                            </span>
                          </div>
                        </div>
                      )
                    } else {
                      // 其他数据类型的通用显示逻辑
                      const processedKeys = new Set()
                      const entries = Object.entries(record)
                      
                      return (
                        <>
                          {/* 基本信息 - 简洁列表 */}
                          <div style={{
                            marginBottom: '12px'
                          }}>
                            {entries.map(([key, value]) => {
                              if (processedKeys.has(key)) return null
                              
                              // 跳过ID和重复字段
                              if (['id'].includes(key)) return null
                              
                              // 处理嵌套对象
                              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                Object.keys(value).forEach(subKey => processedKeys.add(subKey))
                                
                                return (
                                  <div key={key} style={{
                                    marginBottom: '8px'
                                  }}>
                                    <div style={{
                                      fontSize: 'clamp(13px, 2.5vw, 14px)',
                                      color: '#374151',
                                      fontWeight: '600',
                                      marginBottom: '6px'
                                    }}>
                                      {getFieldLabel(key)}
                                    </div>
                                    
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px'
                                    }}>
                                      {Object.entries(value).map(([subKey, subValue]) => (
                                        <div key={subKey} style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '4px 0'
                                        }}>
                                          <span style={{
                                            fontSize: 'clamp(12px, 2.5vw, 13px)',
                                            color: '#6b7280'
                                          }}>
                                            {getFieldLabel(subKey)}:
                                          </span>
                                          <span style={{
                                            fontSize: 'clamp(12px, 2.5vw, 13px)',
                                            color: '#1f2937',
                                            fontWeight: '500'
                                          }}>
                                            {formatField(subValue, subKey)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              }
                              
                              // 普通字段
                              processedKeys.add(key)
                              return (
                                <div key={key} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '6px 0',
                                  borderBottom: '1px solid #f3f4f6'
                                }}>
                                  <span style={{
                                    fontSize: 'clamp(12px, 2.5vw, 13px)',
                                    color: '#6b7280'
                                  }}>
                                    {getFieldLabel(key)}:
                                  </span>
                                  <span style={{
                                    fontSize: 'clamp(12px, 2.5vw, 13px)',
                                    color: '#1f2937',
                                    fontWeight: '500'
                                  }}>
                                    {formatField(value, key)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )
                    }
                  })()}
                </div>
              )}
                </div>
              )
            })}
          </div>
        )}

        {/* 空状态 */}
        {!loading && records.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <div style={{
              fontSize: '18px',
              marginBottom: '8px'
            }}>
              暂无数据
            </div>
            <div style={{
              fontSize: '14px',
              opacity: 0.7
            }}>
              当前没有{currentCard?.title || '相关'}记录
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <Alert message={alertMessage} type={alertType} onClose={() => setAlertMessage('')} />
      
      {selectedDataType ? renderDataView() : renderCardView()}
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes slideDown {
            from { 
              opacity: 0; 
              transform: translateY(-10px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
        `}
      </style>
    </div>
  )
}

export default DataViewer
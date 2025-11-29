import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Download, Upload, Database, AlertTriangle, AlertCircle, Save } from 'lucide-react'
import { db } from '../db/database'

const Settings = () => {
  const [exportStatus, setExportStatus] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  
  // 加载低库存阈值设置
  useEffect(() => {
    loadLowStockThreshold()
  }, [])
  
  const loadLowStockThreshold = async () => {
    try {
      const setting = await db.settings.get({ key: 'lowStockThreshold' })
      if (setting) {
        setLowStockThreshold(setting.value.toString())
      }
    } catch (error) {
      console.error('加载低库存阈值失败:', error)
    }
  }
  


  // 保存低库存阈值设置
  const saveLowStockThreshold = async () => {
    try {
      setSaveStatus('正在保存...')
      const threshold = parseInt(lowStockThreshold)
      
      // 验证输入
      if (isNaN(threshold) || threshold < 0) {
        setSaveStatus('请输入有效的非负整数')
        setTimeout(() => setSaveStatus(''), 3000)
        return
      }
      
      // 保存到数据库
      await db.settings.put({ key: 'lowStockThreshold', value: threshold })
      
      setSaveStatus('保存成功！')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('保存低库存阈值失败:', error)
      setSaveStatus('保存失败，请重试')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }



  // 导出数据
  const exportData = async () => {
    try {
      setExportStatus('正在导出数据...')
      
      // 获取所有数据表的数据
      const clothes = await db.clothes.toArray()
      const inventory = await db.inventory.toArray()
      const stockIn = await db.stockIn.toArray()
      const stockOut = await db.stockOut.toArray()
      
      // 创建备份对象
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          clothes,
          inventory,
          stockIn,
          stockOut
        }
      }
      
      // 创建JSON文件
      const dataStr = JSON.stringify(backupData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      // 创建下载链接
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `服装库存备份_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setExportStatus('数据导出成功！')
      setTimeout(() => setExportStatus(''), 3000)
    } catch (error) {
      console.error('导出数据失败:', error)
      setExportStatus('导出失败，请重试')
      setTimeout(() => setExportStatus(''), 3000)
    }
  }

  // 导入数据
  const importData = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    // 检查文件类型
    if (!file.name.endsWith('.json')) {
      setImportStatus('导入失败：请选择JSON格式的备份文件')
      setTimeout(() => setImportStatus(''), 5000)
      event.target.value = '' // 清空文件输入
      return
    }
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        setImportStatus('正在导入数据...')
        
        const fileContent = e.target.result
        
        // 检查文件内容是否为空
        if (!fileContent || fileContent.trim() === '') {
          throw new Error('备份文件为空')
        }
        
        const backupData = JSON.parse(fileContent)
        
        // 验证备份文件格式 - 更宽松的验证
        if (!backupData || typeof backupData !== 'object') {
          throw new Error('无效的备份文件格式：文件内容不是有效的JSON对象')
        }
        
        // 检查数据格式 - 支持多种备份文件格式
        let dataToImport = backupData
        
        // 格式1: 标准备份格式 {version, timestamp, data: {...}}
        if (backupData.data && typeof backupData.data === 'object') {
          dataToImport = backupData.data
        }
        // 格式2: 直接包含数据表的格式 {clothes: [...], inventory: [...], ...}
        else if (backupData.clothes || backupData.inventory || backupData.stockIn || backupData.stockOut) {
          dataToImport = backupData
        }
        // 格式3: 单个数据表的数组格式
        else if (Array.isArray(backupData)) {
          // 尝试识别数组类型
          if (backupData.length > 0) {
            const firstItem = backupData[0]
            if (firstItem.code && firstItem.name) {
              // 可能是服装数据
              dataToImport = { clothes: backupData }
            } else if (firstItem.clothingId && firstItem.quantity !== undefined) {
              // 可能是库存数据
              dataToImport = { inventory: backupData }
            } else if (firstItem.clothingId && firstItem.purchasePrice !== undefined) {
              // 可能是入库数据
              dataToImport = { stockIn: backupData }
            } else if (firstItem.clothingId && firstItem.sellingPrice !== undefined) {
              // 可能是出库数据
              dataToImport = { stockOut: backupData }
            } else {
              throw new Error('无法识别备份文件中的数据类型')
            }
          } else {
            throw new Error('备份文件为空数组')
          }
        } else {
          throw new Error('无效的备份文件格式：无法识别的文件结构')
        }
        
        // 检查是否有至少一个数据表
        const hasData = dataToImport.clothes || dataToImport.inventory || 
                       dataToImport.stockIn || dataToImport.stockOut
        if (!hasData) {
          throw new Error('备份文件中没有找到有效的数据')
        }
        
        // 清空现有数据
        await db.clothes.clear()
        await db.inventory.clear()
        await db.stockIn.clear()
        await db.stockOut.clear()
        
        // 导入新数据 - 添加错误处理
        let importedCount = 0
        
        if (dataToImport.clothes && Array.isArray(dataToImport.clothes)) {
          await db.clothes.bulkAdd(dataToImport.clothes)
          importedCount += dataToImport.clothes.length
        }
        if (dataToImport.inventory && Array.isArray(dataToImport.inventory)) {
          await db.inventory.bulkAdd(dataToImport.inventory)
          importedCount += dataToImport.inventory.length
        }
        if (dataToImport.stockIn && Array.isArray(dataToImport.stockIn)) {
          await db.stockIn.bulkAdd(dataToImport.stockIn)
          importedCount += dataToImport.stockIn.length
        }
        if (dataToImport.stockOut && Array.isArray(dataToImport.stockOut)) {
          await db.stockOut.bulkAdd(dataToImport.stockOut)
          importedCount += dataToImport.stockOut.length
        }
        
        setImportStatus(`数据导入成功！共导入 ${importedCount} 条记录，页面将刷新...`)
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } catch (error) {
        console.error('导入数据失败:', error)
        
        // 更详细的错误信息
        let errorMessage = '导入失败：'
        if (error.message.includes('JSON')) {
          errorMessage += '文件格式错误，请确保选择的是有效的JSON备份文件'
        } else if (error.message.includes('无法识别')) {
          errorMessage += '无法识别备份文件中的数据类型'
        } else if (error.message.includes('文件结构')) {
          errorMessage += '备份文件格式不正确，请使用系统导出的标准备份文件'
        } else if (error.message.includes('没有找到有效的数据')) {
          errorMessage += '备份文件中没有找到有效的数据记录'
        } else if (error.message.includes('为空')) {
          errorMessage += '备份文件为空'
        } else {
          errorMessage += '文件格式错误或数据损坏'
        }
        
        setImportStatus(errorMessage)
        setTimeout(() => setImportStatus(''), 5000)
      }
    }
    
    reader.onerror = () => {
      setImportStatus('导入失败：文件读取错误')
      setTimeout(() => setImportStatus(''), 5000)
    }
    
    reader.readAsText(file)
    event.target.value = '' // 清空文件输入
  }

  return (
    <div className="container">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '32px'
      }}>
        <SettingsIcon size={28} color="#666" />
        <h1 className="text-xl font-semibold">系统设置</h1>
      </div>

      {/* 低库存阈值设置 */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={20} color="#FF9800" />
          低库存阈值设置
        </h2>
        
        <div style={{ marginBottom: '16px', lineHeight: '1.6' }}>
          设置库存预警阈值，当商品库存低于此值时将标记为低库存。
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="lowStockThreshold" style={{ fontWeight: '500', minWidth: '120px' }}>
              低库存阈值：
            </label>
            <input
              id="lowStockThreshold"
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              onWheel={(e) => e.target.blur()}
              placeholder="请输入阈值"
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                width: '150px'
              }}
              min="0"
              step="1"
            />
          </div>
          
          <button
            onClick={saveLowStockThreshold}
            className="btn btn-primary"
            style={{ 
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            保存设置
          </button>
        </div>
        
        {saveStatus && (
          <div style={{
            color: saveStatus.includes('成功') ? '#4CAF50' : (saveStatus.includes('有效的') ? '#FF9800' : '#f44336'),
            fontWeight: '500',
            fontSize: '14px'
          }}>
            {saveStatus}
          </div>
        )}
      </div>


      
      {/* 数据备份与恢复 */}
      <div className="card">
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Database size={20} />
          数据备份与恢复
        </h2>
        
        <div style={{ 
          color: '#666', 
          marginBottom: '24px',
          lineHeight: '1.6'
        }}>
          备份您的库存数据到本地文件，或从备份文件恢复数据。
          建议定期备份数据以防意外丢失。
        </div>

        {/* 导出数据 */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: '#333'
          }}>
            导出数据备份
          </h3>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={exportData}
              className="btn btn-primary"
              style={{ minHeight: '44px' }}
            >
              <Download size={16} />
              导出数据备份
            </button>
            
            {exportStatus && (
              <span style={{ 
                color: exportStatus.includes('成功') ? '#4CAF50' : '#f44336',
                fontWeight: '500'
              }}>
                {exportStatus}
              </span>
            )}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginTop: '8px'
          }}>
            将导出所有服装信息、库存数据、出入库记录到JSON文件
          </div>
        </div>

        {/* 导入数据 */}
        <div>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: '#333'
          }}>
            从备份文件恢复数据
          </h3>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <label className="btn btn-success" style={{ 
              minHeight: '44px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#28a745',
              borderColor: '#28a745'
            }}>
              <Upload size={16} />
              导入备份文件
              <input
                type="file"
                accept=".json"
                onChange={importData}
                style={{ display: 'none' }}
              />
            </label>
            
            {importStatus && (
              <span style={{ 
                color: importStatus.includes('成功') ? '#4CAF50' : '#f44336',
                fontWeight: '500'
              }}>
                {importStatus}
              </span>
            )}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginTop: '8px'
          }}>
            注意：导入数据将覆盖所有现有数据，请谨慎操作！
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="card">
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={20} color="#FF9800" />
          使用说明
        </h2>
        
        <div style={{ lineHeight: '1.6' }}>
          <p style={{ marginBottom: '16px' }}>
            <strong>数据备份流程：</strong>
          </p>
          <ol style={{ marginLeft: '20px', marginBottom: '16px' }}>
            <li>点击"导出数据备份"按钮下载备份文件</li>
            <li>将备份文件保存到安全位置（U盘、云盘等）</li>
            <li>在不同设备上打开系统，选择"导入备份文件"</li>
            <li>选择之前导出的备份文件进行恢复</li>
          </ol>
          
          <p style={{ 
            color: '#f44336', 
            fontWeight: '500',
            fontSize: '14px'
          }}>
            ⚠️ 重要提醒：导入数据会完全覆盖当前所有数据，请确保已备份重要数据！
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings
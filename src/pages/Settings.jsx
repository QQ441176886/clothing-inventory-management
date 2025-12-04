import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, Download, Upload, Database, AlertTriangle, AlertCircle, Save, FileSpreadsheet } from 'lucide-react'
import { db } from '../db/database'
import * as XLSX from 'xlsx'

const Settings = () => {
  const navigate = useNavigate()
  const [exportStatus, setExportStatus] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [excelImportStatus, setExcelImportStatus] = useState('')
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
      
      // 创建库存映射，用于快速查找服装对应的库存数量
      const inventoryMap = new Map()
      inventory.forEach(item => {
        inventoryMap.set(item.clothingId, item.quantity)
      })
      
      // 将库存数量合并到服装数据中
      const clothesWithInventory = clothes.map(clothing => ({
        ...clothing,
        quantity: inventoryMap.get(clothing.id) || 0
      }))
      
      // 创建备份对象
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          clothes: clothesWithInventory,
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

  // Excel转换和导入数据
  const importExcelData = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    // 检查文件类型
    if (!file.name.endsWith('.xlsx')) {
      setExcelImportStatus('导入失败：请选择Excel格式的进货单文件')
      setTimeout(() => setExcelImportStatus(''), 5000)
      event.target.value = '' // 清空文件输入
      return
    }
    
    setExcelImportStatus('正在解析Excel文件...')
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        
        // 以数组形式读取Excel，这样可以避免中文列名编码问题
        const excelDataArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (excelDataArray.length < 2) {
          setExcelImportStatus('导入失败：Excel文件中没有数据')
          setTimeout(() => setExcelImportStatus(''), 5000)
          return
        }
        
        console.log('Excel数据解析成功:', excelDataArray)
        
        // 手动处理表头和数据行
        const headers = excelDataArray[0]
        const dataRows = excelDataArray.slice(1)
        
        // 查找列索引（基于列名内容）
        const findColumnIndex = (headerNameKeywords) => {
          return headers.findIndex(h => {
            const headerStr = String(h || '')
            return headerNameKeywords.some(keyword => 
              headerStr.includes(keyword) || 
              headerStr.toLowerCase().includes(keyword.toLowerCase())
            )
          })
        }
        
        // 定义列名关键词
        const codeIndex = findColumnIndex(['编码', 'code', 'Code'])
        const nameIndex = findColumnIndex(['名称', 'name', 'Name'])
        const categoryIndex = findColumnIndex(['品类', '类别', 'category', 'Category'])
        const colorIndex = findColumnIndex(['颜色', 'color', 'Color'])
        const sizeIndex = findColumnIndex(['尺码', '尺寸', 'size', 'Size'])
        const quantityIndex = findColumnIndex(['数量', 'quantity', 'Quantity'])
        const purchasePriceIndex = findColumnIndex(['进货单价', '进价', '进货', 'purchasePrice', 'PurchasePrice'])
        const sellingPriceIndex = findColumnIndex(['销售金额', '售价', '销售', 'sellingPrice', 'SellingPrice'])
        
        console.log('列索引:', {
          code: codeIndex,
          name: nameIndex,
          category: categoryIndex,
          color: colorIndex,
          size: sizeIndex,
          quantity: quantityIndex,
          purchasePrice: purchasePriceIndex,
          sellingPrice: sellingPriceIndex
        })
        
        // 检查必要的列是否都找到了
        const missingColumns = []
        if (codeIndex === -1) missingColumns.push('服装编码/Code')
        if (nameIndex === -1) missingColumns.push('服装名称/Name')
        if (colorIndex === -1) missingColumns.push('服装颜色/Color')
        if (sizeIndex === -1) missingColumns.push('服装尺码/Size')
        
        if (missingColumns.length > 0) {
          console.warn('缺少必要的列:', missingColumns)
          setExcelImportStatus('导入失败：缺少必要的列 ' + missingColumns.join(', '))
          setTimeout(() => setExcelImportStatus(''), 5000)
          return
        }
        
        // 清理和转换数据
        const cleanedData = dataRows.map(row => ({
          '服装编码': String(row[codeIndex] || '').trim(),
          '服装名称': String(row[nameIndex] || '').trim(),
          '服装品类': String(row[categoryIndex] || '其他').trim(),
          '服装颜色': String(row[colorIndex] || '').trim(),
          '服装尺码': String(row[sizeIndex] || '').trim(),
          '服装数量': Math.round(Number(row[quantityIndex] || 1)),
          '进货单价': Number(row[purchasePriceIndex] || 0),
          '销售金额': Number(row[sellingPriceIndex] || (Number(row[purchasePriceIndex] || 0) * 1.5)),
          '备注': ''
        })).filter(row => 
          row['服装编码'] && row['服装名称'] && row['服装颜色'] && row['服装尺码']
        )
        
        console.log('清理后的数据行数:', cleanedData.length)
        
        // 构建系统所需的JSON结构
        const clothes = []
        const inventory = []
        const stockIn = []
        let clothingIdCounter = 1
        
        // 创建一个字典来跟踪已存在的服装记录（使用code+color+size作为唯一标识）
        const existingClothes = new Map()
        
        const currentTimeISO = new Date().toISOString()
        
        for (let index = 0; index < cleanedData.length; index++) {
          const row = cleanedData[index]
          // 生成唯一标识：服装编码+颜色+尺码
          const uniqueKey = `${row['服装编码']}_${row['服装颜色']}_${row['服装尺码']}`
          let clothingId
          
          if (existingClothes.has(uniqueKey)) {
            // 如果服装记录已存在，使用已有的clothingId
            clothingId = existingClothes.get(uniqueKey)
            
            // 找到对应的库存记录并更新数量
            for (const invItem of inventory) {
              if (invItem['clothingId'] === clothingId) {
                invItem['quantity'] += row['服装数量']
                break
              }
            }
          } else {
            // 如果服装记录不存在，创建新的服装记录
            const clothing = {
              "id": clothingIdCounter,
              "code": row['服装编码'],
              "name": row['服装名称'],
              "category": row['服装品类'],
              "categoryCustom": "",
              "purchasePrice": row['进货单价'],
              "sellingPrice": row['销售金额'],
              "remark": row['备注'],
              "color": row['服装颜色'],
              "size": row['服装尺码'],
              "createdAt": currentTimeISO,
              "updatedAt": currentTimeISO
            }
            clothes.push(clothing)
            
            // 创建库存记录
            const inventoryItem = {
              "clothingId": clothingIdCounter,
              "quantity": row['服装数量'],
              "createdAt": currentTimeISO,
              "updatedAt": currentTimeISO
            }
            inventory.push(inventoryItem)
            
            // 记录这个服装记录
            existingClothes.set(uniqueKey, clothingIdCounter)
            clothingId = clothingIdCounter
            clothingIdCounter++
          }
          
          // 创建入库记录（无论服装记录是否已存在，都创建新的入库记录）
          const stockInItem = {
            "clothingId": clothingId,
            "quantity": row['服装数量'],
            "purchasePrice": row['进货单价'],
            "totalAmount": row['服装数量'] * row['进货单价'],
            "date": new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
            "operator": "系统导入",
            "notes": "Excel导入",
            "size": row['服装尺码'],
            "color": row['服装颜色'],
            "code": row['服装编码'],
            "name": row['服装名称'],
            "category": row['服装品类'],
            "sellingPrice": row['销售金额'],
            "createdAt": currentTimeISO
          }
          stockIn.push(stockInItem)
        }
        
        const duplicateCount = cleanedData.length - clothes.length
        
        console.log('转换结果统计:')
        console.log('  原始数据行数:', cleanedData.length)
        console.log('  重复商品数量:', duplicateCount)
        console.log('  服装记录数:', clothes.length)
        console.log('  库存记录数:', inventory.length)
        console.log('  入库记录数:', stockIn.length)
        
        setExcelImportStatus('Excel解析完成，正在导入数据...')
        
        // 准备导入数据
        const dataToImport = {
          clothes,
          inventory,
          stockIn
        }
        
        // 使用现有的导入逻辑导入转换后的数据
        const importResult = await importDataFromObject(dataToImport)
        
        if (importResult.success) {
          setExcelImportStatus(`Excel数据导入成功！共导入 ${importResult.importedCount} 条记录，页面将刷新...`)
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          setExcelImportStatus('导入失败：' + importResult.error)
          setTimeout(() => setExcelImportStatus(''), 5000)
        }
        
      } catch (error) {
        console.error('Excel转换或导入失败:', error)
        setExcelImportStatus('导入失败：' + error.message)
        setTimeout(() => setExcelImportStatus(''), 5000)
      }
    }
    
    reader.onerror = () => {
      setExcelImportStatus('导入失败：文件读取错误')
      setTimeout(() => setExcelImportStatus(''), 5000)
    }
    
    reader.readAsArrayBuffer(file)
    event.target.value = '' // 清空文件输入
  }
  
  // 从对象导入数据（用于复用导入逻辑）
  const importDataFromObject = async (dataToImport) => {
    try {
      let importedCount = 0
      
      // 清空现有数据
      await db.clothes.clear()
      await db.inventory.clear()
      await db.stockIn.clear()
      await db.stockOut.clear()
      
      // 移除导入数据中的id字段，保留所有服装记录
      const uniqueClothes = dataToImport.clothes
        .filter(clothing => clothing) // 只过滤null/undefined
        .map(clothing => {
          const { id, ...clothingWithoutId } = clothing
          return clothingWithoutId
        })
      
      // 逐个添加服装记录
      const clothesIdMap = new Map() // 使用唯一键映射新ID
      const clothesByUniqueKey = new Map() // 用于快速查找
      
      for (let i = 0; i < uniqueClothes.length; i++) {
        try {
          const clothing = uniqueClothes[i]
          
          // 添加服装记录
          const newId = await db.clothes.add(clothing)
          importedCount++
          
          // 使用唯一键（服装编码+颜色+尺码）建立映射
          const uniqueKey = `${clothing.code}_${clothing.color}_${clothing.size}`
          clothesIdMap.set(uniqueKey, newId)
          clothesByUniqueKey.set(uniqueKey, clothing)
        } catch (error) {
          console.warn('跳过重复或无效的服装记录:', error)
        }
      }
      
      // 处理inventory数据
      if (dataToImport.inventory && Array.isArray(dataToImport.inventory)) {
        for (const inventoryItem of dataToImport.inventory) {
          try {
            const { id, clothingId, quantity, ...inventoryWithoutId } = inventoryItem
            
            // 获取原始服装数据
            const originalClothing = dataToImport.clothes[clothingId - 1] || 
                                    dataToImport.clothes.find(c => 
                                      c.id === clothingId
                                    )
            
            // 找到对应的服装记录
            let correctClothingId
            if (originalClothing) {
              const uniqueKey = `${originalClothing.code}_${originalClothing.color}_${originalClothing.size}`
              correctClothingId = clothesIdMap.get(uniqueKey)
            }
            
            // 如果找不到映射，跳过该记录
            if (!correctClothingId) {
              continue
            }
            
            // 添加库存记录
            await db.inventory.add({
              clothingId: correctClothingId,
              quantity: quantity || 0,
              ...inventoryWithoutId,
              updatedAt: new Date()
            })
            importedCount++
          } catch (error) {
            console.warn('跳过重复或无效的库存记录:', error)
          }
        }
      }
      
      // 处理stockIn数据
      if (dataToImport.stockIn && Array.isArray(dataToImport.stockIn)) {
        for (const stockInItem of dataToImport.stockIn) {
          try {
            const { id, clothingId, ...stockInWithoutId } = stockInItem
            
            // 获取原始服装数据
            const originalClothing = dataToImport.clothes[clothingId - 1] || 
                                    dataToImport.clothes.find(c => 
                                      c.id === clothingId
                                    )
            
            // 找到对应的服装记录
            let correctClothingId
            if (originalClothing) {
              const uniqueKey = `${originalClothing.code}_${originalClothing.color}_${originalClothing.size}`
              correctClothingId = clothesIdMap.get(uniqueKey)
            } else {
              // 如果没有原始服装数据，尝试使用stockInItem中的信息查找
              const uniqueKey = `${stockInItem.code}_${stockInItem.color}_${stockInItem.size}`
              correctClothingId = clothesIdMap.get(uniqueKey)
            }
            
            // 如果找不到映射，跳过该记录
            if (!correctClothingId) {
              continue
            }
            
            // 添加入库记录
            await db.stockIn.add({
              ...stockInWithoutId,
              clothingId: correctClothingId,
              date: stockInItem.date || new Date()
            })
            importedCount++
          } catch (error) {
            console.warn('跳过重复或无效的入库记录:', error)
          }
        }
      }
      
      return { success: true, importedCount }
    } catch (error) {
      console.error('导入数据失败:', error)
      return { success: false, error: error.message }
    }
  }
  
  // 导入JSON备份数据
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
        
        // 导入新数据 - 添加错误处理
        let importedCount = 0
        
        // 只清空要导入的数据表，保留其他表的数据
        let clothesIdMap = new Map() // 用于映射原始clothes id到新导入的clothes id
        
        if (dataToImport.clothes && Array.isArray(dataToImport.clothes)) {
          // 先保存现有的库存记录（如果有的话），以便后续关联
          const existingInventory = await db.inventory.toArray()
          
          await db.clothes.clear()
          await db.inventory.clear()
          
          // 如果导入服装数据，也需要清空依赖它的入库和出库记录
          // 因为新的服装会有新的ID，旧的入库出库记录会无法关联
          if (dataToImport.stockIn || dataToImport.stockOut) {
            // 如果同时导入了stockIn数据，先清空现有入库记录
            await db.stockIn.clear()
          }
          
          if (dataToImport.stockOut || dataToImport.stockIn) {
            // 如果同时导入了stockOut数据，先清空现有出库记录
            await db.stockOut.clear()
          }
          
          // 移除导入数据中的id字段，保留所有服装记录
          // 根据用户要求，不再过滤缺少字段的记录和去重处理
          const uniqueClothes = dataToImport.clothes
            .filter(clothing => clothing) // 只过滤null/undefined
            .map(clothing => {
              const { id, ...clothingWithoutId } = clothing
              return clothingWithoutId
            })
          
          // 逐个添加，而不是批量添加，以更好地处理可能的冲突
          for (const clothing of uniqueClothes) {
            try {
              const originalId = dataToImport.clothes.find(c => 
                c.code === clothing.code && c.color === clothing.color && c.size === clothing.size
              )?.id
              
              const newId = await db.clothes.add(clothing)
              importedCount++
              
              // 记录原始id到新id的映射
              if (originalId) {
                clothesIdMap.set(originalId, newId)
              }
            } catch (error) {
              console.warn('跳过重复或无效的服装记录:', clothing, error)
            }
          }
        }
        
        if (dataToImport.inventory && Array.isArray(dataToImport.inventory)) {
          // 如果没有先导入clothes数据，先清空inventory表
          if (!dataToImport.clothes) {
            await db.inventory.clear()
          }
          
          // 处理inventory数据
          for (const inventoryItem of dataToImport.inventory) {
            try {
              const { id, clothingId, ...inventoryWithoutId } = inventoryItem
              
              // 获取正确的clothingId
              let correctClothingId = clothingId
              
              // 如果有id映射表，使用映射后的id
              if (clothesIdMap.has(clothingId)) {
                correctClothingId = clothesIdMap.get(clothingId)
              } else {
                // 否则检查clothingId是否存在
                const clothingExists = await db.clothes.get(correctClothingId)
                if (!clothingExists) {
                  // 尝试通过code+color+size查找服装记录
                  // 优先使用库存记录中的code+color+size
                  let searchCriteria = null
                  
                  // 检查库存记录是否包含code+color+size
                  if (inventoryItem.code && inventoryItem.color && inventoryItem.size) {
                    searchCriteria = {
                      code: inventoryItem.code,
                      color: inventoryItem.color,
                      size: inventoryItem.size
                    }
                  } else {
                    // 否则尝试通过原服装数据查找
                    const originalClothing = dataToImport.clothes?.find(c => c.id === clothingId)
                    if (originalClothing && originalClothing.code && originalClothing.color && originalClothing.size) {
                      searchCriteria = {
                        code: originalClothing.code,
                        color: originalClothing.color,
                        size: originalClothing.size
                      }
                    }
                  }
                  
                  if (searchCriteria) {
                    // 通过code+color+size查找服装记录
                    const clothing = await db.clothes.where(searchCriteria).first()
                    
                    if (clothing) {
                      correctClothingId = clothing.id
                    } else {
                      // 如果找不到对应的服装记录，跳过这个库存记录
                      console.warn('跳过无效的库存记录，找不到对应的服装:', inventoryItem)
                      continue
                    }
                  } else {
                    // 如果没有足够的信息查找服装记录，跳过这个库存记录
                    console.warn('跳过无效的库存记录，缺少查找服装所需的信息:', inventoryItem)
                    continue
                  }
                }
              }
              
              // 直接添加新的库存记录，不检查是否已存在
              // 因为在convert_excel_to_json.py中，我们为每行Excel数据创建了独立的服装记录
              // 每个服装记录对应一个库存记录，所以不需要检查重复
              await db.inventory.add({
                ...inventoryWithoutId,
                clothingId: correctClothingId,
                updatedAt: new Date()
              })
              
              importedCount++
            } catch (error) {
              console.warn('跳过重复或无效的库存记录:', inventoryItem, error)
            }
          }
        }
        
        if (dataToImport.stockIn && Array.isArray(dataToImport.stockIn)) {
          // 处理stockIn数据
          // 先清空现有入库记录，确保只显示新导入的数据
          await db.stockIn.clear()
          
          for (const stockInItem of dataToImport.stockIn) {
            try {
              const { id, clothingId, ...stockInWithoutId } = stockInItem
              
              // 获取正确的clothingId
              let correctClothingId = clothingId
              
              // 如果有id映射表，使用映射后的id
              if (clothesIdMap.has(clothingId)) {
                correctClothingId = clothesIdMap.get(clothingId)
              } else {
                // 否则检查clothingId是否存在
                const clothingExists = await db.clothes.get(correctClothingId)
                if (!clothingExists) {
                  // 如果clothingId不存在，尝试通过code+color+size查找
                  let clothing = await db.clothes.where({ 
                    code: stockInItem.code, 
                    color: stockInItem.color, 
                    size: stockInItem.size 
                  }).first()
                  
                  if (clothing) {
                    correctClothingId = clothing.id
                  } else {
                    // 如果找不到对应的服装记录，尝试从入库记录创建新的服装记录
                    if (stockInItem.code && stockInItem.name) {
                      // 创建新的服装记录
                      correctClothingId = await db.clothes.add({
                        code: stockInItem.code,
                        name: stockInItem.name,
                        category: stockInItem.category || '默认分类',
                        size: stockInItem.size || '未设置',
                        color: stockInItem.color || '未设置',
                        purchasePrice: stockInItem.purchasePrice || 0,
                        sellingPrice: stockInItem.sellingPrice || 0,
                        // 其他必要的服装字段可以根据实际情况添加
                      })
                      importedCount++
                    } else {
                      // 如果没有足够的信息创建服装记录，跳过这个入库记录
                      console.warn('跳过无效的入库记录，缺少创建服装所需的信息:', stockInItem)
                      continue
                    }
                  }
                }
              }
              
              // 保存入库记录
              await db.stockIn.add({
                ...stockInWithoutId,
                clothingId: correctClothingId,
                date: stockInItem.date || new Date()
              })
              importedCount++
              
              // 仅当没有导入inventory数据时，才根据stockIn数据更新库存
              // 这样可以避免库存数量被重复计算
              if (!dataToImport.inventory) {
                const inventory = await db.inventory.where({ clothingId: correctClothingId }).first()
                if (inventory) {
                  await db.inventory.update(inventory.id, {
                    quantity: inventory.quantity + (stockInItem.quantity || 0),
                    updatedAt: new Date()
                  })
                } else {
                  // 如果没有库存记录，创建新的
                  await db.inventory.add({
                    clothingId: correctClothingId,
                    quantity: stockInItem.quantity || 0,
                    updatedAt: new Date()
                  })
                }
              }
              
            } catch (error) {
              console.warn('跳过重复或无效的入库记录:', stockInItem, error)
            }
          }
        }
        
        if (dataToImport.stockOut && Array.isArray(dataToImport.stockOut)) {
          // 处理stockOut数据
          for (const stockOutItem of dataToImport.stockOut) {
            try {
              const { id, clothingId, ...stockOutWithoutId } = stockOutItem
              
              // 获取正确的clothingId
              let correctClothingId = clothingId
              
              // 如果有id映射表，使用映射后的id
              if (clothesIdMap.has(clothingId)) {
                correctClothingId = clothesIdMap.get(clothingId)
              } else {
                // 否则检查clothingId是否存在
                const clothingExists = await db.clothes.get(correctClothingId)
                if (!clothingExists) {
                  // 如果clothingId不存在，尝试通过code+color+size查找
                  const clothing = await db.clothes.where({ 
                    code: stockOutItem.code, 
                    color: stockOutItem.color, 
                    size: stockOutItem.size 
                  }).first()
                  
                  if (clothing) {
                    correctClothingId = clothing.id
                  } else {
                    // 如果找不到对应的服装记录，跳过这个出库记录
                    console.warn('跳过无效的出库记录，找不到对应的服装:', stockOutItem)
                    continue
                  }
                }
              }
              
              await db.stockOut.add({
                ...stockOutWithoutId,
                clothingId: correctClothingId,
                date: stockOutItem.date || new Date()
              })
              importedCount++
            } catch (error) {
              console.warn('跳过重复或无效的出库记录:', stockOutItem, error)
            }
          }
        }
        
        // 如果只导入了clothes数据，为每款服装创建库存记录
        if (dataToImport.clothes && Array.isArray(dataToImport.clothes) && 
            (!dataToImport.inventory || !Array.isArray(dataToImport.inventory))) {
          const allClothes = await db.clothes.toArray()
          for (const clothing of allClothes) {
            const existingInventory = await db.inventory.where({ clothingId: clothing.id }).first()
            if (!existingInventory) {
              // 尝试从服装数据中获取库存数量（如果存在的话），否则使用默认值0
              const inventoryQuantity = clothing.quantity || 0
              await db.inventory.add({
                clothingId: clothing.id,
                quantity: inventoryQuantity,
                updatedAt: new Date()
              })
              importedCount++
            }
          }
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
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
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
              borderColor: '#28a745',
              marginRight: '12px'
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
            
            <label className="btn btn-primary" style={{ 
              minHeight: '44px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#007bff',
              borderColor: '#007bff'
            }}>
              <FileSpreadsheet size={16} />
              导入Excel进货单
              <input
                type="file"
                accept=".xlsx"
                onChange={importExcelData}
                style={{ display: 'none' }}
              />
            </label>
            
            {importStatus && (
              <span style={{ 
                color: importStatus.includes('成功') ? '#4CAF50' : '#f44336',
                fontWeight: '500',
                marginLeft: '16px'
              }}>
                {importStatus}
              </span>
            )}
            
            {excelImportStatus && (
              <span style={{ 
                color: excelImportStatus.includes('成功') ? '#4CAF50' : '#f44336',
                fontWeight: '500',
                marginLeft: '16px'
              }}>
                {excelImportStatus}
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
import pandas as pd
import json
import os
from datetime import datetime

# 读取Excel文件
excel_path = '进货单.xlsx'
try:
    df = pd.read_excel(excel_path)
    print("成功读取Excel文件")
    print("Excel列名:", df.columns.tolist())
    print("Excel数据预览:")
    print(df.head())
    
    # 检查必要的列
    required_columns = ['服装编码', '服装名称', '服装品类', '服装尺码', '服装颜色', '服装数量', '进货单价', '销售金额']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        print(f"警告: 缺少必要的列: {missing_columns}")
    
    # 清理数据
    df = df.dropna(subset=['服装编码', '服装名称', '服装颜色', '服装尺码'])
    df = df[df['服装名称'].str.strip() != '']
    df = df[df['服装编码'].str.strip() != '']
    df = df[df['服装颜色'].str.strip() != '']
    df = df[df['服装尺码'].str.strip() != '']
    
    # 填充缺失值
    df['服装数量'] = df['服装数量'].fillna(1).astype(int)
    df['进货单价'] = df['进货单价'].fillna(0.0).astype(float)
    df['销售金额'] = df['销售金额'].fillna(df['进货单价'] * 1.5).astype(float)  # 默认销售价为采购价的1.5倍
    df['服装品类'] = df['服装品类'].fillna('其他')
    
    print(f"清理后的数据行数: {len(df)}")
    
    # 构建系统所需的JSON结构
    clothes = []
    inventory = []
    stock_in = []
    clothing_id_counter = 1
    
    # 创建一个字典来跟踪已存在的服装记录（使用code+color+size作为唯一标识）
    existing_clothes = {}
    
    for index, row in df.iterrows():
        # 生成唯一标识：服装编码+颜色+尺码
        unique_key = f"{str(row['服装编码']).strip()}_{str(row['服装颜色']).strip()}_{str(row['服装尺码']).strip()}"
        
        if unique_key in existing_clothes:
            # 如果服装记录已存在，使用已有的clothingId
            clothing_id = existing_clothes[unique_key]
            
            # 找到对应的库存记录并更新数量
            for inv_item in inventory:
                if inv_item['clothingId'] == clothing_id:
                    inv_item['quantity'] += int(row['服装数量'])
                    break
        else:
            # 如果服装记录不存在，创建新的服装记录
            clothing = {
                "code": str(row['服装编码']).strip(),
                "name": str(row['服装名称']).strip(),
                "category": str(row['服装品类']).strip(),
                "categoryCustom": "",
                "purchasePrice": float(row['进货单价']),
                "sellingPrice": float(row['销售金额']),
                "remark": str(row['备注']) if not pd.isna(row['备注']) else "",
                "color": str(row['服装颜色']).strip(),
                "size": str(row['服装尺码']).strip(),
                "createdAt": datetime.now().isoformat() + "Z",
                "updatedAt": datetime.now().isoformat() + "Z",
                "id": clothing_id_counter
            }
            clothes.append(clothing)
            
            # 创建库存记录
            inventory_item = {
                "clothingId": clothing_id_counter,
                "quantity": int(row['服装数量']),
                "createdAt": datetime.now().isoformat() + "Z",
                "updatedAt": datetime.now().isoformat() + "Z",
                "id": clothing_id_counter
            }
            inventory.append(inventory_item)
            
            # 记录这个服装记录
            existing_clothes[unique_key] = clothing_id_counter
            clothing_id = clothing_id_counter
            clothing_id_counter += 1
        
        # 创建入库记录（无论服装记录是否已存在，都创建新的入库记录）
        stock_in_item = {
            "clothingId": clothing_id,
            "quantity": int(row['服装数量']),
            "purchasePrice": float(row['进货单价']),
            "totalAmount": float(row['服装数量'] * row['进货单价']),
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "operator": "系统导入",
            "notes": "Excel导入",
            "size": str(row['服装尺码']).strip(),
            "color": str(row['服装颜色']).strip(),
            "code": str(row['服装编码']).strip(),  # 添加code字段
            "name": str(row['服装名称']).strip(),  # 添加name字段
            "category": str(row['服装品类']).strip(),  # 添加category字段
            "sellingPrice": float(row['销售金额']),  # 添加sellingPrice字段
            "createdAt": datetime.now().isoformat() + "Z",
            "id": index + 1  # 使用不同的id计数器
        }
        stock_in.append(stock_in_item)
    
    duplicate_count = len(df) - len(clothes)  # 计算重复的商品数量
    
    # 构建最终的JSON结构
    result = {
        "data": {
            "clothes": clothes,
            "inventory": inventory,
            "stockIn": stock_in
        }
    }
    
    # 保存为JSON文件
    output_path = '转换后的进货单.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"成功转换并保存JSON文件到: {output_path}")
    print(f"转换结果统计:")
    print(f"  原始数据行数: {len(df)}")
    print(f"  重复商品数量: {duplicate_count}")
    print(f"  服装记录数: {len(clothes)}")
    print(f"  库存记录数: {len(inventory)}")
    print(f"  入库记录数: {len(stock_in)}")
    
except Exception as e:
    print(f"转换失败: {str(e)}")
    import traceback
    traceback.print_exc()
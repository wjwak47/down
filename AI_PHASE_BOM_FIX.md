# AI阶段BOM编码问题修复

## 问题描述

用户报告密码破解的AI阶段很快就跑完了，没有正常工作。通过调试发现问题出现在PassGPT Python脚本的JSON参数文件读取上。

## 根本原因

**BOM（Byte Order Mark）编码问题**：
- Windows PowerShell的UTF-8编码会在文件开头添加BOM标记（`\xef\xbb\xbf`）
- Python的`json.load()`无法解析带BOM的JSON文件
- 导致脚本启动时就失败，AI阶段快速跳过

## 错误表现

```
[PassGPT] ERROR: Expecting value: line 1 column 1 (char 0)
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

## 解决方案

### 修复Python脚本文件读取

**文件**: `scripts/passgpt_inference.py`

**修改前**:
```python
with open(args_file, 'r') as f:
    args = json.load(f)
```

**修改后**:
```python
with open(args_file, 'r', encoding='utf-8-sig') as f:  # utf-8-sig handles BOM
    args = json.load(f)
```

### 关键改进

1. **BOM处理**: 使用`encoding='utf-8-sig'`自动处理BOM标记
2. **向后兼容**: 对没有BOM的文件也能正常工作
3. **跨平台**: 在Windows、Mac、Linux上都能正常工作

## 验证测试

### 修复前
```bash
python scripts\passgpt_inference.py --args-file test.json
# 输出: JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

### 修复后
```bash
python scripts\passgpt_inference.py --args-file test.json
# 输出: {"passwords": ["sjplayer1", "11215887", "sodapop69", "25253623", "joefredy18"], "count": 5}
```

## 影响范围

### 修复前的问题
- AI阶段无法正常工作
- PassGPT模型无法生成密码
- 密码破解跳过AI阶段，直接进入其他阶段
- 用户看到AI阶段很快完成，没有实际效果

### 修复后的改进
- ✅ AI阶段正常工作
- ✅ PassGPT模型正常生成密码
- ✅ 完整的7层密码破解流程
- ✅ 提高密码破解成功率

## 技术细节

### BOM问题说明
- **BOM**: Byte Order Mark，用于标识文件的字节序
- **UTF-8 BOM**: `EF BB BF`（3字节）
- **Windows特性**: PowerShell和某些编辑器会自动添加BOM
- **JSON解析**: 标准JSON解析器不支持BOM

### 编码选择
- `utf-8`: 标准UTF-8，不处理BOM
- `utf-8-sig`: UTF-8 with signature，自动处理BOM
- **最佳实践**: 对于可能包含BOM的文件使用`utf-8-sig`

## 用户体验改进

### 修复前
1. 启动密码破解
2. AI阶段快速跳过（用户困惑）
3. 直接进入字典攻击等其他阶段
4. 成功率较低

### 修复后
1. 启动密码破解
2. AI阶段正常工作（生成智能密码）
3. 完整的攻击流程
4. 显著提高成功率

## 预防措施

1. **文件编码标准化**: 统一使用`utf-8-sig`处理可能包含BOM的文件
2. **跨平台测试**: 在Windows、Mac、Linux上测试文件读取
3. **错误处理增强**: 添加更详细的错误信息和调试输出
4. **文档更新**: 更新开发文档说明编码注意事项

## 修复状态

- **状态**: ✅ 已完成
- **测试**: ✅ 通过
- **部署**: ✅ 已实施
- **验证**: ✅ AI阶段正常工作

这个修复确保了AI密码生成阶段能够正常工作，显著提高了密码破解的成功率和用户体验。
# 设计文档 - 密码破解模块完整升级

## 概述

本设计文档描述了密码破解模块从"玩具级"到"行业领先"的完整升级方案。升级分为三个阶段：
- **阶段1（P0）**：核心性能优化，100倍速度提升
- **阶段2（P1）**：高级功能增强，200倍速度提升
- **阶段3（P2）**：AI智能增强，500倍速度提升，45-50%命中率

### 设计目标

1. **性能**：从10 pwd/s提升到5000+ pwd/s（500倍）
2. **命中率**：从15-20%提升到45-50%（2.5倍）
3. **用户体验**：支持断点续传、实时统计、进度可视化
4. **智能化**：AI驱动的密码生成和学习
5. **隐私安全**：完全本地运行，可选数据贡献

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                      │
│  FileCompressor.jsx - 用户界面、进度显示、统计可视化          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Main Process (Electron)                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Password Cracker Orchestrator (index.js)            │  │
│  │  - 协调所有模块                                        │  │
│  │  - 批量测试管理                                        │  │
│  │  - Session管理                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ↓                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Password Generation Layer                           │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │  │
│  │  │ Traditional │  │   AI Layer  │  │  Strategy   │ │  │
│  │  │  Generators │  │             │  │  Selector   │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ↓                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  7-Zip Integration Layer                             │  │
│  │  - 批量密码测试                                        │  │
│  │  - 进程管理                                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Components                       │
│  - 7-Zip (密码测试)                                          │
│  - SQLite (本地密码历史)                                     │
│  - ONNX Runtime (AI模型推理)                                │
│  - Server API (在线学习，可选)                              │
└─────────────────────────────────────────────────────────────┘
```

### 模块划分

#### 核心模块
1. **index.js** - 主协调器，批量测试管理
2. **smartCracker.js** - 传统密码生成器（字典、规则、Markov）
3. **sessionManager.js** - 断点续传管理
4. **strategySelector.js** - 自适应策略选择

#### AI模块（新增）
5. **ai/passganGenerator.js** - PassGAN密码生成
6. **ai/lstmLearner.js** - LSTM本地学习
7. **ai/aiOrchestrator.js** - AI模型协调器
8. **ai/modelUpdater.js** - 模型自动更新
9. **ai/passwordDB.js** - 本地密码数据库

#### 辅助模块
10. **pcfgGenerator.js** - PCFG规则生成
11. **statsCollector.js** - 统计信息收集
12. **logger.js** - 日志记录

---

## 组件和接口设计

### 1. 批量测试管理器（BatchTestManager）

**职责**：管理密码批量测试，提升测试速度

**接口**：
```javascript
class BatchTestManager {
  constructor(batchSize = 100) {}
  
  // 添加密码到批次
  addPassword(password) {}
  
  // 测试当前批次
  async testBatch(filePath) {}
  
  // 强制测试（即使批次未满）
  async flush(filePath) {}
  
  // 获取统计信息
  getStats() {}
}
```

**实现要点**：
- 维护密码队列，达到batchSize时自动测试
- 使用临时文件存储密码列表
- 调用7-Zip的`-p@file`参数批量测试
- 解析7-Zip输出，识别成功的密码



### 2. Session管理器（SessionManager）

**职责**：支持断点续传，保存和恢复破解进度

**接口**：
```javascript
class SessionManager {
  // 创建新会话
  createSession(filePath, options) {}
  
  // 保存会话状态
  saveSession(sessionId, state) {}
  
  // 恢复会话
  loadSession(sessionId) {}
  
  // 删除会话
  deleteSession(sessionId) {}
  
  // 列出所有未完成会话
  listPendingSessions() {}
}
```

**会话状态结构**：
```javascript
{
  sessionId: 'uuid',
  filePath: '/path/to/file.zip',
  currentPhase: 2,
  testedPasswords: 15000,
  totalPasswords: 100000,
  startTime: 1234567890,
  lastUpdateTime: 1234567900,
  options: { /* 破解选项 */ }
}
```

---

### 3. 自适应策略选择器（StrategySelector）

**职责**：根据文件特征智能选择破解策略

**接口**：
```javascript
class StrategySelector {
  // 分析文件并选择策略
  selectStrategy(filePath, fileName, fileSize) {}
  
  // 获取Phase权重
  getPhaseWeights(strategy) {}
  
  // 获取每个Phase的密码数量
  getPasswordCounts(strategy) {}
}
```

**策略类型**：
```javascript
const STRATEGIES = {
  PERSONAL: {
    name: '个人文件',
    phases: ['dictionary', 'keyboard', 'dates', 'rules', 'markov'],
    weights: [0.3, 0.25, 0.2, 0.15, 0.1],
    passwordCounts: [5000, 3000, 2000, 5000, 10000]
  },
  WORK: {
    name: '工作文件',
    phases: ['dictionary', 'rules', 'keyboard', 'dates', 'markov'],
    weights: [0.35, 0.25, 0.2, 0.1, 0.1],
    passwordCounts: [8000, 5000, 3000, 2000, 7000]
  },
  GENERIC: {
    name: '通用策略',
    phases: ['dictionary', 'keyboard', 'rules', 'dates', 'markov'],
    weights: [0.25, 0.2, 0.2, 0.15, 0.2],
    passwordCounts: [6000, 4000, 4000, 3000, 8000]
  }
};
```

**文件特征识别**：
- 文件名包含"report", "work", "project" → WORK策略
- 文件名包含"photo", "video", "personal" → PERSONAL策略
- 文件大小>100MB → 增加密码数量
- 其他 → GENERIC策略

---

### 4. PCFG生成器（PCFGGenerator）

**职责**：基于概率上下文无关文法生成密码

**接口**：
```javascript
class PCFGGenerator {
  constructor(grammarFile) {}
  
  // 生成指定数量的密码
  generate(count) {}
  
  // 训练语法模型
  train(passwords) {}
  
  // 保存语法模型
  saveGrammar(filePath) {}
}
```

**语法结构**：
```javascript
{
  structures: {
    'L4D2': 0.15,    // 4个字母+2个数字，概率15%
    'L6D2': 0.12,    // 6个字母+2个数字，概率12%
    'L4D4': 0.10,    // 4个字母+4个数字，概率10%
    'L8': 0.08,      // 8个字母，概率8%
    // ...
  },
  segments: {
    'L4': ['pass', 'word', 'love', 'john', ...],
    'D2': ['12', '23', '01', '99', ...],
    'D4': ['1234', '2023', '2024', '0000', ...],
    // ...
  }
}
```

**生成算法**：
1. 根据概率选择密码结构（如"L4D2"）
2. 根据结构选择具体片段（如"pass" + "12"）
3. 组合生成最终密码（如"pass12"）

---

### 5. PassGAN生成器（PassGANGenerator）

**职责**：使用PassGAN v2模型生成AI密码

**接口**：
```javascript
class PassGANGenerator {
  constructor(modelPath) {}
  
  // 初始化模型
  async initialize() {}
  
  // 生成密码
  async generate(count, minLength, maxLength) {}
  
  // 释放资源
  dispose() {}
}
```

**实现要点**：
- 使用onnxruntime-node加载ONNX模型
- 输入：随机噪声向量（latent vector）
- 输出：密码字符串
- 批量生成以提高效率（每批1000个）
- 过滤无效密码（长度、字符集）

**模型文件**：
- 路径：`resources/models/passgan_v2.onnx`
- 大小：约85MB
- 输入：`[batch_size, 128]` float32
- 输出：`[batch_size, max_length]` int32

---

### 6. LSTM学习器（LSTMLearner）

**职责**：本地学习用户密码习惯

**接口**：
```javascript
class LSTMLearner {
  constructor(dbPath, modelPath) {}
  
  // 添加成功密码到历史
  async addPassword(password, fileName) {}
  
  // 根据文件名生成密码
  async generateByFileName(fileName, count) {}
  
  // 触发模型微调
  async finetune() {}
  
  // 获取历史密码数量
  async getPasswordCount() {}
}
```

**数据库结构**：
```sql
CREATE TABLE password_history (
  id INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL,  -- SHA256哈希，不存储明文
  file_pattern TEXT,             -- 文件名模式（如"report_*"）
  created_at INTEGER,
  success_count INTEGER DEFAULT 1
);
```

**学习触发条件**：
- 每成功破解10个密码，触发一次微调
- 微调使用最近100个密码
- 微调epoch=5，学习率=0.0001

---

### 7. AI协调器（AIOrchestrator）

**职责**：协调PassGAN、LSTM、Markov三个模型

**接口**：
```javascript
class AIOrchestrator {
  constructor(passganGen, lstmLearner, markovGen) {}
  
  // 生成混合密码列表
  async generatePasswords(fileName, totalCount) {}
  
  // 获取各模型贡献比例
  getModelWeights() {}
}
```

**混合策略**：
```javascript
{
  passgan: 0.5,    // PassGAN生成50%
  lstm: 0.3,       // LSTM生成30%
  markov: 0.2      // Markov填充20%
}
```

**工作流程**：
1. PassGAN生成50,000个候选密码
2. LSTM根据文件名对候选密码排序
3. 取排序后的前30,000个
4. Markov快速生成20,000个填充
5. 合并返回50,000个密码

---

## 数据模型

### 密码生成器配置

```javascript
{
  phases: [
    {
      name: 'dictionary',
      enabled: true,
      priority: 1,
      passwordCount: 5000,
      generator: 'SmartDictionary'
    },
    {
      name: 'keyboard',
      enabled: true,
      priority: 2,
      passwordCount: 3000,
      generator: 'KeyboardPattern'
    },
    {
      name: 'rules',
      enabled: true,
      priority: 3,
      passwordCount: 5000,
      generator: 'RuleTransform'
    },
    {
      name: 'dates',
      enabled: true,
      priority: 4,
      passwordCount: 2000,
      generator: 'DatePattern'
    },
    {
      name: 'markov',
      enabled: true,
      priority: 5,
      passwordCount: 10000,
      generator: 'MarkovChain'
    },
    {
      name: 'ai',
      enabled: true,
      priority: 0,  // 最高优先级
      passwordCount: 50000,
      generator: 'AIOrchestrator'
    }
  ]
}
```

### 统计信息模型

```javascript
{
  sessionId: 'uuid',
  startTime: 1234567890,
  endTime: null,
  status: 'running',  // 'running', 'paused', 'completed', 'failed'
  
  // 进度信息
  currentPhase: 'ai',
  totalPhases: 6,
  testedPasswords: 15000,
  totalPasswords: 75000,
  progress: 0.20,
  
  // 性能信息
  currentSpeed: 1200,  // pwd/s
  averageSpeed: 1050,
  peakSpeed: 1500,
  
  // 预估信息
  estimatedTimeRemaining: 50000,  // 秒
  estimatedCompletion: 1234617890,
  
  // 结果信息
  foundPassword: null,
  successPhase: null,
  successPasswordIndex: null
}
```

---

## 错误处理

### 错误类型

1. **文件错误**
   - 文件不存在
   - 文件无法读取
   - 文件格式不支持

2. **7-Zip错误**
   - 7-Zip未安装
   - 7-Zip版本不兼容
   - 7-Zip执行失败

3. **AI模型错误**
   - 模型文件缺失
   - 模型加载失败
   - 推理错误

4. **Session错误**
   - Session文件损坏
   - Session恢复失败

5. **网络错误**（在线学习）
   - 服务器连接失败
   - 模型下载失败
   - 上传超时

### 错误处理策略

```javascript
class ErrorHandler {
  handle(error, context) {
    switch(error.type) {
      case 'FILE_ERROR':
        // 提示用户检查文件
        return { action: 'notify', message: '文件错误' };
        
      case 'SEVENZIP_ERROR':
        // 尝试使用备用7-Zip路径
        return { action: 'retry', fallback: true };
        
      case 'AI_MODEL_ERROR':
        // 降级到传统方法
        return { action: 'fallback', method: 'traditional' };
        
      case 'SESSION_ERROR':
        // 从头开始
        return { action: 'restart' };
        
      case 'NETWORK_ERROR':
        // 使用本地模型
        return { action: 'offline_mode' };
    }
  }
}
```

---

## 测试策略

### 单元测试

**测试框架**：Jest

**测试覆盖**：
- BatchTestManager：批量测试逻辑
- SessionManager：会话保存和恢复
- StrategySelector：策略选择逻辑
- PCFGGenerator：密码生成正确性
- PassGANGenerator：模型加载和推理
- LSTMLearner：数据库操作和学习

**测试示例**：
```javascript
describe('BatchTestManager', () => {
  test('should batch passwords correctly', () => {
    const manager = new BatchTestManager(100);
    for (let i = 0; i < 150; i++) {
      manager.addPassword(`pwd${i}`);
    }
    expect(manager.getBatchCount()).toBe(2);
  });
  
  test('should test batch and return success', async () => {
    const manager = new BatchTestManager(10);
    manager.addPassword('correct_password');
    const result = await manager.testBatch('test.zip');
    expect(result.success).toBe(true);
    expect(result.password).toBe('correct_password');
  });
});
```

### 集成测试

**测试场景**：
1. 完整破解流程（从开始到成功）
2. 断点续传流程（暂停→恢复）
3. AI模型集成（PassGAN + LSTM + Markov）
4. 策略自适应（不同文件类型）

### 性能测试

**测试指标**：
- 密码测试速度（pwd/s）
- 内存占用（MB）
- CPU使用率（%）
- 模型推理延迟（ms）

**性能基准**：
- 阶段1：≥1000 pwd/s
- 阶段2：≥2000 pwd/s
- 阶段3：≥5000 pwd/s
- 内存占用：<500MB
- AI推理延迟：<10ms/batch



---

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式声明。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性1：批量测试一致性

*对于任何*密码列表和加密文件，批量测试的结果应该与逐个测试的结果完全一致（找到相同的密码或都失败）

**验证需求**：1.1, 1.2, 1.3

---

### 属性2：批量测试速度提升

*对于任何*包含100个密码的列表，批量测试的速度应该至少是逐个测试速度的50倍

**验证需求**：1.4

---

### 属性3：Phase顺序优化效果

*对于任何*常见密码（在前60%概率范围内），新的Phase顺序应该比旧顺序更早测试到该密码

**验证需求**：2.1, 2.2, 2.3

---

### 属性4：规则精简不降低命中率

*对于任何*测试密码集，精简后的规则库命中率应该不低于原规则库的95%

**验证需求**：3.1, 3.2, 3.3

---

### 属性5：Session恢复幂等性

*对于任何*破解会话，暂停后恢复应该从完全相同的状态继续，不重复测试已测试的密码

**验证需求**：7.1, 7.2, 7.5

---

### 属性6：Session持久化完整性

*对于任何*保存的Session，应用重启后应该能完整恢复所有状态信息（Phase、进度、选项）

**验证需求**：7.3, 7.4

---

### 属性7：PCFG生成密码有效性

*对于任何*PCFG生成的密码，应该符合定义的语法结构（字母、数字、符号的组合模式）

**验证需求**：4.1, 4.2

---

### 属性8：Markov优化性能提升

*对于任何*生成10万个密码的任务，优化后的Markov链应该比优化前快至少30倍

**验证需求**：5.1, 5.2, 5.3

---

### 属性9：自适应策略正确性

*对于任何*包含工作关键词的文件名，策略选择器应该选择WORK策略而不是PERSONAL策略

**验证需求**：6.1, 6.2, 6.5

---

### 属性10：PassGAN模型输出有效性

*对于任何*PassGAN生成的密码，应该是有效的字符串（长度在范围内，字符集合法）

**验证需求**：8.1, 8.2, 8.4

---

### 属性11：LSTM学习收敛性

*对于任何*包含至少50个密码的训练集，LSTM微调后的损失应该低于微调前

**验证需求**：9.2, 9.4

---

### 属性12：密码存储加密性

*对于任何*存储到本地数据库的密码，应该以加密形式存储，不应该有明文密码

**验证需求**：9.5, 13.1

---

### 属性13：AI模型协同效果

*对于任何*文件破解任务，AI协调器的命中率应该高于任何单一模型的命中率

**验证需求**：11.1, 11.5

---

### 属性14：隐私保护完整性

*对于任何*用户选择"不贡献数据"的情况，系统不应该发送任何网络请求到服务器

**验证需求**：10.5, 13.3

---

### 属性15：统计信息准确性

*对于任何*破解会话，显示的统计信息（速度、进度、预估时间）应该与实际测试情况一致（误差<5%）

**验证需求**：12.1, 12.2, 12.3, 12.4

---

### 属性16：错误降级安全性

*对于任何*AI模型加载失败的情况，系统应该自动降级到传统方法，不应该完全失败

**验证需求**：错误处理策略

---

### 属性17：批量大小优化

*对于任何*批量大小N（10 ≤ N ≤ 1000），存在一个最优值使得测试速度最大化

**验证需求**：1.1

---

### 属性18：模型更新向后兼容

*对于任何*新版本的AI模型，应该能够加载并使用，不应该破坏现有功能

**验证需求**：10.3, 10.4

---

## 实现细节

### 批量测试实现

**7-Zip批量测试方法**：

方案1：使用临时密码文件
```bash
# 创建临时文件passwords.txt，每行一个密码
password1
password2
password3

# 调用7-Zip
7z t -p@passwords.txt archive.zip
```

方案2：使用管道输入（推荐）
```javascript
const { spawn } = require('child_process');

function testBatch(filePath, passwords) {
  return new Promise((resolve, reject) => {
    const proc = spawn('7z', ['t', '-p@stdin', filePath]);
    
    // 写入密码列表
    proc.stdin.write(passwords.join('\n'));
    proc.stdin.end();
    
    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('close', (code) => {
      // 解析输出，找到成功的密码
      const match = output.match(/Everything is Ok/);
      if (match) {
        resolve({ success: true, password: /* 从输出解析 */ });
      } else {
        resolve({ success: false });
      }
    });
  });
}
```

### Markov链优化实现

**优化前（数组队列）**：
```javascript
function generateMarkovPasswords(count) {
  const passwords = [];
  const queue = [''];  // 数组队列
  
  while (passwords.length < count && queue.length > 0) {
    const current = queue.shift();  // O(n) 操作！
    
    if (current.length >= minLength) {
      passwords.push(current);
    }
    
    if (current.length < maxLength) {
      for (const nextChar of getNextChars(current)) {
        queue.push(current + nextChar);
      }
    }
  }
  
  return passwords;
}
```

**优化后（生成器模式）**：
```javascript
function* generateMarkovPasswords() {
  const stack = [''];  // 使用栈代替队列
  
  while (stack.length > 0) {
    const current = stack.pop();  // O(1) 操作
    
    if (current.length >= minLength) {
      yield current;
    }
    
    if (current.length < maxLength) {
      for (const nextChar of getNextChars(current)) {
        stack.push(current + nextChar);
      }
    }
  }
}

// 使用
const gen = generateMarkovPasswords();
for (let i = 0; i < count; i++) {
  const { value, done } = gen.next();
  if (done) break;
  passwords.push(value);
}
```

### PassGAN模型集成实现

```javascript
const ort = require('onnxruntime-node');

class PassGANGenerator {
  constructor(modelPath) {
    this.modelPath = modelPath;
    this.session = null;
  }
  
  async initialize() {
    this.session = await ort.InferenceSession.create(this.modelPath);
  }
  
  async generate(count, minLength = 6, maxLength = 16) {
    const batchSize = 1000;
    const batches = Math.ceil(count / batchSize);
    const passwords = [];
    
    for (let i = 0; i < batches; i++) {
      // 生成随机噪声
      const latent = new Float32Array(batchSize * 128);
      for (let j = 0; j < latent.length; j++) {
        latent[j] = Math.random() * 2 - 1;  // [-1, 1]
      }
      
      // 推理
      const tensor = new ort.Tensor('float32', latent, [batchSize, 128]);
      const results = await this.session.run({ input: tensor });
      
      // 解码输出
      const output = results.output.data;
      for (let j = 0; j < batchSize && passwords.length < count; j++) {
        const pwd = this.decodePassword(output, j, minLength, maxLength);
        if (pwd) passwords.push(pwd);
      }
    }
    
    return passwords;
  }
  
  decodePassword(data, index, minLength, maxLength) {
    // 将模型输出转换为密码字符串
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < maxLength; i++) {
      const charIndex = data[index * maxLength + i];
      if (charIndex < 0 || charIndex >= chars.length) break;
      password += chars[charIndex];
    }
    
    return password.length >= minLength ? password : null;
  }
}
```

### LSTM本地学习实现

```javascript
const sqlite3 = require('sqlite3');
const crypto = require('crypto');

class LSTMLearner {
  constructor(dbPath, modelPath) {
    this.db = new sqlite3.Database(dbPath);
    this.modelPath = modelPath;
    this.initDB();
  }
  
  initDB() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS password_history (
        id INTEGER PRIMARY KEY,
        password_hash TEXT NOT NULL,
        file_pattern TEXT,
        created_at INTEGER,
        success_count INTEGER DEFAULT 1
      )
    `);
  }
  
  async addPassword(password, fileName) {
    const hash = crypto.createHash('sha256')
      .update(password)
      .digest('hex');
    
    const pattern = this.extractPattern(fileName);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO password_history (password_hash, file_pattern, created_at)
         VALUES (?, ?, ?)`,
        [hash, pattern, Date.now()],
        (err) => err ? reject(err) : resolve()
      );
    });
  }
  
  extractPattern(fileName) {
    // 提取文件名模式（如"report_2024.zip" → "report_*"）
    return fileName
      .replace(/\d+/g, '*')
      .replace(/[_\-\.]/g, '_');
  }
  
  async getPasswordCount() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM password_history',
        (err, row) => err ? reject(err) : resolve(row.count)
      );
    });
  }
  
  async finetune() {
    const count = await this.getPasswordCount();
    if (count < 10) return;  // 需要至少10个密码
    
    // 获取最近100个密码用于训练
    const passwords = await this.getRecentPasswords(100);
    
    // 调用Python训练脚本
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const proc = spawn('python', [
        'train_lstm.py',
        '--model', this.modelPath,
        '--passwords', JSON.stringify(passwords),
        '--epochs', '5',
        '--lr', '0.0001'
      ]);
      
      proc.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error('Training failed'));
      });
    });
  }
}
```

---

## 部署架构

### 客户端部署

```
electron-app/
├── resources/
│   ├── models/
│   │   ├── passgan_v2.onnx      (85MB)
│   │   └── lstm_base.onnx       (45MB)
│   ├── bin-win/
│   │   └── 7z.exe
│   ├── bin-mac/
│   │   └── 7z
│   └── data/
│       ├── pcfg_grammar.json
│       └── markov_transitions.json
├── src/
│   └── main/
│       └── modules/
│           └── fileCompressor/
│               ├── index.js
│               ├── smartCracker.js
│               ├── sessionManager.js
│               ├── strategySelector.js
│               ├── pcfgGenerator.js
│               └── ai/
│                   ├── passganGenerator.js
│                   ├── lstmLearner.js
│                   ├── aiOrchestrator.js
│                   └── passwordDB.js
└── package.json
```

### 服务器端部署（可选，用于在线学习）

```
server/
├── api/
│   ├── collect.py          # 密码收集API
│   ├── download.py         # 模型下载API
│   └── stats.py            # 统计信息API
├── scripts/
│   ├── train_passgan.py    # PassGAN训练脚本
│   ├── clean_data.py       # 数据清洗脚本
│   └── deploy_model.py     # 模型部署脚本
├── models/
│   ├── passgan_v2.onnx
│   └── versions/
│       ├── passgan_v2.1.onnx
│       └── passgan_v2.2.onnx
├── data/
│   └── collected_passwords.db
└── requirements.txt
```

**服务器API设计**：

```python
# collect.py - 密码收集API
@app.post('/api/collect')
def collect_password(request):
    password_hash = request.json['password_hash']
    metadata = request.json.get('metadata', {})
    
    # 验证数据
    if not validate_password_hash(password_hash):
        return {'error': 'Invalid hash'}, 400
    
    # 存储到数据库
    db.insert('collected_passwords', {
        'hash': password_hash,
        'metadata': json.dumps(metadata),
        'collected_at': time.time()
    })
    
    return {'success': True}

# download.py - 模型下载API
@app.get('/api/models/latest')
def get_latest_model():
    version = get_latest_version()
    model_url = f'/models/passgan_v{version}.onnx'
    
    return {
        'version': version,
        'url': model_url,
        'size': get_file_size(model_url),
        'checksum': get_file_checksum(model_url)
    }
```

---

## 性能优化策略

### 1. 密码生成优化
- 使用生成器模式，按需生成密码
- 缓存常用密码列表
- 并行生成（多线程）

### 2. 模型推理优化
- 批量推理（batch size = 1000）
- 模型量化（FP32 → FP16）
- 使用ONNX Runtime优化

### 3. 内存优化
- 流式处理密码，不一次性加载全部
- 及时释放不用的模型
- 限制Session历史记录数量

### 4. 磁盘I/O优化
- 使用内存数据库（SQLite :memory:）
- 批量写入日志
- 异步文件操作

---

## 安全考虑

### 1. 密码存储安全
- 本地密码使用AES-256加密
- 密钥派生使用PBKDF2
- 不存储明文密码

### 2. 网络传输安全
- 使用HTTPS传输
- 密码上传前哈希处理
- 不传输用户标识信息

### 3. 模型安全
- 验证模型文件完整性（checksum）
- 防止模型投毒攻击
- 沙箱运行模型推理

### 4. 隐私保护
- 默认完全本地运行
- 数据贡献需明确同意
- 支持完全离线模式


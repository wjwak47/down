# 需求文档 - 密码破解模块完整升级

## 简介

本文档定义了密码破解模块的完整升级需求，包括P0核心优化、P1高级优化和P2 AI增强三个阶段。目标是将当前的"玩具级"工具升级为"行业领先"的AI驱动密码破解系统。

## 术语表

- **Password_Cracker**: 密码破解系统，负责尝试不同密码组合来解锁加密文件
- **7-Zip**: 开源压缩工具，支持密码保护的压缩文件
- **Phase**: 破解阶段，每个阶段使用不同的密码生成策略
- **PCFG**: 概率上下文无关文法（Probabilistic Context-Free Grammar），用于生成符合语法规则的密码
- **Markov_Chain**: 马尔可夫链，基于统计学的密码生成方法
- **PassGAN**: 基于生成对抗网络的密码生成模型
- **LSTM**: 长短期记忆网络，用于学习密码序列规律
- **ONNX**: 开放神经网络交换格式，用于跨平台模型推理
- **Session**: 破解会话，记录破解进度以支持断点续传
- **Batch_Testing**: 批量测试，一次测试多个密码以提高效率

---

## 需求

### 需求1：CPU批量测试优化（P0 - 致命问题）

**用户故事**：作为用户，我希望密码破解速度更快，这样我可以在合理时间内找回忘记的密码。

#### 验收标准

1. WHEN Password_Cracker测试密码时 THEN THE System SHALL支持批量传入密码数组（每批100个）
2. WHEN 批量测试密码时 THEN THE System SHALL一次性调用7-Zip测试所有密码，而不是每个密码spawn一个新进程
3. WHEN 批量测试完成时 THEN THE System SHALL返回成功的密码或继续下一批
4. WHEN 测试速度时 THEN THE System SHALL达到至少1000 passwords/second（当前为10 pwd/s）
5. WHEN 进程管理时 THEN THE System SHALL复用进程，减少spawn开销

---

### 需求2：GPU攻击顺序优化（P0 - 致命问题）

**用户故事**：作为用户，我希望常见密码能更快被测试到，这样我可以更快找回密码。

#### 验收标准

1. WHEN Password_Cracker开始破解时 THEN THE System SHALL按照以下顺序执行Phase：字典攻击 → 键盘模式 → 规则变换 → 日期模式 → Markov链
2. WHEN 执行键盘模式Phase时 THEN THE System SHALL在Phase 2执行（当前为Phase 5）
3. WHEN 60%的常见密码被测试时 THEN THE System SHALL在前3个Phase内完成
4. WHEN Phase顺序调整后 THEN THE System SHALL节省至少60%的平均破解时间

---

### 需求3：规则变换精简（P0 - 致命问题）

**用户故事**：作为用户，我希望系统不要浪费时间测试低概率密码，这样可以更快找到正确密码。

#### 验收标准

1. WHEN 规则变换生成密码时 THEN THE System SHALL只保留高频规则（约50个），删除低概率组合
2. WHEN 分析规则效果时 THEN THE System SHALL删除命中率低于1%的规则
3. WHEN 规则精简后 THEN THE System SHALL减少至少75%的无效密码尝试
4. WHEN 保留的规则时 THEN THE System SHALL包括：首字母大写+数字、全小写+符号、全大写+数字等高频模式

---

### 需求4：PCFG规则生成（P1 - 严重问题）

**用户故事**：作为用户，我希望系统能智能生成符合人类习惯的密码，这样可以提高破解成功率。

#### 验收标准

1. WHEN PCFG_Generator分析密码结构时 THEN THE System SHALL识别字母（L）、数字（D）、符号（S）的组合模式
2. WHEN 生成密码时 THEN THE System SHALL根据结构概率生成（如"LLLLDDDD"比"DDDDLLLL"更常见）
3. WHEN PCFG生成密码时 THEN THE System SHALL命中率提升至少3倍（相比纯随机）
4. WHEN 训练PCFG模型时 THEN THE System SHALL使用RockYou等公开数据集学习密码结构分布

---

### 需求5：Markov链优化（P1 - 严重问题）

**用户故事**：作为用户，我希望Markov链生成密码更快，这样可以在相同时间内测试更多密码。

#### 验收标准

1. WHEN Markov_Chain生成密码时 THEN THE System SHALL使用循环队列或生成器模式，而不是数组队列
2. WHEN 执行shift操作时 THEN THE System SHALL避免O(n)复杂度的数组shift操作
3. WHEN Markov优化后 THEN THE System SHALL生成速度达到至少500,000 passwords/second（当前为10,000 pwd/s）
4. WHEN 内存使用时 THEN THE System SHALL保持内存占用在合理范围（<100MB）

---

### 需求6：自适应策略选择（P1 - 严重问题）

**用户故事**：作为用户，我希望系统能根据文件特征智能选择破解策略，这样可以更快找到密码。

#### 验收标准

1. WHEN 分析文件名时 THEN THE System SHALL判断文件类型（个人文件 vs 工作文件）
2. WHEN 分析文件大小时 THEN THE System SHALL判断文件重要性（大文件通常更重要）
3. WHEN 选择策略时 THEN THE System SHALL动态调整Phase权重和密码数量
4. WHEN 自适应策略启用后 THEN THE System SHALL节省至少40%的平均破解时间
5. WHERE 文件名包含"report"、"work"等关键词 THEN THE System SHALL优先测试工作相关密码

---

### 需求7：断点续传功能（P1 - 严重问题）

**用户故事**：作为用户，我希望能暂停和恢复破解任务，这样我可以在需要时停止并稍后继续。

#### 验收标准

1. WHEN 用户点击"暂停"按钮时 THEN THE System SHALL保存当前Session状态（Phase、已测试密码数、进度）
2. WHEN 用户点击"继续"按钮时 THEN THE System SHALL从上次保存的位置恢复破解
3. WHEN Session保存时 THEN THE System SHALL将状态持久化到本地文件
4. WHEN 应用重启后 THEN THE System SHALL自动检测未完成的Session并提示用户恢复
5. WHEN Session恢复时 THEN THE System SHALL不重复测试已测试过的密码

---

### 需求8：PassGAN v2模型集成（P2 - AI增强）

**用户故事**：作为用户，我希望系统能使用AI生成更像人类的密码，这样可以大幅提高破解成功率。

#### 验收标准

1. WHEN PassGAN_Generator初始化时 THEN THE System SHALL加载预训练的PassGAN v2模型（ONNX格式）
2. WHEN 生成密码时 THEN THE System SHALL使用PassGAN生成候选密码列表
3. WHEN PassGAN生成密码时 THEN THE System SHALL达到35-40%的命中率提升（相比传统方法）
4. WHEN 模型推理时 THEN THE System SHALL支持CPU推理，生成速度至少50,000 passwords/second
5. WHEN 打包应用时 THEN THE System SHALL包含PassGAN模型文件（约85MB）

---

### 需求9：本地LSTM学习（P2 - AI增强）

**用户故事**：作为重度用户，我希望系统能学习我的密码习惯，这样可以更快破解我自己忘记的密码。

#### 验收标准

1. WHEN 用户成功破解密码时 THEN THE System SHALL将密码保存到本地SQLite数据库（加密存储）
2. WHEN 本地密码数量达到10个时 THEN THE System SHALL触发LSTM模型微调
3. WHEN LSTM_Learner生成密码时 THEN THE System SHALL根据文件名生成个性化密码
4. WHEN 本地学习启用后 THEN THE System SHALL对重度用户提升至少10%的命中率
5. WHEN 存储密码时 THEN THE System SHALL使用AES-256加密，保护用户隐私

---

### 需求10：服务器端在线学习（P2 - AI增强）

**用户故事**：作为用户，我希望系统能持续学习最新的密码趋势，这样可以破解更多新型密码。

#### 验收标准

1. WHEN 用户选择"贡献密码"时 THEN THE System SHALL匿名上传成功破解的密码到服务器
2. WHEN 服务器收集密码时 THEN THE System SHALL每周自动重新训练PassGAN模型
3. WHEN 新模型训练完成时 THEN THE System SHALL通过API分发给所有客户端
4. WHEN 客户端检测到新模型时 THEN THE System SHALL自动下载并更新本地模型
5. WHEN 用户未同意贡献时 THEN THE System SHALL不上传任何密码数据，完全本地运行
6. WHEN 数据清洗时 THEN THE System SHALL过滤恶意数据、去重、验证密码有效性

---

### 需求11：AI模型整合和优化（P2 - AI增强）

**用户故事**：作为用户，我希望多个AI模型能协同工作，这样可以达到最佳破解效果。

#### 验收标准

1. WHEN AI_Orchestrator协调模型时 THEN THE System SHALL按照以下顺序调用：PassGAN生成 → LSTM排序 → Markov填充
2. WHEN PassGAN生成候选密码时 THEN THE System SHALL生成100,000个候选密码
3. WHEN LSTM排序密码时 THEN THE System SHALL根据文件名和用户历史对候选密码重新排序
4. WHEN Markov填充时 THEN THE System SHALL快速生成长尾密码补充候选列表
5. WHEN 三个模型协同工作时 THEN THE System SHALL达到45-50%的总体命中率
6. WHEN 性能优化时 THEN THE System SHALL支持模型缓存和并行推理

---

### 需求12：实时统计和可视化（P1 - 用户体验）

**用户故事**：作为用户，我希望看到破解进度和统计信息，这样我可以了解破解状态和预计完成时间。

#### 验收标准

1. WHEN 破解进行中时 THEN THE System SHALL实时显示当前速度（passwords/second）
2. WHEN 破解进行中时 THEN THE System SHALL显示已测试密码数量和总进度百分比
3. WHEN 破解进行中时 THEN THE System SHALL显示当前Phase和剩余Phase
4. WHEN 破解进行中时 THEN THE System SHALL估算并显示预计完成时间
5. WHEN 破解完成时 THEN THE System SHALL显示总耗时、测试密码数、平均速度等统计信息

---

### 需求13：隐私和安全（P2 - 安全性）

**用户故事**：作为用户，我希望我的密码数据是安全的，不会被泄露或滥用。

#### 验收标准

1. WHEN 存储本地密码历史时 THEN THE System SHALL使用AES-256加密
2. WHEN 上传密码到服务器时 THEN THE System SHALL完全匿名，不包含任何用户标识信息
3. WHEN 用户选择"不贡献数据"时 THEN THE System SHALL完全本地运行，不发送任何网络请求
4. WHEN 显示密码时 THEN THE System SHALL默认隐藏密码，需要用户点击"显示"才可见
5. WHEN 应用关闭时 THEN THE System SHALL清除内存中的敏感数据

---

### 需求14：性能监控和日志（P1 - 可维护性）

**用户故事**：作为开发者，我希望能监控系统性能和调试问题，这样可以持续优化系统。

#### 验收标准

1. WHEN 破解运行时 THEN THE System SHALL记录每个Phase的耗时和命中率
2. WHEN 发生错误时 THEN THE System SHALL记录详细的错误日志和堆栈信息
3. WHEN 性能异常时 THEN THE System SHALL记录CPU、内存、磁盘使用情况
4. WHEN 日志记录时 THEN THE System SHALL支持不同日志级别（DEBUG、INFO、WARN、ERROR）
5. WHEN 日志文件过大时 THEN THE System SHALL自动轮转日志文件（每个文件最大10MB）

---

## 非功能性需求

### 性能需求

1. **速度提升**：阶段1完成后速度提升100倍，阶段2完成后200倍，阶段3完成后500倍
2. **响应时间**：UI操作响应时间<100ms
3. **内存占用**：运行时内存占用<500MB（包含AI模型）
4. **模型大小**：PassGAN模型<100MB，LSTM模型<50MB

### 兼容性需求

1. **操作系统**：支持Windows 10+、macOS 10.15+、Linux（Ubuntu 20.04+）
2. **Node.js版本**：Node.js 16+
3. **Electron版本**：Electron 25+
4. **7-Zip版本**：7-Zip 19.00+

### 可维护性需求

1. **代码质量**：所有新代码必须通过ESLint检查
2. **测试覆盖率**：核心模块测试覆盖率>80%
3. **文档完整性**：所有公共API必须有JSDoc注释
4. **模块化**：每个功能模块独立，低耦合高内聚

---

## 约束条件

1. **开源协议**：PassGAN和LSTM模型必须使用MIT或Apache 2.0等宽松开源协议
2. **隐私合规**：必须符合GDPR和CCPA等隐私法规
3. **用户同意**：上传数据前必须获得用户明确同意
4. **离线能力**：核心功能必须支持完全离线运行
5. **向后兼容**：新版本必须能读取旧版本的Session文件

---

## 成功标准

### 阶段1成功标准（P0）
- ✅ 速度从10 pwd/s提升到1000 pwd/s
- ✅ 常见密码破解时间减少60%
- ✅ 无效密码尝试减少75%

### 阶段2成功标准（P1）
- ✅ 速度提升到2000 pwd/s
- ✅ 支持断点续传
- ✅ 命中率提升25%

### 阶段3成功标准（P2）
- ✅ 速度提升到5000 pwd/s
- ✅ AI命中率达到45-50%
- ✅ 支持在线学习和模型更新

---

## 风险和缓解措施

### 风险1：AI模型性能不达预期
- **缓解措施**：先用预训练模型验证效果，再投入开发

### 风险2：批量测试兼容性问题
- **缓解措施**：先在单个平台测试，再扩展到其他平台

### 风险3：用户隐私担忧
- **缓解措施**：默认完全本地运行，上传数据需明确同意

### 风险4：开发时间超预期
- **缓解措施**：分阶段发布，每个阶段独立可用

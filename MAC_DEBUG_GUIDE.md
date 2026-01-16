# Mac 应用无法打开诊断指南

如果应用双击后没有任何反应，请按以下步骤诊断：

## 步骤 1：检查系统架构

打开终端，运行：
```bash
uname -m
```

- 如果显示 `arm64`：你的 Mac 是 Apple Silicon (M1/M2/M3)，应下载 `arm64` 版本
- 如果显示 `x86_64`：你的 Mac 是 Intel 芯片，应下载 `x64` 版本

## 步骤 2：检查隔离属性

```bash
xattr -l "/Applications/ProFlow Studio.app"
```

如果看到 `com.apple.quarantine`，运行：
```bash
sudo xattr -rd com.apple.quarantine "/Applications/ProFlow Studio.app"
```

## 步骤 3：尝试从终端启动

```bash
"/Applications/ProFlow Studio.app/Contents/MacOS/ProFlow Studio"
```

这会显示任何错误信息。

## 步骤 4：检查系统日志

```bash
log show --predicate 'process == "ProFlow Studio"' --last 5m
```

## 步骤 5：检查 Gatekeeper 状态

```bash
spctl --status
spctl -a -v "/Applications/ProFlow Studio.app"
```

## 步骤 6：强制允许运行

```bash
# 临时禁用 Gatekeeper（不推荐长期使用）
sudo spctl --master-disable

# 运行应用后重新启用
sudo spctl --master-enable
```

## 步骤 7：重新签名应用

```bash
codesign --force --deep --sign - "/Applications/ProFlow Studio.app"
```

## 常见错误及解决方案

| 错误 | 解决方案 |
|------|----------|
| "已损坏，无法打开" | 运行 `xattr -cr` 命令 |
| "无法验证开发者" | 右键 → 打开，或运行 `xattr` 命令 |
| 双击无反应 | 从终端启动查看错误 |
| "Bad CPU type" | 下载正确架构版本 |

## 请将以下信息反馈给开发者

1. `uname -m` 的输出
2. 从终端启动时的错误信息
3. macOS 版本（关于本机 → macOS 版本）

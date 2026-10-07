# opc-tui
> OpenClaw 终端客户端：直连 Gateway 的流式 TUI，--full 全屏。实时思考折叠、工具卡、真实 token 与花费、命令补全、滚轮翻历史，零构建即用。
<p align="center">
  <img src="docs/assets/logo.svg" alt="dsh-TUI 像素龙虾标题动画" width="560">
</p>
<p align="center">
  <strong>简体中文</strong> | <a href="README_US.md">English</a>
</p>
## 预览
<div align="center">
  <picture>
    <img src="docs/assets/view-tui.gif" alt="Recorded dsh-TUI session: welcome, completion, help and typing, with animated pixel whale." width="78%" alt="简约控制台">
  </picture>
</div>
<p align="center">
  <sup><em>简约控制台</em></sup>
</p>
<div align="center">
  <picture>
    <img src="docs/assets/view-tui-full.gif" alt="Recorded dsh-TUI session: welcome, completion, help and typing, with animated pixel whale." width="78%" alt="全屏控制台">
  </picture>
</div>
<p align="center">
  <sup><em>全屏控制台</em></sup>
</p>


## 特性
- **直连 Gateway WebSocket**（`ws://127.0.0.1:<port>`），不经过 CLI 子进程
- **真·流式思考**：区别于正文的样式，思考结束后自动折叠，`Ctrl+P` 展开/折叠
- 正文流式输出 + 轻量 Markdown 渲染
- 每步**动态图标**（思考 / 工具 / 正文 / 完成 / 出错）
- 底部三行（输入框 / 上下文进度条 / 数据行）**跟随终端宽度**，缩放窗口自动重排
- 启动 banner：像素小龙虾 + 大字 LOGO + 流光动画


## 环境要求
- **Node.js >= 18**
- 本机正在运行 **OpenClaw Gateway**（默认 `127.0.0.1:18789`）
  
## 安装OpenClaw并配置
**系统要求**
- Node.js 22+（推荐 Node 24，安装脚本会自动处理）
- 操作系统 (`macOS / Linux / Windows（Windows 强烈推荐使用 WSL2）`)
- 包管理器 (`npm 或 pnpm`)（源码构建时需要 pnpm)

**一键安装脚本**
**macOS / Linux / WSL2：**
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```
**Windows（PowerShell）:**
```bash
powershell -c "irm https://openclaw.ai/install.ps1 | iex"
```
- 脚本会自动完成 Node 检测、安装和引导流程。如需仅安装而不启动引导，添加 (`--no-onboard`) 参数-

**运行引导向导**
```bash
openclaw onboard
```
**配置模型与 API 密钥**
- 在引导过程中会提示选择模型提供商（Anthropic、DeepSeek、Qwen、OpenAI、Ollama 等）并输入 API 密钥。密钥推荐存放在 (`~/.openclaw/.env`) 中，以便守护进程读取。 -
```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-bind loopback
```
**启动GateWay**
```bash
# 安装为守护进程（后台运行）
openclaw gateway install

# 或手动启动
openclaw gateway

# 仪表盘访问
openclaw dashboard
```
**使用本地Ollama模型（示例）：**
```bash
openclaw config set models.providers.ollama.apiKey "ollama-local"
openclaw models set ollama/llama3.3
```
## 故障排查&维护命令
**故障排查：**
```bash
openclaw status              # 查看整体状态
openclaw gateway status      # 检查 Gateway 状态
openclaw logs --follow       # 实时查看日志
openclaw doctor              # 自动修复配置和状态
openclaw channels status --probe  # 检查频道连接
```

**维护命令：**
```bash
openclaw update --channel stable   # 更新到稳定版
openclaw update --channel dev      # 更新到开发版
openclaw configure                 # 重新配置
openclaw models list               # 查看已配置模型
openclaw models set <provider/model>  # 切换默认模型
openclaw health --verbose          # 详细健康检查
```
## 安装Opc-tui

**方式一：手动克隆**

```bash
git clone https://github.com/LarnXA/OpenClaw-tui.git
cd OpenClaw-tui
npm install
npm install -g .
```

Windows 也可以双击 `install.bat`；macOS / Linux 用 `sh install.sh`。

**方式二：链接直装**

```bash
npm install -g https://github.com/LarnXA/OpenClaw-tui.git
```

> 两者区别：方式一装的是本地仓库，改代码立刻生效、`git pull` 就能更新；方式二装的是从 GitHub 下载的快照，更新要重跑这条命令，也不适合改代码。

## 运行

```bash
opc-tui -v       #查看版本号
opc-tui          # 默认：流式 CLI 界面（直连 Gateway）
opc-tui --full   # 全屏界面（同样直连 Gateway）
```

## 怎么找到 Gateway 配置

按顺序查找 `openclaw.json`：

1. `OPENCLAW_CONFIG_PATH`（直接指向配置文件）
2. `OPENCLAW_STATE_DIR`（目录）
3. `~/.opc-tui.json` 里的 `configPath` 或 `stateDir`
4. `~/.openclaw/openclaw.json`
5. `%APPDATA%\openclaw\openclaw.json`（Windows）

网关地址取 `gateway.port`（默认 18789），token 取 `gateway.auth.token`（或 `password`）。

如果你的配置不在默认位置，建一个 `~/.opc-tui.json`：

```json
{ "configPath": "D:\\path\\to\\openclaw.json" }
```

## 命令与快捷键

命令（输入 `/` 有补全）：

- `/new` 新开会话 · `/clear` 清屏 · `/session` 查看/切换会话 · `/model` 查看/切换模型
- `/status` 运行状态 · `/lang` 中英切换 · `/export` 导出会话 · `/help` 帮助 · `/quit` 退出

快捷键：

- `Ctrl+P` 展开/折叠思考 · `Ctrl+R` 搜索历史 · `Ctrl+L` 清屏
- `Ctrl+V` 粘贴 · `Ctrl+C`（输入为空时）退出 · `↑`/`↓` 输入历史

## 目录结构
|文件名|作用|
|---|---|
| bin/opc-tui.js|入口|
| src/simple.js|默认的流式 CLI 界面（主逻辑）|
| src/app.js|全屏界面（--full）|
| src/ansi.js|颜色 / truecolor 辅助|
| src/screen.js|宽度计算、diff 渲染|
| src/sprite.js |像素小龙虾|
|src/gw.mjs|Gateway 客户端封装|
| dev-notes/|开发期探针脚本（已在 .gitignore 中排除）|

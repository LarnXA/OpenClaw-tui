# opc-tui

OpenClaw 的**终端客户端（TUI）**：直连本机 Gateway 的 WebSocket，聊天、实时看思考过程、看会话数据。

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

## 安装

**方式一（推荐）— 从源码装**：能改代码、能 `git pull` 更新

```bash
git clone https://github.com/LarnXA/OpenClaw-tui.git
cd OpenClaw-tui
npm install
npm install -g .
```

Windows 也可以双击 `install.bat`；macOS / Linux 用 `sh install.sh`。

**方式二 — 一行从 GitHub 直装**（最省事）

```bash
npm install -g https://github.com/LarnXA/OpenClaw-tui.git
```

> 两者区别：方式一装的是本地仓库，改代码立刻生效、`git pull` 就能更新；方式二装的是从 GitHub 下载的快照，更新要重跑这条命令，也不适合改代码。

## 运行

```bash
opc-tui          # 默认：流式 CLI 界面
opc-tui --full   # 可选：全屏界面
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

```
bin/opc-tui.js     入口
src/simple.js      默认的流式 CLI 界面（主逻辑）
src/app.js         --full 全屏界面
src/ansi.js        颜色 / truecolor 辅助
src/screen.js      宽度计算、diff 渲染
src/sprite.js      像素小龙虾
src/gw.mjs         Gateway 客户端封装
dev-notes/         开发期探针脚本（已在 .gitignore 中排除）
```

## License

MIT

# opc-tui
> OpenClaw Terminal Client: A streaming TUI that connects directly to the Gateway, --full for full screen. Real-time folding of thoughts, tool cards, actual tokens and costs, command completion, scroll through history, ready to use without any setup.
<p align="center">
   <a href="README.md">简体中文</a> | <strong>English</strong>
</p>

## View
<div align="center">
  <picture>
    <img src="docs/assets/view-tui.gif" alt="Recorded dsh-TUI session: welcome, completion, help and typing, with animated pixel whale." width="78%" alt="Simple Console">
  </picture>
</div>
<p align="center">
  <sup><em>Simple Console</em></sup>
</p>
<div align="center">
  <picture>
    <img src="docs/assets/view-tui-full.gif" alt="Recorded dsh-TUI session: welcome, completion, help and typing, with animated pixel whale." width="78%" alt="Full Screen Console">
  </picture>
</div>
<p align="center">
  <sup><em>Full Screen Console</em></sup>
</p>

## Preview
- opc-tui Simple Console
![image](https://github.com/LarnXA/OpenClaw-tui/docs/assets/view-tui.gif)
- opc-tui --full Full-Screen Console
![image](https://github.com/LarnXA/OpenClaw-tui/docs/assets/view-tui-full.gif)
## Features

- **Direct Gateway WebSocket** (`ws://127.0.0.1:<port>`), bypasses the CLI subprocess  
- **True Streamed Thinking**: Different from the main text style, automatically folds after thinking, `Ctrl P` to expand/collapse  
- Main text streamed output with lightweight Markdown rendering  
- **Animated icons** for each step (thinking / tool / main text / done / error)  
- Bottom three lines (input box / context progress bar / data row) **follow terminal width**, auto-rearrange when resizing window  
- Startup banner: pixel lobster, big LOGO, flowing light animation

## Environment Requirements
- **Node.js >= 18**
- The local machine is running **OpenClaw Gateway** (default `127.0.0.1:18789`)

## Install OpenClaw and Configure
**System Requirements**
- Node.js 22 (Node 24 recommended, the install script will handle it automatically)
- Operating System macOS / Linux / Windows (Windows strongly recommended to use WSL2)
- Package manager npm or pnpm (pnpm needed if building from source)

**One-Click Install Script**
**macOS / Linux / WSL2:**
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```
**Windows (PowerShell):**
```bash
powershell -c "irm https://openclaw.ai/install.ps1 | iex"
```
- The script will automatically handle Node detection, installation, and onboarding. If you just want to install without starting the onboarding process, add the --no-onboard parameter.

**Run the Boot Wizard**
```bash openclaw onboard``` 
**Configure Model and API Key** 
- During the boot, you'll be prompted to select a model provider (Anthropic, OpenAI, Ollama, etc.) and enter your API key. The key is recommended to be stored in ~/.openclaw/.env for daemons to read.
```bash
openclaw onboard --non-interactive \
 --mode local \
 --auth-choice apiKey \
 --anthropic-api-key "$ANTHROPIC_API_KEY" \
 --gateway-bind loopback
```

**Start GateWay**
```bash
# Install as a daemon (runs in the background)
openclaw gateway install

# Or turn on manually
openclaw gateway

# Dashboard Access
openclaw dashboard
```
**Using a local Ollama model (example)：**
```bash
openclaw config set models.providers.ollama.apiKey "ollama-local"
openclaw models set ollama/llama3.3
```
## Troubleshooting & Maintenance Commands
**Troubleshooting：**
```bash
openclaw status # Check overall status
openclaw gateway status # Check Gateway status
openclaw logs --follow # View logs in real-time
openclaw doctor # Automatically fix configuration and status
openclaw channels status --probe # Check channel connections
```

**Maintenance Commands:**
```bash
openclaw update --channel stable # Update to the stable version
openclaw update --channel dev # Update to the development version
openclaw configure # Reconfigure
openclaw models list # List configured models
openclaw models set <provider/model> # Switch the default model
openclaw health --verbose # Detailed health check
```
## Install Opc-tui

**Method 1 (Recommended) — Install from Source**

```bash
git clone https://github.com/LarnXA/OpenClaw-tui.git
cd OpenClaw-tui
npm install
npm install -g .
```

On Windows, you can also double-click `install.bat`; on macOS / Linux, use `sh install.sh`.

**Method 2 — Install Directly via Command Line**

```bash
npm install -g https://github.com/LarnXA/OpenClaw-tui.git
```

> The difference between the two: Method 1 installs from the local repository, so any code changes take effect immediately, and you can update it with `git pull`; Method 2 installs from a snapshot downloaded from GitHub, so updating requires rerunning this command, and it's not suitable for code modifications either. 

## Running

```bash
opc-tui -v # check the version number
opc-tui # default: streaming CLI interface (directly connects to Gateway)
opc-tui --full # full-screen interface (also connects directly to Gateway)
```

## How to Find Gateway Configuration

Look for `openclaw.json` in this order:

1. `OPENCLAW_CONFIG_PATH` (directly points to the config file)
2. `OPENCLAW_STATE_DIR` (directory)
3. `configPath` or `stateDir` in `~/.opc-tui.json`
4. `~/.openclaw/openclaw.json`
5. `%APPDATA%openclawopenclaw.json` (Windows)

The gateway address uses `gateway.port` (default 18789), and the token uses `gateway.auth.token` (or `password`).

If your configuration isn't in the default location, create a `~/.opc-tui.json`: 

```json
{ "configPath": "D:\\path\\to\\openclaw.json" }
```

## Commands and Shortcuts

Commands (type `/` to autocomplete):

- `/new` Start a new conversation · `/clear` Clear the screen · `/session` View/switch sessions · `/model` View/switch models
- `/status` Check running status · `/lang` Switch between Chinese and English · `/export` Export conversation · `/help` Help · `/quit` Quit

Keyboard Shortcuts:

- `Ctrl P` Expand/Collapse Thoughts · `Ctrl R` Search History · `Ctrl L` Clear Screen
- `Ctrl V` Paste · `Ctrl C` (when input is empty) Exit · `↑`/`↓` Input History

## Directory Structure
|Filename|Purpose|
|---|---|
| bin/opc-tui.js|Entry point|
| src/simple.js|Default streaming CLI interface (main logic)|
| src/app.js|Full-screen interface (--full)|
| src/ansi.js|Color / truecolor helper|
| src/screen.js|Width calculation, diff rendering|
| src/sprite.js|Pixel crayfish|
| src/gw.mjs|Gateway client wrapper|
| dev-notes/|Development probe scripts (excluded in .gitignore)|

## License

MIT

---
AIGC:
  Label: "1"
  ContentProducer: "001191330110MADHPQQY7L10000"
  ProduceID: "ExportRequest(files=[ExportFile(docType=2, fileType=3)])"
  ReservedCode1: "3187855ddc34ef804f979779c108199d57c3dcfa49d5a33e15e249ee509b1757"
  ContentPropagator: "001191330110MADHPQQY7L10000"
  PropagateID: "ExportRequest(files=[ExportFile(docType=2, fileType=3)])"
  ReservedCode2: ""
---
### opc-tui
 
OpenClaw terminal client: a streaming TUI that connects directly to the Gateway, with `--full` for full-screen mode. Features include real-time thought folding, tool cards, accurate token and cost displays, command completion, and scroll-wheel navigation through command history—ready to use with zero setup.
 
<p align="center">
<img src="docs/assets/logo.svg" alt="dsh-TUI pixel lobster title animation" width="560">
</p> 
### Preview
 
### Characteristics
 
### Environmental Requirements
 
### Install OpenClaw and configure it
 
<strong>System Requirements</strong>
 
<strong>One-Click Installation Script</strong><strong>macOS / Linux / WSL2:</strong>
 
<strong>Windows (PowerShell):</strong>
 
<strong>Run the Guidance Wizard</strong>
 
<strong>Configure the Model and API Key</strong>
 
<strong>Start the Gateway</strong>
 
<strong>Using a local Ollama model (example):</strong>
 
### Troubleshooting & Maintenance Commands
 
<strong>Troubleshooting:</strong>
 
<strong>Maintenance Command:</strong>
 
### Install Opc-tui
 
<strong>Method 1 (Recommended) — Install from Source Code</strong>
 
On Windows, you can also double-click `install.bat`; on macOS/Linux, use `sh install.sh`.
 
<strong>Method 2 — Direct Installation via Command Line</strong>
 
The difference between the two is this: Method one installs a local repository, so changes take effect immediately and can be updated with `git pull`; method two installs a snapshot downloaded from GitHub, which requires rerunning that command to update and is not suitable for modifying code.
 
### Run
 
### How to find the Gateway configuration
 
Search for `openclaw.json` in sequence:
 
The gateway address is taken from `gateway.port` (default 18789), and the token is taken from `gateway.auth.token` (or `password`).
 
If your configuration is not in the default location, create a `~/.opc-tui.json`:
 
### Commands and Keyboard Shortcuts
 
Command (type `/` for autocomplete):
 
Keyboard shortcuts:
 
### Directory Structure
 
### License
 
MIT
 

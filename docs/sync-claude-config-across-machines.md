# Syncing Claude Code Configuration Across Multiple Machines

This guide explains how to sync Claude Code configurations (MCP servers and custom agents) across multiple machines using Dropbox and symbolic links.

## Overview

By default, Claude Code stores its configuration locally on each machine, which means:
- **Project files** → Sync via Dropbox ✓
- **Claude Code settings** (MCP servers, global settings) → Don't sync ✗

This guide shows you how to store Claude configurations on Dropbox so they sync automatically.

## Prerequisites

- Dropbox installed and syncing on all machines
- Claude Code installed on all machines
- Basic terminal/command line knowledge

## Step 1: Set Up on Your Primary Machine

### 1.1 Create Dropbox Folder for Claude Configs

```bash
mkdir -p ~/Dropbox/Claude-Config
mkdir -p ~/Dropbox/Claude-Config/.claude
```

### 1.2 Move MCP Server Configuration

**On macOS:**
```bash
# Check if the config file exists
ls ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Move it to Dropbox
mv ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/Dropbox/Claude-Config/

# Create a symbolic link back
ln -s ~/Dropbox/Claude-Config/claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**On Linux:**
```bash
# Check if the config file exists
ls ~/.config/claude/claude_desktop_config.json

# Move it to Dropbox
mv ~/.config/claude/claude_desktop_config.json ~/Dropbox/Claude-Config/

# Create a symbolic link back
ln -s ~/Dropbox/Claude-Config/claude_desktop_config.json ~/.config/claude/claude_desktop_config.json
```

**On Windows (use PowerShell as Administrator):**
```powershell
# Check if the config file exists
Test-Path "$env:APPDATA\Claude\claude_desktop_config.json"

# Move it to Dropbox
Move-Item "$env:APPDATA\Claude\claude_desktop_config.json" "$env:USERPROFILE\Dropbox\Claude-Config\"

# Create a symbolic link back
New-Item -ItemType SymbolicLink -Path "$env:APPDATA\Claude\claude_desktop_config.json" -Target "$env:USERPROFILE\Dropbox\Claude-Config\claude_desktop_config.json"
```

### 1.3 Move Global Custom Agents/Commands (Optional)

If you have a global `.claude` folder with custom commands or agents:

**On macOS/Linux:**
```bash
# Check if you have a global .claude folder
ls -la ~/.claude

# If it exists, move it to Dropbox
mv ~/.claude/* ~/Dropbox/Claude-Config/.claude/
rmdir ~/.claude

# Create a symbolic link
ln -s ~/Dropbox/Claude-Config/.claude ~/.claude
```

**On Windows (PowerShell as Administrator):**
```powershell
# Check if you have a global .claude folder
Test-Path "$env:USERPROFILE\.claude"

# If it exists, move it to Dropbox
Move-Item "$env:USERPROFILE\.claude\*" "$env:USERPROFILE\Dropbox\Claude-Config\.claude\"
Remove-Item "$env:USERPROFILE\.claude"

# Create a symbolic link
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude" -Target "$env:USERPROFILE\Dropbox\Claude-Config\.claude"
```

### 1.4 Verify the Setup

```bash
# Check that the symlink was created correctly
ls -l ~/Library/Application\ Support/Claude/claude_desktop_config.json  # macOS
# or
ls -l ~/.config/claude/claude_desktop_config.json  # Linux

# The output should show it's a symlink pointing to Dropbox
# Example: claude_desktop_config.json -> /Users/you/Dropbox/Claude-Config/claude_desktop_config.json
```

## Step 2: Set Up on Additional Machines

Wait for Dropbox to fully sync the `Claude-Config` folder to your other machine(s), then:

### 2.1 On macOS

```bash
# Remove existing config file if it exists
rm ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Create symlink to Dropbox config
ln -s ~/Dropbox/Claude-Config/claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# If using global .claude folder
ln -s ~/Dropbox/Claude-Config/.claude ~/.claude
```

### 2.2 On Linux

```bash
# Remove existing config file if it exists
rm ~/.config/claude/claude_desktop_config.json

# Create symlink to Dropbox config
ln -s ~/Dropbox/Claude-Config/claude_desktop_config.json ~/.config/claude/claude_desktop_config.json

# If using global .claude folder
ln -s ~/Dropbox/Claude-Config/.claude ~/.claude
```

### 2.3 On Windows (PowerShell as Administrator)

```powershell
# Remove existing config file if it exists
Remove-Item "$env:APPDATA\Claude\claude_desktop_config.json"

# Create symlink to Dropbox config
New-Item -ItemType SymbolicLink -Path "$env:APPDATA\Claude\claude_desktop_config.json" -Target "$env:USERPROFILE\Dropbox\Claude-Config\claude_desktop_config.json"

# If using global .claude folder
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude" -Target "$env:USERPROFILE\Dropbox\Claude-Config\.claude"
```

## Step 3: Test the Sync

1. On your primary machine, add a new MCP server:
   ```bash
   claude mcp add supabase
   ```

2. Wait for Dropbox to sync (usually a few seconds)

3. On your second machine, verify the MCP server appears:
   ```bash
   claude mcp list
   ```

4. You should see the Supabase MCP server listed on both machines!

## Important Notes

⚠️ **Concurrent Usage Warning**: Avoid running Claude Code on both machines simultaneously while Dropbox is syncing, as this could cause configuration conflicts.

⚠️ **Backup First**: Before making these changes, consider backing up your existing `claude_desktop_config.json` file.

⚠️ **Path Consistency**: Make sure Dropbox is installed in the same relative location on all machines (usually `~/Dropbox` or `%USERPROFILE%\Dropbox`).

## Troubleshooting

### Symlink Not Working

Verify the symlink is correct:
```bash
ls -l ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

The output should show `->` pointing to your Dropbox folder.

### Config Not Syncing

1. Check Dropbox sync status
2. Restart Claude Code on the second machine
3. Verify the file exists in Dropbox:
   ```bash
   cat ~/Dropbox/Claude-Config/claude_desktop_config.json
   ```

### Permission Issues on Windows

Make sure you're running PowerShell as Administrator when creating symbolic links.

## What Gets Synced

With this setup, the following will sync across machines:
- ✅ MCP server configurations
- ✅ MCP server credentials/API keys
- ✅ Global custom slash commands (if using `~/.claude`)
- ✅ Global custom prompts/agents (if using `~/.claude`)

Project-specific `.claude` folders (in your project directories) already sync via Dropbox automatically.

## Reverting the Setup

If you want to go back to local configs:

```bash
# Remove the symlink
rm ~/Library/Application\ Support/Claude/claude_desktop_config.json  # macOS
# or
rm ~/.config/claude/claude_desktop_config.json  # Linux

# Copy the file back from Dropbox
cp ~/Dropbox/Claude-Config/claude_desktop_config.json ~/Library/Application\ Support/Claude/  # macOS
# or
cp ~/Dropbox/Claude-Config/claude_desktop_config.json ~/.config/claude/  # Linux
```

# WCMD - WebSocket Interface for VS Code

The **WCMD** extension provides a WebSocket interface for executing commands within Visual Studio Code. While designed to complement the web app at [http://cmdkeys.github.io](http://cmdkeys.github.io), it offers a flexible tool that can be used for various custom purposes. The interface is open to third-party integrations and is distributed under an open-source license.

## WebSocket Server Overview

By default, the WebSocket server listens on port **5813**. Once connected, the server offers two primary functions:

1. **Executing VS Code Commands:** Run any command available in VS Code.
2. **Accessing the Local Terminal:** Execute terminal commands and optionally return output or open a new terminal tab within the VS Code interface.

To explore the full list of available VS Code commands, visit the [VS Code Command Guide](https://code.visualstudio.com/api/extension-guides/command).  
To start, connect to the WebSocket server.

Example local IP: **192.168.1.203**

![Local WebSocket Server Setup](https://raw.githubusercontent.com/VsCodePlugins/vscodeplugins.github.io/refs/heads/main/assets/settings-toaskbar.png)

## Testing the WebSocket Interface

You can test the WebSocket functionality using this tool: [WebSocket Test Page](https://livepersoninc.github.io/ws-test-page/).  
To connect locally, use the WebSocket URL `ws://localhost:5813`.

On systems like Linux, you may need to open port **5813**. You can check port availability with the following command:

```bash
netstat -na | grep :5813
#  OPEN THE PORT WITH UFW
sudo ufw allow 5813/tcp

```

![WebSocket Connection Example](https://raw.githubusercontent.com/VsCodePlugins/vscodeplugins.github.io/refs/heads/main/assets/command-webpage-example.png)

## Usage Examples

### Executing VS Code Commands

To execute a VS Code command, send a JSON message like the following after establishing a connection:

```json
{"vscodeCommand": "vscode.newWindow"}
```

This will open a new VS Code window.

### Executing Terminal Commands

To run terminal commands, send a message specifying the command and an optional terminal name:

```json
{"terminalCommand": "ls -p", "terminalName": "List all files"}
```

This will execute the `ls -p` command in a new terminal tab titled **List all files**.

![Terminal Command Example](https://raw.githubusercontent.com/VsCodePlugins/vscodeplugins.github.io/refs/heads/main/assets/terminal_example.png)

### Executing Commands with Return Values

To execute a command and return the result in the WebSocket response, use:

```json
{"commandWithReturn": "ls -p"}
```

This will return the result of the `ls -p` command in the response message.

Example response:

![Command with Return Example](https://raw.githubusercontent.com/VsCodePlugins/vscodeplugins.github.io/refs/heads/main/assets/command-with-return.png)

## Release Notes

### Version 0.0.2

- Initial release with basic WebSocket interface functionality.
- Supported features:
  - Execute VS Code commands.
  - Run terminal commands.
  - Retrieve command output.


### Available Functions (Registered Commands)

- **Update port number:** Change the WebSocket server's port.
- **Close WebSocket connections:** Disable connections on the current port.
- **Display settings:** View and modify WebSocket server settings.

![Command Overview](https://raw.githubusercontent.com/VsCodePlugins/vscodeplugins.github.io/refs/heads/main/assets/list-commands.png)

---
author website : https://bueltan.github.io/
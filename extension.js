const vscode = require('vscode');
const WebSocket = require('ws');

/**
 * @param {vscode.ExtensionContext} context
 */

const Event = require('./event_model');
const Command = require('./command_model');
var ip = require('ip');



function activate(context) {

	let wss;
	//let timeoutID = setTimeout(websocketServer, context=context, 2000);
	//console.log(timeoutID)
	let port = 5813;
	wss = websocketServer(context, port);

	let disposable_display_settings = vscode.commands.registerCommand('vscodeKeyboard.display_settings', function () {
		vscode.window.showInformationMessage('vscodeKeyboard: localhost address -> ' + ip.address() + ":" + port);
	});

	let disposable_open_ws_port = vscode.commands.registerCommand('vscodeKeyboard.open_websocket_port', function () {
		vscode.window.showInformationMessage('vscodeKeyboard: Open to connections -> ' + ip.address() + ":" + port);
		wss = websocketServer(context, port);
	});

	let disposable_close_ws_port = vscode.commands.registerCommand('vscodeKeyboard.close_websocket_port', function () {
		wss.close()
		vscode.window.showWarningMessage('vscodeKeyboard: Connection in -> ' + ip.address() + ":" + port + " closed");
	});

	let disposable_update_port = vscode.commands.registerCommand('vscodeKeyboard.update_port', async function () {

		let newPort;

		await vscode.window.showInputBox({
			placeHolder: "Set new port number 90 - 65535 ",
			prompt: "",
			validateInput: (value) => {
				const regex = /^[0-9]+$/;
				if (!regex.test(value)) {
					return 'Please only numbers';
				}

				const num = parseInt(value);
				if (num < 90 || num > 65535) {
					return 'Must be between 90 and 65535.';
				}
				newPort = value;
				return null;
			}
		})
		if (newPort !== undefined) {
			wss.close()
			vscode.window.showWarningMessage('vscodeKeyboard: Connection in -> ' + ip.address() + ":" + port + " closed");
			wss = websocketServer(context, newPort);
		}

	});
	context.subscriptions.push(disposable_update_port);
	context.subscriptions.push(disposable_display_settings);
	context.subscriptions.push(disposable_open_ws_port);
	context.subscriptions.push(disposable_close_ws_port);
}

function onDidChange(session, ws, eventName, message = null) {
	let debugSession = session;
	console.log("EventName: " + eventName + "Session:" + session.id);
	debugSession = session;
	var id = Math.random().toString(16).slice(2)
	const event = new Event({
		sessionID: debugSession.id,
		sessionType: debugSession.type,
		sessionName: debugSession.name,
		eventID: eventName + "_" + id,
		eventName: eventName,
		eventType: "onDidChange",
		message: message === null ? eventName : message
	})
	ws.send(event.toJsonString());
}

/**
 * @param {vscode.ExtensionContext} context
 * @param {Number} port
 */

function websocketServer(context, port) {

	const wss = new WebSocket.Server({ port: port });
	vscode.window.showInformationMessage('vscodeKeyboard: Open to receive connections in -> ' + ip.address() + ":" + port);
	wss.on('connection', function connection(ws) {
		console.log('Client connected');
		vscode.window.showInformationMessage('vscodeKeyboard:Client connected in -> ' + ip.address() + ":" + port);
		ws.on('message', function incoming(message) {
			let sessionID;
			let sessionName;
			let sessionType;
			console.log('Message received: %s', message.toString());
			if (vscode.debug.activeDebugSession) {
				sessionID = vscode.debug.activeDebugSession.id
				sessionName = vscode.debug.activeDebugSession.name;
				sessionType = vscode.debug.activeDebugSession.type;
			}
			executeCommand(message.toString(), ws, sessionID, sessionName, sessionType);
		});

		ws.on('close', function () {
			vscode.window.showWarningMessage('vscodeKeyboard: Client disconnected in -> ' + ip.address() + ":" + port);
		});

		context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(session => {
			onDidChange(session, ws, "onDidChangeActiveDebugSession");
			return;
		}));

		context.subscriptions.push(vscode.debug.onDidChangeBreakpoints(() => {
			const breakpoints = vscode.debug.breakpoints;
			onDidChange(vscode.debug.activeDebugSession, ws, "onDidChangeBreakpoints", "Total breakpoints:" + breakpoints.length)
		}));

		context.subscriptions.push(vscode.debug.onDidStartDebugSession((session) => {
			onDidChange(session, ws, "onDidStartDebugSession")
		}));

		context.subscriptions.push(vscode.debug.onDidTerminateDebugSession((session) => {
			onDidChange(session, ws, "onDidTerminateDebugSession")

		}));

		context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent((e) => {
			onDidChange(vscode.debug.activeDebugSession, ws, "onDidReceiveDebugSessionCustomEvent", e.body)
		}));

	});
	return wss;
}



let mapDebugCommands = {
	"startDebug": new Command("startDebug", "start", "Start (F5)"),
	"continueDebug": new Command("continueDebug", "continue", "Continue (F5)"),
	"stopDebug": new Command("stopDebug", "stop", "Stop (Shift+F5)"),
	"pauseDebug": new Command("pauseDebug", "pause", "Pause (F6)"),
	"restartDebug": new Command("restartDebug", "restart", "Restart (Ctrl+Shift+F5)"),
	"stepOutDebug": new Command("stepOutDebug", "stepOut", "Step Out (Shift+F11)"),
	"stepIntoDebug": new Command("stepIntoDebug", "stepInto", "Step Into (F11)"),
	"stepOverDebug": new Command("stepOverDebug", "stepOver", "Step Over (F10)"),
}

function isJSONValid(message) {
	try {
		JSON.parse(message);
		return true;
	} catch (error) {
		return false;
	}
}



function executeCommand(message, ws, currentSessionID, currentSessionName, currentSessionType) {
	let commandReturnEvent = "commandReturnEvent";
	let eventID;
	let vscodeCommand;
	let terminalCommand;
	let terminalName;


	if (isJSONValid(message)) {
		eventID = JSON.parse(message).eventID;
		vscodeCommand = JSON.parse(message).vscodeCommand;
		terminalCommand = JSON.parse(message).terminalCommand;
		terminalName = JSON.parse(message).terminalName;

	}

	if (eventID === undefined) {
		eventID = "command_" + Math.random().toString(16).slice(2)
	}

	let event = new Event({
		eventID: eventID,
		sessionID: currentSessionID,
		sessionName: currentSessionName,
		sessionType: currentSessionType,
		eventType: commandReturnEvent,
	})

	if (vscodeCommand != undefined && vscodeCommand != null) {
		vscode.commands.executeCommand(vscodeCommand);
		const commandObject = new Command("VscodeCommand", vscodeCommand, vscodeCommand)
		event.eventName = commandObject.name
		event.message = commandObject.response
		ws.send(event.toJsonString())
		return
	}

	if (terminalCommand != undefined && terminalCommand != null) {
		vscodeKeyboardCommand(terminalCommand);
		const commandObject = new Command("TerminalCommand", terminalCommand, terminalCommand)
		event.eventName = commandObject.name
		event.message = commandObject.response
		ws.send(event.toJsonString())
		return
	}

	if (message.toString().includes("flutter")) {
		executeFlutterCommand(message.toString())
		const commandObject = new Command("FLutterCommand", message.toString(), message.toString())
		event.eventName = commandObject.name
		event.message = commandObject.response
		ws.send(event.toJsonString())
		return;
	}
	if (message.toString().includes("Debug")) {
		let commandObject = mapDebugCommands[message.toString()]
		event.eventName = commandObject.name
		event.message = commandObject.response
		vscode.commands.executeCommand('workbench.action.debug.' + mapDebugCommands[message.toString()].command);
		ws.send(event.toJsonString())
	}
}

let flutterTerminal;
let commandTerminal;

function executeFlutterCommand(command) {
	if (flutterTerminal == undefined) {
		flutterTerminal = vscode.window.createTerminal('VscodeKeyboard: Flutter Terminal' );
	}
	vscode.window.showInformationMessage('vscodeKeyboard: Flutter Command:  ' + command);
	flutterTerminal.sendText(`${command}`);
	flutterTerminal.show();
}


function vscodeKeyboardCommand(command) {
	if (commandTerminal == undefined) {
		commandTerminal = vscode.window.createTerminal('VscodeKeyboard: Command Terminal');
	}
	vscode.window.showInformationMessage('vscodeKeyboard: Command Terminal:  ' + command);
	commandTerminal.sendText(`${command}`);
	commandTerminal.show();
}

function deactivate() {

}

module.exports = {
	activate,
	deactivate,
}

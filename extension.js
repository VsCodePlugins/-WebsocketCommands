const vscode = require('vscode');
const WebSocket = require('ws');
const cp = require('child_process')
let wss;
var dictClientsWs = {};

/**
 * @param {vscode.ExtensionContext} context
 * @param {vscode.StatusBarItem} myStatusBarItem
 * @param {vscode.DebugSession} debugSession

 */

let sessionsDebugDict = {}

const Event = require('./event_model');
const Command = require('./command_model');
const ClientWs = require('./client_ws_model');
const ModelSessionDebug = require('./session_debug_model');

var ip = require('ip');
const myCommandId = 'wcmd.displaySettings';

let globalStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
globalStatusBar.command = myCommandId;



function activate(context) {


	// create a new status bar item that we can now manage

	context.subscriptions.push(globalStatusBar);
	//let timeoutID = setTimeout(websocketServer, context=context, 2000);
	//console.log(timeoutID)
	let port = 5813;
	wss = websocketServer(context, port);
	subscribeEventsDebugging(context);

	let disposable_display_settings = vscode.commands.registerCommand('wcmd.displaySettings', function () {
		if (wss.clients.size > 0) {
			let clientsStr = getNamesAsString(dictClientsWs)

			vscode.window.showInformationMessage('wcmd:\nTotal clients connected -> ' + wss.clients.size + '\n ' + clientsStr + ' connected to : ' + ip.address() + ":" + port + "\n", "Web App", "Github", "Readme").then(selection => {
				if (selection === "Web App") {
					vscode.env.openExternal(vscode.Uri.parse(
						'https://cmdkeys.github.io'));
				} else if (selection === "Readme") {
					vscode.env.openExternal(vscode.Uri.parse(
						'https://marketplace.visualstudio.com/items?itemName=VscodePlugins-CmdKeys.vscodeplugins-cmdkeys'));

				} else if (selection === "Github") {
					vscode.env.openExternal(vscode.Uri.parse(
						'https://github.com/VsCodePlugins/CmdKeys.git'));

				}
			});
		} else {
			vscode.window.showInformationMessage('wcmd:  Open to connections -> ' + ip.address() + ":" + port + ' - No clients connected', "Web App").then(selection => {
				if (selection === "Web App") {
					vscode.env.openExternal(vscode.Uri.parse(
						'https://cmdkeys.github.io'));
				}
			});
		}
	});

	let disposable_open_ws_port = vscode.commands.registerCommand('wcmd.openWebsocketPort', function () {
		vscode.window.showInformationMessage('wcmd: Open to connections -> ' + ip.address() + ":" + port);
		wss = websocketServer(context, port);
	});

	let disposable_close_ws_port = vscode.commands.registerCommand('wcmd.closeWebsocketPort', function () {
		wss.close()
		vscode.window.showWarningMessage('wcmd: Connection in -> ' + ip.address() + ":" + port + " closed");
	});

	let disposable_update_port = vscode.commands.registerCommand('wcmd.updatePort', async function () {

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
		}).then(

		);

		if (newPort !== undefined) {
			wss.close()
			vscode.window.showWarningMessage('wcmd: Connection in -> ' + ip.address() + ":" + port + " closed",);
			wss = websocketServer(context, newPort);
		}
	});
	context.subscriptions.push(disposable_update_port);
	context.subscriptions.push(disposable_display_settings);
	context.subscriptions.push(disposable_open_ws_port);
	context.subscriptions.push(disposable_close_ws_port);
}

/**
 * @param {vscode.DebugSession} sessionDebug
 * @param {string} eventName
 * @param {number} sessionUnixTimestamp
 * @param {undefined} [message]
 */

function sendOnDidChangeToAll(sessionDebug, eventName, sessionUnixTimestamp, message) {
	// Notify by ws to all clients.
	for (const [key, clientWs] of Object.entries(dictClientsWs)) {
		onDidChange(sessionDebug, clientWs.ws, eventName, sessionUnixTimestamp, message);
	}
}

/**
 * @param {vscode.DebugSession} session
 * @param {{ send: (arg0: string) => void; }} ws
 * @param {string} eventName
 * @param {number} sessionUnixTimestamp
 */

function onDidChange(session, ws, eventName, sessionUnixTimestamp, message = null,) {
	let debugSession = session;
	debugSession = session;
	var id = Math.random().toString(16).slice(2)
	const event = new Event({
		sessionID: debugSession.name,
		sessionType: debugSession.type,
		sessionName: debugSession.name,
		sessionUnixTimestamp: sessionUnixTimestamp,
		eventID: eventName + "_" + id,
		eventName: eventName,
		eventType: "onDidChangeDebug",
		message: message === null ? eventName : message
	})
	console.log(event.toJsonString());
	ws.send(event.toJsonString());
}

/**
 * @param {{ subscriptions: vscode.Disposable[]; }} context
 */

function subscribeEventsDebugging(context) {
	// eslint-disable-next-line no-unused-vars
	context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(_session => {
		let currentSession = vscode.debug.activeDebugSession;
		updateDictDebugSession(currentSession, "onDidChangeActiveDebugSession")
	}));

	context.subscriptions.push(vscode.debug.onDidChangeBreakpoints(() => {
		//const breakpoints = vscode.debug.breakpoints;
		//let session = vscode.debug.activeDebugSession
		//updateDictDebugSession(session, "onDidChangeBreakpoints", "totalBreakpoints: " + breakpoints.length)
	}));

	context.subscriptions.push(vscode.debug.onDidStartDebugSession((session) => {
		updateDictDebugSession(session, "onDidStartDebugSession")
		// only for set to the top the current session. 
		let currentSession = vscode.debug.activeDebugSession;
		updateDictDebugSession(currentSession, "onDidChangeActiveDebugSession")

	}));

	context.subscriptions.push(vscode.debug.onDidTerminateDebugSession((session) => {
		let unixTimestamp = sessionsDebugDict[session.name].unixTimestamp
		delete sessionsDebugDict[session.name];
		sendOnDidChangeToAll(session, "onDidTerminateDebugSession", unixTimestamp)
	}));

	context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent((e) => {
		//const debugSession = vscode.debug.activeDebugSession;
		//updateDictDebugSession(debugSession, "onDidReceiveDebugSessionCustomEvent", e.body)
	}));

}


function getNamesAsString(dictionary) {
	var values = [];

	for (var clave in dictionary) {
		if (dictionary.hasOwnProperty(clave)) {
			values.push(dictionary[clave].name);
		}
	}

	return values.join(",\n");
}

/**
 * @param {number} ms
 */
async function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
async function nextConsole() {
	vscode.commands.executeCommand('workbench.action.debug.nextConsole');
	await delay(100);
}

/**
* @param {string} nameSession
*/
async function changeSession(nameSession) {

	let currentSession = vscode.debug.activeDebugSession;
	if (nameSession == currentSession.name) {
		return;
	}

	for await (const [key, modelDebugSession] of Object.entries(sessionsDebugDict)) {
		await nextConsole()
		let currentSession = vscode.debug.activeDebugSession;
		if (currentSession.name == nameSession) {
			break;
		}

	}

}


function syncSessionsDebug(message = null) {
	for (const [key, modelDebugSession] of Object.entries(sessionsDebugDict)) {
		updateDictDebugSession(modelDebugSession.debugSession, "syncSessionsDebug", message)
	}
}


/**
 * @param {Event} event
 */
function sendEventToAllClientsWs(event) {
	if (Object.keys(dictClientsWs).length == 0) {
		console.log("No client Ws ")
		return;
	}
	for (const [key, clientWs] of Object.entries(dictClientsWs)) {
		clientWs.ws.send(event.toJsonString())

	}
}


function updateDictDebugSession(sessionDebug, eventName, message) {
	if (sessionDebug == undefined) {
		console.log("session undefined")
		return;
	}
	if (sessionDebug == null) {
		console.log("session null")
		return;
	}

	let modelDebugSession;

	if (sessionsDebugDict[sessionDebug.name] === undefined) {
		modelDebugSession = new ModelSessionDebug(sessionDebug.name, sessionDebug)
		sessionsDebugDict[sessionDebug.name] = modelDebugSession;
	} else {
		modelDebugSession = sessionsDebugDict[sessionDebug.name]
		if (eventName == "onDidChangeActiveDebugSession") {
			modelDebugSession.unixTimestamp = Date.now()
		}
	}
	if (Object.keys(dictClientsWs).length == 0) {
		console.log("No client Ws ")
		return;
	}
	// Notify to ws clients.
	sendOnDidChangeToAll(sessionDebug, eventName, modelDebugSession.unixTimestamp, message);

}

function statusBarState(wss) {
	globalStatusBar.tooltip = wss.clients.size + " Device connected"

	if (wss.clients.size > 1) {
		globalStatusBar.text = `${wss.clients.size} 🔌 Websocket Commands`;
		globalStatusBar.tooltip = wss.clients.size + " Device connected"

	}
	if (wss.clients.size == 1) {
		globalStatusBar.tooltip = wss.clients.size + " Device connected"
		globalStatusBar.text = `🔌 Websocket Commands`;

	}
	if (wss.clients.size == 0) {
		globalStatusBar.text = `🚫 Websocket Commands`;
		globalStatusBar.tooltip = wss.clients.size + " Device connected"
	}
	globalStatusBar.show();
}
/**
 * @param {vscode.ExtensionContext} _context
 */
function websocketServer(_context, port) {

	// @ts-ignore
	const wss = new WebSocket.Server({ port: port });
	vscode.window.showInformationMessage('wcmd: Open to receive connections in -> ' + ip.address() + ":" + port);
	globalStatusBar.text = `🚦 Websocket Commands`;
	globalStatusBar.tooltip = wss.clients.size + " Device connected"
	globalStatusBar.show();

	wss.on('connection', function connection(ws, req) {
		console.log('Client connected...');
		let client = new ClientWs(req.headers['sec-websocket-key'], undefined, ws);
		dictClientsWs[client.id] = client;

		syncSessionsDebug()
		statusBarState(wss)
		ws.on('message', function incoming(message) {
			let sessionID;
			let sessionName;
			let sessionType;
			console.log('Message received: %s', message.toString());
			if (vscode.debug.activeDebugSession) {
				sessionID = vscode.debug.activeDebugSession.name
				sessionName = vscode.debug.activeDebugSession.name;
				sessionType = vscode.debug.activeDebugSession.type;
			}
			executeCommand(message.toString(), client, sessionID, sessionName, sessionType);
		});
		ws.on('close', function () {
			//vscode.window.showWarningMessage('wcmd: Client '+ client.name + ' disconnected in -> ' + ip.address() + ":" + port);
			delete dictClientsWs[client.id]
			statusBarState(wss)

		});
	});
	return wss;
}


function isJSONValid(message) {
	try {
		JSON.parse(message);
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * @param {ClientWs} client
 */

async function executeCommand(message, client, currentSessionID, currentSessionName, currentSessionType) {
	let commandReturnEvent = "commandReturnEvent";
	let eventID;
	let debugCommand;
	let vscodeCommand;
	let terminalCommand;
	let commandWithReturn;
	let terminalName;
	let startConnection;
	let clientDevice;
	let debugSessionNameSelector;
	let showMessage;
	let getVsCodeCommands;


	if (isJSONValid(message)) {
		eventID = JSON.parse(message).eventID;
		debugCommand = JSON.parse(message).debugCommand;
		vscodeCommand = JSON.parse(message).vscodeCommand;
		terminalCommand = JSON.parse(message).terminalCommand;
		commandWithReturn = JSON.parse(message).commandWithReturn;
		terminalName = JSON.parse(message).terminalName;
		clientDevice = JSON.parse(message).clientDevice;
		startConnection = JSON.parse(message).startConnection;
		showMessage = JSON.parse(message).showMessage;
		getVsCodeCommands = JSON.parse(message).getVsCodeCommands;
		// debugSessionSelector 
		debugSessionNameSelector = JSON.parse(message).debugSessionNameSelector;

	}

	if (showMessage != undefined && showMessage) {
		vscode.window.showInformationMessage('wcmd: ' + showMessage);

	}

	if (eventID === undefined) {
		eventID = "command_" + Math.random().toString(16).slice(2)
	}

	if (clientDevice != undefined && startConnection) {
		client.name = clientDevice
		//vscode.window.showInformationMessage('wcmd: Client : '+ clientDevice + ' connected' );
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
		const commandObject = new Command("vscodeCommand", vscodeCommand, vscodeCommand)
		event.eventName = commandObject.name
		event.message = commandObject.response
		sendEventToAllClientsWs(event);
		return
	}

	if (commandWithReturn != undefined && commandWithReturn != null) {
		const commandObject = new Command("commandWithReturn", commandWithReturn)
		cp.exec(commandWithReturn, (err, stdout, stderr) => {
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			event.message = stdout + " " + stderr

			if (err) {
				console.log('error: ' + err.message);
				event.message = err.message
			}
			event.eventName = commandObject.name
			sendEventToAllClientsWs(event);

		});
		return
	}

	if (getVsCodeCommands != undefined && getVsCodeCommands) {
		let list = await vscode.commands.getCommands()
		let listCommandsMessage = "";

		for (let row in list) {
			console.log(list[row])
			listCommandsMessage = listCommandsMessage + list[row] + "\n";
		}

		event.eventName = "listCommandsMessage"
		event.message = listCommandsMessage;
		sendEventToAllClientsWs(event);
		return
	}

	if (terminalCommand != undefined && terminalCommand != null) {
		cmdTerminal(terminalCommand, { terminalName: terminalName });
		const commandObject = new Command("terminalCommand", terminalCommand, terminalCommand)

		event.eventName = commandObject.name
		event.message = commandObject.response
		sendEventToAllClientsWs(event);
		return
	}

	if (debugSessionNameSelector != undefined && debugSessionNameSelector != null) {
		changeSession(debugSessionNameSelector);
		return
	}

	if (debugCommand != undefined && debugCommand != null) {
		const commandObject = new Command("debugCommand", debugCommand, debugCommand)
		event.eventName = commandObject.name
		event.message = commandObject.response
		vscode.commands.executeCommand('workbench.action.debug.' + debugCommand);
		sendEventToAllClientsWs(event);

	}
}

let commandTerminal;
let lastTerminalName;


function cmdTerminal(command, { terminalName = "Command Terminal" }) {

	if (lastTerminalName != terminalName) {
		lastTerminalName = terminalName
		commandTerminal = vscode.window.createTerminal('wcmd: ' + terminalName);
	}

	if (commandTerminal == undefined) {
		commandTerminal = vscode.window.createTerminal('wcmd: ' + terminalName);
	}

	vscode.window.showInformationMessage('wcmd: Command Terminal:  ' + command);
	commandTerminal.sendText(`${command}`);
	commandTerminal.show();
}

function deactivate() {
	if (wss != undefined) {
		wss.close()
	}
	vscode.window.showWarningMessage('wcmd: Deactivated ');
}

module.exports = {
	activate,
	deactivate,
}
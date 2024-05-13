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
const myCommandId = 'vscodeKeyboard.display_settings';

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

	let disposable_display_settings = vscode.commands.registerCommand('vscodeKeyboard.display_settings', function () {
		vscode.commands.executeCommand('workbench.action.debug.nextConsole');
		if (wss.clients.size > 0) {
			let clientsStr = getNamesAsString(dictClientsWs)

			vscode.window.showInformationMessage('VscodeKeyboard:\nTotal clients connected -> ' + wss.clients.size + '\n ' + clientsStr + ' connected to : ' + ip.address() + ":" + port + "\n", "vscodekeyboard.com", "Settings", "README").then(selection => {
				if (selection === "vscodekeyboard.com") {
					vscode.env.openExternal(vscode.Uri.parse(
						'https://www.vscodekeyboard.com'));
				}
			});
		} else {
			vscode.window.showInformationMessage('VscodeKeyboard:  Open to connections -> ' + ip.address() + ":" + port + ', No clients connected', "vscodekeyboard.com");
		}
	});

	let disposable_open_ws_port = vscode.commands.registerCommand('vscodeKeyboard.open_websocket_port', function () {
		vscode.window.showInformationMessage('VscodeKeyboard: Open to connections -> ' + ip.address() + ":" + port);
		wss = websocketServer(context, port);
	});

	let disposable_close_ws_port = vscode.commands.registerCommand('vscodeKeyboard.close_websocket_port', function () {
		wss.close()
		vscode.window.showWarningMessage('VscodeKeyboard: Connection in -> ' + ip.address() + ":" + port + " closed");
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
		}).then(

		);
		if (newPort !== undefined) {
			wss.close()
			vscode.window.showWarningMessage('vscodeKeyboard: Connection in -> ' + ip.address() + ":" + port + " closed",);
			wss = websocketServer(context, newPort);
		}

	});
	context.subscriptions.push(disposable_update_port);
	context.subscriptions.push(disposable_display_settings);
	context.subscriptions.push(disposable_open_ws_port);
	context.subscriptions.push(disposable_close_ws_port);
}

function subscribeEventsDebugging(context) {
	context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(session => {
		updateDictDebugSession(session, "onDidChangeActiveDebugSession")

	}));

	context.subscriptions.push(vscode.debug.onDidChangeBreakpoints(() => {

		const breakpoints = vscode.debug.breakpoints;
		let session = vscode.debug.activeDebugSession
		updateDictDebugSession(session, "onDidChangeActiveDebugSession", "totalBreakpoints: " + breakpoints.length)
	}));

	context.subscriptions.push(vscode.debug.onDidStartDebugSession((session) => {
		updateDictDebugSession(session, "onDidStartDebugSession")

	}));

	context.subscriptions.push(vscode.debug.onDidTerminateDebugSession((session) => {
		let unixTimestamp = sessionsDebugDict[session.id].unixTimestamp
		delete sessionsDebugDict[session.id];
		onDidChange(session, "onDidTerminateDebugSession", unixTimestamp)

	}));

	context.subscriptions.push(vscode.debug.onDidReceiveDebugSessionCustomEvent((e) => {
		const debugSession = vscode.debug.activeDebugSession;
		updateDictDebugSession(debugSession, "onDidReceiveDebugSessionCustomEvent", e.body)
	}));

}

function onDidChange(session, ws, eventName, sessionUnixTimestamp, message = null,) {
	let debugSession = session;
	debugSession = session;
	var id = Math.random().toString(16).slice(2)
	const event = new Event({
		sessionID: debugSession.id,
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

function getNamesAsString(dictionary) {
	var values = [];

	for (var clave in dictionary) {
		if (dictionary.hasOwnProperty(clave)) {
			values.push(dictionary[clave].name);
		}
	}

	return values.join(",\n");
}


function ensureAvailabilityPort(port) {
	port = port + 1;
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
	if (Object.keys(dictClientsWs).length ==0){
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
		return ;
	}
	if (sessionDebug == null) {
		console.log("session null")
		return;
	}

	let modelDebugSession;

	if (sessionsDebugDict[sessionDebug.id] === undefined) {
		modelDebugSession = new ModelSessionDebug(sessionDebug.id, sessionDebug)
		sessionsDebugDict[sessionDebug.id] = modelDebugSession;
	} else {
		modelDebugSession = sessionsDebugDict[sessionDebug.id]
	}
	if (Object.keys(dictClientsWs).length ==0 ){
		console.log("No client Ws ")
		return;
	}
	// Notify to ws clients.
	for (const [key, clientWs] of Object.entries(dictClientsWs)) {
		onDidChange(sessionDebug, clientWs.ws, eventName, modelDebugSession.unixTimestamp, message);
	}
}

function statusBarState(wss){
	globalStatusBar.tooltip = wss.clients.size + " Device connected"

	if (wss.clients.size > 1) {
		globalStatusBar.text = `${wss.clients.size} 🌐 VscKeyboard`;
		globalStatusBar.tooltip = wss.clients.size + " Device connected"

	}
	if (wss.clients.size == 1) {
		globalStatusBar.tooltip = wss.clients.size + " Device connected"
		globalStatusBar.text = `🌐 VscKeyboard`;

	}
	if (wss.clients.size == 0) {
		globalStatusBar.text = `🚫 VscKeyboard`;
		globalStatusBar.tooltip = wss.clients.size + " Device connected"
	}
	globalStatusBar.show();
}
/**
 * @param {vscode.ExtensionContext} context
 */
function websocketServer(context, port) {

	const wss = new WebSocket.Server({ port: port });
	vscode.window.showInformationMessage('VscodeKeyboard: Open to receive connections in -> ' + ip.address() + ":" + port);
	globalStatusBar.text = `🚦 VscKeyboard`;
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
				sessionID = vscode.debug.activeDebugSession.id
				sessionName = vscode.debug.activeDebugSession.name;
				sessionType = vscode.debug.activeDebugSession.type;
			}
			executeCommand(message.toString(), client, sessionID, sessionName, sessionType);
		});
		ws.on('close', function () {
			//vscode.window.showWarningMessage('vscodeKeyboard: Client '+ client.name + ' disconnected in -> ' + ip.address() + ":" + port);
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

function executeCommand(message, client, currentSessionID, currentSessionName, currentSessionType) {
	let commandReturnEvent = "commandReturnEvent";
	let eventID;
	let vscodeCommand;
	let terminalCommand;
	let commandWithReturn;
	let terminalName;
	let startConnection;
	let clientDevice;


	if (isJSONValid(message)) {
		eventID = JSON.parse(message).eventID;
		vscodeCommand = JSON.parse(message).vscodeCommand;
		terminalCommand = JSON.parse(message).terminalCommand;
		commandWithReturn = JSON.parse(message).commandWithReturn;
		terminalName = JSON.parse(message).terminalName;
		clientDevice = JSON.parse(message).clientDevice;
		startConnection = JSON.parse(message).startConnection;
	}

	if (eventID === undefined) {
		eventID = "command_" + Math.random().toString(16).slice(2)
	}

	if (clientDevice != undefined && startConnection) {
		client.name = clientDevice
		//vscode.window.showInformationMessage('VscodeKeyboard: Client : '+ clientDevice + ' connected' );
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
		sendEventToAllClientsWs(event);
		return
	}

	if (commandWithReturn != undefined && commandWithReturn != null) {
		const commandObject = new Command("CommandWithReturn", commandWithReturn)

		cp.exec(commandWithReturn, (err, stdout, stderr) => {
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			event.message = stdout
			if (err) {
				console.log('error: ' + err);
				event.message = err
			}
			event.eventName = commandObject.name
			sendEventToAllClientsWs(event);

		});
		return
	}

	if (terminalCommand != undefined && terminalCommand != null) {
		vscodeKeyboardTerminal(terminalCommand, { terminalName: terminalName });
		const commandObject = new Command("TerminalCommand", terminalCommand, terminalCommand)
		event.eventName = commandObject.name
		event.message = commandObject.response
		sendEventToAllClientsWs(event);
		return
	}

	if (message.toString().includes("flutter")) {
		executeFlutterCommand(message.toString())
		const commandObject = new Command("FLutterCommand", message.toString(), message.toString())
		event.eventName = commandObject.name
		event.message = commandObject.response
		sendEventToAllClientsWs(event);
		return;
	}
	if (message.toString().includes("Debug")) {
		let commandObject = mapDebugCommands[message.toString()]
		event.eventName = commandObject.name
		event.message = commandObject.response
		vscode.commands.executeCommand('workbench.action.debug.' + mapDebugCommands[message.toString()].command);
		sendEventToAllClientsWs(event);
	}
}

let flutterTerminal;
let commandTerminal;
let lastTerminalName;

function executeFlutterCommand(command) {
	if (flutterTerminal == undefined) {
		flutterTerminal = vscode.window.createTerminal('VscodeKeyboard: Flutter Terminal');
	}
	vscode.window.showInformationMessage('VscodeKeyboard: Flutter Command ->  ' + command);
	flutterTerminal.sendText(`${command}`);
	flutterTerminal.show();
}

function vscodeKeyboardTerminal(command, { terminalName = "Command Terminal" }) {
	if (lastTerminalName != terminalName) {
		lastTerminalName = terminalName
		commandTerminal = vscode.window.createTerminal('VscodeKeyboard: ' + terminalName);
	}

	if (commandTerminal == undefined) {
		commandTerminal = vscode.window.createTerminal('VscodeKeyboard: ' + terminalName);
	}

	vscode.window.showInformationMessage('VscodeKeyboard: Command Terminal:  ' + command);
	commandTerminal.sendText(`${command}`);
	commandTerminal.show();
}

function deactivate() {
	if (wss != undefined) {
		wss.close()
	}
	vscode.window.showWarningMessage('vscodeKeyboard: Deactivated ');
}

module.exports = {
	activate,
	deactivate,
}

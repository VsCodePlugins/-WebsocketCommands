const vscode = require('vscode');

/**
 * @param {String} id
 * @param {number} unixTimestamp
* @param {vscode.DebugSession} debugSession



 */
class ModelSessionDebug {

    constructor(id, debugSession,) {

        this.id = id;
        this.debugSession = debugSession
        this.unixTimestamp =  Date.now();

    }

    /**
     * @returns {Map} 
     */
    getArgumentsMap() {
        const argsMap = new Map();
        argsMap.set('id', this.id);
        argsMap.set('unixTimestamp', this.unixTimestamp);
        argsMap.set('debugSession', this.debugSession);
        return argsMap;
    }

    toJsonString() {
        return JSON.stringify(this);
    }
}

module.exports = ModelSessionDebug; 
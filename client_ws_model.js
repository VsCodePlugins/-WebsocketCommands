const WebSocket = require('ws');

/**
 * @param {String} name
 * @param {String} id
 * @param {WebSocket} ws



 */
class ClientWs {

    constructor(id, name, ws) {

        this.name = name;
        this.id = id;
        this.ws = ws;
    }

    /**
     * @returns {Map} 
     */
    getArgumentsMap() {
        const argsMap = new Map();
        argsMap.set('name', this.name);
        argsMap.set('id', this.id);
        argsMap.set('ws', this.ws);
        return argsMap;
    }

    toJsonString() {
        return JSON.stringify(this);
    }
}

module.exports = ClientWs; 
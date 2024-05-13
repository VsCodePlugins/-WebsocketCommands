			/**
	 * @param {String} sessionID
	 * @param {String} sessionType
	 * @param {String} sessionName
	 * @param {String} sessionUnixTimestamp
	 * @param {String} eventID
	 * @param {String} eventType
	 * @param {String} eventName
	 * @param {String} message
	 * @param {number} unixTimestamp
	 */
class Event {

	constructor({sessionID=null ,sessionType=null,sessionName=null, sessionUnixTimestamp=null, eventID=null, eventType=null , eventName=null, message=null, eventUnixTimestamp=null}) {


	  this.sessionID = sessionID ;
	  this.sessionType = sessionType;
	  this.sessionName =sessionName; 
	  this.sessionUnixTimestamp =sessionUnixTimestamp;
	  this.eventID = eventID;
	  this.eventType = eventType;
	  this.eventName = eventName;
	  this.message = message;
	  this.eventUnixTimestamp = Date.now()
	}
  
	/**
	 * @returns {Map} 
	 */
	getArgumentsMap() {
	  const argsMap = new Map();
	  argsMap.set('sessionID', this.sessionID);
	  argsMap.set('sessionType', this.sessionType);
	  argsMap.set('sessionName', this.sessionName);
	  argsMap.set('sessionUnixTimestamp', this.sessionUnixTimestamp)
	  argsMap.set('eventID', this.eventID);
	  argsMap.set('eventType', this.eventType);
	  argsMap.set('eventName', this.eventName);
	  argsMap.set('message', this.message);
	  argsMap.set('unixTimestamp', this.eventUnixTimestamp)
	  return argsMap;
	}
  
	toJsonString() {
	  return JSON.stringify(this);
	}
  }

  module.exports = Event; 
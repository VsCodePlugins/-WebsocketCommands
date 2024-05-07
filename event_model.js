			/**
	 * @param {String} sessionID
	 * @param {String} sessionType
	 * @param {String} sessionName
	 * @param {String} eventID
	 * @param {String} eventType
	 
	 * @param {String} eventName
	 * @param {String} message
	 */
class Event {

	constructor({sessionID=null ,sessionType=null,sessionName=null, eventID=null, eventType=null , eventName=null, message=null}) {


	  this.sessionID = sessionID ;
	  this.sessionType = sessionType;
	  this.sessionName =sessionName; 
	  this.eventID = eventID;
	  this.eventType = eventType;
	  this.eventName = eventName;
	  this.message = message;
	}
  
	/**
	 * @returns {Map} 
	 */
	getArgumentsMap() {
	  const argsMap = new Map();
	  argsMap.set('sessionID', this.sessionID);
	  argsMap.set('sessionType', this.sessionType);
	  argsMap.set('sessionName', this.sessionName);
	  argsMap.set('eventID', this.eventID);
	  argsMap.set('eventType', this.eventType);
	  argsMap.set('eventName', this.eventName);
	  argsMap.set('message', this.message);
	  return argsMap;
	}
  
	toJsonString() {
	  return JSON.stringify(this);
	}
  }

  module.exports = Event; 
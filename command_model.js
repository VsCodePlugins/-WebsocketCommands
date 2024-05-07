			/**
	 * @param {String} name
     * @param {String} command
     * @param {String?} response



	 */
            class Command {

                constructor(name,command,response=null ) {
            
                  this.name = name ;
                  this.command = command;
                  this.response =response; 
                }
              
                /**
                 * @returns {Map} 
                 */
                getArgumentsMap() {
                  const argsMap = new Map();
                  argsMap.set('name', this.name);
                  argsMap.set('command', this.command);
                  argsMap.set('response', this.response);
                  return argsMap;
                }
              
                toJsonString() {
                  return JSON.stringify(this);
                }
              }
            
              module.exports = Command; 
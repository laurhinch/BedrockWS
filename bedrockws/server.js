import WebSocket from '../node_modules/ws/index.js';
import uuid, { NIL } from '../node_modules/uuid/dist/index.js';
import { get } from 'http';

class Server {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.commandQueue = [];
        this.commandResponses = {};
        this.awaitingCommands = {};
        this.startWSServer();
    }

    //returns a new uuid
    newUUID() {
        return uuid.v4();
    }

    //starts the websocket server
    startWSServer() {
        console.log(`Type /connect ${this.host}:${this.port}`);
        this._server = new WebSocket.Server({ port: this.port, host: this.host });
    }

    //runs the server
    async run() {
        //on websocket connection
        this._server.on('connection', socket => {
            //run the on connect callback
            this.connectCallback(socket);
            //on receiving an incoming packet
            socket.on('message', packet => {
                let packetData = JSON.parse(packet);
                //return packet to on event callback function
                if(packetData.header.messagePurpose === 'event') {
                    this.eventCallback(packetData);
                }
                //if this packet is a commandResponse
                if (packetData.header.messagePurpose === 'commandResponse') {
                    //if command is awaited, add it to the commandResponses
                    this.commandResponses[packetData.header.requestId] = packetData;
                    //console.log(JSON.stringify(this.commandResponses));
                    //console.log(this.commandResponses[packetData.header.requestId]);
                    Object.keys(this.commandResponses).forEach(element => {
                        console.log("\tResponse: " + JSON.stringify(element));
                    });
                }
                //send commands from the command queue
                this.sendCommandsFromQueue(socket);
            });
        });
    }

    sendCommandsFromQueue(socket) {
        //send new commands from the commandQueue (limit is 100 max)
        let c = Math.min(100 - Object.keys(this.awaitingCommands).length, this.commandQueue.length);
        for (let i = 0; i < c; i++) {
            //send the first command in commandQueue then shift it to awaitingCommands
            let command = this.commandQueue.shift();
            socket.send(JSON.stringify(command));
            this.awaitingCommands[command.header.requestId] = command;
        }
    }

    //sets the callback for onconnect
    onConnect(callback) {
        this.connectCallback = callback;
    }

    //sets the callback for onevent
    onEvent(callback) {
        this.eventCallback = callback;
    }

    //generates a commandRequest json
    commandRequestJson(cmd, uuid) {
        const data = {
            "header": {
                "version": 1,
                "requestId": uuid,
                "messagePurpose": "commandRequest",
                "messageType": "commandRequest"
            },
            "body": {
                "version": 1,
                "commandLine": cmd,
                "origin": {
                    "type": "player"
                }
            }
        }
        return data;
    }

    //returns the commandResponse packet for the given requestId
    getCommandResponse(cmdRequestId) {
        return new Promise(resolve => {
            Object.keys(this.commandResponses).forEach(element => {
                if(element.header.requestId === cmdRequestId) {
                    let result = element;
                    delete this.awaitingCommands[cmdRequestId];
                    delete this.commandResponses[cmdRequestId];
                    resolve(result);
                }
            });
        });
    }

    //adds the command to the command queue and returns commandResponse when command response is received
    async executeCommand(command) {
        //generate commandRequest
        let commandUUID = this.newUUID();
        //add commandRequest to command send queue
        this.commandQueue.push(this.commandRequestJson(command, commandUUID));
        //return commandResponse packet for sent commandRequest
        this.getCommandResponse(commandUUID).then(result => {
            return result;
        });
    }
}

export { Server as default };
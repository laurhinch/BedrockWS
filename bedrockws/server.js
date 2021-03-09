import WebSocket from '../node_modules/ws/index.js';
import uuid from '../node_modules/uuid/dist/index.js';

class Server {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.commandQueue = [];
        this.awaitingCommands = {};
        this.waitingResponses = {};
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
    run() {
        //on websocket connection
        this._server.on('connection', socket => {
            //run the on connect callback
            this.connectCallback(socket);
            //on receiving an incoming packet
            socket.on('message', packet => {
                let packetData = JSON.parse(packet);
                //if this packet is a commandResponse
                if (packetData.header.messagePurpose === 'commandResponse') {
                    //add it to the waitingResponses
                    if(this.waitingResponses[packetData.header.requestId]) {
                        //basically calling resolve(packetData)
                        this.waitingResponses[packetData.header.requestId][0](packetData);
                    }
                }
                //return packet to on event callback function
                if(packetData.header.messagePurpose === 'event') {
                    this.eventCallback(packetData);
                }
                //send commands from the command queue
                this.sendCommandsFromQueue(socket);
            });
        });
    }

    async sendCommandsFromQueue(socket) {
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

    async getPosition(target) {
        let result = await this.executeCommand(`querytarget ${target}`);
        return JSON.parse(result.body.details)[0].position;
    }

    async getRotation(target) {
        let result = await this.executeCommand(`querytarget ${target}`);
        return JSON.parse(result.body.details)[0].yRot;
    }

    async executeCommand(command){
        let commandId = this.newUUID();
        let commandData = this.commandRequestJson(command, commandId);
        this.commandQueue.push(commandData);
        return new Promise((resolve, reject) => {
            this.waitingResponses[commandId] = [resolve, reject];
        });
    }
}

export { Server as default };
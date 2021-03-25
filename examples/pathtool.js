const WebSocket = require('ws');
const uuid = require('uuid');
const fs = require('fs');

class Server {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.commandQueue = [];
        this.awaitingCommands = {};
        this.waitingResponses = {};
    }

    //returns a new uuid
    newUUID() {
        return uuid.v4();
    }

    //closes all sockets
    disconnectAll() {
        this._server.clients.forEach((socket) => {
            //attempt to perform a soft close on this socket
            socket.close();
            process.nextTick(() => {
                //perform hard close if socket hangs
                if ([socket.OPEN, socket.CLOSING].includes(socket.readyState)) {
                    socket.terminate();
                }
            });
        });
    }

    //starts the websocket server
    start() {
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
                    if (this.waitingResponses[packetData.header.requestId]) {
                        //basically calling resolve(packetData)
                        this.waitingResponses[packetData.header.requestId][0](packetData);
                    }
                }
                //return packet to on event callback function
                if (packetData.header.messagePurpose === 'event') {
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

    async getLocalPlayerName() {
        let result = await this.executeCommand('getlocalplayername');
        return result.body.localplayername;
    }

    async getPosition(target) {
        let result = await this.executeCommand(`querytarget ${target}`);
        return JSON.parse(result.body.details)[0].position;
    }

    async getRotation(target) {
        let result = await this.executeCommand(`querytarget ${target}`);
        return JSON.parse(result.body.details)[0].yRot;
    }

    async executeCommand(command) {
        let commandId = this.newUUID();
        let commandData = this.commandRequestJson(command, commandId);
        this.commandQueue.push(commandData);
        return new Promise((resolve, reject) => {
            this.waitingResponses[commandId] = [resolve, reject];
        });
    }
}

//start a new websocket server on localhost:3000
const wss = new Server('localhost', 3000);

wss.start();

//on connection
wss.onConnect(socket => {
    console.log("Player connected.");
    //subscribe to PlayerMessage event (TODO: automate subscriptions)
    socket.send(JSON.stringify({
        "header": {
          "version": 1,
          "requestId": wss.newUUID(),
          "messageType": "commandRequest",
          "messagePurpose": "subscribe"
        },
        "body": {
          "eventName": "PlayerMessage"
        },
    }));
});

let pathsFile = 'PATH_TO_PATHS_FOLDER/paths';
let pathNumber = 1;
let segmentNumber = 1;
let pointIndex = 0;
let lastPoint;

function calc3dLine(x1, y1, z1, x2, y2, z2) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let dz = z2 - z1;
    let d = Math.sqrt(Math.pow(x2 - x1,2) + Math.pow(y2 - y1,2) + Math.pow(z2 - z1,2));
    let pointList = [];
    if(d <= 1) {
        pointList.push({x1, y1, z1});
    } else {
        for(var dPoint = 0; dPoint <= d-0.7; dPoint += 1) {
            x1 += dx / d;
            y1 += dy / d;
            z1 += dz / d;
            pointList.push({x1, y1, z1});
        }
    }
    return pointList;
}

//appends a command string to index corresponding file
function appendToFiles(point, index) {
    let commandStr = `execute @r[x=${Math.trunc(point.x1)},y=${Math.trunc(point.y1)},z=${Math.trunc(point.z1)},r=24] ${point.x1.toFixed(6)} ${point.y1.toFixed(6)} ${point.z1.toFixed(6)} particle vaeron:arena_path_point ~ ~ ~`;
    fs.appendFile(pathsFile + `/${pathNumber}/s${segmentNumber}/i${index}.mcfunction`, commandStr + "\n", error => {});
    console.log(commandStr);
}

//on event
wss.onEvent(async event => {
    if(event.body.properties.Message === '!addpoint') {
        let pos = await wss.getPosition(event.body.properties.Sender);
        let x1 = Math.floor(pos.x) + 0.5;
        let y1 = Math.floor(pos.y) - 0.6;
        let z1 = Math.floor(pos.z) + 0.5;
        let pointPath = [];
        if(lastPoint != undefined) {
            let x2 = Math.floor(lastPoint.x) + 0.5;
            let y2 = (Math.floor(lastPoint.y) - 0.6);
            let z2 = Math.floor(lastPoint.z) + 0.5;
            lastPoint = pos;
            pointPath = calc3dLine(x2, y2, z2, x1, y1, z1);
        }
        lastPoint = pos;
        console.log(pointPath);
        pointPath.forEach(point => {
            appendToFiles(point, pointIndex);
            pointIndex = pointIndex >= 19 ? 0 : pointIndex + 1;
        });
    }
    let match = event.body.properties.Message.match(/^!segment (\d+)/i);
    if(match) {
        segmentNumber = +match[1];
        //make segment directory
        fs.mkdir(pathsFile + `/${pathNumber}/s${segmentNumber}`, error => {});
        //add command for running segment root to the path root function
        let segmentRootCmd = `execute @r[scores={VA2_arenaProg=${segmentNumber-1}..${segmentNumber}}] ~ ~ ~ function vaeron/monster_trucks/arena/paths/${pathNumber}/s${segmentNumber}/root`;
        fs.appendFile(pathsFile + `/${pathNumber}/root.mcfunction`, segmentRootCmd + "\n", error => {});
        //add all index functions to the segment root function
        for(let i = 0; i <= 19; i++) {
            let indexRootCmd = `execute @e[tag=tick_clock,scores={VA2_pathPoint=${i}}] ~ ~ ~ function vaeron/monster_trucks/arena/paths/${pathNumber}/s${segmentNumber}/i${i}`;
            fs.appendFile(pathsFile + `/${pathNumber}/s${segmentNumber}/root.mcfunction`, indexRootCmd + "\n", error => {});
        }
        console.log("Segment is now:" + segmentNumber);
    }
    match = event.body.properties.Message.match(/^!path (\d+)/i);
    if(match) {
        pathNumber = +match[1];
        //make path directory
        fs.mkdir(pathsFile + `/${pathNumber}`, error => {});
        //make segment directory for current segment
        fs.mkdir(pathsFile + `/${pathNumber}/s${segmentNumber}`, error => {});
        console.log("Path is now:" + pathNumber);
    }
    
});

//run server
wss.run();
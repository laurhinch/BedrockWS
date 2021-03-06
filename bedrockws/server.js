import WebSocket from '../node_modules/ws/index.js';
import uuid from '../node_modules/uuid/dist/index.js';

class Server {
    constructor(host, port) {
        this.host = host;
        this.port = port;
        this.sentPackets = [];
        this.waitingPackets = [];
        this.receivedPackets = [];
        this.startWSServer();
    }

    //returns a new uuid
    newUUID() {
        return uuid.v4();
    }

    //starts the websocket server
    startWSServer() {
        console.log(`Type /connect ${this.host}:${this.port}`);
        this._server = new WebSocket.Server({port: this.port, host: this.host});
    }

    //runs the server
    run() {
        //on websocket connection
        this._server.on('connection', socket => {
            //run the on connect callback
            this.connectCallback(socket);

            //on receiving an incoming packet
            socket.on('message', packet => {
                //parse the packet and return it to on event callback function
                let packetData = JSON.parse(packet);
                this.eventCallback(packetData);
            });
        });
    }

    //sets the callback for onconnect
    onConnect(callback) {
        this.connectCallback = callback;
    }

    //sets the callback for onevent
    onEvent(callback) {
        this.eventCallback = callback;
    }
}

export {Server as default};
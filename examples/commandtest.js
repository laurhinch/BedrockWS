import Server from "../bedrockws/server.js";

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

//on event
wss.onEvent(async event => {
    if(event.body.properties.Message === '!') {
        let pos = await wss.getPosition(event.body.properties.Sender);
        console.log(pos);
    }
    if(event.body.properties.Message === '.') {
        let name = await wss.getLocalPlayerName();
        console.log(name);
    }
    if(event.body.properties.Message === '?') {
        let rot = await wss.getRotation(event.body.properties.Sender);
        console.log(rot);
    }
});

//run server
wss.run();
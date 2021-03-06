import Server from "../bedrockws/server.js";

//start a new websocket server on localhost:3000
const wss = new Server('localhost', 3000);

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
wss.onEvent(event => {
    /*
    if(event.body.eventName === 'PlayerMessage') {
        console.log("got message \"" + event.body.properties.Message + "\"");
        wss.executeCommand(`querytarget laurhinch`).then(response => {
            console.log(response);
        });
    }
    */
    if(event.body.properties.Message === '!') {
        wss.executeCommand(`say .`).then(response => {
            console.log(response);
        });
    }
});

//run server
wss.run();
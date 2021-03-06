# BedrockWS #
### A JavaScript Websocket API for Minecraft Bedrock Edition ###
BedrockWS is a very simple API for Minecraft Bedrock websocket connections. The complexity of the API may increase in the future.

Currently the API is limited and does not yet contain JSON definitions for all packet types.

## Examples ##
Websocket server examples can be found in the `examples` folder. Outdated examples are located in the `examples_old` folder and may be broken or incomplete.

### basicconect.js ###
This code can be found in `examples/basicconnect.js`. It runs a basic websocket server that can be connected to with `/connect localhost:3000`.

```javascript
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
wss.onEvent(packet => {
    console.log(packet);
});

//run server
wss.run();
```

## Dependencies ##
BedrockWS requires uuid and ws.

```
npm install uuid
npm install ws
```
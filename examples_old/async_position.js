//create websocket server on port 3000
console.log('To connect type /connect localhost:3000');
const wss = new WebSocket.Server({port: 3000, host: 'localhost'});

//on websocket connection
wss.on('connection', socket => {
  console.log('Connected');

  //subscribe to all chat messages
  socket.send(JSON.stringify({
    "header": {
      "version": 1,
      "requestId": uuid.v4(),
      "messageType": "commandRequest",
      "messagePurpose": "subscribe"
    },
    "body": {
      "eventName": "PlayerMessage"
    },
  }));

  //on receiving a message packet
  socket.on('message', packet => {
    const msg = JSON.parse(packet);

    //if this packet is a chat message
    if (msg.body.eventName === 'PlayerMessage') {
      //check for chat that follows pattern !pyramid {size} {block}
      const match = msg.body.properties.Message.match(/^!pos/i);
      console.log(match);
      if (match) {
        position = await getPos('laurhinch');
        console.log();
      }
    }

    //if this packet is a commandResponse
    if (msg.header.messagePurpose == 'commandResponse') {
      //if command is awaited, handle it
      if (msg.header.requestId in awaitedQueue) {
        if (msg.body.statusCode < 0) {
          console.log(awaitedQueue[msg.header.requestId].body.commandLine, msg.body.statusMessage);
        }
        delete awaitedQueue[msg.header.requestId];
      }
    }

    //send new commands from the commandQueue (limit is 100 max)
    let c = Math.min(100 - Object.keys(awaitedQueue).length, sendQueue.length);
    for (let i = 0; i < c; i++) {
      //send the first command in sendQueue then add it to awaitedQueue
      let command = sendQueue.shift();
      socket.send(JSON.stringify(command));
      awaitedQueue[command.header.requestId] = command;
    }
  });

  //sends a commandRequest packet to bedrock
  function commandRequest(cmd, uuid) {
    const msg = {
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
    return msg;
  }

  //returns the position of the target
  async function getPos(target) {
    let commandResponse = await JSON.parse(executeCommand(`querytarget ${target}`));
    if(commandResponse['statusCode'] === 0) {
      let details = commandResponse['details'];
      let posData = details[0]['position'];
      return {x: posData['x'], y: posData['y'], z: posData['z']};
    }
  }

  //executes the command and returns the commandResponse packet
  async function executeCommand(command) {
    let cmd_uuid = uuid.v4()
    let commandRequestPacket = commandRequest(command, cmd_uuid);
    socket.send(commandRequestPacket);
    result = socket.on('message', packet => {
      if(packet. )
    });
    return result;
  }

  //returns the packet received with this uuid
  async function receiveData(packet_uuid) {
    while(true) {
      
    }
  }
});
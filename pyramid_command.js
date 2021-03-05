const WebSocket = require('ws');
const uuid = require('uuid');

//start websocket server
console.log('To connect type /connect localhost:3000');
const wss = new WebSocket.Server({port: 3000});

//on socket connection
wss.on('connection', socket => {
  console.log('Connected');
  const sendQueue = []; //commands to send
  const awaitedQueue = {}; //awaited responses from minecraft

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
      const match = msg.body.properties.Message.match(/^!pyramid (\d+) (\w+)/i);
      console.log(match);
      if (match) {
        pyramid(+match[1],match[2]);
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
  function send(cmd) {
    const msg = {
      "header": {
        "version": 1,
        "requestId": uuid.v4(),
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
    sendQueue.push(msg);
  }

  //creates a pyramid of {size} around player made of {block}
  function pyramid(size, block) {
    for (let y = 0; y < size + 1; y++) {
      let side = size - y;
      for (let x = -side; x < side + 1; x++) {
        send(`setblock ~${x} ~${y} ~${-side} ${block}`);
        send(`setblock ~${x} ~${y} ~${+side} ${block}`);
        send(`setblock ~${-side} ~${y} ~${x} ${block}`);
        send(`setblock ~${+side} ~${y} ~${x} ${block}`);
      }
    }
  }
});
const express = require("express");
const app = express();
const cors = require("cors");
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origins: ["*"],
    handlePreflightRequest: (req, rest) => {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": true,
      });
      res.end();
    },
  },
});

let noOfPlayers = 2;
let gameStarted = false;
let players = [];
let currentRound = 1;
let noOfResponses = 0;
let responses = {
  2: [],
  1: [],
};
let amountGiven = {
  2: 0,
  1: 0,
};
let map = new Map();

app.use(cors());

function updateScores() {
  if (responses[2].length === 2 && responses[1].length === 0) {
    amountGiven[2] = -25;
  } else if (responses[2].length === 1 && responses[1].length === 1) {
    amountGiven[2] = 25;
  } else {
    amountGiven[1] = 25;
  }
  players = players.map(player => {
    if (responses[2].includes(player.id)) {
      player.score += amountGiven[2];
    } else {
      player.score += amountGiven[1];
    }
    return player;
  });
  responses[2] = [];
  responses[1] = [];
}

io.on("connection", socket => {
  if (!gameStarted) {
    noOfPlayers--;
    socket.on("player-details", playerData => {
      let player = {
        playerData,
        score: 0,
        id: socket.id,
      };
      players.push(player);
      io.emit("update-scores", players);
    });

    if (noOfPlayers > 0) {
      io.emit("waiting", "Waiting for players");
    } else if (noOfPlayers === 0) {
      io.emit("start", "Starting Game");
      io.emit("next-round", currentRound);
      gameStarted = true;
    }
  }
  socket.on("play-round", resp => {
    responses[resp].push(socket.id);
    noOfResponses++;
    if (noOfResponses === 2) {
      updateScores();
      noOfResponses = 0;
      io.emit("update-scores", players);
      io.emit("next-round", ++currentRound);
    }
  });
});

server.listen(5000, () => {
  console.log(`Server started at port 5000`);
});

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

let noOfPlayers = 4;
let gameStarted = false;
let players = [];
let currentRound = 0;
let noOfResponses = 0;
let responses = {
  2: [],
  1: [],
};
let amountGiven = {
  2: 0,
  1: 0,
};

app.use(cors());

function updateScores() {
  if (responses[2].length === 4 && responses[1].length === 0) {
    amountGiven[2] = -25;
    amountGiven[1] = 0;
  } else if (responses[2].length === 3 && responses[1].length === 1) {
    amountGiven[2] = 25;
    amountGiven[1] = -25;
  } else if (responses[2].length === 2 && responses[1].length === 2) {
    amountGiven[2] = 50;
    amountGiven[1] = -12.5;
  } else if (responses[2].length === 1 && responses[1].length === 3) {
    amountGiven[2] = 75;
    amountGiven[1] = 0;
  } else {
    amountGiven[2] = 0;
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

function findWinner() {
  let maxScore = 0;
  const winner = players.reduce((acc, player) => {
    if (player.score > maxScore) {
      maxScore = player.score;
      acc = player.playerData;
    }
    return acc;
  }, "");
  return winner;
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
      io.emit("next-round", currentRound + 1);
      gameStarted = true;
    }
  }
  socket.on("play-round", resp => {
    responses[resp].push(socket.id);
    noOfResponses++;
    if (noOfResponses === 8) {
      updateScores();
      noOfResponses = 0;
      currentRound++;

      if (currentRound === 3) {
        io.emit("update-scores", players);
        const winner = findWinner();
        io.emit("end-game", `${winner} is the winner !!`);
        gameStarted = false;
        players = [];
        currentRound = 0;
      } else {
        io.emit("update-scores", players);
        io.emit("next-round", currentRound + 1);
      }
    }
  });
});

server.listen(5000, () => {
  console.log(`Server started at port 5000`);
});

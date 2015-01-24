var _ = require('lodash');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var Game = require('./game');
var gj_CONSTANTS = require('./public/shared/gj_constants.js');
var gj_JSON = require('./public/shared/gj_json.js');

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

http.listen(port, function() {
    console.log('listening on ' + port);
});

// Setup socket.io to manage connections with clients ########################

var game = new Game();
var clients = [];

function Client(socket) {
    this.socket = socket;
    game.addPlayer(this.socket.id);

    socket.on('msg input', this.receiveInput.bind(this));
    socket.emit('msg state', game.state.getState());

    console.log('Client connected with ID: ' + this.socket.id);
}

Client.prototype.receiveInput = function(msgInput) {
    console.log('Received input "' + msgInput + '" from client ' + this.socket.id);
    game.handleInput(this.socket.id, msgInput);
};

Client.prototype.dispose = function() {
    console.log('Client disconnected with ID: ' + this.socket.id);
    game.removePlayer(this.socket.id);
};

io.on('connection', function(socket) {
    var client = new Client(socket);
    clients.push(client);
    socket.on('disconnect', function() {
        clients.splice(clients.indexOf(client), 1);
        client.dispose();
    });
});

// Update loop ###############################################################

setInterval(function() {
        var oldState = _.cloneDeep(game.state.getState());
        game.step();
        var newState = game.state.getState();

        var diff = gj_JSON.diff(oldState, newState);

        var state = 'Some game state ' + Math.random().toString().substr(2);
        _.each(clients, function(client) {
            client.socket.emit('msg diff', diff);
        });
    },
    gj_CONSTANTS.deltaTime
);

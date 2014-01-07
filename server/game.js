(function() {
    require('./optimized_board');
    var uuid = require('node-uuid');
    Game = function(name) {
        var MAX_PLAYERS = 2;

        var _id = uuid.v1(),
            _name,
            _players = [],
            _board = new Board(),
            _ready,
            _started;

        _name = name || "";

        var _isOnTheGame = function (player) {
            for (var i = 0; i < _players.length; i++) {
                var pInGame = _players[i];
                if (player.getId() === pInGame.getId()) {
                    return true;
                }
            }
            return false;
        };

        return {
            getId: function() {
                return _id;
            },
            getName: function () {
                return _name;
            },
            getPlayers: function() {
                return _players;
            },

            maxPlayers: MAX_PLAYERS,

            setName: function(name) {
                _name = name;
            },

            hasStarted: function() {
                return _started;
            },

            join: function(player) {
                if (!this.isReady()) {
                    if (player) {
                        if (_players.length < MAX_PLAYERS) {
                            if (!_isOnTheGame(player)) {
                                _players.push(player);
                                if (_players.length == MAX_PLAYERS) {
                                    _ready = true;
                                    // set player's opponent
                                    // TODO: find a way not to hardcode this!!
                                    _players[0].setOpponent(_players[1]);
                                    _players[1].setOpponent(_players[0]);
                                }
                                LOGGER.info("app.game: Player has joined");
                            } else {
                                player.notify("system", {type: 'status', message: 'player already in the game'});
                            }
                        }

                        if (this.isReady()) {
                            // notify players
                            var SIDES = ["white", "black"];
                            for (var i = 0; i < _players.length; i++) {
                                var index = Math.floor((Math.random()*SIDES.length));
                                var side = SIDES.splice(index, 1);
                                _players[i].setSide(side);
                                _players[i].notify("game.ready", {side: side});
                            }
                        }
                    }
                } else {
                    player.notify("system", {type: 'status', message: 'game is full'});
                }
            },

            isReady: function () {
                return _ready;
            },

            playerPlace: function(player, pieces) {
                var valid = _board.place(player.getSide(), pieces);
                if (valid) {
                    player.ready();
                    player.getOpponent().notify("client.ready", {pieces: pieces, color: player.getSide()});
                    if (player.getOpponent().isReady()) {
                        _started = true;
                        player.notify("game.start", {started: _started, turn: player.turn()});
                        player.getOpponent().notify("game.start", {started: _started, turn: player.getOpponent().turn()});
                    }
                } else {
                    player.notify("system", {type: "alert", message: "You have placed on an invalid board location"});
                }
            },

            playerMoved: function(player, moveId, from, to) {
                var o = this;
                _board.move(from, to, function(err, actions, end) {
                    if (err) {
                        player.notify("client.move", {success: false, desc: "invalid move",
                            moveId: moveId, turn: player.turn()});
                    } else {
                        for (var i = 0; i < _players.length; i++) {
                            _players[i].toggleTurn();
                            _players[i].notify("client.move", {success: true,
                                actions: actions, moveId: moveId, turn: _players[i].turn()});
                        }
                    }
                    if (end) {
                        GameManager.removeGame(o.getId());
                    }
                });
            },

            playerDisconnected: function(player) {
                if (player && player.getOpponent()) {
                    player.getOpponent().notify('system', {type: "alert", message: "Opponent has been disconnected"})
                    for (var i = 0; i < _players.length; i++) {
                        if (_players[i].getId() == player.getId()) {
                            _players.splice(i, 1);
                            break;
                        }
                    }
                    _ready = false;
                    _started = false;
                }
            },

            destroy: function() {
                for (var i = 0; i <  _players.length; i++) {
                    _players[i].destroy();
                }
                _players = null;
                _board = null;
            }
        }
    };
})();
(function() {
    require('./board');
    Game = function(name) {
        var MAX_PLAYERS = 2;

        var _id = Game.__id++,
            _name,
            _players = [],
            _board = new Board(),
            _ready;

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
            setName: function(name) {
                _name = name;
            },

            join: function(player) {
                if (!this.isReady()) {
                    if (player) {
                        if (_players.length < MAX_PLAYERS) {
                            if (!_isOnTheGame(player)) {
                                _players.push(player);
                                console.log("app.game: Player has joined");
                            } else {
                                player.notify("system", {type: 'status', message: 'player already in the game'});
                            }
                        }

                        if (_players.length == MAX_PLAYERS) {
                            _ready = true;
                        }

                        if (this.isReady()) {
                            // notify players
                            var SIDES = ["white", "black"];
                            for (var i = 0; i < _players.length; i++) {
                                var index = Math.floor((Math.random()*SIDES.length));
                                var side = SIDES.splice(index, 1);
                                _players[i].setSide(side);
                                _players[i].notify("gameReady", {side: side});
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

            playerMoved: function(from, to) {
                _board.move(from, to);
            }
        }
    };

    Game.__id = 0;
})();
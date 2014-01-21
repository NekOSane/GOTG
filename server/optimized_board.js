(function() {
    Board = function() {
        var X_AXIS_SIZE = 9,
            Y_AXIS_SIZE = 8;

        var VALID_PLACINGS = {
            white: {from: {x:0,y:0}, to: {x:X_AXIS_SIZE-1, y:2}},
            black: {from: {x:0,y:5}, to: {x:X_AXIS_SIZE-1, y:Y_AXIS_SIZE-1}}
        };

        var _board = {
            white: {
                pieces: [],
                dead: []
            },
            black: {
                pieces: [],
                dead: []
            }
        };

        var _validateMove = function(from, to) {
            if (to.x < 0 && to.x >= X_AXIS_SIZE && to.y < 0 && to.y >= Y_AXIS_SIZE) {
                // outside boundary
                return false;
            }
            if ( (to.x - from.x === -1 || to.x - from.x === 1) && from.y === to.y) {
                return true;
            } else if ((to.y - from.y === -1 || to.y - from.y === 1) && from.x === to.x) {
                return true;
            }
            return false;
        };

        var validatePiecesCount = function(piece, counter) {
            var rank = piece.rank;
            if (!counter[rank]) {
                counter[rank] = 1;
            } else {
                counter[rank]++;
            }
            LOGGER.debug('now validating ' + rank);
            if (!Board.PIECES[rank]) {
                return false;
            }
            return !(counter[rank] > Board.PIECES[rank].count);
        };

        var _validatePlacing = function(x, y, color) {
            var validPlacing = VALID_PLACINGS[color];
            return x >= validPlacing.from.x && x <= validPlacing.to.x &&
                y >= validPlacing.from.y && y <= validPlacing.to.y;
        };

        var getPieceAt = function(x, y, side) {
            if (side) {
                var pieces = _board[side].pieces;
                for (var i = 0; i < pieces.length; i++) {
                    var piece = pieces[i];
                    if (piece.x == x && piece.y == y) {
                        return {pos: i, piece: piece};
                    }
                }
                return {pos: -1, piece: null};
            } else {
                var bPieces = _board.black.pieces;
                var wPieces = _board.white.pieces;
                var b = 0;
                var w = 0;

                var piece;
                while(b < bPieces.length || w < wPieces.length) {
                    if (b < bPieces.length) {
                        piece = bPieces[b];
                        if (piece.x == x && piece.y == y) {
                            return {pos: b, piece: piece};
                        }
                        b++
                    }
                    if (w < wPieces.length) {
                        piece = wPieces[w];
                        if (piece.x == x && piece.y == y) {
                            return {pos: w, piece: piece};
                        }
                        w++;
                    }
                }
                return {pos: -1, piece: null};
            }
        };

        var updatePiecePositionByIndex = function(side, index, newX, newY) {
            var piece = _board[side].pieces[index];
            if (piece) {
                piece.x = newX;
                piece.y = newY;
            }
            return piece;
        };

        var removePieceByIndex = function(side, index) {
            var piece = _board[side].pieces.splice(index, 1);
            _board[side].dead.push(piece);
            return piece;
        };

        return {
            maxX: X_AXIS_SIZE,
            maxY: Y_AXIS_SIZE,
            place: function(side, pieces) {
                var counter = {};
                for (var i = 0; i < pieces.length; i++) {
                    var p = pieces[i];
                    if (!validatePiecesCount(p, counter)) {
                        return false;
                    }
                    if (!_validatePlacing(p.pos.x, p.pos.y, side)) {
                        return false;
                    }
                    //_board[p.pos.x][p.pos.y] = {rank: p.rank, color: side};
                    _board[side].pieces.push({rank: p.rank, x: p.pos.x, y: p.pos.y, color: side});
                    LOGGER.debug("Board.place: " + Util.inspect(p, false, null));
                    // TODO: should this be here???
                    p.rank = null;
                }
                LOGGER.debug("Board.place: board array has " + Util.inspect(_board, false, null));
                return true;
            },

            move: function(from, to, cb, side) {
                var end = false;
                var toMove = getPieceAt(from.x, from.y, side);
                var pieceToMove = toMove.piece;
                if (pieceToMove) {
                    if (_validateMove(from, to)) {
                        var actions;
                        var obstructed = getPieceAt(to.x, to.y, side);
                        var piece = obstructed.piece;
                        if (!piece) {
                            var moved = updatePiecePositionByIndex(pieceToMove.color, toMove.pos, to.x, to.y);
                            actions = [{action : "place", from : from, to: to}];

                            if (moved.rank == 15) {
                                // it's the flag
                                if (moved.y == 0 && moved.color == 'black') {
                                    // black won
                                    actions.push({action: 'finished', winner: 'black'});
                                    end = true;
                                } else if (moved.y == Y_AXIS_SIZE-1 && moved.color == 'white') {
                                    // white won
                                    actions.push({action: 'finished', winner: 'white'});
                                    end = true;
                                }
                            }
                            // notify game
                            cb(null, actions, end);
                        } else {
                            // either same side's piece or opponent piece
                            if (piece.color != pieceToMove.color) {
                                // we have a clash here!!
                                if (piece.rank === pieceToMove.rank) {
                                    actions = [
                                        {action: 'remove', position: from},
                                        {action: 'remove', position: to}
                                    ];
                                    if (piece.rank == 15) {
                                        // both are flag, we had a draw
                                        actions.push({action: 'finished', winner: ''});
                                        end = true;
                                    }
                                    // both dead, remove them both
                                    removePieceByIndex(pieceToMove.color, toMove.pos);
                                    removePieceByIndex(piece.color, obstructed.pos);
                                    // notify game
                                    cb(null, actions, end);

                                } else if (Board.PIECES[pieceToMove.rank].canKill.indexOf(parseInt(piece.rank)) > -1) {
                                    // player who moved won!
                                    actions = [
                                        {action: 'remove', position: to},
                                        {action: 'place', from: from, to: to}
                                    ];
                                    if (piece.rank == 15) {
                                        actions.push({action: 'finished', winner: pieceToMove.color});
                                        end = true;
                                    }
                                    removePieceByIndex(piece.color, obstructed.pos);
                                    updatePiecePositionByIndex(pieceToMove.color, toMove.pos, to.x, to.y);
                                    cb(null, actions, end);
                                } else {
                                    // player who moved lost!
                                    actions = [
                                        {action: "remove", position: from}
                                    ];
                                    if (pieceToMove.rank == 15) {
                                        actions.push({action: 'finished', winner: piece.color});
                                        end = true;
                                    }
                                    removePieceByIndex(pieceToMove.color, toMove.pos);
                                    // notify game
                                    cb(null, actions, end);
                                }
                            } else {
                                // invalid move!
                                LOGGER.info('Board.move: Invalid Move!');
                                cb('invalid move!', null, end);
                            }
                        }
                    } else {
                        // move is invalid
                        LOGGER.info('Board.move: Invalid Move!');
                        cb('invalid move!', null, end);
                    }
                    LOGGER.debug('Board now has: ' + Util.inspect(_board, false, null));
                } else {
                    // this piece is no longer there... player might be cheating!!
                    LOGGER.info('Board.move: piece is no longer there... player might be cheating!!');
                    cb('piece is no longer there... player might be cheating!!', null, end);
                }
            }
        }
    };

    Board.PIECES = {
        '1' : {name: "Spy", count: 2, canKill: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ,13, 15]},
        '2' : {name: "General 5", count: 1, canKill: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ,13, 14, 15]},
        '3' : {name: "General 4", count: 1, canKill: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ,13, 14, 15]},
        '4' : {name: "General 3", count: 1, canKill: [4, 5, 6, 7, 8, 9, 10, 11, 12 ,13, 14, 15]},
        '5' : {name: "General 2", count: 1, canKill: [5, 6, 7, 8, 9, 10, 11, 12 ,13, 14, 15]},
        '6' : {name: "General 1", count: 1, canKill: [6, 7, 8, 9, 10, 11, 12 ,13, 14, 15]},
        '7' : {name: "Colonel", count: 1, canKill: [7, 8, 9, 10, 11, 12 ,13, 14, 15]},
        '8' : {name: "Lt. Colonel", count: 1, canKill: [8, 9, 10, 11, 12 ,13, 14, 15]},
        '9' : {name: "Major", count: 1, canKill: [9, 10, 11, 12 ,13, 14, 15]},
        '10' : {name: "Captain", count: 1, canKill: [10, 11, 12 ,13, 14, 15]},
        '11' : {name: "1st Lieutenant", count: 1, canKill: [11, 12 ,13, 14, 15]},
        '12' : {name: "2nd Lieutenant", count: 1, canKill: [12 ,13, 14, 15]},
        '13' : {name: "Sergeant", count: 1, canKill: [13, 14, 15]},
        '14' : {name: "Private", count: 6, canKill: [14, 15, 1]},
        '15' : {name: "Flag", count: 1, canKill: [15]}
    }
})();
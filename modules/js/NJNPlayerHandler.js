define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var PlayerHandler = declare("bgagame.PlayerHandler", null, {
            constructor(gameui, playerID, playerName, playerColor, playerNo) {
                Object.assign(this, {gameui, playerID, playerName, playerColor, playerNo});

                this.hand = null;
                this.overallPlayerBoard = $('overall_player_board_' + this.playerID);
            },

            setHand(handData, sortCardsBy, selectedCardID){ this.hand = new bgagame.HandHandler(this.gameui, this, handData, sortCardsBy, selectedCardID); },
        });
    });

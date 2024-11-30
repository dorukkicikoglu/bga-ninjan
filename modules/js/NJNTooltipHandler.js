define([
    "dojo",
    "dojo/_base/declare",
    "ebg/counter",
],
    function (dojo, declare) {
        var TooltipHandler = declare("bgagame.TooltipHandler", null, {
            constructor(gameui, playedCards) {
                Object.assign(this, {gameui, playedCards});
                
                this.addTooltipToCards();
            },

            addTooltipToCards(){
                var suitRowsHTML = '';

                for(var suit in this.playedCards){
                    var suitCards = Object.values(this.playedCards[suit]); //convert dict to array for sorting
                    suitCards.sort((a, b) => { return parseInt(b.rank) - parseInt(a.rank); });

                    suitRowsHTML += '<div class="suit-row">' + this.gameui.createCardIcons(suitCards) + '</div>';
                }

                var tooltipHTML = dojo.string.substitute(this.gameui.jstpl_tooltip_wrapper, {suit_rows: suitRowsHTML, tooltip_title: _('Cards Revealed')});

                dojo.query('.a-card').forEach((node) => {
                    var cardID = 'card-id-' + dojo.attr(node, 'card-id');
                    dojo.attr(node, 'id', cardID);

                    this.gameui.addTooltipHtml(cardID, tooltipHTML, this.gameui.isDesktop() ? 600 : 0);
                });
            },

            addNewPlayedCard(newPlayedCardsData){ 
                for(var cardData of newPlayedCardsData){
                    if(!this.playedCards.hasOwnProperty(cardData.suit))
                        this.playedCards[cardData.suit] = {};
                    this.playedCards[cardData.suit][cardData.rank] = cardData;
                }
                this.addTooltipToCards();
            }
        });

        return TooltipHandler;
    });

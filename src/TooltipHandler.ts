type SuitKey = number;
type RankKey = number;  

class TooltipHandler{
	constructor(private gameui: GameBody, private playedCards: Record<SuitKey, Record<RankKey, CardData>> ) { 
        this.addTooltipToCards();
	}

	public addTooltipToCards(){
        let suitRowsHTML = '';

        for(let suit in this.playedCards){
            let suitCards = Object.values(this.playedCards[suit]); //convert dict to array for sorting
            suitCards.sort((a, b) => { return b.rank - a.rank; });

            suitRowsHTML += '<div class="suit-row">' + this.gameui.createCardIcons(suitCards) + '</div>';
        }

        let tooltipHTML = dojo.string.substitute(this.gameui.jstpl_tooltip_wrapper, {suit_rows: suitRowsHTML, tooltip_title: _('Cards Revealed')});

        dojo.query('.a-card').forEach((node) => {
            let cardID = 'card-id-' + dojo.attr(node, 'card-id');
            dojo.attr(node, 'id', cardID);

            this.gameui.addTooltipHtml(cardID, tooltipHTML, this.gameui.isDesktop() ? 600 : 0);
        });
    }

    public addNewPlayedCard(newPlayedCardsData){ 
        for(let cardData of newPlayedCardsData){
            if(!this.playedCards.hasOwnProperty(cardData.suit))
                this.playedCards[cardData.suit] = {};
            this.playedCards[cardData.suit][cardData.rank] = cardData;
        }
        this.addTooltipToCards();
    }
}
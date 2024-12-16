class HandHandler{
    public overallPlayerBoard: HTMLDivElement;
    public handContainer: HTMLDivElement;
    private cardsContainer: HTMLDivElement;
    private orderCardsButton: HTMLDivElement;
    private confirmButtonDisabled: true = true;

    constructor(private gameui: GameBody, private owner: PlayerHandler, private handData: CardData[], private sortCardsBy: 'rank' | 'suit', public selectedCardID: number | false) {
        this.handContainer = dojo.query('#game_play_area .my-hand-container')[0];
        this.cardsContainer = dojo.query('.cards-container', this.handContainer)[0];
        this.orderCardsButton = dojo.query('.order-cards-button', this.handContainer)[0];

        dojo.connect(this.orderCardsButton, 'onclick', () => { this.orderCardsButtonClicked(); });
        dojo.connect(this.cardsContainer, 'onclick', (event) => { this.cardsContainerClicked(event); });

        if(this.owner.playerColor.toLowerCase() == 'ffffff')
            this.orderCardsButton.style.setProperty('--player-color', '#000000');
        if(this.owner.playerColor.toLowerCase() == 'ff0000'){ //red colour on red background
            this.handContainer.style.setProperty('--player-color', '#bb0000');
            dojo.query('.my-hand-title', this.handContainer)[0].style.setProperty('--player-color', '#FF0000');
            this.orderCardsButton.style.setProperty('--player-color', '#FF0000');
        }

        this.displayHand();

        this.reorderCards(false);
    }

    private displayHand(): void{
        dojo.empty(this.cardsContainer);

        for(let cardData of this.handData)
            this.insertCardToHand(cardData, true);

        this.setHandCountAttrForMobileResizing(false);
    }

    private orderCardsButtonClicked(): void{
        this.sortCardsBy = (this.sortCardsBy == 'suit' ? 'rank' : 'suit');
        this.gameui.ajaxAction('setSortCardsBy', {isSuit: this.sortCardsBy == 'suit'}, false, false);
        this.reorderCards(true);
    }

    private reorderCards(doAnimate: boolean): void{
        let cards = dojo.query('.a-card', this.cardsContainer);

        if(doAnimate){
            cards.forEach((card, index) => {
                let cardClone = this.gameui.cloneCard(card);
                dojo.place(cardClone, this.cardsContainer);
                dojo.style(cardClone, 'margin', 0);
                this.gameui.placeOnObject(cardClone, card);

                card.style.opacity = 0;
            });
        }

        let suitToStrength = this.getSuitToStrength();

        cards.sort((a, b) => { // Sort cards by sortCardsBy attribute
            let diff = this.compareCardsByAttr(a, b, this.sortCardsBy, suitToStrength);
            if(diff != 0)
                return diff;

            let secondarySortBy: 'rank' | 'suit' = this.sortCardsBy == 'suit' ? 'rank' : 'suit';
            return this.compareCardsByAttr(a, b, secondarySortBy, suitToStrength);
        });

        cards.reverse(); //reverse because they will be appended to first location
        cards.forEach(card => { dojo.place(card, this.cardsContainer, 'first'); }); // Append cards in sorted order

        this.orderCardsButton.innerHTML = _('sort by ' + (this.sortCardsBy == 'suit' ? 'rank' : 'suit'));

        if(!doAnimate)
            return;

        let animations = [];
        dojo.query('.a-card-clone', this.cardsContainer).forEach((cardClone, index) => {
            let goTo = dojo.query('.a-card:not(.a-card-clone)[card-id=' + dojo.attr(cardClone, 'card-id') + ']', this.cardsContainer)[0];
            let goToLeft = goTo.offsetLeft;

            animations.push(this.gameui.animationHandler.animateProperty({
                node: cardClone, 
                easing: 'sineInOut',
                properties: {left: goToLeft}, 
                duration: 300
            }));
        });
        animations = dojo.fx.combine(animations);
        (animations as any).onEnd = () => {
            dojo.query('.a-card-clone', this.cardsContainer).forEach(dojo.destroy);
            dojo.query('.a-card', this.cardsContainer).forEach((card) => { card.style.opacity = null; });
        };
        (animations as any).play();
    }

    private getSuitToStrength(): Record<number, number> {
        let suitToCards: Record<number, CardData[]> = {};
        for (let card of this.handData) {
            if (!suitToCards.hasOwnProperty(card.suit))
                suitToCards[card.suit] = [];
            suitToCards[card.suit].push(card);
        }

        let suitToStrength: Record<number, number> = {};
        for (let suit in suitToStrength)
            suitToStrength[suit] = this.gameui.getCardsStrength(suitToCards[suit]);

        return suitToStrength;
    }

    private compareCardsByAttr(cardA: HTMLDivElement, cardB: HTMLDivElement, attribute: 'suit' | 'rank', suitToStrength: Record<number, number> = {}): number{
        if(!suitToStrength)
            suitToStrength = this.getSuitToStrength();

        function getCardSortValue(card): number{
            if(attribute == 'suit'){
                let suit = parseInt(dojo.attr(card, 'suit'));
                return suitToStrength[suit];
            }
            return parseInt(dojo.attr(card, attribute));
        }

        let diff = getCardSortValue(cardB) - getCardSortValue(cardA);
        if(diff == 0 && attribute == 'suit')
            return parseInt(dojo.attr(cardB, 'suit')) - parseInt(dojo.attr(cardA, 'suit'));
        return diff;
    }

    private cardsContainerClicked(event){
        if(!['selectCard', 'takePile'].includes(this.gameui.gamedatas.gamestate.name) || this.gameui.isInterfaceLocked())
            return;

        if(!dojo.hasClass(event.target, 'a-card'))
            return;

        this.cardClicked(event.target);  
    }
    
    private cardClicked(card){
        if(this.gameui.gamedatas.gamestate.name == 'takePile'){ //pre-selection
            if(!dojo.hasClass(card, 'selection-confirmed') && this.gameui.isCurrentPlayerActive()) //only revert is allowed as player has to do pile action
                return;

            let preSelectionEnabled = this.gameui.prefHandler.getPref('card_preselection') == 1;
            if(!preSelectionEnabled){
                this.gameui.confirmationDialog(_("This will let you select the next round's cards in advance"), () => { 
                    this.gameui.prefHandler.setPref('card_preselection', 1);

                    this.cardClicked(card);
                    setTimeout(() => { this.gameui.showTopBarTooltip(_('You can turn off this preference from the menu'), 'menu-wheel-tooltip', 3500); }, 800);
                });
                dojo.query('.standard_popin .standard_popin_title')[0].innerHTML = _('Enable card preselection?');
                return;
            }
        }

        let cardID = parseInt(dojo.attr(card, 'card-id'));
        let cardData = {card_id: cardID, suit: dojo.attr(card, 'suit'), rank: dojo.attr(card, 'rank')};
        let cardDiv = dojo.query('.a-card[card-id="' + cardID + '"]', this.cardsContainer)[0];

        let cardWasSelected = dojo.attr(cardDiv, 'selected') == 'true';
        dojo.query('.a-card', this.cardsContainer).forEach((aCard) => { dojo.attr(aCard, 'selected', 'false'); });

        this.setConfirmedSelectedCardID(false);

        if(!cardWasSelected){ 
            this.selectedCardID = false;
            dojo.attr(cardDiv, 'selected', 'true');
        }

        if(this.gameui.gamedatas.gamestate.name == 'selectCard'){
            if(!this.gameui.isCurrentPlayerActive() && (!this.confirmButtonDisabled || cardWasSelected))
                this.gameui.ajaxAction('actRevertCardSelection', {}, true, false);

            if(this.confirmButtonDisabled){
                if(!cardWasSelected)
                    this.gameui.ajaxAction('actSelectCard', {cardID: cardID}, true, false);
            } else this.updateStatusTextUponCardSelection();
        } else if(this.gameui.gamedatas.gamestate.name == 'takePile') { //pre-selection
            if(cardWasSelected)
                this.gameui.ajaxAction('actRevertCardSelectionPreSelection', {}, true, false);
            else this.gameui.ajaxAction('actSelectCardPreSelection', {cardID: cardID}, false, false);
        }
    }

    private setConfirmedSelectedCardID(selectedCardIDIn: number | false){
        this.selectedCardID = selectedCardIDIn;
        dojo.query('.a-card', this.cardsContainer).forEach(function(card){dojo.removeClass(card, 'selection-confirmed');});
        if(this.selectedCardID)
            dojo.addClass(dojo.query('.a-card[card-id="' + this.selectedCardID + '"]', this.cardsContainer)[0], 'selection-confirmed');
    }

    public onLeavingStateSelectCards(): void{ this.selectedCardID = false; }

    public updateConfirmedSelection(confirmedCardID: number | false, preselection: boolean){
        this.setConfirmedSelectedCardID(confirmedCardID);

        this.updateStatusTextUponCardSelection();

        if(preselection){ //show temporary text at status bar
            if(confirmedCardID){
                let selectedCard = dojo.query('.a-card[card-id=' + confirmedCardID + ']', this.handContainer)[0];
                let cardData = new CardData(dojo.attr(selectedCard, 'card-id'), dojo.attr(selectedCard, 'suit'), dojo.attr(selectedCard, 'rank'));
                let cardIconsHTML = this.gameui.createCardIcons([cardData]);

                this.gameui.changeTitleTemp(dojo.string.substitute(_('${playerYou}\'ve preselected ${cardIcon}'), {playerYou: this.gameui.divYou(), cardIcon: cardIconsHTML}));
            } else this.gameui.changeTitleTemp(); //remove temp title
        }
    }

    public updateStatusTextUponCardSelection(){
        if(this.gameui.gamedatas.gamestate.name != 'selectCard')
            return;

        let statusText = dojo.query('#pagemaintitletext .status-text')[0];
        let selectedCardContainer = dojo.query('#pagemaintitletext .selected-card-container')[0];

        let selectedCard = dojo.query('.a-card[selected=true]', this.handContainer);

        if(selectedCard.length > 0)
            selectedCard = selectedCard[0];
        else selectedCard = false;

        if(!selectedCard){
            selectedCardContainer.style.display = 'none';
            statusText.style.display = null;
            return;
        }

        let cardData = new CardData(parseInt(dojo.attr(selectedCard, 'card-id')), parseInt(dojo.attr(selectedCard, 'suit')), parseInt(dojo.attr(selectedCard, 'rank')));
        let cardIconsHTML = this.gameui.createCardIcons([cardData]);

        let isSelectionConfirmed = this.selectedCardID && true;

        let selectedCardContainerHTML = dojo.string.substitute( isSelectionConfirmed ? _('Selected ${cardIcons}') : _('Play ${cardIcons}'), {cardIcons: cardIconsHTML});
        if(isSelectionConfirmed)
            selectedCardContainerHTML += '&nbsp;<span class="waiting-text capitalize-first">' + _('waiting for others') + '</span>';
        else selectedCardContainerHTML += '<a class="confirm-play-button bgabutton bgabutton_blue">' + _('Confirm') + '</a>';

        selectedCardContainer.innerHTML = selectedCardContainerHTML;
        selectedCardContainer.style.display = null;
        statusText.style.display = 'none';

        if(isSelectionConfirmed)
            this.gameui.dotTicks(dojo.query('.waiting-text', selectedCardContainer)[0]);

        dojo.query('.confirm-play-button', selectedCardContainer).connect('onclick', this, () => { this.confirmPlayButtonClicked(); });
    }

    private confirmPlayButtonClicked(){
        let selectedCard = dojo.query('.a-card[selected=true]', this.handContainer);

        if(selectedCard.length <= 0)
            return;

        selectedCard = selectedCard[0];
        let cardID = parseInt(dojo.attr(selectedCard, 'card-id'));
        this.gameui.ajaxAction('actSelectCard', {cardID: cardID});
    }

    public removeCardsFromHandData(removedCardsData){
        if (!Array.isArray(removedCardsData))
            removedCardsData = [{card_id: removedCardsData}];

        let handDataObj = {};
        let removedCardsObj = {};
        for(let nextCardData of this.handData)
            handDataObj[nextCardData.card_id] = nextCardData;
        for(let nextCardData of removedCardsData)
            removedCardsObj[nextCardData.card_id] = 1;

        this.handData = [];
        for(let key in handDataObj){
            if(removedCardsObj.hasOwnProperty(key))
                continue;
            this.handData.push(handDataObj[key]);
        }
    }

    public setHandCountAttrForMobileResizing(doAnimate = true){
        if(doAnimate){
            let cards = dojo.query('.a-card', this.cardsContainer);
            cards.forEach((card) => { card.style.transition = 'margin 0.2s ease-in'; });
            setTimeout(() => { cards.forEach((card) => { card.style.transition = null; }); }, 200);
        }
        dojo.attr(this.cardsContainer, 'hand-card-count-for-mobile-resizing', this.handData.length);                
    }

    private insertCardToHand(cardData, insertToEnd){ 
        let aCard = dojo.create('div', { class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id });

        if(parseInt(cardData.card_id) == this.selectedCardID)
            dojo.query(aCard).attr('selected', 'true').addClass('selection-confirmed');

        dojo.place(aCard, this.cardsContainer); 
    }
}
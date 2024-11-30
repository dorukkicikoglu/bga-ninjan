define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var HandHandler = declare("bgagame.HandHandler", null, {
            constructor(gameui, owner, handData, sortCardsBy, selectedCardID) {
                Object.assign(this, {gameui, owner, handData, sortCardsBy, selectedCardID});

                this.handContainer = dojo.query('#game_play_area .my-hand-container')[0];
                this.cardsContainer = dojo.query('.cards-container', this.handContainer)[0];
                this.orderCardsButton = dojo.query('.order-cards-button', this.handContainer)[0];
                
                this.tableCardsCount = 0;
                this.maxPlayableCardCount = 0;

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
            },

            displayHand(){
                dojo.empty(this.cardsContainer);

                for(cardData of this.handData)
                    this.insertCardToHand(cardData, true);

                this.setHandCountAttrForMobileResizing(false);
            },

            orderCardsButtonClicked(){
                this.sortCardsBy = (this.sortCardsBy == 'suit' ? 'rank' : 'suit');
                this.gameui.ajaxcallwrapper('setSortCardsBy', {isSuit: this.sortCardsBy == 'suit'}, false, false);
                this.reorderCards(true);
            },

            reorderCards(doAnimate){
                var cards = dojo.query('.a-card', this.cardsContainer);

                if(doAnimate){
                    cards.forEach((card, index) => {
                        var cardClone = this.gameui.cloneCard(card);
                        dojo.place(cardClone, this.cardsContainer);
                        dojo.style(cardClone, 'margin', 0);
                        this.gameui.placeOnObject(cardClone, card);

                        card.style.opacity = 0;
                    });
                }

                var suitToStrength = this.getSuitToStrength();

                cards.sort((a, b) => { // Sort cards by sortCardsBy attribute
                    var diff = this.compareCardsByAttr(a, b, this.sortCardsBy, suitToStrength);
                    if(diff != 0)
                        return diff;

                    var secondarySortBy = this.sortCardsBy == 'suit' ? 'rank' : 'suit';
                    return this.compareCardsByAttr(a, b, secondarySortBy, suitToStrength);
                });

                cards.reverse(); //reverse because they will be appended to first location
                cards.forEach(card => { dojo.place(card, this.cardsContainer, 'first'); }); // Append cards in sorted order

                this.orderCardsButton.innerHTML = _('sort by ' + (this.sortCardsBy == 'suit' ? 'rank' : 'suit'));

                if(!doAnimate)
                    return;

                var animations = [];
                dojo.query('.a-card-clone', this.cardsContainer).forEach((cardClone, index) => {
                    var goTo = dojo.query('.a-card:not(.a-card-clone)[card-id=' + dojo.attr(cardClone, 'card-id') + ']', this.cardsContainer)[0];
                    var goToLeft = goTo.offsetLeft;

                    animations.push(this.gameui.animationHandler.animateProperty({
                        node: cardClone, 
                        easing: 'sineInOut',
                        properties: {left: goToLeft}, 
                        duration: 300
                    }));
                });
                animations = dojo.fx.combine(animations);
                animations.onEnd = () => {
                    dojo.query('.a-card-clone', this.cardsContainer).forEach(dojo.destroy);
                    dojo.query('.a-card', this.cardsContainer).forEach((card) => { card.style.opacity = null; });
                };
                animations.play();
            },

            getSuitToStrength(){
                var suitToStrength = {};
                for(card of this.handData){
                    if(!suitToStrength.hasOwnProperty(card.suit))
                        suitToStrength[card.suit] = [];
                    suitToStrength[card.suit].push(card);
                }

                for(suit in suitToStrength)
                    suitToStrength[suit] = this.gameui.getCardsStrength(suitToStrength[suit]);

                return suitToStrength;
            },

            compareCardsByAttr(cardA, cardB, attribute, suitToStrength = false){
                if(!suitToStrength)
                    suitToStrength = this.getSuitToStrength();

                function getCardSortValue(card){
                    if(attribute == 'suit'){
                        var suit = parseInt(dojo.attr(card, 'suit'));
                        return suitToStrength[suit];
                    }
                    return parseInt(dojo.attr(card, attribute));
                }

                var diff = getCardSortValue(cardB, attribute) - getCardSortValue(cardA, attribute);
                if(diff == 0 && attribute == 'suit')
                    return parseInt(dojo.attr(cardB, 'suit')) - parseInt(dojo.attr(cardA, 'suit'));
                return diff;
            },

            cardsContainerClicked(event){
                if(!['selectCard', 'takePile'].includes(this.gameui.gamedatas.gamestate.name) || this.gameui.isInterfaceLocked())
                    return;

                if(!dojo.hasClass(event.target, 'a-card'))
                    return;

                this.cardClicked(event.target);  
            },
            
            cardClicked(card){
                if(this.gameui.gamedatas.gamestate.name == 'takePile'){ //pre-selection
                    if(!dojo.hasClass(card, 'selection-confirmed') && this.gameui.isCurrentPlayerActive()) //only revert is allowed as player has to do pile action
                        return;

                    var preSelectionEnabled = this.gameui.prefHandler.getPref('card_preselection') == 1;
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

                var cardID = parseInt(dojo.attr(card, 'card-id'));
                var cardData = {card_id: cardID, suit: dojo.attr(card, 'suit'), rank: dojo.attr(card, 'rank')};
                var cardDiv = dojo.query('.a-card[card-id="' + cardID + '"]', this.cardsContainer)[0];

                var cardWasSelected = dojo.attr(cardDiv, 'selected') == 'true';
                dojo.query('.a-card', this.cardsContainer).forEach((aCard) => { dojo.attr(aCard, 'selected', 'false'); });

                this.setConfirmedSelectedCardID(false);

                if(!cardWasSelected){ 
                    this.selectedCardID = false;
                    dojo.attr(cardDiv, 'selected', 'true');
                }

                if(this.gameui.gamedatas.gamestate.name == 'selectCard'){
                    if(!this.gameui.isCurrentPlayerActive())
                        this.gameui.ajaxcallwrapper('actRevertCardSelection', {}, true, false);

                    this.updateStatusTextUponCardSelection();
                } else if(this.gameui.gamedatas.gamestate.name == 'takePile') { //pre-selection
                    if(cardWasSelected)
                        this.gameui.ajaxcallwrapper('actRevertCardSelectionPreSelection', {}, true, false);
                    else this.gameui.ajaxcallwrapper('actSelectCardPreSelection', {cardID: cardID}, false, false);
                }
            },

            setConfirmedSelectedCardID(selectedCardIDIn){
                this.selectedCardID = selectedCardIDIn;
                dojo.query('.a-card', this.cardsContainer).forEach(function(card){dojo.removeClass(card, 'selection-confirmed');});
                if(this.selectedCardID)
                    dojo.addClass(dojo.query('.a-card[card-id="' + this.selectedCardID + '"]', this.cardsContainer)[0], 'selection-confirmed');
            },

            onLeavingStateSelectCards(){ this.selectedCardID = false; },

            updateConfirmedSelection(confirmedCardID, preselection){
                if(!confirmedCardID)
                    confirmedCardID = false;
                else confirmedCardID = parseInt(confirmedCardID);

                this.setConfirmedSelectedCardID(confirmedCardID);

                this.updateStatusTextUponCardSelection();

                if(preselection){ //show temporary text at status bar
                    if(confirmedCardID){
                        var selectedCard = dojo.query('.a-card[card-id=' + confirmedCardID + ']', this.handContainer)[0];
                        var cardData = {card_id: dojo.attr(selectedCard, 'card-id'), suit: dojo.attr(selectedCard, 'suit'), rank: dojo.attr(selectedCard, 'rank')};
                        var cardIconsHTML = this.gameui.createCardIcons([cardData]);

                        this.gameui.changeTitleTemp(dojo.string.substitute(_('${playerYou}\'ve preselected ${cardIcon}'), {playerYou: this.gameui.divYou(), cardIcon: cardIconsHTML}));
                    } else this.gameui.changeTitleTemp(); //remove temp title
                }
            },

            updateStatusTextUponCardSelection(){
                if(this.gameui.gamedatas.gamestate.name != 'selectCard')
                    return;

                var statusText = dojo.query('#pagemaintitletext .status-text')[0];
                var selectedCardContainer = dojo.query('#pagemaintitletext .selected-card-container')[0];

                var selectedCard = dojo.query('.a-card[selected=true]', this.handContainer);

                if(selectedCard.length > 0)
                    selectedCard = selectedCard[0];
                else selectedCard = false;

                if(!selectedCard){
                    selectedCardContainer.style.display = 'none';
                    statusText.style.display = null;
                    return;
                }

                var cardData = {card_id: dojo.attr(selectedCard, 'card-id'), suit: dojo.attr(selectedCard, 'suit'), rank: dojo.attr(selectedCard, 'rank')};
                var cardIconsHTML = this.gameui.createCardIcons([cardData]);

                var isSelectionConfirmed = this.selectedCardID && true;

                var selectedCardContainerHTML = dojo.string.substitute( isSelectionConfirmed ? _('Selected ${cardIcons}') : _('Play ${cardIcons}'), {cardIcons: cardIconsHTML});
                if(isSelectionConfirmed)
                    selectedCardContainerHTML += '&nbsp;<span class="waiting-text capitalize-first">' + _('waiting for others') + '</span>';
                else selectedCardContainerHTML += '<a class="confirm-play-button bgabutton bgabutton_blue">' + _('Confirm') + '</a>';

                selectedCardContainer.innerHTML = selectedCardContainerHTML;
                selectedCardContainer.style.display = null;
                statusText.style.display = 'none';

                if(isSelectionConfirmed)
                    this.gameui.dotTicks(dojo.query('.waiting-text', selectedCardContainer)[0]);

                dojo.query('.confirm-play-button', selectedCardContainer).connect('onclick', this, () => { this.confirmPlayButtonClicked(); });
            },

            confirmPlayButtonClicked(){
                var selectedCard = dojo.query('.a-card[selected=true]', this.handContainer);

                if(selectedCard.length <= 0)
                    return;

                selectedCard = selectedCard[0];
                var cardID = parseInt(dojo.attr(selectedCard, 'card-id'));
                this.gameui.ajaxcallwrapper('actSelectCard', {cardID: cardID});
            },

            removeCardsFromHandData(removedCardsData){
                if (!Array.isArray(removedCardsData))
                    removedCardsData = [{card_id: removedCardsData}];

                var handDataObj = {};
                var removedCardsObj = {};
                for(var nextCardData of this.handData)
                    handDataObj[nextCardData.card_id] = nextCardData;
                for(var nextCardData of removedCardsData)
                    removedCardsObj[nextCardData.card_id] = 1;

                this.handData = [];
                for(var key in handDataObj){
                    if(removedCardsObj.hasOwnProperty(key))
                        continue;
                    this.handData.push(handDataObj[key]);
                }
            },

            setHandCountAttrForMobileResizing(doAnimate = true){
                if(doAnimate){
                    var cards = dojo.query('.a-card', this.cardsContainer);
                    cards.forEach((card) => { card.style.transition = 'margin 0.2s ease-in'; });
                    setTimeout(() => { cards.forEach((card) => { card.style.transition = null; }); }, 200);
                }
                dojo.attr(this.cardsContainer, 'hand-card-count-for-mobile-resizing', this.handData.length);                
            },

            insertCardToHand(cardData, insertToEnd){ 
                var aCard = dojo.create('div', { class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id });

                if(parseInt(cardData.card_id) == this.selectedCardID)
                    dojo.query(aCard).attr('selected', 'true').addClass('selection-confirmed');

                var cardDivs = false;

                if(!insertToEnd){
                    var cardDivs = dojo.query('.a-card', this.cardsContainer);
                    insertToEnd = cardDivs.length <= 0; 
                }

                if(insertToEnd){
                    dojo.place(aCard, this.cardsContainer);
                    return; 
                }

                var lastCardDiv = false;
                var insertAfterDiv = false;

                if(this.sortCardsBy == 'suit'){
                    cardDivs.forEach((node, index) => {
                        var nextSuit = parseInt(dojo.attr(node, 'suit'));
                        var nextRank = parseInt(dojo.attr(node, 'rank'));

                        if(nextSuit == parseInt(cardData.suit)){
                            if(!insertAfterDiv){
                                if(node.previousElementSibling)
                                    insertAfterDiv = node.previousElementSibling;
                                else insertAfterDiv = 'to_start';
                            }
                            if(nextRank > parseInt(cardData.rank))
                                insertAfterDiv = node;
                        }

                        lastCardDiv = node;
                    });
                } else { //sorted by rank
                    var matchingCards = [];

                    cardDivs.forEach((node, index) => {
                        var nextSuit = parseInt(dojo.attr(node, 'suit'));
                        var nextRank = parseInt(dojo.attr(node, 'rank'));

                        if(nextRank < parseInt(cardData.rank)){
                            if(!node.previousElementSibling)
                                insertAfterDiv = 'to_start';
                            return;
                        } else if(nextRank == parseInt(cardData.rank)){
                            matchingCards.push(node);
                        } else insertAfterDiv = node;

                        lastCardDiv = node;
                    });

                    if(matchingCards.length > 0){
                        insertAfterDiv = 'to_set_start';
                        var suitToStrength = this.getSuitToStrength();

                        for(nextCard of matchingCards){
                            if(this.compareCardsByAttr(aCard, nextCard, 'suit', suitToStrength) > 0)
                                insertAfterDiv = nextCard;
                            else break;
                        }

                        if(insertAfterDiv == 'to_set_start'){
                            if(matchingCards[0].previousElementSibling)
                                insertAfterDiv = matchingCards[0].previousElementSibling;
                            else insertAfterDiv = 'to_start';
                        }
                    }
                }

                if(!insertAfterDiv)
                    insertAfterDiv = lastCardDiv;

                if(insertAfterDiv == 'to_start')
                    dojo.place(aCard, this.cardsContainer, 'first');
                else dojo.place(aCard, insertAfterDiv, 'after');
            }
        });
    });

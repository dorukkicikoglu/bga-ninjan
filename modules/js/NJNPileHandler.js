define([
    "dojo",
    "dojo/_base/declare",
],
    function (dojo, declare) {
        var PileHandler = declare("bgagame.PileHandler", null, {
            constructor(gameui, pilesData, pileQueueData) {
                Object.assign(this, {gameui, pilesData, pileQueueData});

                this.pilesRow = dojo.query('#game_play_area .piles-row')[0];
                this.pilesContainer = dojo.query('#game_play_area .piles-container')[0];
                this.pileQueueContainer = dojo.query('#game_play_area .pile-queue-container')[0];

                this.pileContainers = {};

                dojo.connect(this.pilesContainer, 'onclick', (event) => { this.pilesContainerClicked(event); });

                this.displayPiles();
                this.fillPileQueue();
            },

            displayPiles(){
                for(pileIndex in this.pilesData){
                    var pileContainer = dojo.place(dojo.string.substitute(this.gameui.jstpl_pile_container, {pileIndex: pileIndex}), this.pilesContainer);

                    for(cardData of this.pilesData[pileIndex])
                        dojo.place(dojo.create('div', {class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id}), pileContainer);

                    this.pileContainers[pileIndex] = pileContainer;
                }
            },

            fillPileQueue(){
                var wrapper = dojo.query('.remaining-cards-wrapper', this.pileQueueContainer)[0];
                dojo.empty(wrapper);

                for(cardIndex in this.pileQueueData){
                    var cardData = this.pileQueueData[cardIndex];

                    var cardContainer = dojo.place(dojo.string.substitute(this.gameui.jstpl_queue_card, {playerName: this.gameui.divColoredPlayer(cardData.owner_id)}), wrapper);
                    if(cardIndex == 1)
                        dojo.addClass(cardContainer, 'second-queue-card');

                    var aCard = dojo.create('div', {class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id});
                    dojo.place(aCard, cardContainer, 'first');
                }

                if(this.pileQueueData.length > 0)
                    dojo.addClass(this.pilesRow, 'expanded');

                if(this.pileQueueData.length <= 1)
                    dojo.attr(this.pileQueueContainer, 'line-hidden', 'true')
            },

            showPossiblePiles(possiblePiles){
                if(possiblePiles.reason != 'take'){
                    $('pagemaintitletext').innerHTML = (
                        this.gameui.isCurrentPlayerActive() ? 
                            dojo.string.substitute(_('No pile to take... ${playerYou} must place under a pile'), {playerYou: this.gameui.divYou()}) : 
                            dojo.string.substitute(_('${playerName} must place under a pile'), {playerName: this.gameui.divColoredPlayer(this.gameui.getActivePlayerId())})
                    );
                    document.title = $('pagemaintitletext').innerText;
                }

                for(pileIndex in this.pileContainers)
                    this.pileContainers[pileIndex].removeAttribute('click-reason');

                if(!this.gameui.isCurrentPlayerActive())
                    return;

                for(pileIndex of possiblePiles.pile_indices)
                    dojo.attr(this.pileContainers[pileIndex], 'click-reason', possiblePiles.reason);
            },

            pilesContainerClicked(event){
                if(this.gameui.isInterfaceLocked() || this.gameui.gamedatas.gamestate.name != 'takePile' || !this.gameui.isCurrentPlayerActive())
                    return;

                var pileContainer = $(event.target).closest('.a-pile-container')

                if(!dojo.hasClass(pileContainer, 'a-pile-container') || !dojo.hasAttr(pileContainer, 'click-reason'))
                    return;

                this.pileClicked(pileContainer);  
            },

            pileClicked(pile){ this.gameui.ajaxcallwrapper('actTakePile', {pileIndex: dojo.attr(pile, 'pile-index')}); },
            
            onLeavingStateTakePiles(){ 
                if(this.pileQueueData.length > 0) 
                    return; 

                dojo.removeClass(this.pilesRow, 'expanded'); 
                dojo.removeAttr(this.pileQueueContainer, 'line-hidden'); 
                dojo.removeAttr(this.pileQueueContainer, 'width-set');
                this.pileQueueContainer.style = null; 
            },

            animatePileQueue(pileQueueDataIn, autoPlay){
                if(autoPlay){
                    setTimeout(() => { this.animatePileQueue(pileQueueDataIn, false); }, 600); //autoPlay delay is 600ms so slideAnimations happens in max 900ms
                    return;
                }

                this.pileQueueData = pileQueueDataIn;
                var isDesktop = this.gameui.isDesktop();

                var pilesContainerClone = dojo.clone(this.pilesContainer);
                dojo.style(pilesContainerClone, {position: 'absolute', top: '0px', left: '0px'});
                if(!isDesktop) 
                    pilesContainerClone.style.width = '100%'; //otherwise piles dont fit horizontally on mobile
                dojo.place(pilesContainerClone, this.pilesRow);

                this.gameui.placeOnObject(pilesContainerClone, this.pilesContainer);

                this.fillPileQueue(true);
                dojo.query('.a-card', this.pileQueueContainer).forEach((node) => { node.style.opacity = 0; });

                var marginProps = isDesktop ? ['width', 'paddingLeft', 'paddingRight'] : ['height', 'paddingTop', 'paddingBottom'];
                marginProps.forEach(prop => this.pileQueueContainer.style[prop] = '0px');
                var queueArrows = dojo.query('.queue-arrows-container', this.pileQueueContainer)[0];
                queueArrows.style.display = 'none';
                dojo.query('.player-name-text', this.pileQueueContainer).forEach((playerNameText) => { playerNameText.style.opacity = 0; });

                var pileQueueContainerClone = dojo.clone(this.pileQueueContainer);
                dojo.style(pileQueueContainerClone, {position: 'absolute', overflow: 'hidden'});
                dojo.place(pileQueueContainerClone, this.pilesRow);
                this.gameui.placeOnObject(pileQueueContainerClone, this.pileQueueContainer);

                this.pileQueueContainer.style = null;

                this.pilesContainer.style.opacity = 0;
                this.pileQueueContainer.style.opacity = 0;

                var queueOffset = this.gameui.getPos(this.pileQueueContainer).x - this.gameui.getPos(pileQueueContainerClone).x;
                var expandAnimations = dojo.fx.combine([
                    this.gameui.animationHandler.animateOnObject({
                        node: pilesContainerClone,
                        goTo: this.pilesContainer,
                        duration: 200,
                        easing: 'sineOut',
                        onEnd: () => { this.pilesContainer.style = null; dojo.destroy(pilesContainerClone); }
                    }), 
                    this.gameui.animationHandler.animateProperty({
                        node: pileQueueContainerClone,
                        duration: 200,
                        easing: 'sineOut',
                        properties: {
                            width: dojo.style(this.pileQueueContainer, 'width'),
                            height: dojo.style(this.pileQueueContainer, 'height'),
                            padding: dojo.style(this.pileQueueContainer, 'padding'),
                            marginLeft: queueOffset,
                        },
                        onEnd: () => { this.pileQueueContainer.style = null; queueArrows.style = null; dojo.destroy(pileQueueContainerClone); }
                    })
                ]);

                var slideAnimations = [];
                var queueCardContainers = dojo.query('.a-queue-card-container', this.pileQueueContainer);

                for(cardIndex in this.pileQueueData){
                    var cardData = this.pileQueueData[cardIndex];
                    var cardDiv = dojo.query('.my-hand-container .a-card[card-id=' + cardData.card_id + ']');
                    var onBeginCardAnimation = () => {};

                    if(cardDiv.length > 0){
                        var cardDivToKill = cardDiv[0];
                        
                        dojo.removeClass(cardDivToKill, 'selection-confirmed');

                        var cardDiv = dojo.clone(cardDivToKill);
                        
                        this.gameui.myself.hand.removeCardsFromHandData(parseInt(dojo.attr(cardDiv, 'card-id')));

                        dojo.style(cardDiv, {position: 'absolute', zIndex: 2});
                        dojo.place(cardDiv, 'page-content', 'first'); //first child prevents z-index issues when other cards slide from player boards and overlap with player hand
                        this.gameui.placeOnObject(cardDiv, cardDivToKill);

                        onBeginCardAnimation = () => {
                            dojo.style(cardDivToKill, {opacity: 0});

                            this.gameui.animationHandler.animateProperty({
                                node: cardDivToKill,
                                duration: 500, 
                                easing: 'sineInOut',
                                properties: {width: 0, marginLeft: 0},
                                onEnd: dojo.hitch(this, function(cardDivToKill){ dojo.destroy(cardDivToKill); }, cardDivToKill)
                            }).play();
                        };
                    } else {
                        cardDiv = dojo.create('div', {class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id, style: 'position: absolute; z-index: 3;'});
                        dojo.attr(cardDiv, 'card-id', cardData.card_id);

                        var playerBoard = this.gameui.players[cardData.owner_id].overallPlayerBoard;
                        dojo.place(cardDiv, 'page-content');
                        this.gameui.placeOnObject(cardDiv, playerBoard);
                        cardDiv.style.opacity = 0;

                        onBeginCardAnimation = dojo.hitch(this, function(cardDiv){ cardDiv.style.opacity = 1; }, cardDiv);
                    }

                    var queueCardContainer = queueCardContainers[parseInt(cardIndex)];
                    var goTo = dojo.query('.a-card', queueCardContainer)[0];

                    var onBegin = dojo.hitch(this, function(queueCardContainer, onBeginCardAnimation){
                        dojo.query('.player-name-text', queueCardContainer)[0].style.opacity = 1;
                        onBeginCardAnimation();
                    }, queueCardContainer, onBeginCardAnimation);

                    slideAnimations.push(this.gameui.animationHandler.animateOnObject({
                        node: cardDiv,
                        goTo: goTo,
                        duration: Math.min(500, (autoPlay ? 900 : 1200) / this.pileQueueData.length), //autoPlay has 900ms because delay is 600ms
                        easing: 'sineInOut',
                        onBegin: onBegin,
                        onEnd: dojo.hitch(this, function(cardDiv, goTo){
                            cardDiv.removeAttribute("style");
                            dojo.place(cardDiv, goTo, 'replace');
                        }, cardDiv, goTo)
                    }));
                }

                slideAnimations = dojo.fx.chain(slideAnimations);

                slideAnimations.onEnd = () => { setTimeout(() => { 
                    if(this.gameui.myself)
                        this.gameui.myself.hand.setHandCountAttrForMobileResizing(true); 

                    this.gameui.tooltipHandler.addNewPlayedCard(this.pileQueueData);
                    this.gameui.releaseNotification(); 
                }, 200); };

                dojo.fx.combine([expandAnimations, slideAnimations]).play();
            },

            animatePileTaken(playerID, pileIndex, selectedCardData, reason, autoPlay, cardIconsData){
                if(reason != 'zombie'){ //update status text if not zombie
                    if(reason == 'take')
                        this.pilesData[pileIndex] = [];
                    this.pilesData[pileIndex].push({card_id: selectedCardID, suit: selectedCardData.suit, rank: selectedCardData.suit, card_location_arg: pileIndex, location_on_pile: this.pilesData[pileIndex].length});
     
                    var playerName = this.gameui.divColoredPlayer(playerID);
                    var isMe = this.gameui.myself && playerID == this.gameui.myself.playerID;
                    var statusBarHTML = dojo.string.substitute(
                        reason == 'take' ? 
                            (isMe ? 
                            (!autoPlay ? _('${playerYou} are taking ${CARD_ICONS}') : _('${playerYou} are auto-taking ${CARD_ICONS}')) : 
                            (!autoPlay ? _('${playerName} is taking ${CARD_ICONS}') : _('${playerName} is auto-taking ${CARD_ICONS}'))) :
                            (isMe ? 
                            _('${playerYou} are placing ${CARD_ICONS}') : 
                            _('${playerName} is placing ${CARD_ICONS}')), 
                    {playerYou: playerName, playerName: playerName, CARD_ICONS: this.gameui.createCardIcons(cardIconsData)});

                    this.gameui.updateStatusText(statusBarHTML);
                }

                dojo.query('.a-pile-container', this.pilesContainer).forEach((node) => { node.removeAttribute('click-reason'); }); 

                var selectedCardID = selectedCardData.card_id;
                
                this.pileQueueData = this.pileQueueData.filter(obj => obj.card_id !== selectedCardID);
                
                var pileContainer = this.pileContainers[pileIndex];
                var pileCards = dojo.query('.a-card', pileContainer);
                var newPileCard = false;

                var cardDiv = dojo.query('.a-card[card-id=' + selectedCardID + ']', this.pileQueueContainer)[0];
                var queueCardContainer = $(cardDiv).closest('.a-queue-card-container');

                newPileCard = dojo.clone(cardDiv);

                if(reason != 'zombie'){
                    var tempClone = dojo.clone(newPileCard);
                    dojo.place(tempClone, pileContainer, reason == 'take' ? 'first' : 'last');
                    var newCardTop = tempClone.offsetTop;
                    dojo.destroy(tempClone);
                }
                
                cardDiv.style.opacity = 0;
                
                dojo.style(newPileCard, {position: 'absolute', zIndex: 1, margin: 0});
                dojo.place(newPileCard, reason != 'zombie' ? pileContainer : 'page-content');
                this.gameui.placeOnObject(newPileCard, cardDiv);
                this.pilesContainer.style.zIndex = 1;

                var liftCardAnimation = this.gameui.animationHandler.animateProperty({ //lift card
                    node: newPileCard, 
                    easing: 'sineIn',
                    properties: {top: dojo.style(newPileCard, 'top') - 60, left: dojo.style(newPileCard, 'left') + Math.random() * 10 + 10},
                    duration: 200,
                    delay: autoPlay || this.gameui.isReplay() ? 0 : 500
                });

                var slideCardAnimation = reason != 'zombie' ?
                    this.gameui.animationHandler.animateProperty({ //slide card to pile
                        node: newPileCard,
                        properties: {top: newCardTop, left: 0},
                        delay: 200,
                        duration: 500,
                        easing: 'sineIn',
                        onEnd: () => { this.pilesContainer.style.zIndex = null; }
                    }) :
                    this.gameui.animationHandler.animateProperty({ //slide zombie card off screen
                        node: newPileCard,
                        properties: {top: dojo.style(newPileCard, 'top') - 60, left: -2 * this.gameui.getPos(newPileCard).w},
                        delay: 200,
                        duration: 500,
                        easing: 'sineInOut'
                });

                var closeQueueCardAnimation = this.gameui.animationHandler.animateProperty({ //close card's prev. queue container
                    node: queueCardContainer,
                    delay: 400,
                    duration: 200,
                    easing: 'sineOut',
                    properties: {width: 0, margin: 0},
                    onBegin: () => { 
                        if(!dojo.hasAttr(this.pileQueueContainer, 'width-set')){
                            dojo.style(this.pileQueueContainer, 'width', this.gameui.getPos(dojo.query('.remaining-cards-wrapper', this.pileQueueContainer)[0]).w + 'px');
                            dojo.attr(this.pileQueueContainer, 'width-set', 'true');
                        }

                        var playerNameText = dojo.query('.player-name-text', queueCardContainer)[0];
                        var playerNameTextClone = dojo.clone(playerNameText);
                        dojo.place(playerNameTextClone, 'page-content');
                        this.gameui.placeOnObject(playerNameTextClone, playerNameText);                                    
                        dojo.destroy(playerNameText);
                        this.gameui.animationHandler.fadeOutAndDestroy(playerNameTextClone);

                        var secondQueueCard = dojo.query('.second-queue-card', this.pileQueueContainer);
                        if(secondQueueCard.length > 0){
                            secondQueueCard = secondQueueCard[0];

                            dojo.removeClass(secondQueueCard, 'second-queue-card'); 
                            if(secondQueueCard.nextElementSibling)
                                dojo.addClass(secondQueueCard.nextElementSibling, 'second-queue-card');
                        }
                    },
                    onEnd: () => { 
                        this.pileQueueData.length <= 1 && dojo.attr(this.pileQueueContainer, 'line-hidden', 'true');
                        dojo.destroy(queueCardContainer); 
                    }
                });

                closeQueueCardAnimation = this.pileQueueData.length > 0 ? closeQueueCardAnimation : dojo.fx.combine([closeQueueCardAnimation, this.gameui.animationHandler.animateProperty({ //make queue transparent
                    node: this.pileQueueContainer,
                    duration: 200,
                    delay: 400,
                    properties: { opacity: 0 },
                })]);

                var tiltTakenCardsAnimation = (reason == 'take') ? [] :dojo.fx.combine([]);
                if(reason == 'take'){
                    var tiltTakenCardsAnimation = [];
                    var cardWidth = this.gameui.remove_px(getComputedStyle(dojo.body()).getPropertyValue('--card-width').trim());

                    pileCards.forEach((cardDiv, index) => {
                        var cardClone = dojo.clone(cardDiv);

                        dojo.addClass(cardClone, 'card-to-animate-to-board');
                        dojo.style(cardClone, {position: 'absolute', zIndex: 2});
                        dojo.place(cardClone, 'page-content');
                        this.gameui.placeOnObject(cardClone, cardDiv);

                        cardDiv.style.opacity = 0;

                        tiltTakenCardsAnimation.push(this.gameui.animationHandler.animateProperty({
                            node: cardClone,
                            duration: 500,
                            properties: { marginTop: cardWidth * 0.36, marginLeft: cardWidth * 0.36},
                            easing: 'sineInOut',
                            delay: 200,
                            onBegin: () => { dojo.destroy(cardDiv); }
                        }));
                    });
                    tiltTakenCardsAnimation = dojo.fx.combine(tiltTakenCardsAnimation);
                }

                var fromPileAnimations = (reason == 'take') ? [] : dojo.fx.combine([]);
                if(reason == 'take'){
                    var cardDelay = Math.max(50, Math.min(120, 300 / pileCards.length));
                    var goTo = this.gameui.players[playerID].overallPlayerBoard;

                    dojo.query('.card-to-animate-to-board').forEach((cardDiv, index) => {
                        fromPileAnimations.push(this.gameui.animationHandler.animateOnObject({
                            node: cardDiv,
                            goTo: goTo,
                            duration: 200,
                            easing: 'sineInOut',
                            delay: index * cardDelay + 200,
                            onEnd: () => { this.gameui.animationHandler.fadeOutAndDestroy(cardDiv); }
                        }));
                    });

                    fromPileAnimations = dojo.fx.combine(fromPileAnimations);
                    fromPileAnimations.onEnd = () => { 
                        setTimeout(() => { dojo.addClass(goTo, 'board-bounce'); }, 80);
                        setTimeout(() => { dojo.removeClass(goTo, 'board-bounce'); }, 430);
                    }
                }

                fromPileAnimations = this.pileQueueData.length > 0 ? fromPileAnimations : dojo.fx.combine([this.gameui.animationHandler.animateProperty({ //shrink queue
                    node: this.pileQueueContainer,
                    duration: 400,
                    easing: 'sineOut',
                    delay: 200,
                    properties: this.gameui.isDesktop() ? { width: 0, marginRight: 0 } : { height: 0, marginBottom: 0 },
                    onBegin: () => { this.pileQueueContainer.style.overflow = 'hidden'; },
                    onEnd: () => { this.pileQueueContainer.style.display = 'none'; }
                }), fromPileAnimations]);

                var allAnims = dojo.fx.chain([
                    liftCardAnimation,
                    dojo.fx.combine([slideCardAnimation, closeQueueCardAnimation, tiltTakenCardsAnimation]),
                    fromPileAnimations
                ]);

                allAnims.onEnd = () => { 
                    newPileCard.style = null;
                    if(reason != 'zombie')
                        dojo.place(newPileCard, pileContainer);
                    else dojo.destroy(newPileCard);
                    
                    this.gameui.tooltipHandler.addTooltipToCards();

                    setTimeout(() => { this.gameui.releaseNotification(); }, autoPlay ? 300 : 0);
                }

                setTimeout(() => { allAnims.play(); }, autoPlay && this.gameui.isReplay() ? 0 : 300);                
            },
        });
    });

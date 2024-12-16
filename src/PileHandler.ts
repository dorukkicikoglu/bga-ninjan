class PileHandler{
    public pilesRow: HTMLDivElement;
    private pilesContainer: HTMLDivElement;
    public pileQueueContainer: HTMLDivElement;
    private pileContainers: Record<number, HTMLDivElement> = {};

    constructor(private gameui: GameBody, private pilesData: CardData[][], public pileQueueData: CardData[]) { 
        this.pilesRow = dojo.query('#game_play_area .piles-row')[0];
        this.pilesContainer = dojo.query('#game_play_area .piles-container')[0];
        this.pileQueueContainer = dojo.query('#game_play_area .pile-queue-container')[0];

        dojo.connect(this.pilesContainer, 'onclick', (event) => { this.pilesContainerClicked(event); });

        this.displayPiles();
        this.fillPileQueue();
    }

    private displayPiles(): void {
        for(let pileIndex in this.pilesData){
            let pileContainer = dojo.place(dojo.string.substitute(this.gameui.jstpl_pile_container, {pileIndex: pileIndex}), this.pilesContainer);

            for(let cardData of this.pilesData[pileIndex])
                dojo.place(dojo.create('div', {class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id}), pileContainer);

            this.pileContainers[pileIndex] = pileContainer;
        }
    }

    private fillPileQueue(): void {
        let wrapper = dojo.query('.remaining-cards-wrapper', this.pileQueueContainer)[0];
        dojo.empty(wrapper);

        for(let cardIndex in this.pileQueueData){
            let cardData = this.pileQueueData[cardIndex];

            let cardContainer = dojo.place(dojo.string.substitute(this.gameui.jstpl_queue_card, {playerName: this.gameui.divColoredPlayer(cardData.owner_id)}), wrapper);
            if(parseInt(cardIndex) == 1)
                dojo.addClass(cardContainer, 'second-queue-card');

            let aCard = dojo.create('div', {class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id});
            dojo.place(aCard, cardContainer, 'first');
        }

        if(this.pileQueueData.length > 0)
            dojo.addClass(this.pilesRow, 'expanded');

        if(this.pileQueueData.length <= 1)
            dojo.attr(this.pileQueueContainer, 'line-hidden', 'true')
    }

    public showPossiblePiles(possiblePiles: { reason: string; pile_indices: number[] }){
        if(possiblePiles.reason != 'take'){
            $('pagemaintitletext').innerHTML = (
                this.gameui.isCurrentPlayerActive() ? 
                    dojo.string.substitute(_('No pile to take... ${playerYou} must place under a pile'), {playerYou: this.gameui.divYou()}) : 
                    dojo.string.substitute(_('${playerName} must place under a pile'), {playerName: this.gameui.divColoredPlayer(this.gameui.getActivePlayerId())})
            );
            document.title = $('pagemaintitletext').innerText;
        }

        for(let pileIndex in this.pileContainers)
            this.pileContainers[pileIndex].removeAttribute('click-reason');

        if(!this.gameui.isCurrentPlayerActive())
            return;

        for(let pileIndex of possiblePiles.pile_indices)
            dojo.attr(this.pileContainers[pileIndex], 'click-reason', possiblePiles.reason);
    }

    private pilesContainerClicked(event: MouseEvent){
        if(this.gameui.isInterfaceLocked() || this.gameui.gamedatas.gamestate.name != 'takePile' || !this.gameui.isCurrentPlayerActive())
            return;

        let pileContainer = $(event.target).closest('.a-pile-container')

        if(!dojo.hasClass(pileContainer, 'a-pile-container') || !dojo.hasAttr(pileContainer, 'click-reason'))
            return;

        this.pileClicked(pileContainer);  
    }

    private pileClicked(pile: HTMLDivElement){ this.gameui.ajaxAction('actTakePile', {pileIndex: dojo.attr(pile, 'pile-index')}); }

    public onLeavingStateTakePiles(): void {
        if(this.pileQueueData.length > 0) 
            return; 

        dojo.removeClass(this.pilesRow, 'expanded'); 
        dojo.removeAttr(this.pileQueueContainer, 'line-hidden'); 
        dojo.removeAttr(this.pileQueueContainer, 'width-set');
        this.pileQueueContainer.removeAttribute('style');
    }

    public animatePileQueue(pileQueueDataIn: CardData[], autoPlay: boolean){
        if(autoPlay){
            setTimeout(() => { this.animatePileQueue(pileQueueDataIn, false); }, 600); //autoPlay delay is 600ms so slideAnimations happens in max 900ms
            return;
        }

        this.pileQueueData = pileQueueDataIn;
        let isDesktop = this.gameui.isDesktop();

        let pilesContainerClone = dojo.clone(this.pilesContainer);
        dojo.style(pilesContainerClone, {position: 'absolute', top: '0px', left: '0px'});
        if(!isDesktop) 
            pilesContainerClone.style.width = '100%'; //otherwise piles dont fit horizontally on mobile
        dojo.place(pilesContainerClone, this.pilesRow);

        this.gameui.placeOnObject(pilesContainerClone, this.pilesContainer);

        this.fillPileQueue();
        dojo.query('.a-card', this.pileQueueContainer).forEach((node) => { node.style.opacity = 0; });

        let marginProps = isDesktop ? ['width', 'paddingLeft', 'paddingRight'] : ['height', 'paddingTop', 'paddingBottom'];
        marginProps.forEach(prop => this.pileQueueContainer.style[prop] = '0px');
        let queueArrows = dojo.query('.queue-arrows-container', this.pileQueueContainer)[0];
        queueArrows.style.display = 'none';
        dojo.query('.player-name-text', this.pileQueueContainer).forEach((playerNameText) => { playerNameText.style.opacity = 0; });

        let pileQueueContainerClone = dojo.clone(this.pileQueueContainer);
        dojo.style(pileQueueContainerClone, {position: 'absolute', overflow: 'hidden'});
        dojo.place(pileQueueContainerClone, this.pilesRow);
        this.gameui.placeOnObject(pileQueueContainerClone, this.pileQueueContainer);

        this.pileQueueContainer.removeAttribute('style');

        this.pilesContainer.style.opacity = '0';
        this.pileQueueContainer.style.opacity = '0';

        let queueOffset = this.gameui.getPos(this.pileQueueContainer).x - this.gameui.getPos(pileQueueContainerClone).x;

        let expandAnimations = dojo.fx.combine([
            this.gameui.animationHandler.animateOnObject({
                node: pilesContainerClone,
                goTo: this.pilesContainer,
                duration: 200,
                easing: 'sineOut',
                onEnd: () => { this.pilesContainer.removeAttribute('style'); dojo.destroy(pilesContainerClone); }
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
                onEnd: () => { this.pileQueueContainer.removeAttribute('style'); queueArrows.style.cssText = ''; dojo.destroy(pileQueueContainerClone); }
            })
        ]);

        let slideAnimations = [];
        let queueCardContainers = dojo.query('.a-queue-card-container', this.pileQueueContainer);

        for(let cardIndex in this.pileQueueData){
            let cardData = this.pileQueueData[parseInt(cardIndex)];
            let cardDivQuery: HTMLDivElement[] = dojo.query('.my-hand-container .a-card[card-id=' + cardData.card_id + ']');
            let onBeginCardAnimation = () => {};
            let cardDiv : HTMLDivElement;

            if(cardDivQuery.length > 0){
                let cardDivToKill = cardDivQuery[0];
                
                dojo.removeClass(cardDivToKill, 'selection-confirmed');

                cardDiv = dojo.clone(cardDivToKill);
                
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

                let playerBoard = this.gameui.players[cardData.owner_id].overallPlayerBoard;
                dojo.place(cardDiv, 'page-content');
                this.gameui.placeOnObject(cardDiv, playerBoard);
                cardDiv.style.opacity = '0';

                onBeginCardAnimation = dojo.hitch(this, function(cardDiv){ cardDiv.style.opacity = 1; }, cardDiv);
            }

            let queueCardContainer = queueCardContainers[parseInt(cardIndex)];
            let goTo = dojo.query('.a-card', queueCardContainer)[0];

            let onBegin = dojo.hitch(this, function(queueCardContainer, onBeginCardAnimation){
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

        (slideAnimations as any).onEnd = () => { setTimeout(() => { 
            if(this.gameui.myself)
                this.gameui.myself.hand.setHandCountAttrForMobileResizing(true); 

            this.gameui.tooltipHandler.addNewPlayedCard(this.pileQueueData);
            this.gameui.releaseNotification(); 
        }, 200); };

        dojo.fx.combine([expandAnimations, slideAnimations]).play();
    }

    public animatePileTaken(playerID: number, pileIndex: number, selectedCardData: CardData, reason: string, autoPlay: boolean, cardIconsData: any): void {
        if(reason != 'zombie'){ //update status text if not zombie
            if(reason == 'take')
                this.pilesData[pileIndex] = [];

            this.pilesData[pileIndex].push(new CardData(selectedCardData.card_id, selectedCardData.suit, selectedCardData.rank, pileIndex, this.pilesData[pileIndex].length));

            //update status text
            let playerName = this.gameui.divColoredPlayer(playerID);
            let isMe = this.gameui.myself && playerID == this.gameui.myself.playerID;
            let statusBarHTML = dojo.string.substitute(
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

        let selectedCardID = selectedCardData.card_id;
        
        this.pileQueueData = this.pileQueueData.filter(obj => obj.card_id !== selectedCardID);
        
        let pileContainer = this.pileContainers[pileIndex];
        let pileCards = dojo.query('.a-card', pileContainer);

        let cardDiv = dojo.query('.a-card[card-id=' + selectedCardID + ']', this.pileQueueContainer)[0];
        let queueCardContainer = $(cardDiv).closest('.a-queue-card-container');

        let newPileCard = dojo.clone(cardDiv);
        let newCardTop = 0;

        if(reason != 'zombie'){
            let tempClone = dojo.clone(newPileCard);
            dojo.place(tempClone, pileContainer, reason == 'take' ? 'first' : 'last');
            newCardTop = tempClone.offsetTop;
            dojo.destroy(tempClone);
        }
        
        cardDiv.style.opacity = 0;
        
        dojo.style(newPileCard, {position: 'absolute', zIndex: 1, margin: 0});
        dojo.place(newPileCard, reason != 'zombie' ? pileContainer : 'page-content');
        this.gameui.placeOnObject(newPileCard, cardDiv);
        this.pilesContainer.style.zIndex = '1';

        let liftCardAnimation = this.gameui.animationHandler.animateProperty({ //lift card
            node: newPileCard, 
            easing: 'sineIn',
            properties: {top: dojo.style(newPileCard, 'top') - 60, left: dojo.style(newPileCard, 'left') + Math.random() * 10 + 10},
            duration: 200,
            delay: autoPlay || this.gameui.isReplay() ? 0 : 500
        });

        let slideCardAnimation = reason != 'zombie' ?
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

        let closeQueueCardAnimation = this.gameui.animationHandler.animateProperty({ //close card's prev. queue container
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

                let playerNameText = dojo.query('.player-name-text', queueCardContainer)[0];
                let playerNameTextClone = dojo.clone(playerNameText);
                dojo.place(playerNameTextClone, 'page-content');
                this.gameui.placeOnObject(playerNameTextClone, playerNameText);                                    
                dojo.destroy(playerNameText);
                this.gameui.animationHandler.fadeOutAndDestroy(playerNameTextClone);

                let secondQueueCard = dojo.query('.second-queue-card', this.pileQueueContainer);
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

        let tiltTakenCardsAnimation = (reason == 'take') ? [] : dojo.fx.combine([]);
        if(reason == 'take'){
            tiltTakenCardsAnimation = [];
            let cardWidth = this.gameui.remove_px(getComputedStyle(dojo.body()).getPropertyValue('--card-width').trim());

            pileCards.forEach((cardDiv, index) => {
                let cardClone = dojo.clone(cardDiv);

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
        
        let fromPileAnimations = (reason == 'take') ? [] : dojo.fx.combine([]);
        if(reason == 'take'){
            let cardDelay = Math.max(50, Math.min(120, 300 / pileCards.length));
            let goTo = this.gameui.players[playerID].overallPlayerBoard;

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

        let allAnims = dojo.fx.chain([
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
    }
}
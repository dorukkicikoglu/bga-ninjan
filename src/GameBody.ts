// @ts-ignore
GameGui = (function () { // this hack required so we fake extend GameGui
  function GameGui() {}
  return GameGui;
})();

// Note: it does not really extend it in es6 way, you cannot call super you have to use dojo way 
class GameBody extends GameGui { 
    private imageLoader: ImageLoadHandler;
    public animationHandler: AnimationHandler;
    public players: Record<number, PlayerHandler> = {};
    public myself: PlayerHandler;
    private pileHandler: PileHandler;
    public prefHandler: PrefHandler;
    public backgroundHandler: BackgroundHandler;
    public tooltipHandler: TooltipHandler;
    public logMutationObserver: LogMutationObserver;

    public readonly jstpl_card_icon ='<div class="a-card-icon" suit="${suit}" rank="${rank}" card-id="${card_id}"></div>';
    public readonly jstpl_pile_container ='<div class="a-pile-container" pile-index="${pileIndex}"><i class="place-under-icon fa6 fa-share"></i></div>';
    public readonly jstpl_queue_card ='<div class="a-queue-card-container"><div class="player-name-text">${playerName}</div></div>';
    public readonly jstpl_background_container ='<div class="background-container"><div class="bg-front"></div><div class="bg-paper"></div><div class="bg-rock bg-breathing"></div><div class="bg-front bg-front-transparent"></div><div class="bg-ref-card"></div><div class="bg-scissors"></div></div>';
    public readonly jstpl_tooltip_wrapper ='<div class="tooltip-wrapper"><div class="tooltip-title">${tooltip_title}</div><div class="suits-container">${suit_rows}</div></div>';

    constructor() {
        super();

        console.log('ninjan constructor');
    }
     
    public setup(gamedatas: any) {
        console.log( "Starting game setup" );
        this.imageLoader = new ImageLoadHandler(this, ['ninjan-cards', 'bg-front']);

        this.animationHandler = new AnimationHandler(this);
        this.prefHandler = new PrefHandler(this, gamedatas.pref_names);
        this.backgroundHandler = new BackgroundHandler(this);

        dojo.query('.my-hand-container .my-hand-title')[0].innerHTML = _('Your hand');

        // Setting up player boards
        for(let player_id in gamedatas.players)
        {
            const {name, color, player_no} = this.gamedatas.players[player_id];
            this.players[player_id] = new PlayerHandler(this, parseInt(player_id), name, color, parseInt(player_no));
        }
        
        if(this.players.hasOwnProperty(this.player_id)){
            this.myself = this.players[this.player_id];
            this.myself.setHand(gamedatas.my_hand, gamedatas.sort_cards_by, gamedatas.selectedCardID || null);
        
            document.documentElement.style.setProperty('--player-color', '#' + this.myself.playerColor);
        } else {
            dojo.query('.my-hand-container')[0].style.display = 'none';
        }

        this.preloadFont();

        this.pileHandler = new PileHandler(this, this.gamedatas.pilesData, this.gamedatas.pileQueueData);

        if(this.gamedatas.gamestate.name == 'gameEnd' && this.pileHandler.pileQueueData.length > 0) //show pileQueue at gameEnd if it has elements
            this.pileHandler.pileQueueContainer.style.display = 'inline-block';

        this.tooltipHandler = new TooltipHandler(this, gamedatas.played_cards);
        this.logMutationObserver = new LogMutationObserver(this);

        // Setup game notifications to handle (see "setupNotifications" method below)
        this.setupNotifications();

        console.log( "Ending game setup" );
    } 

    public onEnteringState(stateName: string, args: any) {
        console.log( 'Entering state: '+stateName, args );
            
        switch( stateName )
        {
            case 'selectCard':
                if(this.myself)
                    this.myself.hand.updateConfirmedSelection(args.args._private.selected_card_id, false);
                break;

            case 'takePile':
                dojo.addClass(this.pileHandler.pilesRow, 'expanded');

                this.pileHandler.showPossiblePiles(args.args.possible_piles);
                break;

            case 'dummmy':
                break;
        }
    }

    public onLeavingState(stateName: string) {
        console.log( 'Leaving state: '+stateName );

        switch( stateName )
        {
            case 'selectCard':
                if(!this.myself)
                    return;
                this.myself.hand.onLeavingStateSelectCards();
            case 'takePile':
                this.pileHandler.onLeavingStateTakePiles();
            break;
        }
    }

    public onUpdateActionButtons(stateName: string, args: any) {
        console.log( 'onUpdateActionButtons: '+stateName, args );
                  
        switch( stateName )
        {
             case 'selectCard':
                let titleContainer = $('pagemaintitletext');
                titleContainer.innerHTML = '<span class="select-card-menu"><span class="status-text">' + titleContainer.innerHTML + '</span><span class="selected-card-container" style="display: none;"></span></span>';

                if(this.myself)
                    this.myself.hand.updateStatusTextUponCardSelection();
            break;
        }
    } 

    public setupNotifications() {
        console.log( 'notifications subscriptions setup' );
            
        dojo.subscribe('notif_cardSelectionConfirmed', this, "notif_cardSelectionConfirmed" );
        dojo.subscribe('notif_cardSelectionReverted', this, "notif_cardSelectionReverted" );
        dojo.subscribe('notif_animateSelectedCards', this, "notif_animateSelectedCards");
        dojo.subscribe('notif_animatePileTaken', this, "notif_animatePileTaken");
        dojo.subscribe('notif_endingGameNoCardCanBeTaken', this, "notif_endingGameNoCardCanBeTaken");

        const synchronousEvents = ['notif_animateSelectedCards', 'notif_animatePileTaken', 'notif_endingGameNoCardCanBeTaken'];
        synchronousEvents.forEach(event => { this.notifqueue.setSynchronous(event); });
    }

    public releaseNotification(){ this.notifqueue.setSynchronousDuration(0); }

    public notif_cardSelectionConfirmed(notif): void {
        console.log('notif_cardSelectionConfirmed');
        console.log(notif);

        this.myself.hand.updateConfirmedSelection(notif.args.confirmed_selected_card_id, notif.args.pre_selection);
    }

    public notif_cardSelectionReverted(notif): void {
        console.log('notif_cardSelectionReverted');
        console.log(notif);

        this.myself.hand.updateConfirmedSelection(false, notif.args.pre_selection);
    }

    public notif_animateSelectedCards(notif): void {
        console.log('notif_animateSelectedCards');
        console.log(notif);

        if(notif.args.is_final_round)
            this.updateStatusText('Final round! Revealing cards...')

        setTimeout(() => { this.pileHandler.animatePileQueue(notif.args.pile_queue_data, notif.args.auto_play); });
    }

    public notif_animatePileTaken(notif): void {
        console.log('notif_animatePileTaken');
        console.log(notif);

        if(parseInt(notif.args.new_score) == notif.args.new_score)
            this.scoreCtrl[notif.args.player_id].toValue(notif.args.new_score);

        this.pileHandler.animatePileTaken(notif.args.player_id, notif.args.pile_index, notif.args.selected_card_data, notif.args.reason, notif.args.autoPlay, notif.args.card_icons_data || [] );
    }

    public notif_endingGameNoCardCanBeTaken(notif): void {
        console.log('notif_endingGameNoCardCanBeTaken');
        console.log(notif);

        this.updateStatusText('No more cards can be taken. Ending the game');
        this.dotTicks($('pagemaintitletext'));

        setTimeout(() => { this.releaseNotification(); }, 5000);
    }

    //utility functions
    private format_string_recursive(log, args) {
        try {
            log = _(log);
            if (log && args && !args.processed) {
                args.processed = true;

                // list of special keys we want to replace with images
                let keys = ['textPlayerID', 'LOG_CLASS', 'CARD_ICONS_STR', 'ARROW_LEFT', 'ARROW_DOWN', 'REVEALED_CARDS_DATA_STR', 'NO_MORE_CARDS', 'PILE_NUM'];
                for(let key of keys) {
                    if(key in args) {
                        if(key == 'textPlayerID')
                            args['textPlayerID'] = this.divColoredPlayer(args['textPlayerID']);
                        else if(key == 'LOG_CLASS')
                            log = log + '<div log-class-tag="' + args['LOG_CLASS'] + '"></div>';
                        else if(key == 'CARD_ICONS_STR')
                            args['CARD_ICONS_STR'] = '<div class="card-icons-container">' + this.createCardIcons(args['CARD_ICONS']) + '</div>';
                        else if(key == 'REVEALED_CARDS_DATA_STR')
                            args['REVEALED_CARDS_DATA_STR'] = this.createLogSelectedCards(args['REVEALED_CARDS_DATA']);
                        else if(key == 'ARROW_LEFT')
                            args['ARROW_LEFT'] = '<div class="log-arrow log-arrow-left">⇐</div>';
                        else if(key == 'ARROW_DOWN')
                            args['ARROW_DOWN'] = '<i class="log-arrow place-under-icon fa6 fa-share"></i>';
                        else if(key == 'PILE_NUM')
                            args['PILE_NUM'] = '';
                    }
                }
            }
        } catch (e) {
            console.error(log,args,"Exception thrown", e.stack);
        }
        return (this as any).inherited(arguments);
    }
    public divYou(attributes = {}): string {
        let color = this.gamedatas.players[this.player_id].color;
        let color_bg = "";
        if (this.gamedatas.players[this.player_id] && this.gamedatas.players[this.player_id].color_back) {
            color_bg = "background-color:#" + this.gamedatas.players[this.player_id.toString()].color_back + ";";
        }
        attributes['player-color'] = color;
        let html = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + __("lang_mainsite", "You") + "</span>";
        return html;
    }
    public divColoredPlayer(player_id, attributes = {}, detectYou = true): string {
        if(detectYou && parseInt(player_id) === parseInt(this.player_id))
            return this.divYou(attributes);

        player_id = player_id.toString();

        let color = this.gamedatas.players[player_id].color;
        let color_bg = "";
        if (this.gamedatas.players[player_id] && this.gamedatas.players[player_id].color_back) {
            color_bg = "background-color:#" + this.gamedatas.players[player_id].color_back + ";";
        }
        attributes['player-color'] = color;
        let html = "<span style=\"color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + this.gamedatas.players[player_id].name + "</span>";
        return html;
    }
    private getAttributesHTML(attributes): string{ return Object.entries(attributes || {}).map(([key, value]) => `${key}="${value}"`).join(' '); }
    public getPos(node: HTMLDivElement): Record<string, number> { let pos = this.getBoundingClientRectIgnoreZoom(node); pos.w = pos.width; pos.h = pos.height; return pos; }
    public onGameUserPreferenceChanged(){}
    public isDesktop(): boolean { return dojo.hasClass(dojo.body(), 'desktop_version'); }
    public isMobile(): boolean { return dojo.hasClass(dojo.body(), 'mobile_version'); }
    public updateStatusText(statusText): void{ $('gameaction_status').innerHTML = statusText; $('pagemaintitletext').innerHTML = statusText; }
    public changeTitleTemp(tempHTML = false) {
        const titleText = $('pagemaintitletext');
        dojo.query('.temp-span', titleText.parentNode).forEach(dojo.destroy);
        
        if(!tempHTML){ //remove temp title
            dojo.removeClass(titleText, 'temporarily-invisible');
            return;
        }

        dojo.addClass(titleText, 'temporarily-invisible');
        const tempSpan = dojo.create('span', {class: 'temp-span'});
        tempSpan.innerHTML = tempHTML;
        dojo.place(tempSpan, titleText, 'after');

        setTimeout(() => {
            if(!document.contains(tempSpan))
                return;

            this.animationHandler.animateProperty({
                node: tempSpan,
                duration: 200,
                properties: {opacity: 0},
                onEnd: () => { this.changeTitleTemp(); }
            }).play();
        }, 3000);
    }
    public ajaxAction(action: string, args: Record<string, any> = {}, lock: boolean = true, checkAction: boolean = true): void{
        args.version = this.gamedatas.version;
        this.bgaPerformAction(action, args, { lock: lock, checkAction: checkAction });
    }
    public createCardIcons(cardIconsData: CardData[] | { [key: string]: CardData }): string {
        let html: string = '';

        if (Array.isArray(cardIconsData)) {
            for (let iconData of cardIconsData){
                html += dojo.string.substitute(this.jstpl_card_icon, { card_id: iconData.card_id, suit: iconData.suit, rank: iconData.rank });
            }
        } else {
            for (let key in cardIconsData)
                html += dojo.string.substitute(this.jstpl_card_icon, { card_id: cardIconsData[key].card_id, suit: cardIconsData[key].suit, rank: cardIconsData[key].rank });
        }
        return html;
    }
    createLogSelectedCards(cardsData: CardData[]): string {
        let logHTML = '';
        cardsData.forEach((cardData) => { logHTML += '<div class="player-selected-card-row">' + this.divColoredPlayer(cardData.owner_id, {class: 'playername'}, false) + '<div class="log-arrow log-arrow-right">➜</div><div class="card-icons-container">' + this.createCardIcons([cardData]) + '</div></div>'; });
        return logHTML;
    }
    private preloadFont(): void{
        let preloadLink: HTMLLinkElement = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.href = g_themeurl + 'css/font/roboto/Roboto-Black.woff2'; // Adjust this URL to the correct one based on the weight/style you're using
        preloadLink.as = 'font';
        preloadLink.type = 'font/woff2';
        preloadLink.crossOrigin = 'anonymous';
        document.head.appendChild(preloadLink);
    }
    public cloneCard(cardToClone: HTMLDivElement): HTMLDivElement{
        let cardClone: HTMLDivElement = dojo.clone(cardToClone);
        let cardWidth: string = getComputedStyle(cardToClone).getPropertyValue('--card-width').trim();

        cardClone.style.setProperty('--card-width', cardWidth);
        dojo.style(cardClone, 'position', 'absolute');
        dojo.addClass(cardClone, 'a-card-clone');

        return cardClone;
    }
    public getCardsStrength(inputArr: CardData[] = []){
        let sum = 0;
        for(let key in inputArr)
            sum += Math.abs(inputArr[key].rank);

        let strength = 10000 * inputArr.length + sum;
        return strength;
    }
    public isReplay(): boolean { return typeof g_replayFrom != 'undefined' || g_archive_mode; }
    public remove_px(str: string): number {
        str = str.trim();
        if (!isNaN(parseInt(str)) && str === parseInt(str).toString())
            return parseInt(str);
        const result = parseInt(str.toLowerCase().replace(/px/g, ''));
        return isNaN(result) ? 0 : result;
    }
    public rgbToHex(rgb: string): string { // Extract the numeric values using a regex
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match){
            this.printDebug('-- rgb --', rgb);
            throw new Error("Invalid RGB format");
        }

        // Convert each component to a two-character hexadecimal
        const [, r, g, b] = match;
        return [r, g, b]
            .map((num) => {
                const hex = parseInt(num, 10).toString(16);
                return hex.padStart(2, '0'); // Ensure two digits
            })
            .join(''); // Combine into a single string
    }
    public dotTicks(waitingTextContainer: HTMLDivElement){
        let dotInterval: number;

        let loaderSpan = dojo.create('span', {class: 'loader-span', style: 'display: inline-block; width: 24px; text-align: left;', dots: 0});
        dojo.place(loaderSpan, waitingTextContainer, 'after');

        let dotTick = () => {
            if (!document.body.contains(waitingTextContainer)) 
                return clearInterval(dotInterval);

            let dotCount = parseInt(dojo.attr(loaderSpan, 'dots'));
            loaderSpan.innerHTML = '.'.repeat(dotCount);

            dojo.attr(loaderSpan, 'dots', (dotCount + 1) % 4);
        }
        dotTick();
        dotInterval = setInterval(dotTick, 500);
    }
    public showTopBarTooltip(message, className = '', destroyTimeOut: number | false = false){
        const tooltip = new dijit.TooltipDialog({
            content: message,
            class: 'a-top-bar-tooltip ' + className
        });

        dijit.popup.open({
            popup: tooltip,
            around: dojo.byId('ingame_menu_wheel')
        });

        dojo.byId('topbar').appendChild(tooltip.domNode.parentNode); // Reparent the popup for z-index control

        if(typeof destroyTimeOut === "number")
            setTimeout(() => { dijit.popup.close(tooltip); tooltip.destroy(); }, destroyTimeOut);
    }
    public printDebug(...args: any[]): void{ args[0] = typeof args[0] == 'string' ? '*** ' + args[0] : args[0]; console.log(...args); }
}

class CardData{
    public owner_id: number;
    public pile_index: number;
    public location_on_pile: number;

    constructor(public card_id: number, public suit: number, public rank: number, pile_index?: number, location_on_pile?: number) {
        if (pile_index !== undefined)
            this.pile_index = pile_index;

        if (location_on_pile !== undefined)
            this.location_on_pile = location_on_pile;
    }
}
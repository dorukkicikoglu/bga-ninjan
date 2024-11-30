/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * Ninjan implementation : © Doruk Kicikoglu <doruk.kicikoglu@gmail.com>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * ninjan.js
 *
 * Ninjan user interface script
 * 
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

define([
    "dojo","dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    g_gamethemeurl + "modules/js/NJNAnimationHandler.js",
    g_gamethemeurl + "modules/js/NJNPlayerHandler.js",
    g_gamethemeurl + "modules/js/NJNHandHandler.js",
    g_gamethemeurl + "modules/js/NJNPileHandler.js",
    g_gamethemeurl + "modules/js/NJNPrefHandler.js",
    g_gamethemeurl + "modules/js/NJNBackgroundHandler.js",
    g_gamethemeurl + "modules/js/NJNTooltipHandler.js",
    g_gamethemeurl + "modules/js/NJNLogMutationObserver.js",
    g_gamethemeurl + "modules/js/NJNImageLoadHandler.js"
],
function (dojo, declare) {
    return declare("bgagame.ninjan", ebg.core.gamegui, {
        constructor: function(){
            console.log('ninjan constructor');

            this.players = {};
            this.myself = null;
            this.pileHandler = null;
            this.prefHandler = null;
            this.backgroundHandler = null;
            this.tooltipHandler = null;
            this.logMutationObserver = null;

            this.jstpl_card_icon ='<div class="a-card-icon" suit="${suit}" rank="${rank}" card-id="${card_id}"></div>';
            this.jstpl_pile_container ='<div class="a-pile-container" pile-index="${pileIndex}"><i class="place-under-icon fa6 fa-share"></i></div>';
            this.jstpl_queue_card ='<div class="a-queue-card-container"><div class="player-name-text">${playerName}</div></div>';
            this.jstpl_background_container ='<div class="background-container"><div class="bg-front"></div><div class="bg-paper"></div><div class="bg-rock bg-breathing"></div><div class="bg-front bg-front-transparent"></div><div class="bg-scissors"></div></div>';
            this.jstpl_tooltip_wrapper ='<div class="tooltip-wrapper"><div class="tooltip-title">${tooltip_title}</div><div class="suits-container">${suit_rows}</div></div>';

            this.imageLoader = new bgagame.ImageLoadHandler(this, ['ninjan-cards', 'bg-front']);
        },
        
        /*
            setup:
            
            This method must set up the game user interface according to current game situation specified
            in parameters.
            
            The method is called each time the game interface is displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)
            
            "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
        */
        
        setup: function( gamedatas )
        {
            console.log( "Starting game setup" );

            this.animationHandler = new bgagame.AnimationHandler(this);
            this.prefHandler = new bgagame.PrefHandler(this, gamedatas.pref_names);
            this.backgroundHandler = new bgagame.BackgroundHandler(this);

            dojo.query('.my-hand-container .my-hand-title')[0].innerHTML = _('Your hand');

            // Setting up player boards
            for( var player_id in gamedatas.players )
            {
                const {name, color, player_no} = this.gamedatas.players[player_id];
                this.players[player_id] = new bgagame.PlayerHandler(this, player_id, name, color, parseInt(player_no));
            }
            
            if(this.players.hasOwnProperty(this.player_id)){
                this.myself = this.players[this.player_id];
                this.myself.setHand(gamedatas.my_hand, gamedatas.sort_cards_by, gamedatas.selectedCardID || null);
            
                document.documentElement.style.setProperty('--player-color', '#' + this.myself.playerColor);
            } else {
                dojo.query('.my-hand-container')[0].style.display = 'none';
            }

            this.preloadFont();

            this.pileHandler = new bgagame.PileHandler(this, this.gamedatas.pilesData, this.gamedatas.pileQueueData);

            if(this.gamedatas.gamestate.name == 'gameEnd' && this.pileHandler.pileQueueData.length > 0) //show pileQueue at gameEnd if it has elements
                this.pileHandler.pileQueueContainer.style.display = 'inline-block';

            this.tooltipHandler = new bgagame.TooltipHandler(this, gamedatas.played_cards);
            this.logMutationObserver = new bgagame.LogMutationObserver(this);

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            console.log( "Ending game setup" );
        },
       

        ///////////////////////////////////////////////////
        //// Game & client states
        
        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args )
        {
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
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
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
        }, 

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //        
        onUpdateActionButtons: function( stateName, args )
        {
            console.log( 'onUpdateActionButtons: '+stateName, args );
                      
            switch( stateName )
            {
                 case 'selectCard':
                    var titleContainer = $('pagemaintitletext');
                    titleContainer.innerHTML = '<span class="select-card-menu"><span class="status-text">' + titleContainer.innerHTML + '</span><span class="selected-card-container" style="display: none;"></span></span>';

                    if(this.myself)
                        this.myself.hand.updateStatusTextUponCardSelection();
                break;
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods
        
        /*
        
            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.
        
        */

        /** Override this function to inject html into log items. This is a built-in BGA method.  */
        /* @Override */
        format_string_recursive: function format_string_recursive(log, args) {
            try {
                log = _(log);
                if (log && args && !args.processed) {
                    args.processed = true;

                    // list of special keys we want to replace with images
                    var keys = ['textPlayerID', 'LOG_CLASS', 'CARD_ICONS_STR', 'ARROW_LEFT', 'ARROW_DOWN', 'REVEALED_CARDS_DATA_STR', 'NO_MORE_CARDS', 'PILE_NUM'];
                    for(var key of keys) {
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
            return this.inherited({callee: format_string_recursive}, arguments);
        },

        getPos: function(node) { var pos = this.getBoundingClientRectIgnoreZoom(node); pos.w = pos.width; pos.h = pos.height; return pos; },

        /* Implementation of proper colored You with background in case of white or light colors  */
 
        divYou: function(attributes = {}) {
            var color = this.gamedatas.players[this.player_id].color;
            var color_bg = "";
            if (this.gamedatas.players[this.player_id] && this.gamedatas.players[this.player_id].color_back) {
                color_bg = "background-color:#" + this.gamedatas.players[this.player_id.toString()].color_back + ";";
            }
            attributes['player-color'] = color;
            var html = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + __("lang_mainsite", "You") + "</span>";
            return html;
        },

        /* Implementation of proper colored player name with background in case of white or light colors  */

        divColoredPlayer: function(player_id, attributes = {}, detectYou = true) {
            if(detectYou && parseInt(player_id) === parseInt(this.player_id))
                return this.divYou(attributes);

            player_id = player_id.toString();

            var color = this.gamedatas.players[player_id].color;
            var color_bg = "";
            if (this.gamedatas.players[player_id] && this.gamedatas.players[player_id].color_back) {
                color_bg = "background-color:#" + this.gamedatas.players[player_id].color_back + ";";
            }
            attributes['player-color'] = color;
            var html = "<span style=\"color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + this.gamedatas.players[player_id].name + "</span>";
            return html;
        },
        getAttributesHTML: function(attributes){ return Object.entries(attributes || {}).map(([key, value]) => `${key}="${value}"`).join(' '); },

        isDesktop: function () { return dojo.hasClass(dojo.body(), 'desktop_version'); },
        isMobile: function () { return dojo.hasClass(dojo.body(), 'mobile_version'); },

        updateStatusText(statusText){
            $('gameaction_status').innerHTML = statusText;
            $('pagemaintitletext').innerHTML = statusText;
        },

        changeTitleTemp(tempHTML = false) {
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
        },

        createLogSelectedCards(cardsData){
            var logHTML = '';
            cardsData.forEach((cardData) => { logHTML += '<div class="player-selected-card-row">' + this.divColoredPlayer(cardData.owner_id, {class: 'playername'}, false) + '<div class="log-arrow log-arrow-right">➜</div><div class="card-icons-container">' + this.createCardIcons([cardData]) + '</div></div>'; });
            return logHTML;
        },

        preloadFont(){
            var preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.href = g_themeurl + 'css/font/roboto/Roboto-Black.woff2'; // Adjust this URL to the correct one based on the weight/style you're using
            preloadLink.as = 'font';
            preloadLink.type = 'font/woff2';
            preloadLink.crossOrigin = 'anonymous';
            document.head.appendChild(preloadLink);
        },

        createCardIcons: function(cardIconsData){
            var html = '';

            if(Array.isArray(cardIconsData)) {
                for(let iconData of cardIconsData)
                    html += dojo.string.substitute(this.jstpl_card_icon, { card_id: iconData.card_id, suit: iconData.suit, rank: iconData.rank });
            } else {
                for(let key in cardIconsData)
                    html += dojo.string.substitute(this.jstpl_card_icon, { card_id: cardIconsData[key].card_id, suit: cardIconsData[key].suit, rank: cardIconsData[key].rank });
            }
            return html;
        },

        cloneCard: function(cardToClone){
            var cardClone = dojo.clone(cardToClone);
            var cardWidth = getComputedStyle(cardToClone).getPropertyValue('--card-width').trim();

            cardClone.style.setProperty('--card-width', cardWidth);
            dojo.style(cardClone, 'position', 'absolute');
            dojo.addClass(cardClone, 'a-card-clone');

            return cardClone;
        },

        getCardsStrength(inputArr = false){
            var sum = 0;
            for(var key in inputArr)
                sum += Math.abs(parseInt(inputArr[key].rank));

            var strength = 10000 * inputArr.length + sum;
            return strength;
        },

        isReplay() { return typeof g_replayFrom != 'undefined' || g_archive_mode; },

        remove_px(str) { if(str == parseInt(str)) { return parseInt(str); } str = (str + "").toLowerCase(); while (str.indexOf("px") > 0) {str = str.replace("px", "");} str = parseInt(str); return str; },

        rgbToHex(rgb) { // Extract the numeric values using a regex
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
        },

        dotTicks(waitingTextContainer){
            var dotInterval = false;

            var loaderSpan = dojo.create('span', {class: 'loader-span', style: 'display: inline-block; width: 24px; text-align: left;', dots: 0});
            dojo.place(loaderSpan, waitingTextContainer, 'after');

            var dotTick = () => {
                if (!document.body.contains(waitingTextContainer)) 
                    return clearInterval(dotInterval);

                var dotCount = parseInt(dojo.attr(loaderSpan, 'dots'));
                loaderSpan.innerHTML = '.'.repeat(dotCount);

                dojo.attr(loaderSpan, 'dots', (dotCount + 1) % 4);
            }
            dotTick();
            dotInterval = setInterval(dotTick, 500);
        },

        showTopBarTooltip(message, className = '', destroyTimeOut = false){
            const tooltip = new dijit.TooltipDialog({
                content: message,
                class: 'a-top-bar-tooltip ' + className
            });

            dijit.popup.open({
                popup: tooltip,
                around: dojo.byId('ingame_menu_wheel')
            });

            dojo.byId('topbar').appendChild(tooltip.domNode.parentNode); // Reparent the popup for z-index control

            if(destroyTimeOut)
                setTimeout(() => { dijit.popup.close(tooltip); tooltip.destroy(); }, destroyTimeOut);
        },

        printDebug:function(...args){ args[0] = typeof args[0] == 'string' ? '*** ' + args[0] : args[0]; console.log(...args); },

        ///////////////////////////////////////////////////
        //// Player's action
        
        /*
        
            Here, you are defining methods to handle player's action (ex: results of mouse click on 
            game objects).
            
            Most of the time, these methods:
            _ check the action is possible at this game state.
            _ make a call to the game server
        
        */
        
        ajaxcallwrapper: function(action, args = {}, lock = true, checkAction = true, handler) {            
            args.version = this.gamedatas.version;
            this.bgaPerformAction(action, args, { lock: lock, checkAction: checkAction });
        },

        isViewOnly() {
            return this.isSpectator || typeof g_replayFrom != 'undefined' || g_archive_mode;
        },
        
        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:
            
            In this method, you associate each of your game notifications with your local method to handle it.
            
            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your ninjan.game.php file.
        
        */
        setupNotifications: function()
        {
            console.log( 'notifications subscriptions setup' );
            
            dojo.subscribe('notif_cardSelectionConfirmed', this, "notif_cardSelectionConfirmed" );
            dojo.subscribe('notif_cardSelectionReverted', this, "notif_cardSelectionReverted" );
            dojo.subscribe('notif_animateSelectedCards', this, "notif_animateSelectedCards");
            dojo.subscribe('notif_animatePileTaken', this, "notif_animatePileTaken");
            dojo.subscribe('notif_endingGameNoCardCanBeTaken', this, "notif_endingGameNoCardCanBeTaken");

            const synchronousEvents = ['notif_animateSelectedCards', 'notif_animatePileTaken', 'notif_endingGameNoCardCanBeTaken'];
            synchronousEvents.forEach(event => { this.notifqueue.setSynchronous(event); });
        },

        releaseNotification(){ this.notifqueue.setSynchronousDuration(0); },

        notif_cardSelectionConfirmed: function(notif)
        {
            console.log('notif_cardSelectionConfirmed');
            console.log(notif);

            this.myself.hand.updateConfirmedSelection(notif.args.confirmed_selected_card_id, notif.args.pre_selection);
        },

        notif_cardSelectionReverted: function(notif)
        {
            console.log('notif_cardSelectionReverted');
            console.log(notif);

            this.myself.hand.updateConfirmedSelection(false, notif.args.pre_selection);
        },

        notif_animateSelectedCards: function(notif)
        {
            console.log('notif_animateSelectedCards');
            console.log(notif);

            if(notif.args.is_final_round)
                this.updateStatusText('Final round! Revealing cards...')

            setTimeout(() => { this.pileHandler.animatePileQueue(notif.args.pile_queue_data, notif.args.auto_play); });
        },

        notif_animatePileTaken: function(notif)
        {
            console.log('notif_animatePileTaken');
            console.log(notif);

            if(parseInt(notif.args.new_score) == notif.args.new_score)
                this.scoreCtrl[notif.args.player_id].toValue(notif.args.new_score);

            this.pileHandler.animatePileTaken(notif.args.player_id, notif.args.pile_index, notif.args.selected_card_data, notif.args.reason, notif.args.autoPlay, notif.args.card_icons_data || [] );
        },

        notif_endingGameNoCardCanBeTaken: function(notif)
        {
            console.log('notif_endingGameNoCardCanBeTaken');
            console.log(notif);

            this.updateStatusText('No more cards can be taken. Ending the game');
            this.dotTicks($('pagemaintitletext'));

            setTimeout(() => { this.releaseNotification(); }, 5000);
        },
   });             
});
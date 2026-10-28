var AnimationHandler = /** @class */ (function () {
    function AnimationHandler(gameui) {
        this.gameui = gameui;
    }
    AnimationHandler.prototype.animateProperty = function (args) {
        args = this.addEasing(args);
        return dojo.animateProperty(args);
    };
    AnimationHandler.prototype.animateOnObject = function (args, ignoreGoToPositionChange) {
        var _this = this;
        if (ignoreGoToPositionChange === void 0) { ignoreGoToPositionChange = false; }
        var initialGoToPos = args.goTo ? this.gameui.getPos(args.goTo) : null;
        if (!args.hasOwnProperty('properties'))
            args.properties = {};
        var dojoAnim;
        var arg_beforeBegin = args.hasOwnProperty('beforeBegin') ? args.beforeBegin : function (obj) { return obj; };
        var arg_onBegin = args.hasOwnProperty('onBegin') ? args.onBegin : function (obj) { return obj; };
        args.beforeBegin = function (properties) {
            args = arg_beforeBegin(args);
            var nodePos = _this.gameui.getPos(args.node);
            var goToPos = (!ignoreGoToPositionChange && document.contains(args.goTo)) ? _this.gameui.getPos(args.goTo) : initialGoToPos; // animate to initial position if goTo is not contained in DOM anymore
            var startScaleValues = { x: 1, y: 1 };
            var nodeTranformMatrix = dojo.style(args.node, 'transform');
            var match = nodeTranformMatrix.match(/^matrix\(([^\)]+)\)$/);
            if (match && match.length >= 2) {
                var values = match[1].split(',').map(parseFloat);
                startScaleValues = { x: values[0], y: values[3] };
            }
            var endScaleValues = { x: startScaleValues.x * goToPos.w / nodePos.w, y: startScaleValues.y * goToPos.h / nodePos.h };
            var startW = dojo.style(args.node, 'width');
            var startH = dojo.style(args.node, 'height');
            var nodeTransformOrigin = dojo.style(args.node, 'transform-origin');
            var splitValues = nodeTransformOrigin.split(' ');
            nodeTransformOrigin = { x: parseFloat(splitValues[0]) / startW, y: parseFloat(splitValues[1]) / startH };
            if (!args.hasOwnProperty('fixX') || !args.fixX)
                dojoAnim.properties.left = { start: dojo.style(args.node, 'left'), end: dojo.style(args.node, 'left') + (goToPos.x - nodePos.x) + ((endScaleValues.x - startScaleValues.x) * nodeTransformOrigin.x * startW) };
            if (!args.hasOwnProperty('fixY') || !args.fixY)
                dojoAnim.properties.top = { start: dojo.style(args.node, 'top'), end: dojo.style(args.node, 'top') + (goToPos.y - nodePos.y) + ((endScaleValues.y - startScaleValues.y) * nodeTransformOrigin.y * startH) };
            if (JSON.stringify(startScaleValues) != JSON.stringify(endScaleValues))
                dojoAnim.properties.scale = endScaleValues.x + ' ' + endScaleValues.y;
        };
        args.onBegin = function (properties) {
            args = arg_onBegin(args);
        };
        args = this.addEasing(args);
        dojoAnim = dojo.animateProperty(args);
        return dojoAnim;
    };
    AnimationHandler.prototype.addEasing = function (args) {
        if (!args.hasOwnProperty('easing'))
            return args;
        if (dojo.fx.easing.hasOwnProperty(args.easing))
            args.easing = dojo.fx.easing[args.easing];
        else
            delete args.easing;
        return args;
    };
    AnimationHandler.prototype.fadeOutAndDestroy = function (node) { return dojo.animateProperty({ node: node, properties: { opacity: 0 }, duration: 300, onEnd: function () { dojo.destroy(node); } }).play(); };
    return AnimationHandler;
}());
var AnimationScope = /** @class */ (function () {
    function AnimationScope() {
        this.animations = [];
        this.timeouts = [];
        this.stopped = false;
    }
    AnimationScope.prototype.add = function (animation) {
        this.stopped ? this.neutralize(animation) : this.animations.push(animation);
        return animation;
    };
    AnimationScope.prototype.setTimeout = function (callback, delay) {
        var timeout = window.setTimeout(callback, delay);
        this.stopped ? clearTimeout(timeout) : this.timeouts.push(timeout);
        return timeout;
    };
    AnimationScope.prototype.stop = function () {
        var _this = this;
        this.stopped = true;
        this.timeouts.forEach(function (timeout) { clearTimeout(timeout); });
        this.animations.forEach(function (animation) { _this.neutralize(animation); });
        this.timeouts = [];
        this.animations = [];
    };
    AnimationScope.prototype.neutralize = function (animation) {
        animation.play = function () { return animation; }; //a chain or combine may still try to start it
        animation.stop();
    };
    return AnimationScope;
}());
var BackgroundHandler = /** @class */ (function () {
    function BackgroundHandler(gameui) {
        this.gameui = gameui;
        this.scissorsAngle = 0;
        this.paperSide = -1;
        this.flyingAnimationOn = false;
        this.flyingAnimationManuallySet = false;
        this.displayBackground();
    }
    BackgroundHandler.prototype.displayBackground = function () {
        this.backgroundContainer = dojo.place(this.gameui.jstpl_background_container, dojo.body(), 'first');
        this.scissors = dojo.query('.bg-scissors', this.backgroundContainer)[0];
        this.paper = dojo.query('.bg-paper', this.backgroundContainer)[0];
        this.rock = dojo.query('.bg-rock', this.backgroundContainer)[0];
        this.setScissorsTime();
    };
    BackgroundHandler.prototype.setScissorsTime = function () {
        var _this = this;
        var maxAngle = 10;
        var maxStep = 4.5;
        var minStep = 3.5;
        var step = minStep + (Math.random() * (maxStep - minStep));
        var direction;
        if (this.scissorsAngle + maxStep > maxAngle)
            direction = -1;
        else if (this.scissorsAngle - maxStep < -1 * maxAngle)
            direction = 1;
        else
            direction = (Math.floor(Math.random() * 2) * 2) - 1; //-1 or +1 
        this.scissorsAngle += step * direction;
        var time = 2500 + Math.random() * 4000;
        this.scissors.style.transform = 'rotate(' + this.scissorsAngle + 'deg)';
        this.scissors.style.transition = 'transform ' + (time / 1000) + 's ease-in-out';
        setTimeout(function () { _this.setScissorsTime(); }, time - 100);
    };
    BackgroundHandler.prototype.setPaperTime = function () {
        var _this = this;
        if (!this.flyingAnimationOn)
            return;
        var possibleSides = [0, 1, 2, 3];
        if (this.paperSide >= 0)
            possibleSides.splice(this.paperSide, 1);
        this.paperSide = possibleSides[Math.floor(Math.random() * possibleSides.length)];
        this.paper.style.transform = null;
        var cords;
        var paperPos = dojo.position(this.paper); //dojo.position because background-container is out of overall-content which might have zoom property
        var bodyPos = dojo.window.getBox();
        var topBarHeight = this.gameui.getPos($('topbar')).h;
        var rightSideWidth = this.gameui.isMobile() ? 0 : this.gameui.getPos($('right-side')).w;
        function getRandomPosAtSide(orientation) {
            return (orientation == 'vertical') ?
                topBarHeight + Math.random() * (bodyPos.h - paperPos.h - topBarHeight) :
                Math.random() * (bodyPos.w - paperPos.w - rightSideWidth);
        }
        if (this.paperSide == 0)
            cords = { start: { x: -1.2 * paperPos.w, y: getRandomPosAtSide('vertical') }, end: { x: 1.2 * bodyPos.w, y: getRandomPosAtSide('vertical') } };
        else if (this.paperSide == 1)
            cords = { start: { x: getRandomPosAtSide('horizontal'), y: -1.2 * paperPos.h }, end: { x: getRandomPosAtSide('horizontal'), y: 1.2 * bodyPos.h } };
        else if (this.paperSide == 2)
            cords = { start: { x: 1.2 * bodyPos.w, y: getRandomPosAtSide('vertical') }, end: { x: -1.2 * paperPos.w, y: getRandomPosAtSide('vertical') } };
        else if (this.paperSide == 3)
            cords = { start: { x: getRandomPosAtSide('horizontal'), y: 1.2 * bodyPos.h }, end: { x: getRandomPosAtSide('horizontal'), y: -1.2 * paperPos.h } };
        var deltaX = cords.end.x - cords.start.x;
        var deltaY = cords.end.y - cords.start.y;
        var angleDegrees = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        angleDegrees = (angleDegrees + 360) % 360;
        var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        var speed;
        if (this.gameui.isDesktop())
            speed = this.paperSide % 2 == 0 ? 0.588 : 0.27;
        else
            speed = this.paperSide % 2 == 0 ? 0.34 : 0.23;
        speed *= (0.8 + Math.random() * 0.4);
        var time = distance / speed;
        dojo.attr(this.paper, 'flipped', (angleDegrees > 90 && angleDegrees < 270) ? 'true' : 'false');
        this.paper.style.setProperty('--fly-shake-speed', Math.min(0.3, (speed * 1.23)) + 's');
        this.paper.style.visibility = 'visible';
        this.paper.style.transform = 'rotate(' + angleDegrees + 'deg) scale(' + (0.9 + Math.random() * 0.4) + ')';
        this.paper.style.transition = 'none';
        this.paper.style.left = cords.start.x + 'px';
        this.paper.style.top = cords.start.y + 'px';
        this.paper.offsetHeight; // Forces a reflow to apply changes
        this.paper.style.transition = 'top ' + (time / 1000) + 's ease, left ' + (time / 1000) + 's linear';
        this.paper.style.left = cords.end.x + 'px';
        this.paper.style.top = cords.end.y + 'px';
        var delayToNextAnim = 18000 + Math.random() * 15000;
        clearTimeout(this.flyingTimeout);
        this.flyingTimeout = setTimeout(function () { _this.setPaperTime(); }, time + delayToNextAnim);
    };
    BackgroundHandler.prototype.flyingCharactersPreferenceChanged = function (pref_value) {
        var _this = this;
        var manuallySet = this.flyingAnimationManuallySet; //it's automatically called on page load on first time
        this.flyingAnimationManuallySet = true;
        dojo.attr(this.rock, 'hover-fast', pref_value ? 'true' : 'false');
        if (this.flyingAnimationOn === pref_value)
            return;
        this.flyingAnimationOn = pref_value;
        if (pref_value) { //turned on
            if (manuallySet)
                this.setPaperTime(); //fly instantly if manually turned on
            else
                setTimeout(function () { _this.setPaperTime(); }, 15000 + Math.random() * 10000);
        }
        else {
            clearTimeout(this.flyingTimeout);
        }
    };
    return BackgroundHandler;
}());
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// @ts-ignore
GameGui = (function () {
    function GameGui() { }
    return GameGui;
})();
// Note: it does not really extend it in es6 way, you cannot call super you have to use dojo way 
var GameBody = /** @class */ (function (_super) {
    __extends(GameBody, _super);
    function GameBody() {
        var _this = _super.call(this) || this;
        _this.players = {};
        _this.isAnimatingNotification = false;
        _this.jstpl_card_icon = '<div class="a-card-icon" suit="${suit}" rank="${rank}" card-id="${card_id}"></div>';
        _this.jstpl_pile_container = '<div class="a-pile-container" pile-index="${pileIndex}"><i class="place-under-icon fa6 fa-share"></i></div>';
        _this.jstpl_queue_card = '<div class="a-queue-card-container"><div class="player-name-text">${playerName}</div></div>';
        _this.jstpl_background_container = '<div class="background-container"><div class="bg-front"></div><div class="bg-paper"></div><div class="bg-rock bg-breathing"></div><div class="bg-front bg-front-transparent"></div><div class="bg-ref-card"></div><div class="bg-scissors"></div></div>';
        _this.jstpl_tooltip_wrapper = '<div class="tooltip-wrapper"><div class="tooltip-title">${tooltip_title}</div><div class="suits-container">${suit_rows}</div></div>';
        console.log('ninjan constructor');
        return _this;
    }
    GameBody.prototype.setup = function (gamedatas) {
        console.log("Starting game setup");
        var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari)
            document.body.classList.add('safari-browser');
        this.imageLoader = new ImageLoadHandler(this, ['ninjan-cards', 'bg-front']);
        this.animationHandler = new AnimationHandler(this);
        this.prefHandler = new PrefHandler(this, gamedatas.pref_names);
        this.backgroundHandler = new BackgroundHandler(this);
        dojo.query('.my-hand-container .my-hand-title')[0].innerHTML = _('Your hand');
        // Setting up player boards
        for (var player_id in gamedatas.players) {
            var _a = this.gamedatas.players[player_id], name_1 = _a.name, color = _a.color, player_no = _a.player_no;
            this.players[player_id] = new PlayerHandler(this, parseInt(player_id), name_1, color, parseInt(player_no));
        }
        if (this.players.hasOwnProperty(this.player_id)) {
            this.myself = this.players[this.player_id];
            this.myself.setHand(gamedatas.my_hand, gamedatas.sort_cards_by, gamedatas.selectedCardID || null);
            document.documentElement.style.setProperty('--player-color', '#' + this.myself.playerColor);
        }
        else {
            dojo.query('.my-hand-container')[0].style.display = 'none';
        }
        this.preloadFont();
        this.pileHandler = new PileHandler(this, this.gamedatas.pilesData, this.gamedatas.pileQueueData);
        if (this.gamedatas.gamestate.name == 'gameEnd' && this.pileHandler.pileQueueData.length > 0) //show pileQueue at gameEnd if it has elements
            this.pileHandler.pileQueueContainer.style.display = 'inline-block';
        this.tooltipHandler = new TooltipHandler(this, gamedatas.played_cards);
        this.logMutationObserver = new LogMutationObserver(this);
        this.recapHandler = new RecapHandler(this, gamedatas.lastRoundRecap || null, !!gamedatas.recapAutoplayEligible);
        // Setup game notifications to handle (see "setupNotifications" method below)
        this.setupNotifications();
        console.log("Ending game setup");
    };
    GameBody.prototype.onEnteringState = function (stateName, args) {
        console.log('Entering state: ' + stateName, args);
        switch (stateName) {
            case 'selectCard':
                if (!args.args._private)
                    return;
                if (!args.args._private.autoPlay && !args.args._private.selected_card_id)
                    this.showRefCard();
                if (this.myself)
                    this.myself.hand.updateConfirmedSelection(args.args._private.selected_card_id, false);
                break;
            case 'takePile':
                dojo.addClass(this.pileHandler.pilesRow, 'expanded');
                if (this.isCurrentPlayerActive() && !args.args.autoPlay)
                    this.showRefCard();
                this.pileHandler.showPossiblePiles(args.args.possible_piles);
                break;
            case 'gameEnd':
                this.recapHandler.ensureButton(); //BGA rewrites the status bar for the end of game, the replay button stays for the final round
                break;
        }
    };
    GameBody.prototype.onLeavingState = function (stateName) {
        console.log('Leaving state: ' + stateName);
        switch (stateName) {
            case 'selectCard':
                if (!this.myself)
                    return;
                this.myself.hand.onLeavingStateSelectCards();
            case 'takePile':
                this.pileHandler.onLeavingStateTakePiles();
                break;
        }
    };
    GameBody.prototype.onUpdateActionButtons = function (stateName, args) {
        console.log('onUpdateActionButtons: ' + stateName, args);
        if (this.recapHandler)
            this.recapHandler.ensureButton();
        switch (stateName) {
            case 'selectCard':
                var titleContainer = $('pagemaintitletext');
                titleContainer.innerHTML = '<span class="select-card-menu"><span class="status-text">' + titleContainer.innerHTML + '</span><span class="selected-card-container" style="display: none;"></span></span>';
                if (this.myself)
                    this.myself.hand.updateStatusTextUponCardSelection();
                break;
        }
    };
    GameBody.prototype.setupNotifications = function () {
        var _this = this;
        console.log('notifications subscriptions setup');
        dojo.subscribe('notif_cardSelectionConfirmed', this, "notif_cardSelectionConfirmed");
        dojo.subscribe('notif_cardSelectionReverted', this, "notif_cardSelectionReverted");
        dojo.subscribe('notif_animateSelectedCards', this, "notif_animateSelectedCards");
        dojo.subscribe('notif_animatePileTaken', this, "notif_animatePileTaken");
        dojo.subscribe('notif_endingGameNoCardCanBeTaken', this, "notif_endingGameNoCardCanBeTaken");
        var synchronousEvents = ['notif_animateSelectedCards', 'notif_animatePileTaken', 'notif_endingGameNoCardCanBeTaken'];
        synchronousEvents.forEach(function (event) { _this.notifqueue.setSynchronous(event); });
    };
    GameBody.prototype.releaseNotification = function () {
        this.isAnimatingNotification = false;
        this.notifqueue.setSynchronousDuration(0);
        this.recapHandler.onLiveNotificationReleased();
        this.recapHandler.ensureButton();
    };
    GameBody.prototype.startAnimatingNotification = function () { this.isAnimatingNotification = true; this.recapHandler.ensureButton(); };
    GameBody.prototype.notif_cardSelectionConfirmed = function (notif) {
        console.log('notif_cardSelectionConfirmed');
        console.log(notif);
        this.hideRefCard();
        this.myself.hand.updateConfirmedSelection(notif.args.confirmed_selected_card_id, notif.args.pre_selection);
    };
    GameBody.prototype.notif_cardSelectionReverted = function (notif) {
        console.log('notif_cardSelectionReverted');
        console.log(notif);
        if (!notif.args.pre_selection)
            this.showRefCard();
        this.myself.hand.updateConfirmedSelection(false, notif.args.pre_selection);
    };
    GameBody.prototype.notif_animateSelectedCards = function (notif) {
        var _this = this;
        console.log('notif_animateSelectedCards');
        console.log(notif);
        if (this.recapHandler.deferWhilePlaying(function () { _this.notif_animateSelectedCards(notif); }))
            return;
        this.startAnimatingNotification();
        this.recapHandler.setRecapData(notif.args.round_recap);
        if (notif.args.round_recap)
            this.recapHandler.markSeenLive(notif.args.round_recap);
        if (notif.args.is_final_round)
            this.updateStatusText('Final round! Revealing cards...');
        setTimeout(function () { _this.pileHandler.animatePileQueue(notif.args.pile_queue_data, notif.args.auto_play); });
    };
    GameBody.prototype.notif_animatePileTaken = function (notif) {
        var _this = this;
        console.log('notif_animatePileTaken');
        console.log(notif);
        if (this.recapHandler.deferWhilePlaying(function () { _this.notif_animatePileTaken(notif); }))
            return;
        this.startAnimatingNotification();
        this.recapHandler.setRecapData(notif.args.round_recap);
        if (notif.args.round_recap)
            this.recapHandler.markSeenLive(notif.args.round_recap);
        if (parseInt(notif.args.new_score) == notif.args.new_score)
            this.scoreCtrl[notif.args.player_id].toValue(notif.args.new_score);
        this.hideRefCard();
        this.pileHandler.animatePileTaken(notif.args.player_id, notif.args.pile_index, notif.args.selected_card_data, notif.args.reason, notif.args.autoPlay, notif.args.card_icons_data || []);
    };
    GameBody.prototype.notif_endingGameNoCardCanBeTaken = function (notif) {
        var _this = this;
        console.log('notif_endingGameNoCardCanBeTaken');
        console.log(notif);
        if (this.recapHandler.deferWhilePlaying(function () { _this.notif_endingGameNoCardCanBeTaken(notif); }))
            return;
        this.startAnimatingNotification();
        this.updateStatusText('No more cards can be taken. Ending the game');
        this.dotTicks($('pagemaintitletext'));
        setTimeout(function () { _this.releaseNotification(); }, 5000);
    };
    //utility functions
    GameBody.prototype.format_string_recursive = function (log, args) {
        try {
            log = _(log);
            if (log && args && !args.processed) {
                args.processed = true;
                // list of special keys we want to replace with images
                var keys = ['textPlayerID', 'LOG_CLASS', 'CARD_ICONS_STR', 'ARROW_LEFT', 'ARROW_DOWN', 'REVEALED_CARDS_DATA_STR', 'NO_MORE_CARDS', 'PILE_NUM'];
                for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
                    var key = keys_1[_i];
                    if (key in args) {
                        if (key == 'textPlayerID')
                            args['textPlayerID'] = this.divColoredPlayer(args['textPlayerID']);
                        else if (key == 'LOG_CLASS')
                            log = log + '<div log-class-tag="' + args['LOG_CLASS'] + '"></div>';
                        else if (key == 'CARD_ICONS_STR')
                            args['CARD_ICONS_STR'] = '<div class="card-icons-container">' + this.createCardIcons(args['CARD_ICONS']) + '</div>';
                        else if (key == 'REVEALED_CARDS_DATA_STR')
                            args['REVEALED_CARDS_DATA_STR'] = this.createLogSelectedCards(args['REVEALED_CARDS_DATA']);
                        else if (key == 'ARROW_LEFT')
                            args['ARROW_LEFT'] = '<i class="log-arrow log-arrow-left fa6 fa-angle-double-left"></i>';
                        else if (key == 'ARROW_DOWN')
                            args['ARROW_DOWN'] = '<i class="log-arrow place-under-icon fa6 fa-share"></i>';
                        else if (key == 'PILE_NUM')
                            args['PILE_NUM'] = '';
                    }
                }
            }
        }
        catch (e) {
            console.error(log, args, "Exception thrown", e.stack);
        }
        return this.inherited(arguments);
    };
    GameBody.prototype.divYou = function (attributes) {
        if (attributes === void 0) { attributes = {}; }
        var color = this.gamedatas.players[this.player_id].color;
        var color_bg = "";
        if (this.gamedatas.players[this.player_id] && this.gamedatas.players[this.player_id].color_back) {
            color_bg = "background-color:#" + this.gamedatas.players[this.player_id.toString()].color_back + ";";
        }
        attributes['player-color'] = color;
        var html = "<span style=\"font-weight:bold;color:#" + color + ";" + color_bg + "\" " + this.getAttributesHTML(attributes) + ">" + __("lang_mainsite", "You") + "</span>";
        return html;
    };
    GameBody.prototype.divColoredPlayer = function (player_id, attributes, detectYou) {
        if (attributes === void 0) { attributes = {}; }
        if (detectYou === void 0) { detectYou = true; }
        if (detectYou && parseInt(player_id) === parseInt(this.player_id))
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
    };
    GameBody.prototype.getAttributesHTML = function (attributes) { return Object.entries(attributes || {}).map(function (_a) {
        var key = _a[0], value = _a[1];
        return "".concat(key, "=\"").concat(value, "\"");
    }).join(' '); };
    GameBody.prototype.getPos = function (node) { var pos = this.getBoundingClientRectIgnoreZoom(node); pos.w = pos.width; pos.h = pos.height; return pos; };
    GameBody.prototype.onGameUserPreferenceChanged = function () { };
    GameBody.prototype.isDesktop = function () { return dojo.hasClass(dojo.body(), 'desktop_version'); };
    GameBody.prototype.isMobile = function () { return dojo.hasClass(dojo.body(), 'mobile_version'); };
    GameBody.prototype.updateStatusText = function (statusText) { $('gameaction_status').innerHTML = statusText; $('pagemaintitletext').innerHTML = statusText; };
    GameBody.prototype.changeTitleTemp = function (tempHTML) {
        var _this = this;
        if (tempHTML === void 0) { tempHTML = false; }
        var titleText = $('pagemaintitletext');
        dojo.query('.temp-span', titleText.parentNode).forEach(dojo.destroy);
        if (!tempHTML) { //remove temp title
            dojo.removeClass(titleText, 'temporarily-invisible');
            return;
        }
        dojo.addClass(titleText, 'temporarily-invisible');
        var tempSpan = dojo.create('span', { class: 'temp-span' });
        tempSpan.innerHTML = tempHTML;
        dojo.place(tempSpan, titleText, 'after');
        setTimeout(function () {
            if (!document.contains(tempSpan))
                return;
            _this.animationHandler.animateProperty({
                node: tempSpan,
                duration: 200,
                properties: { opacity: 0 },
                onEnd: function () { _this.changeTitleTemp(); }
            }).play();
        }, 3000);
    };
    GameBody.prototype.ajaxAction = function (action, args, lock, checkAction) {
        if (args === void 0) { args = {}; }
        if (lock === void 0) { lock = true; }
        if (checkAction === void 0) { checkAction = true; }
        args.version = this.gamedatas.version;
        this.bgaPerformAction(action, args, { lock: lock, checkAction: checkAction });
    };
    GameBody.prototype.createCardIcons = function (cardIconsData) {
        var html = '';
        if (Array.isArray(cardIconsData)) {
            for (var _i = 0, cardIconsData_1 = cardIconsData; _i < cardIconsData_1.length; _i++) {
                var iconData = cardIconsData_1[_i];
                html += dojo.string.substitute(this.jstpl_card_icon, { card_id: iconData.card_id, suit: iconData.suit, rank: iconData.rank });
            }
        }
        else {
            for (var key in cardIconsData)
                html += dojo.string.substitute(this.jstpl_card_icon, { card_id: cardIconsData[key].card_id, suit: cardIconsData[key].suit, rank: cardIconsData[key].rank });
        }
        return html;
    };
    GameBody.prototype.createLogSelectedCards = function (cardsData) {
        var _this = this;
        var logHTML = '';
        cardsData.forEach(function (cardData) { logHTML += '<div class="player-selected-card-row">' + _this.divColoredPlayer(cardData.owner_id, { class: 'playername' }, false) + '<i class="log-arrow log-arrow-right fa6 fa-arrow-right"></i><div class="card-icons-container">' + _this.createCardIcons([cardData]) + '</div></div>'; });
        return logHTML;
    };
    GameBody.prototype.showRefCard = function () { dojo.query('.bg-ref-card').forEach(function (node) { return dojo.addClass(node, 'ref-card-visible'); }); };
    GameBody.prototype.hideRefCard = function () { dojo.query('.bg-ref-card').forEach(function (node) { return dojo.removeClass(node, 'ref-card-visible'); }); };
    GameBody.prototype.preloadFont = function () {
        var preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.href = g_themeurl + 'css/font/roboto/Roboto-Black.woff2'; // Adjust this URL to the correct one based on the weight/style you're using
        preloadLink.as = 'font';
        preloadLink.type = 'font/woff2';
        preloadLink.crossOrigin = 'anonymous';
        document.head.appendChild(preloadLink);
    };
    GameBody.prototype.cloneCard = function (cardToClone) {
        var cardClone = dojo.clone(cardToClone);
        var cardWidth = getComputedStyle(cardToClone).getPropertyValue('--card-width').trim();
        cardClone.style.setProperty('--card-width', cardWidth);
        dojo.style(cardClone, 'position', 'absolute');
        dojo.addClass(cardClone, 'a-card-clone');
        return cardClone;
    };
    GameBody.prototype.getCardsStrength = function (inputArr) {
        if (inputArr === void 0) { inputArr = []; }
        var sum = 0;
        for (var key in inputArr)
            sum += Math.abs(inputArr[key].rank);
        var strength = 10000 * inputArr.length + sum;
        return strength;
    };
    GameBody.prototype.isReplay = function () { return typeof g_replayFrom != 'undefined' || g_archive_mode; };
    GameBody.prototype.remove_px = function (str) {
        str = str.trim();
        if (!isNaN(parseInt(str)) && str === parseInt(str).toString())
            return parseInt(str);
        var result = parseInt(str.toLowerCase().replace(/px/g, ''));
        return isNaN(result) ? 0 : result;
    };
    GameBody.prototype.rgbToHex = function (rgb) {
        var match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match) {
            this.printDebug('-- rgb --', rgb);
            throw new Error("Invalid RGB format");
        }
        // Convert each component to a two-character hexadecimal
        var r = match[1], g = match[2], b = match[3];
        return [r, g, b]
            .map(function (num) {
            var hex = parseInt(num, 10).toString(16);
            return hex.padStart(2, '0'); // Ensure two digits
        })
            .join(''); // Combine into a single string
    };
    GameBody.prototype.dotTicks = function (waitingTextContainer) {
        var dotInterval;
        var loaderSpan = dojo.create('span', { class: 'loader-span', style: 'display: inline-block; width: 24px; text-align: left;', dots: 0 });
        dojo.place(loaderSpan, waitingTextContainer, 'after');
        var dotTick = function () {
            if (!document.body.contains(waitingTextContainer))
                return clearInterval(dotInterval);
            var dotCount = parseInt(dojo.attr(loaderSpan, 'dots'));
            loaderSpan.innerHTML = '.'.repeat(dotCount);
            dojo.attr(loaderSpan, 'dots', (dotCount + 1) % 4);
        };
        dotTick();
        dotInterval = setInterval(dotTick, 500);
    };
    GameBody.prototype.showTopBarTooltip = function (message, className, destroyTimeOut) {
        if (className === void 0) { className = ''; }
        if (destroyTimeOut === void 0) { destroyTimeOut = false; }
        var tooltip = new dijit.TooltipDialog({
            content: message,
            class: 'a-top-bar-tooltip ' + className
        });
        dijit.popup.open({
            popup: tooltip,
            around: dojo.byId('ingame_menu_wheel')
        });
        dojo.byId('topbar').appendChild(tooltip.domNode.parentNode); // Reparent the popup for z-index control
        if (typeof destroyTimeOut === "number")
            setTimeout(function () { dijit.popup.close(tooltip); tooltip.destroy(); }, destroyTimeOut);
    };
    GameBody.prototype.printDebug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        args[0] = typeof args[0] == 'string' ? '*** ' + args[0] : args[0];
        console.log.apply(console, args);
    };
    return GameBody;
}(GameGui));
var CardData = /** @class */ (function () {
    function CardData(card_id, suit, rank, pile_index, location_on_pile) {
        this.card_id = card_id;
        this.suit = suit;
        this.rank = rank;
        if (pile_index !== undefined)
            this.pile_index = pile_index;
        if (location_on_pile !== undefined)
            this.location_on_pile = location_on_pile;
    }
    return CardData;
}());
var HandHandler = /** @class */ (function () {
    function HandHandler(gameui, owner, handData, sortCardsBy, selectedCardID) {
        var _this = this;
        this.gameui = gameui;
        this.owner = owner;
        this.handData = handData;
        this.sortCardsBy = sortCardsBy;
        this.selectedCardID = selectedCardID;
        this.confirmButtonDisabled = true;
        this.handContainer = dojo.query('#game_play_area .my-hand-container')[0];
        this.cardsContainer = dojo.query('.cards-container', this.handContainer)[0];
        this.orderCardsButton = dojo.query('.order-cards-button', this.handContainer)[0];
        dojo.connect(this.orderCardsButton, 'onclick', function () { _this.orderCardsButtonClicked(); });
        dojo.connect(this.cardsContainer, 'onclick', function (event) { _this.cardsContainerClicked(event); });
        if (this.owner.playerColor.toLowerCase() == 'ffffff')
            this.orderCardsButton.style.setProperty('--player-color', '#000000');
        if (this.owner.playerColor.toLowerCase() == 'ff0000') { //red colour on red background
            this.handContainer.style.setProperty('--player-color', '#bb0000');
            dojo.query('.my-hand-title', this.handContainer)[0].style.setProperty('--player-color', '#FF0000');
            this.orderCardsButton.style.setProperty('--player-color', '#FF0000');
        }
        this.displayHand();
        this.reorderCards(false);
    }
    HandHandler.prototype.displayHand = function () {
        dojo.empty(this.cardsContainer);
        for (var _i = 0, _a = this.handData; _i < _a.length; _i++) {
            var cardData = _a[_i];
            this.insertCardToHand(cardData, true);
        }
        this.setHandCountAttrForMobileResizing(false);
    };
    HandHandler.prototype.orderCardsButtonClicked = function () {
        if (this.gameui.recapHandler.isPlaying())
            return;
        this.sortCardsBy = (this.sortCardsBy == 'suit' ? 'rank' : 'suit');
        this.gameui.ajaxAction('setSortCardsBy', { isSuit: this.sortCardsBy == 'suit' }, false, false);
        this.reorderCards(true);
    };
    HandHandler.prototype.reorderCards = function (doAnimate) {
        var _this = this;
        var cards = dojo.query('.a-card', this.cardsContainer);
        if (doAnimate) {
            cards.forEach(function (card, index) {
                var cardClone = _this.gameui.cloneCard(card);
                dojo.place(cardClone, _this.cardsContainer);
                dojo.style(cardClone, 'margin', 0);
                _this.gameui.placeOnObject(cardClone, card);
                card.style.opacity = 0;
            });
        }
        var suitToStrength = this.getSuitToStrength();
        cards.sort(function (a, b) {
            var diff = _this.compareCardsByAttr(a, b, _this.sortCardsBy, suitToStrength);
            if (diff != 0)
                return diff;
            var secondarySortBy = _this.sortCardsBy == 'suit' ? 'rank' : 'suit';
            return _this.compareCardsByAttr(a, b, secondarySortBy, suitToStrength);
        });
        cards.reverse(); //reverse because they will be appended to first location
        cards.forEach(function (card) { dojo.place(card, _this.cardsContainer, 'first'); }); // Append cards in sorted order
        this.orderCardsButton.innerHTML = this.sortCardsBy == 'suit' ? _('sort by rank') : _('sort by suit');
        if (!doAnimate)
            return;
        var animations = [];
        dojo.query('.a-card-clone', this.cardsContainer).forEach(function (cardClone, index) {
            var goTo = dojo.query('.a-card:not(.a-card-clone)[card-id=' + dojo.attr(cardClone, 'card-id') + ']', _this.cardsContainer)[0];
            var goToLeft = goTo.offsetLeft;
            animations.push(_this.gameui.animationHandler.animateProperty({
                node: cardClone,
                easing: 'sineInOut',
                properties: { left: goToLeft },
                duration: 300
            }));
        });
        animations = dojo.fx.combine(animations);
        animations.onEnd = function () {
            dojo.query('.a-card-clone', _this.cardsContainer).forEach(dojo.destroy);
            dojo.query('.a-card', _this.cardsContainer).forEach(function (card) { card.style.opacity = null; });
        };
        animations.play();
    };
    HandHandler.prototype.getSuitToStrength = function () {
        var suitToCards = {};
        for (var _i = 0, _a = this.handData; _i < _a.length; _i++) {
            var card = _a[_i];
            if (!suitToCards.hasOwnProperty(card.suit))
                suitToCards[card.suit] = [];
            suitToCards[card.suit].push(card);
        }
        var suitToStrength = {};
        for (var suit in suitToCards)
            suitToStrength[suit] = this.gameui.getCardsStrength(suitToCards[suit]);
        return suitToStrength;
    };
    HandHandler.prototype.compareCardsByAttr = function (cardA, cardB, attribute, suitToStrength) {
        if (suitToStrength === void 0) { suitToStrength = {}; }
        if (!suitToStrength)
            suitToStrength = this.getSuitToStrength();
        function getCardSortValue(card) {
            if (attribute == 'suit') {
                var suit = parseInt(dojo.attr(card, 'suit'));
                return suitToStrength[suit];
            }
            return parseInt(dojo.attr(card, attribute));
        }
        var diff = getCardSortValue(cardB) - getCardSortValue(cardA);
        if (diff == 0 && attribute == 'suit')
            return parseInt(dojo.attr(cardB, 'suit')) - parseInt(dojo.attr(cardA, 'suit'));
        return diff;
    };
    HandHandler.prototype.cardsContainerClicked = function (event) {
        if (!['selectCard', 'takePile'].includes(this.gameui.gamedatas.gamestate.name) || this.gameui.isInterfaceLocked() || this.gameui.recapHandler.isPlaying())
            return;
        if (!dojo.hasClass(event.target, 'a-card'))
            return;
        this.cardClicked(event.target);
    };
    HandHandler.prototype.cardClicked = function (card) {
        var _this = this;
        if (this.gameui.gamedatas.gamestate.name == 'takePile') { //pre-selection
            if (!dojo.hasClass(card, 'selection-confirmed') && this.gameui.isCurrentPlayerActive()) //only revert is allowed as player has to do pile action
                return;
            var preSelectionEnabled = this.gameui.prefHandler.getPref('card_preselection') == 1;
            if (!preSelectionEnabled) {
                this.gameui.confirmationDialog(_("This will let you select the next round's cards in advance"), function () {
                    _this.gameui.prefHandler.setPref('card_preselection', 1);
                    _this.cardClicked(card);
                    setTimeout(function () { _this.gameui.showTopBarTooltip(_('You can turn off this preference from the menu'), 'menu-wheel-tooltip', 3500); }, 800);
                });
                dojo.query('.standard_popin .standard_popin_title')[0].innerHTML = _('Enable card preselection?');
                return;
            }
        }
        var cardID = parseInt(dojo.attr(card, 'card-id'));
        var cardData = { card_id: cardID, suit: dojo.attr(card, 'suit'), rank: dojo.attr(card, 'rank') };
        var cardDiv = dojo.query('.a-card[card-id="' + cardID + '"]', this.cardsContainer)[0];
        var cardWasSelected = dojo.attr(cardDiv, 'selected') == 'true';
        dojo.query('.a-card', this.cardsContainer).forEach(function (aCard) { dojo.attr(aCard, 'selected', 'false'); });
        this.setConfirmedSelectedCardID(false);
        if (!cardWasSelected) {
            this.selectedCardID = false;
            dojo.attr(cardDiv, 'selected', 'true');
        }
        if (this.gameui.gamedatas.gamestate.name == 'selectCard') {
            if (!this.gameui.isCurrentPlayerActive() && (!this.confirmButtonDisabled || cardWasSelected))
                this.gameui.ajaxAction('actRevertCardSelection', {}, true, false);
            if (this.confirmButtonDisabled) {
                if (!cardWasSelected)
                    this.gameui.ajaxAction('actSelectCard', { cardID: cardID }, true, false);
            }
            else
                this.updateStatusTextUponCardSelection();
        }
        else if (this.gameui.gamedatas.gamestate.name == 'takePile') { //pre-selection
            if (cardWasSelected)
                this.gameui.ajaxAction('actRevertCardSelectionPreSelection', {}, true, false);
            else
                this.gameui.ajaxAction('actSelectCardPreSelection', { cardID: cardID }, false, false);
        }
    };
    HandHandler.prototype.setConfirmedSelectedCardID = function (selectedCardIDIn) {
        this.selectedCardID = selectedCardIDIn;
        dojo.query('.a-card', this.cardsContainer).forEach(function (card) { dojo.removeClass(card, 'selection-confirmed'); });
        if (this.selectedCardID)
            dojo.addClass(dojo.query('.a-card[card-id="' + this.selectedCardID + '"]', this.cardsContainer)[0], 'selection-confirmed');
    };
    HandHandler.prototype.onLeavingStateSelectCards = function () { this.selectedCardID = false; };
    HandHandler.prototype.updateConfirmedSelection = function (confirmedCardID, preselection) {
        this.setConfirmedSelectedCardID(confirmedCardID);
        this.updateStatusTextUponCardSelection();
        if (preselection) { //show temporary text at status bar
            if (confirmedCardID) {
                var selectedCard = dojo.query('.a-card[card-id=' + confirmedCardID + ']', this.handContainer)[0];
                var cardData = new CardData(dojo.attr(selectedCard, 'card-id'), dojo.attr(selectedCard, 'suit'), dojo.attr(selectedCard, 'rank'));
                var cardIconsHTML = this.gameui.createCardIcons([cardData]);
                this.gameui.changeTitleTemp(dojo.string.substitute(_('${playerYou}\'ve preselected ${cardIcon}'), { playerYou: this.gameui.divYou(), cardIcon: cardIconsHTML }));
            }
            else
                this.gameui.changeTitleTemp(); //remove temp title
        }
    };
    HandHandler.prototype.updateStatusTextUponCardSelection = function () {
        var _this = this;
        if (this.gameui.gamedatas.gamestate.name != 'selectCard')
            return;
        var statusText = dojo.query('#pagemaintitletext .status-text')[0];
        var selectedCardContainer = dojo.query('#pagemaintitletext .selected-card-container')[0];
        var selectedCard = dojo.query('.a-card[selected=true]', this.handContainer);
        if (selectedCard.length > 0)
            selectedCard = selectedCard[0];
        else
            selectedCard = false;
        if (!selectedCard) {
            selectedCardContainer.style.display = 'none';
            statusText.style.display = null;
            return;
        }
        var cardData = new CardData(parseInt(dojo.attr(selectedCard, 'card-id')), parseInt(dojo.attr(selectedCard, 'suit')), parseInt(dojo.attr(selectedCard, 'rank')));
        var cardIconsHTML = this.gameui.createCardIcons([cardData]);
        var isSelectionConfirmed = this.selectedCardID && true;
        var selectedCardContainerHTML = dojo.string.substitute(isSelectionConfirmed ? _('Selected ${cardIcons}') : _('Play ${cardIcons}'), { cardIcons: cardIconsHTML });
        if (isSelectionConfirmed)
            selectedCardContainerHTML += '&nbsp;<span class="waiting-text capitalize-first">' + _('waiting for others') + '</span>';
        else
            selectedCardContainerHTML += '<a class="confirm-play-button bgabutton bgabutton_blue">' + _('Confirm') + '</a>';
        selectedCardContainer.innerHTML = selectedCardContainerHTML;
        selectedCardContainer.style.display = null;
        statusText.style.display = 'none';
        if (isSelectionConfirmed)
            this.gameui.dotTicks(dojo.query('.waiting-text', selectedCardContainer)[0]);
        dojo.query('.confirm-play-button', selectedCardContainer).connect('onclick', this, function () { _this.confirmPlayButtonClicked(); });
    };
    HandHandler.prototype.confirmPlayButtonClicked = function () {
        if (this.gameui.recapHandler.isPlaying())
            return;
        var selectedCard = dojo.query('.a-card[selected=true]', this.handContainer);
        if (selectedCard.length <= 0)
            return;
        selectedCard = selectedCard[0];
        var cardID = parseInt(dojo.attr(selectedCard, 'card-id'));
        this.gameui.ajaxAction('actSelectCard', { cardID: cardID });
    };
    HandHandler.prototype.removeCardsFromHandData = function (removedCardsData) {
        if (!Array.isArray(removedCardsData))
            removedCardsData = [{ card_id: removedCardsData }];
        var handDataObj = {};
        var removedCardsObj = {};
        for (var _i = 0, _a = this.handData; _i < _a.length; _i++) {
            var nextCardData = _a[_i];
            handDataObj[nextCardData.card_id] = nextCardData;
        }
        for (var _b = 0, removedCardsData_1 = removedCardsData; _b < removedCardsData_1.length; _b++) {
            var nextCardData = removedCardsData_1[_b];
            removedCardsObj[nextCardData.card_id] = 1;
        }
        this.handData = [];
        for (var key in handDataObj) {
            if (removedCardsObj.hasOwnProperty(key))
                continue;
            this.handData.push(handDataObj[key]);
        }
    };
    HandHandler.prototype.setHandCountAttrForMobileResizing = function (doAnimate) {
        if (doAnimate === void 0) { doAnimate = true; }
        if (doAnimate) {
            var cards_1 = dojo.query('.a-card', this.cardsContainer);
            cards_1.forEach(function (card) { card.style.transition = 'margin 0.2s ease-in'; });
            setTimeout(function () { cards_1.forEach(function (card) { card.style.transition = null; }); }, 200);
        }
        dojo.attr(this.cardsContainer, 'hand-card-count-for-mobile-resizing', this.handData.length);
    };
    HandHandler.prototype.insertCardToHand = function (cardData, insertToEnd) {
        var aCard = dojo.create('div', { class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id });
        if (parseInt(cardData.card_id) == this.selectedCardID)
            dojo.query(aCard).attr('selected', 'true').addClass('selection-confirmed');
        dojo.place(aCard, this.cardsContainer);
    };
    return HandHandler;
}());
var ImageLoadHandler = /** @class */ (function () {
    function ImageLoadHandler(gameui, propNames) {
        this.gameui = gameui;
        this.images = {};
        var style = getComputedStyle(document.body);
        for (var _i = 0, propNames_1 = propNames; _i < propNames_1.length; _i++) {
            var imageTag = propNames_1[_i];
            var imageCSSURL = style.getPropertyValue('--image-source-' + imageTag);
            var imageNameMinified = imageCSSURL.match(/url\((?:'|")?.*\/(.*?)(?:'|")?\)/)[1];
            var imageName = imageNameMinified.replace('_minified', '');
            this.gameui.dontPreloadImage(imageName);
            this.images[imageTag] = { imageName: imageName, loaded: false };
        }
        for (var imageTag in this.images)
            this.loadImage(imageTag);
    }
    ImageLoadHandler.prototype.loadImage = function (imageTag) {
        var _this = this;
        var imageName = this.images[imageTag].imageName;
        var img = new Image();
        img.src = g_gamethemeurl + 'img/' + imageName;
        img.onerror = function () { console.error('Error loading image: ' + imageName); };
        img.onload = function () {
            document.documentElement.style.setProperty('--image-source-' + imageTag, 'url(' + img.src + ')');
            _this.images[imageTag].loaded = true;
        };
    };
    return ImageLoadHandler;
}());
var LogMutationObserver = /** @class */ (function () {
    function LogMutationObserver(gameui) {
        this.gameui = gameui;
        this.nextTimestampValue = '';
        this.observeLogs();
    }
    LogMutationObserver.prototype.observeLogs = function () {
        var _this = this;
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'div' && node.classList.contains('log')) {
                            _this.processLogDiv(node);
                        }
                    });
                }
            });
        });
        // Configure the MutationObserver to observe changes to the container's child nodes
        var config = {
            childList: true,
            subtree: true // Set to true if you want to observe all descendants of the container
        };
        // Start observing the container
        observer.observe($('logs'), config);
        observer.observe($('chatbar'), config); //mobile notifs
        if (g_archive_mode) { //to observe replayLogs that appears at the bottom of the page on replays
            var replayLogsObserverStarted_1 = false;
            var replayLogsObserver = new MutationObserver(function (mutations, obs) {
                for (var _i = 0, mutations_1 = mutations; _i < mutations_1.length; _i++) {
                    var mutation = mutations_1[_i];
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach(function (node) {
                            if (!replayLogsObserverStarted_1 && node instanceof HTMLElement && node.id.startsWith('replaylogs')) {
                                _this.processLogDiv(node);
                            }
                        });
                    }
                }
            });
            replayLogsObserver.observe(document.body, { childList: true, subtree: true });
        }
    };
    LogMutationObserver.prototype.processLogDiv = function (node) {
        var _this = this;
        var classTag = dojo.query('*[log-class-tag]', node);
        if (classTag.length > 0) {
            dojo.addClass(node, 'a-game-log ' + dojo.attr(classTag[0], 'log-class-tag'));
            classTag.forEach(dojo.destroy);
        }
        else if (dojo.query('.log-arrow-left, .log-arrow-right, .place-under-icon', node).length > 0) { //guarantee adding class in replay as preserve fields arent loaded
            dojo.addClass(node, 'a-game-log');
            if (dojo.query('.log-arrow-right', node).length > 0)
                dojo.addClass(node, 'selected-cards-log');
            else
                dojo.addClass(node, 'take-pile-log');
        }
        dojo.query('.playername', node).forEach(function (playerName) { dojo.attr(playerName, 'player-color', _this.gameui.rgbToHex(dojo.style(playerName, 'color'))); });
        if (dojo.hasClass(node, 'selected-cards-log')) {
            dojo.attr(node, 'first-selected-cards-log', Array.from(node.parentNode.children).some(function (sibling) { return sibling !== node && sibling.classList.contains("selected-cards-log"); }) ? 'false' : 'true'); //the first new-hand-long will have no margin-top or margin-bottom
        }
        else if (dojo.hasClass(node, 'take-pile-log')) {
            if (this.gameui.isDesktop()) {
                var cardIcons = dojo.query('.card-icons-container', node)[0];
                if (dojo.query('.playername', node).length > 0)
                    cardIcons.style.width = 'calc(100% - ' + (10 + this.gameui.getPos(dojo.query('.playername', node)[0]).w + this.gameui.getPos(dojo.query('.log-arrow', node)[0]).w) + 'px)';
            }
        }
        if (this.gameui.isDesktop() && dojo.hasClass(node, 'a-game-log')) {
            var timestamp = dojo.query('.timestamp', node);
            if (timestamp.length > 0) {
                this.nextTimestampValue = timestamp[0].innerText;
            }
            else if (this.observeLogs.hasOwnProperty('nextTimestampValue')) {
                var newTimestamp = dojo.create('div', { class: 'timestamp' });
                newTimestamp.innerHTML = this.nextTimestampValue;
                dojo.place(newTimestamp, node);
            }
        }
    };
    return LogMutationObserver;
}());
var PileHandler = /** @class */ (function () {
    function PileHandler(gameui, pilesData, pileQueueData) {
        var _this = this;
        this.gameui = gameui;
        this.pilesData = pilesData;
        this.pileQueueData = pileQueueData;
        this.pileContainers = {};
        this.animationScope = null; //set while a recap plays, so skipping it stops these animations
        this.pilesRow = dojo.query('#game_play_area .piles-row')[0];
        this.pilesContainer = dojo.query('#game_play_area .piles-container')[0];
        this.pileQueueContainer = dojo.query('#game_play_area .pile-queue-container')[0];
        dojo.connect(this.pilesContainer, 'onclick', function (event) { _this.pilesContainerClicked(event); });
        this.displayPiles();
        this.fillPileQueue();
    }
    PileHandler.prototype.track = function (animation) { return this.animationScope ? this.animationScope.add(animation) : animation; };
    PileHandler.prototype.later = function (callback, delay) {
        if (delay === void 0) { delay = 0; }
        this.animationScope ? this.animationScope.setTimeout(callback, delay) : setTimeout(callback, delay);
    };
    PileHandler.prototype.displayPiles = function () {
        for (var pileIndex in this.pilesData) {
            var pileContainer = dojo.place(dojo.string.substitute(this.gameui.jstpl_pile_container, { pileIndex: pileIndex }), this.pilesContainer);
            for (var _i = 0, _a = this.pilesData[pileIndex]; _i < _a.length; _i++) {
                var cardData = _a[_i];
                dojo.place(dojo.create('div', { class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id }), pileContainer);
            }
            this.pileContainers[pileIndex] = pileContainer;
            this.addPileSumText(Number(pileIndex));
        }
    };
    PileHandler.prototype.getStateSnapshot = function () { return JSON.parse(JSON.stringify({ pilesData: this.pilesData, pileQueueData: this.pileQueueData })); };
    PileHandler.prototype.renderState = function (pilesData, pileQueueData) {
        var _this = this;
        dojo.query('#page-content > .a-card, #page-content > .player-name-text, .card-to-animate-to-board').forEach(dojo.destroy); //leftover animation clones
        dojo.query('.board-bounce').removeClass('board-bounce'); //a skipped recap can stop between the bounce's start and end
        dojo.query('.piles-container, .pile-queue-container', this.pilesRow).forEach(function (node) { if (node !== _this.pilesContainer && node !== _this.pileQueueContainer)
            dojo.destroy(node); });
        dojo.empty(this.pilesContainer);
        this.pilesContainer.removeAttribute('style');
        this.pileContainers = {};
        this.pilesData = pilesData;
        this.displayPiles();
        dojo.removeClass(this.pilesRow, 'expanded');
        dojo.removeAttr(this.pileQueueContainer, 'line-hidden');
        dojo.removeAttr(this.pileQueueContainer, 'width-set');
        this.pileQueueContainer.removeAttribute('style');
        this.pileQueueData = pileQueueData;
        this.fillPileQueue();
    };
    PileHandler.prototype.getQueueLayoutSnapshot = function () { return { expanded: dojo.hasClass(this.pilesRow, 'expanded'), lineHidden: this.pileQueueContainer.getAttribute('line-hidden'), widthSet: this.pileQueueContainer.getAttribute('width-set'), style: this.pileQueueContainer.getAttribute('style') }; };
    PileHandler.prototype.applyQueueLayoutSnapshot = function (layout) {
        dojo.toggleClass(this.pilesRow, 'expanded', layout.expanded);
        var attrs = [['line-hidden', layout.lineHidden], ['width-set', layout.widthSet], ['style', layout.style]];
        for (var _i = 0, attrs_1 = attrs; _i < attrs_1.length; _i++) {
            var _a = attrs_1[_i], attr = _a[0], value = _a[1];
            value === null ? this.pileQueueContainer.removeAttribute(attr) : this.pileQueueContainer.setAttribute(attr, value);
        }
    };
    PileHandler.prototype.addPileSumText = function (pileIndex) {
        var pileContainer = this.pileContainers[pileIndex];
        var pileCardCount = this.pilesData[pileIndex].length;
        var pileSum = this.pilesData[pileIndex].reduce(function (sum, cardData) { return sum + Number(cardData.rank); }, 0);
        dojo.attr(pileContainer, 'pile-sum-visible', pileCardCount >= 2 ? 'true' : 'false');
        pileContainer.style.setProperty('--pile-card-count', '"' + pileSum + '"');
    };
    PileHandler.prototype.fillPileQueue = function () {
        var wrapper = dojo.query('.remaining-cards-wrapper', this.pileQueueContainer)[0];
        dojo.empty(wrapper);
        for (var cardIndex in this.pileQueueData) {
            var cardData = this.pileQueueData[cardIndex];
            var cardContainer = dojo.place(dojo.string.substitute(this.gameui.jstpl_queue_card, { playerName: this.gameui.divColoredPlayer(cardData.owner_id) }), wrapper);
            if (parseInt(cardIndex) == 1)
                dojo.addClass(cardContainer, 'second-queue-card');
            var aCard = dojo.create('div', { class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id });
            dojo.place(aCard, cardContainer, 'first');
        }
        if (this.pileQueueData.length > 0)
            dojo.addClass(this.pilesRow, 'expanded');
        if (this.pileQueueData.length <= 1)
            dojo.attr(this.pileQueueContainer, 'line-hidden', 'true');
    };
    PileHandler.prototype.showPossiblePiles = function (possiblePiles) {
        if (possiblePiles.reason != 'take') {
            $('pagemaintitletext').innerHTML = (this.gameui.isCurrentPlayerActive() ?
                dojo.string.substitute(_('No pile to take... ${playerYou} must place under a pile'), { playerYou: this.gameui.divYou() }) :
                dojo.string.substitute(_('${playerName} must place under a pile'), { playerName: this.gameui.divColoredPlayer(this.gameui.getActivePlayerId()) }));
            document.title = $('pagemaintitletext').innerText;
        }
        for (var pileIndex in this.pileContainers)
            this.pileContainers[pileIndex].removeAttribute('click-reason');
        if (!this.gameui.isCurrentPlayerActive())
            return;
        for (var _i = 0, _a = possiblePiles.pile_indices; _i < _a.length; _i++) {
            var pileIndex = _a[_i];
            dojo.attr(this.pileContainers[pileIndex], 'click-reason', possiblePiles.reason);
        }
    };
    PileHandler.prototype.pilesContainerClicked = function (event) {
        if (this.gameui.isInterfaceLocked() || this.gameui.recapHandler.isPlaying() || this.gameui.gamedatas.gamestate.name != 'takePile' || !this.gameui.isCurrentPlayerActive())
            return;
        var pileContainer = $(event.target).closest('.a-pile-container');
        if (!dojo.hasClass(pileContainer, 'a-pile-container') || !dojo.hasAttr(pileContainer, 'click-reason'))
            return;
        this.pileClicked(pileContainer);
    };
    PileHandler.prototype.pileClicked = function (pile) { this.gameui.ajaxAction('actTakePile', { pileIndex: dojo.attr(pile, 'pile-index') }); };
    PileHandler.prototype.onLeavingStateTakePiles = function () {
        if (this.pileQueueData.length > 0)
            return;
        dojo.removeClass(this.pilesRow, 'expanded');
        dojo.removeAttr(this.pileQueueContainer, 'line-hidden');
        dojo.removeAttr(this.pileQueueContainer, 'width-set');
        this.pileQueueContainer.removeAttribute('style');
    };
    PileHandler.prototype.animatePileQueue = function (pileQueueDataIn, autoPlay, onComplete) {
        var _this = this;
        if (onComplete === void 0) { onComplete = null; }
        if (autoPlay) {
            this.later(function () { _this.animatePileQueue(pileQueueDataIn, false, onComplete); }, 600); //autoPlay delay is 600ms so slideAnimations happens in max 900ms
            return;
        }
        this.pileQueueData = pileQueueDataIn;
        var isDesktop = this.gameui.isDesktop();
        var pilesContainerClone = dojo.clone(this.pilesContainer);
        dojo.style(pilesContainerClone, { position: 'absolute', top: '0px', left: '0px' });
        if (!isDesktop)
            pilesContainerClone.style.width = '100%'; //otherwise piles dont fit horizontally on mobile
        dojo.place(pilesContainerClone, this.pilesRow);
        this.gameui.placeOnObject(pilesContainerClone, this.pilesContainer);
        this.fillPileQueue();
        dojo.query('.a-card', this.pileQueueContainer).forEach(function (node) { node.style.opacity = 0; });
        var marginProps = isDesktop ? ['width', 'paddingLeft', 'paddingRight'] : ['height', 'paddingTop', 'paddingBottom'];
        marginProps.forEach(function (prop) { return _this.pileQueueContainer.style[prop] = '0px'; });
        var queueArrows = dojo.query('.queue-arrows-container', this.pileQueueContainer)[0];
        queueArrows.style.display = 'none';
        dojo.query('.player-name-text', this.pileQueueContainer).forEach(function (playerNameText) { playerNameText.style.opacity = 0; });
        var pileQueueContainerClone = dojo.clone(this.pileQueueContainer);
        dojo.style(pileQueueContainerClone, { position: 'absolute', overflow: 'hidden' });
        dojo.place(pileQueueContainerClone, this.pilesRow);
        this.gameui.placeOnObject(pileQueueContainerClone, this.pileQueueContainer);
        this.pileQueueContainer.removeAttribute('style');
        this.pilesContainer.style.opacity = '0';
        this.pileQueueContainer.style.opacity = '0';
        var queueOffset = this.gameui.getPos(this.pileQueueContainer).x - this.gameui.getPos(pileQueueContainerClone).x;
        var expandAnimations = dojo.fx.combine([
            this.track(this.gameui.animationHandler.animateOnObject({
                node: pilesContainerClone,
                goTo: this.pilesContainer,
                duration: 200,
                easing: 'sineOut',
                onEnd: function () { _this.pilesContainer.removeAttribute('style'); dojo.destroy(pilesContainerClone); }
            })),
            this.track(this.gameui.animationHandler.animateProperty({
                node: pileQueueContainerClone,
                duration: 200,
                easing: 'sineOut',
                properties: {
                    width: dojo.style(this.pileQueueContainer, 'width'),
                    height: dojo.style(this.pileQueueContainer, 'height'),
                    padding: dojo.style(this.pileQueueContainer, 'padding'),
                    marginLeft: queueOffset,
                },
                onEnd: function () { _this.pileQueueContainer.removeAttribute('style'); queueArrows.style.cssText = ''; dojo.destroy(pileQueueContainerClone); }
            }))
        ]);
        var slideAnimations = [];
        var queueCardContainers = dojo.query('.a-queue-card-container', this.pileQueueContainer);
        var _loop_1 = function (cardIndex) {
            var cardData = this_1.pileQueueData[parseInt(cardIndex)];
            var cardDivQuery = dojo.query('.my-hand-container .a-card[card-id=' + cardData.card_id + ']');
            var onBeginCardAnimation = function () { };
            var cardDiv = void 0;
            if (cardDivQuery.length > 0) {
                var cardDivToKill_1 = cardDivQuery[0];
                dojo.removeClass(cardDivToKill_1, 'selection-confirmed');
                cardDiv = dojo.clone(cardDivToKill_1);
                this_1.gameui.myself.hand.removeCardsFromHandData(parseInt(dojo.attr(cardDiv, 'card-id')));
                dojo.style(cardDiv, { position: 'absolute', zIndex: 2 });
                dojo.place(cardDiv, 'page-content', 'first'); //first child prevents z-index issues when other cards slide from player boards and overlap with player hand
                this_1.gameui.placeOnObject(cardDiv, cardDivToKill_1);
                onBeginCardAnimation = function () {
                    dojo.style(cardDivToKill_1, { opacity: 0 });
                    _this.track(_this.gameui.animationHandler.animateProperty({
                        node: cardDivToKill_1,
                        duration: 500,
                        easing: 'sineInOut',
                        properties: { width: 0, marginLeft: 0 },
                        onEnd: dojo.hitch(_this, function (cardDivToKill) { dojo.destroy(cardDivToKill); }, cardDivToKill_1)
                    })).play();
                };
            }
            else {
                cardDiv = dojo.create('div', { class: 'a-card', suit: cardData.suit, rank: cardData.rank, 'card-id': cardData.card_id, style: 'position: absolute; z-index: 3;' });
                dojo.attr(cardDiv, 'card-id', cardData.card_id);
                var playerBoard = this_1.gameui.players[cardData.owner_id].overallPlayerBoard;
                dojo.place(cardDiv, 'page-content');
                this_1.gameui.placeOnObject(cardDiv, playerBoard);
                cardDiv.style.opacity = '0';
                onBeginCardAnimation = dojo.hitch(this_1, function (cardDiv) { cardDiv.style.opacity = 1; }, cardDiv);
            }
            var queueCardContainer = queueCardContainers[parseInt(cardIndex)];
            var goTo = dojo.query('.a-card', queueCardContainer)[0];
            var onBegin = dojo.hitch(this_1, function (queueCardContainer, onBeginCardAnimation) {
                dojo.query('.player-name-text', queueCardContainer)[0].style.opacity = 1;
                onBeginCardAnimation();
            }, queueCardContainer, onBeginCardAnimation);
            slideAnimations.push(this_1.track(this_1.gameui.animationHandler.animateOnObject({
                node: cardDiv,
                goTo: goTo,
                duration: Math.min(500, (autoPlay ? 900 : 1200) / this_1.pileQueueData.length), //autoPlay has 900ms because delay is 600ms
                easing: 'sineInOut',
                onBegin: onBegin,
                onEnd: dojo.hitch(this_1, function (cardDiv, goTo) {
                    cardDiv.removeAttribute("style");
                    dojo.place(cardDiv, goTo, 'replace');
                }, cardDiv, goTo)
            })));
        };
        var this_1 = this;
        for (var cardIndex in this.pileQueueData) {
            _loop_1(cardIndex);
        }
        slideAnimations = dojo.fx.chain(slideAnimations);
        slideAnimations.onEnd = function () {
            _this.later(function () {
                if (_this.gameui.myself)
                    _this.gameui.myself.hand.setHandCountAttrForMobileResizing(true);
                _this.gameui.tooltipHandler.addNewPlayedCard(_this.pileQueueData);
                onComplete ? onComplete() : _this.gameui.releaseNotification();
            }, 200);
        };
        dojo.fx.combine([expandAnimations, slideAnimations]).play();
    };
    PileHandler.prototype.animatePileTaken = function (playerID, pileIndex, selectedCardData, reason, autoPlay, cardIconsData, onComplete) {
        var _this = this;
        if (onComplete === void 0) { onComplete = null; }
        if (reason != 'zombie') { //update status text if not zombie
            if (reason == 'take')
                this.pilesData[pileIndex] = [];
            this.pilesData[pileIndex].push(new CardData(selectedCardData.card_id, selectedCardData.suit, selectedCardData.rank, pileIndex, this.pilesData[pileIndex].length));
            //update status text
            var playerName = this.gameui.divColoredPlayer(playerID);
            var isMe = this.gameui.myself && playerID == this.gameui.myself.playerID;
            var statusBarHTML = dojo.string.substitute(reason == 'take' ?
                (isMe ?
                    (!autoPlay ? _('${playerYou} are taking ${CARD_ICONS}') : _('${playerYou} are auto-taking ${CARD_ICONS}')) :
                    (!autoPlay ? _('${playerName} is taking ${CARD_ICONS}') : _('${playerName} is auto-taking ${CARD_ICONS}'))) :
                (isMe ?
                    _('${playerYou} are placing ${CARD_ICONS}') :
                    _('${playerName} is placing ${CARD_ICONS}')), { playerYou: playerName, playerName: playerName, CARD_ICONS: this.gameui.createCardIcons(cardIconsData) });
            this.gameui.updateStatusText(statusBarHTML);
        }
        dojo.query('.a-pile-container', this.pilesContainer).forEach(function (node) { node.removeAttribute('click-reason'); });
        var selectedCardID = selectedCardData.card_id;
        this.pileQueueData = this.pileQueueData.filter(function (obj) { return obj.card_id !== selectedCardID; });
        var pileContainer = this.pileContainers[pileIndex];
        var pileCards = dojo.query('.a-card', pileContainer);
        var cardDiv = dojo.query('.a-card[card-id=' + selectedCardID + ']', this.pileQueueContainer)[0];
        var queueCardContainer = $(cardDiv).closest('.a-queue-card-container');
        var newPileCard = dojo.clone(cardDiv);
        var newCardTop = 0;
        if (reason != 'zombie') {
            var tempClone = dojo.clone(newPileCard);
            dojo.place(tempClone, pileContainer, reason == 'take' ? 'first' : 'last');
            newCardTop = tempClone.offsetTop;
            dojo.destroy(tempClone);
        }
        cardDiv.style.opacity = 0;
        dojo.style(newPileCard, { position: 'absolute', zIndex: 1, margin: 0 });
        dojo.place(newPileCard, reason != 'zombie' ? pileContainer : 'page-content');
        this.gameui.placeOnObject(newPileCard, cardDiv);
        this.pilesContainer.style.zIndex = '1';
        var liftCardAnimation = this.track(this.gameui.animationHandler.animateProperty({
            node: newPileCard,
            easing: 'sineIn',
            properties: { top: dojo.style(newPileCard, 'top') - 60, left: dojo.style(newPileCard, 'left') + Math.random() * 10 + 10 },
            duration: 200,
            delay: autoPlay || this.gameui.isReplay() ? 0 : 500
        }));
        var slideCardAnimation = reason != 'zombie' ?
            this.track(this.gameui.animationHandler.animateProperty({
                node: newPileCard,
                properties: { top: newCardTop, left: 0 },
                delay: 200,
                duration: 500,
                easing: 'sineIn',
                onEnd: function () { _this.addPileSumText(pileIndex); _this.pilesContainer.style.zIndex = null; }
            })) :
            this.track(this.gameui.animationHandler.animateProperty({
                node: newPileCard,
                properties: { top: dojo.style(newPileCard, 'top') - 60, left: -2 * this.gameui.getPos(newPileCard).w },
                delay: 200,
                duration: 500,
                easing: 'sineInOut'
            }));
        var closeQueueCardAnimation = this.track(this.gameui.animationHandler.animateProperty({
            node: queueCardContainer,
            delay: 400,
            duration: 200,
            easing: 'sineOut',
            properties: { width: 0, margin: 0 },
            onBegin: function () {
                if (!dojo.hasAttr(_this.pileQueueContainer, 'width-set')) {
                    dojo.style(_this.pileQueueContainer, 'width', _this.gameui.getPos(dojo.query('.remaining-cards-wrapper', _this.pileQueueContainer)[0]).w + 'px');
                    dojo.attr(_this.pileQueueContainer, 'width-set', 'true');
                }
                var playerNameText = dojo.query('.player-name-text', queueCardContainer)[0];
                var playerNameTextClone = dojo.clone(playerNameText);
                dojo.place(playerNameTextClone, 'page-content');
                _this.gameui.placeOnObject(playerNameTextClone, playerNameText);
                dojo.destroy(playerNameText);
                _this.track(_this.gameui.animationHandler.fadeOutAndDestroy(playerNameTextClone));
                var secondQueueCard = dojo.query('.second-queue-card', _this.pileQueueContainer);
                if (secondQueueCard.length > 0) {
                    secondQueueCard = secondQueueCard[0];
                    dojo.removeClass(secondQueueCard, 'second-queue-card');
                    if (secondQueueCard.nextElementSibling)
                        dojo.addClass(secondQueueCard.nextElementSibling, 'second-queue-card');
                }
            },
            onEnd: function () {
                _this.pileQueueData.length <= 1 && dojo.attr(_this.pileQueueContainer, 'line-hidden', 'true');
                dojo.destroy(queueCardContainer);
            }
        }));
        closeQueueCardAnimation = this.pileQueueData.length > 0 ? closeQueueCardAnimation : dojo.fx.combine([closeQueueCardAnimation, this.track(this.gameui.animationHandler.animateProperty({
                node: this.pileQueueContainer,
                duration: 200,
                delay: 400,
                properties: { opacity: 0 },
            }))]);
        var tiltTakenCardsAnimation = (reason == 'take') ? [] : dojo.fx.combine([]);
        if (reason == 'take') {
            tiltTakenCardsAnimation = [];
            var cardWidth_1 = this.gameui.remove_px(getComputedStyle(dojo.body()).getPropertyValue('--card-width').trim());
            pileCards.forEach(function (cardDiv, index) {
                var cardClone = dojo.clone(cardDiv);
                dojo.addClass(cardClone, 'card-to-animate-to-board');
                dojo.style(cardClone, { position: 'absolute', zIndex: 2 });
                dojo.place(cardClone, 'page-content');
                _this.gameui.placeOnObject(cardClone, cardDiv);
                cardDiv.style.opacity = 0;
                tiltTakenCardsAnimation.push(_this.track(_this.gameui.animationHandler.animateProperty({
                    node: cardClone,
                    duration: 500,
                    properties: { marginTop: cardWidth_1 * 0.36, marginLeft: cardWidth_1 * 0.36 },
                    easing: 'sineInOut',
                    delay: 200,
                    onBegin: function () { dojo.destroy(cardDiv); }
                })));
            });
            tiltTakenCardsAnimation = dojo.fx.combine(tiltTakenCardsAnimation);
        }
        var fromPileAnimations = (reason == 'take') ? [] : dojo.fx.combine([]);
        if (reason == 'take') {
            var cardDelay_1 = Math.max(50, Math.min(120, 300 / pileCards.length));
            var goTo_1 = this.gameui.players[playerID].overallPlayerBoard;
            dojo.query('.card-to-animate-to-board').forEach(function (cardDiv, index) {
                fromPileAnimations.push(_this.track(_this.gameui.animationHandler.animateOnObject({
                    node: cardDiv,
                    goTo: goTo_1,
                    duration: 200,
                    easing: 'sineInOut',
                    delay: index * cardDelay_1 + 200,
                    onEnd: function () { _this.track(_this.gameui.animationHandler.fadeOutAndDestroy(cardDiv)); }
                })));
            });
            fromPileAnimations = dojo.fx.combine(fromPileAnimations);
            fromPileAnimations.onEnd = function () {
                _this.later(function () { dojo.addClass(goTo_1, 'board-bounce'); }, 80);
                _this.later(function () { dojo.removeClass(goTo_1, 'board-bounce'); }, 430);
            };
        }
        fromPileAnimations = this.pileQueueData.length > 0 ? fromPileAnimations : dojo.fx.combine([this.track(this.gameui.animationHandler.animateProperty({
                node: this.pileQueueContainer,
                duration: 400,
                easing: 'sineOut',
                delay: 200,
                properties: this.gameui.isDesktop() ? { width: 0, marginRight: 0 } : { height: 0, marginBottom: 0 },
                onBegin: function () { _this.pileQueueContainer.style.overflow = 'hidden'; },
                onEnd: function () { _this.pileQueueContainer.style.display = 'none'; }
            })), fromPileAnimations]);
        if (onComplete !== null && this.pileQueueData.length > 0) { //recap only: fit the queue to its remaining cards after each step, so restoring the current board doesn't jump. live play keeps the width until the queue empties
            var fitQueueAnimation_1 = this.track(this.gameui.animationHandler.animateProperty({
                node: this.pileQueueContainer,
                duration: 400,
                easing: 'sineOut',
                delay: 200,
                properties: {},
                beforeBegin: function () { fitQueueAnimation_1.properties.width = { start: dojo.style(_this.pileQueueContainer, 'width'), end: _this.gameui.getPos(dojo.query('.remaining-cards-wrapper', _this.pileQueueContainer)[0]).w }; },
                onEnd: function () { _this.pileQueueContainer.style.width = ''; dojo.removeAttr(_this.pileQueueContainer, 'width-set'); }
            }));
            fromPileAnimations = dojo.fx.combine([fitQueueAnimation_1, fromPileAnimations]);
        }
        var allAnims = dojo.fx.chain([
            liftCardAnimation,
            dojo.fx.combine([slideCardAnimation, closeQueueCardAnimation, tiltTakenCardsAnimation]),
            fromPileAnimations
        ]);
        allAnims.onEnd = function () {
            newPileCard.style = null;
            if (reason != 'zombie')
                dojo.place(newPileCard, pileContainer);
            else
                dojo.destroy(newPileCard);
            _this.gameui.tooltipHandler.addTooltipToCards();
            _this.later(function () { onComplete ? onComplete() : _this.gameui.releaseNotification(); }, autoPlay ? 300 : 0);
        };
        this.later(function () { allAnims.play(); }, autoPlay && this.gameui.isReplay() ? 0 : 300);
    };
    return PileHandler;
}());
var PlayerHandler = /** @class */ (function () {
    function PlayerHandler(gameui, playerID, playerName, playerColor, playerNo) {
        this.gameui = gameui;
        this.playerID = playerID;
        this.playerName = playerName;
        this.playerColor = playerColor;
        this.playerNo = playerNo;
        this.overallPlayerBoard = $('overall_player_board_' + this.playerID);
    }
    PlayerHandler.prototype.setHand = function (handData, sortCardsBy, selectedCardID) {
        this.hand = new HandHandler(this.gameui, this, handData, sortCardsBy, selectedCardID);
    };
    return PlayerHandler;
}());
var PrefHandler = /** @class */ (function () {
    function PrefHandler(gameui, prefNameToIndex) {
        var _this = this;
        this.gameui = gameui;
        this.prefNameToIndex = prefNameToIndex;
        this.gameui.bga.userPreferences.onChange = function (prefIndex, prefValue) { _this.onGameUserPreferenceChanged(prefIndex, prefValue); };
    }
    PrefHandler.prototype.onGameUserPreferenceChanged = function (prefIndex, prefValue) {
        switch (prefIndex) {
            case 110:
                this.gameui.backgroundHandler.flyingCharactersPreferenceChanged(parseInt(prefValue) == 1);
                break;
            case 101:
                if (parseInt(prefValue) == 2 && this.gameui.gamedatas.gamestate.name != 'selectCard' && this.gameui.myself && this.gameui.myself.hand.selectedCardID) { //revert card selection
                    if (this.gameui.myself && dojo.query('.a-card[selected=true]', this.gameui.myself.hand.handContainer).length > 0)
                        this.gameui.ajaxAction('actRevertCardSelectionPreSelection', {}, true, false);
                    dojo.query('.a-card', this.gameui.myself.hand.handContainer).attr('selected', 'false');
                }
                break;
        }
    };
    PrefHandler.prototype.getNumericPrefIndex = function (prefIndex) {
        if (this.gameui.prefs.hasOwnProperty(prefIndex))
            return prefIndex;
        else if (this.prefNameToIndex.hasOwnProperty(prefIndex))
            return this.prefNameToIndex[prefIndex];
        return null;
    };
    PrefHandler.prototype.setPref = function (prefIndexStr, newValue) {
        var prefIndex = this.getNumericPrefIndex(prefIndexStr);
        this.gameui.bga.userPreferences.set(prefIndex, newValue);
    };
    PrefHandler.prototype.getPref = function (prefIndex) {
        var prefIndexNum = prefIndex;
        if (typeof prefIndex === "string" && !/^\d+$/.test(prefIndex)) {
            if (!this.prefNameToIndex.hasOwnProperty(prefIndex)) {
                console.error('Pref index not found', prefIndex);
                return null;
            }
            prefIndexNum = this.prefNameToIndex[prefIndex];
        }
        return this.gameui.bga.userPreferences.get(prefIndexNum);
    };
    return PrefHandler;
}());
var RecapHandler = /** @class */ (function () {
    function RecapHandler(gameui, recapData, autoplayEligible) {
        var _this = this;
        this.gameui = gameui;
        this.recapData = recapData;
        this.stepTimeout = 10000; //fallback to current state if an animation never completes
        this.stepGap = 300;
        this.playing = false;
        this.finishCurrentRecap = null;
        this.pendingAutoplay = null; //autoplay waits for the interface to settle
        this.deferredNotifs = [];
        this.replayButton = null;
        this.skipButton = null;
        this.pendingSeenRecap = null; //live notification that arrived while the tab was hidden
        this.ensureButton();
        document.addEventListener('visibilitychange', function () { _this.onVisibilityChange(); });
        this.pruneSeenMarkers();
        var autoplaySeenSteps = this.getAutoplaySeenSteps(autoplayEligible);
        if (autoplaySeenSteps === undefined)
            return;
        this.setPlaying(true); //block interaction right away, animations start after the interface settles
        this.pendingAutoplay = setTimeout(function () { _this.pendingAutoplay = null; _this.play(true, autoplaySeenSteps); }, 500);
    }
    RecapHandler.prototype.isPlaying = function () { return this.playing; };
    RecapHandler.prototype.setRecapData = function (recapData) {
        if (recapData === undefined) //notifications from before this feature don't carry recap data
            return;
        this.recapData = recapData;
        this.ensureButton();
    };
    RecapHandler.prototype.deferWhilePlaying = function (callback) {
        if (!this.playing)
            return false;
        this.deferredNotifs.push(callback);
        return true;
    };
    //a live reveal (no steps yet) or step counts as seen if the tab is visible when it arrives or becomes visible before its
    //animation ends: a notification reaches a tab while another tab (the acting player's, in Studio) is in front
    RecapHandler.prototype.markSeenLive = function (recapData) {
        if (!this.gameui.myself || this.gameui.isSpectator || this.gameui.isReplay() || this.gameui.instantaneousMode)
            return;
        this.pendingSeenRecap = null;
        if (document.visibilityState === 'visible') {
            this.advanceSeenMarker(recapData);
            return;
        }
        console.log('Round recap: tab hidden, seen marker waits for the tab to show before this animation ends', { round: recapData.round, steps: recapData.steps.length });
        this.pendingSeenRecap = recapData;
    };
    RecapHandler.prototype.onLiveNotificationReleased = function () {
        if (!this.pendingSeenRecap)
            return;
        console.log('Round recap: animation ended with the tab hidden, seen marker not advanced', { round: this.pendingSeenRecap.round, steps: this.pendingSeenRecap.steps.length });
        this.pendingSeenRecap = null;
    };
    RecapHandler.prototype.onVisibilityChange = function () {
        if (document.visibilityState !== 'visible' || !this.pendingSeenRecap)
            return;
        var recapData = this.pendingSeenRecap;
        this.pendingSeenRecap = null;
        this.advanceSeenMarker(recapData);
    };
    RecapHandler.prototype.advanceSeenMarker = function (recapData) {
        var marker = this.getSeenMarker();
        var round = Number(recapData.round);
        var stepCount = recapData.steps.length;
        if (stepCount == 0 ? (!marker || marker.round < round) : (marker && marker.round == round && marker.steps == stepCount - 1)) {
            this.setSeenMarker(round, stepCount);
            console.log('Round recap: seen marker advanced', { from: marker, to: { round: round, steps: stepCount } });
        }
        else
            console.log('Round recap: seen marker not advanced, an earlier part was missed or already counted', { stored: marker, round: round, steps: stepCount });
    };
    RecapHandler.prototype.ensureButton = function () {
        var _this = this;
        var pageTitle = $('page-title');
        if (!pageTitle)
            return;
        if (!this.replayButton || !pageTitle.contains(this.replayButton))
            this.replayButton = this.createButton(pageTitle, 'ninjan-replay-button', _('Replay last round'), 'fa-history', function () { _this.play(false, null); });
        if (!this.skipButton || !pageTitle.contains(this.skipButton))
            this.skipButton = this.createButton(pageTitle, 'ninjan-skip-recap-button', _('Skip recap'), 'fa-step-forward', function () { _this.skip(); });
        var isReplayVisible = !!this.recapData && !this.playing && !this.gameui.isAnimatingNotification; //at gameEnd too, for the final round
        this.replayButton.style.display = isReplayVisible ? '' : 'none';
        this.skipButton.style.display = this.playing ? '' : 'none';
        dojo.toggleClass(pageTitle, 'replay-round-button-visible', isReplayVisible || this.playing);
    };
    RecapHandler.prototype.createButton = function (pageTitle, id, label, icon, onClick) {
        var _this = this;
        if (getComputedStyle(pageTitle).position == 'static')
            pageTitle.style.position = 'relative';
        var button = dojo.create('div', { id: id, class: 'replay-round-button', role: 'button', tabindex: 0, title: label, 'aria-label': label, innerHTML: '<i class="fa ' + icon + '"></i>' });
        dojo.place(button, pageTitle, 'first');
        this.gameui.addTooltipHtml(id, '<div class="tooltip-wrapper replay-round-tooltip">' + label + '</div>', this.gameui.isDesktop() ? 400 : 0);
        var click = function () {
            if (_this.gameui.tooltips[id]) //the button hides under the cursor, so its tooltip wouldn't get a mouseleave
                _this.gameui.tooltips[id].close();
            onClick();
        };
        dojo.connect(button, 'onclick', click);
        dojo.connect(button, 'onkeydown', function (event) {
            if (event.key != 'Enter' && event.key != ' ')
                return;
            event.preventDefault();
            click();
        });
        return button;
    };
    RecapHandler.prototype.skip = function () {
        if (this.finishCurrentRecap) {
            this.finishCurrentRecap('skipped');
            return;
        }
        if (!this.playing)
            return;
        clearTimeout(this.pendingAutoplay); //skipped before the autoplay drew anything
        this.pendingAutoplay = null;
        if (this.recapData) {
            this.setSeenMarker(this.recapData.round, this.recapData.steps.length);
            console.log('Round recap: skipped before it started', { round: this.recapData.round, steps: this.recapData.steps.length });
        }
        this.endPlaying();
    };
    RecapHandler.prototype.endPlaying = function () {
        this.setPlaying(false);
        var deferredNotifs = this.deferredNotifs;
        this.deferredNotifs = [];
        deferredNotifs.forEach(function (callback) { callback(); });
    };
    RecapHandler.prototype.isLiveGameEnded = function () { return this.gameui.gamedatas.gamestate.name == 'gameEnd' && !this.gameui.isReplay(); }; //no autoplay then, archive/replay mode never autoplays anyway
    //how many steps autoplay starts after: null replays the reveal too, undefined means no autoplay
    RecapHandler.prototype.getAutoplaySeenSteps = function (autoplayEligible) {
        if (!autoplayEligible || !this.recapData || !this.gameui.myself || this.gameui.isSpectator || this.isLiveGameEnded() || this.gameui.isReplay() || this.gameui.instantaneousMode) {
            console.log('Round recap autoplay: not eligible', { autoplayEligible: autoplayEligible, hasRecap: !!this.recapData });
            return undefined;
        }
        var marker = this.getSeenMarker();
        var recap = this.recapData;
        var recapRound = Number(recap.round);
        var log = function (replay) { console.log('Round recap autoplay', { storedMarker: marker, recapRound: recapRound, recapSteps: recap.steps.length, replay: replay }); };
        if (!marker || marker.round < recapRound) {
            log('reveal and all ' + recap.steps.length + ' steps');
            return null;
        }
        if (marker.round > recapRound || marker.steps >= recap.steps.length) {
            log('nothing, already seen');
            return undefined;
        }
        var lastSeenStep = marker.steps > 0 ? recap.steps[marker.steps - 1] : null;
        var boardSource = !lastSeenStep ? 'revealed cards in the queue' : (lastSeenStep.piles_after && lastSeenStep.queue_after ? 'server snapshot' : 'steps applied to the board before the round');
        log('steps ' + (marker.steps + 1) + ' to ' + recap.steps.length + ', starting ' + (marker.steps == 0 ? 'after the reveal' : 'after step ' + marker.steps) + ' (board: ' + boardSource + ')');
        return marker.steps;
    };
    //the board after the first stepCount steps: the server's snapshot of the last one, else the steps applied to the board before the round
    RecapHandler.prototype.getBoardAfterSteps = function (recap, stepCount) {
        var lastStep = stepCount > 0 ? recap.steps[stepCount - 1] : null;
        if (lastStep && lastStep.piles_after && lastStep.queue_after)
            return { pilesData: lastStep.piles_after, pileQueueData: lastStep.queue_after };
        var pilesData = JSON.parse(JSON.stringify(recap.piles_before));
        var pileQueueData = JSON.parse(JSON.stringify(recap.revealed));
        var _loop_2 = function (step) {
            pileQueueData = pileQueueData.filter(function (cardData) { return Number(cardData.card_id) != Number(step.card.card_id); });
            if (step.action == 'take')
                pilesData[step.pile_index] = [step.card];
            else if (step.action == 'place')
                (pilesData[step.pile_index] = pilesData[step.pile_index] || []).push(step.card);
        };
        for (var _i = 0, _a = recap.steps.slice(0, stepCount); _i < _a.length; _i++) {
            var step = _a[_i];
            _loop_2(step);
        }
        return { pilesData: pilesData, pileQueueData: pileQueueData };
    };
    RecapHandler.prototype.play = function (isAutoplay, seenSteps) {
        var _this = this;
        if (!this.recapData || (this.playing && !isAutoplay) || this.finishCurrentRecap || this.gameui.isAnimatingNotification)
            return;
        var recap = JSON.parse(JSON.stringify(this.recapData));
        var firstStep = seenSteps === null ? 0 : seenSteps;
        var currentState = this.gameui.pileHandler.getStateSnapshot();
        var currentQueueLayout = this.gameui.pileHandler.getQueueLayoutSnapshot();
        var endOfGameTitle = this.gameui.gamedatas.gamestate.name == 'gameEnd' ? { status: $('gameaction_status').innerHTML, title: $('pagemaintitletext').innerHTML } : null; //BGA adds the end of game title and buttons once, updatePageTitle can't rebuild them
        var currentScores = {};
        var scoreAfterSteps = {};
        for (var playerID in this.gameui.players) {
            currentScores[playerID] = this.gameui.scoreCtrl[playerID] ? this.gameui.scoreCtrl[playerID].getValue() : 0;
            scoreAfterSteps[playerID] = currentScores[playerID];
        }
        for (var _i = 0, _a = recap.steps.slice(firstStep); _i < _a.length; _i++) { //derive scores before the replayed steps from the current scores
            var step = _a[_i];
            if (step.action == 'take' && scoreAfterSteps.hasOwnProperty(step.player_id))
                scoreAfterSteps[step.player_id] -= step.taken_cards.reduce(function (sum, cardData) { return sum + Number(cardData.rank); }, 0);
        }
        var finished = false;
        var watchdog = null;
        var animationScope = new AnimationScope();
        var finish = function (outcome) {
            if (finished)
                return;
            finished = true;
            clearTimeout(watchdog);
            animationScope.stop(); //nothing of the recap keeps animating or fires later, the restore redraws whatever it left midway
            _this.gameui.pileHandler.animationScope = null;
            _this.restoreCurrentState(currentState, currentQueueLayout, currentScores, endOfGameTitle);
            if (isAutoplay || outcome == 'skipped') //set even after a failure so a broken recap doesn't autoplay on every load
                _this.setSeenMarker(recap.round, recap.steps.length);
            if (outcome == 'failed')
                console.error('Round recap failed, showing current state');
            else if (outcome == 'skipped')
                console.log('Round recap: skipped', { round: recap.round, steps: recap.steps.length });
            _this.finishCurrentRecap = null;
            _this.endPlaying();
        };
        this.finishCurrentRecap = finish;
        var runAnimation = function (animate, next) {
            if (finished)
                return;
            clearTimeout(watchdog);
            watchdog = setTimeout(function () { finish('failed'); }, _this.stepTimeout);
            var isDone = false;
            var done = function () {
                if (isDone || finished)
                    return;
                isDone = true;
                clearTimeout(watchdog);
                animationScope.setTimeout(function () { if (!finished)
                    next(); }, _this.stepGap);
            };
            try {
                animate(done);
            }
            catch (e) {
                console.error(e);
                finish('failed');
            }
        };
        var runStep = function (stepIndex) {
            if (stepIndex >= recap.steps.length) {
                finish('done');
                return;
            }
            var step = recap.steps[stepIndex];
            var reason = step.action == 'take' ? 'take' : (step.action == 'place' ? 'place_under' : 'zombie');
            var pileIndex = step.action == 'zombie' ? 'zombie' : step.pile_index;
            var cardIconsData = step.action == 'take' ? step.taken_cards : [step.card];
            runAnimation(function (done) {
                if (step.action == 'take' && _this.gameui.scoreCtrl[step.player_id]) {
                    scoreAfterSteps[step.player_id] += step.taken_cards.reduce(function (sum, cardData) { return sum + Number(cardData.rank); }, 0);
                    _this.gameui.scoreCtrl[step.player_id].toValue(scoreAfterSteps[step.player_id]);
                }
                _this.gameui.pileHandler.animatePileTaken(step.player_id, pileIndex, step.card, reason, step.auto, cardIconsData, done);
            }, function () { runStep(stepIndex + 1); });
        };
        try {
            this.gameui.pileHandler.animationScope = animationScope;
            this.setPlaying(true);
            for (var playerID in scoreAfterSteps) {
                if (this.gameui.scoreCtrl[playerID])
                    this.gameui.scoreCtrl[playerID].setValue(scoreAfterSteps[playerID]);
            }
            this.gameui.updateStatusText(dojo.string.substitute(_('Replaying round ${round}...'), { round: recap.round }));
            if (seenSteps === null) {
                this.gameui.pileHandler.renderState(recap.piles_before, []);
                runAnimation(function (done) { _this.gameui.pileHandler.animatePileQueue(recap.revealed, false, done); }, function () { runStep(0); });
            }
            else { //the board as it was after the last seen step, the revealed cards already in the queue
                var board = this.getBoardAfterSteps(recap, seenSteps);
                this.gameui.pileHandler.renderState(board.pilesData, board.pileQueueData);
                animationScope.setTimeout(function () { if (!finished)
                    runStep(firstStep); }, this.stepGap);
            }
        }
        catch (e) {
            console.error(e);
            finish('failed');
        }
    };
    RecapHandler.prototype.restoreCurrentState = function (currentState, currentQueueLayout, currentScores, endOfGameTitle) {
        try {
            this.gameui.pileHandler.renderState(currentState.pilesData, currentState.pileQueueData);
            var gamestate = this.gameui.gamedatas.gamestate;
            if (this.isLiveGameEnded() && !endOfGameTitle) { //game ended during the replay, leave the queue exactly as the live game left it
                this.gameui.pileHandler.applyQueueLayoutSnapshot(currentQueueLayout);
                this.gameui.pileHandler.onLeavingStateTakePiles(); //in case the replay started before takePile was left
            }
            else if (gamestate.name == 'gameEnd' && currentState.pileQueueData.length > 0) //same as setup, queue stays visible at gameEnd. a replay started at gameEnd ends on this too, its last step already fitted the queue
                this.gameui.pileHandler.pileQueueContainer.style.display = 'inline-block';
            for (var playerID in currentScores) {
                if (this.gameui.scoreCtrl[playerID])
                    this.gameui.scoreCtrl[playerID].setValue(currentScores[playerID]);
            }
            if (endOfGameTitle) { //updatePageTitle would also empty the Return to main site / Play again buttons
                $('gameaction_status').innerHTML = endOfGameTitle.status;
                $('pagemaintitletext').innerHTML = endOfGameTitle.title;
            }
            else
                this.gameui.updatePageTitle();
            if (gamestate.name == 'takePile' && gamestate.args && gamestate.args.possible_piles)
                this.gameui.pileHandler.showPossiblePiles(gamestate.args.possible_piles);
            this.gameui.tooltipHandler.addTooltipToCards();
        }
        catch (e) {
            console.error('Could not restore current state after round recap', e);
        }
    };
    RecapHandler.prototype.setPlaying = function (playing) {
        this.playing = playing;
        dojo.toggleClass(dojo.body(), 'round-recap-playing', playing);
        this.ensureButton();
    };
    RecapHandler.prototype.getSeenKey = function () { return RecapHandler.SEEN_KEY_PREFIX + this.gameui.table_id + '_' + this.gameui.player_id; };
    RecapHandler.prototype.getSeenMarker = function () {
        try {
            var marker = JSON.parse(window.localStorage.getItem(this.getSeenKey()));
            return marker && isFinite(marker.round) && isFinite(marker.steps) ? { round: Number(marker.round), steps: Number(marker.steps) } : null;
        }
        catch (e) {
            return null; //localStorage unavailable or unreadable, autoplay from the reveal
        }
    };
    RecapHandler.prototype.setSeenMarker = function (round, steps) {
        try {
            window.localStorage.setItem(this.getSeenKey(), JSON.stringify({ round: Number(round), steps: Number(steps), time: Date.now() }));
        }
        catch (e) { }
    };
    RecapHandler.prototype.pruneSeenMarkers = function () {
        try {
            var currentKey = this.getSeenKey();
            var otherMarkers = [];
            var keysToRemove_1 = [];
            for (var i = 0; i < window.localStorage.length; i++) {
                var key = window.localStorage.key(i);
                if (!key || key.indexOf(RecapHandler.SEEN_KEY_PREFIX) !== 0 || key == currentKey)
                    continue;
                if (/^\d+_\d+_\d+$/.test(key.substring(RecapHandler.SEEN_KEY_PREFIX.length))) {
                    keysToRemove_1.push(key);
                    continue;
                }
                var time = 0; //markers written before the time was stored count as stale
                try {
                    time = Number(JSON.parse(window.localStorage.getItem(key)).time) || 0;
                }
                catch (e) { }
                otherMarkers.push({ key: key, time: time });
            }
            otherMarkers.sort(function (a, b) { return b.time - a.time; });
            otherMarkers.forEach(function (marker, index) {
                if (index >= RecapHandler.SEEN_MARKER_MAX_COUNT || Date.now() - marker.time > RecapHandler.SEEN_MARKER_MAX_AGE)
                    keysToRemove_1.push(marker.key);
            });
            keysToRemove_1.forEach(function (key) { window.localStorage.removeItem(key); });
            if (keysToRemove_1.length > 0)
                console.log('Round recap: removed old seen markers', keysToRemove_1);
        }
        catch (e) { }
    };
    RecapHandler.SEEN_KEY_PREFIX = 'ninjan_recap_seen_';
    RecapHandler.SEEN_MARKER_MAX_AGE = 30 * 24 * 60 * 60 * 1000; //other tables' markers older than 30 days are deleted
    RecapHandler.SEEN_MARKER_MAX_COUNT = 20; //and only the newest 20 are kept
    return RecapHandler;
}());
var TooltipHandler = /** @class */ (function () {
    function TooltipHandler(gameui, playedCards) {
        this.gameui = gameui;
        this.playedCards = playedCards;
        this.addTooltipToCards();
    }
    TooltipHandler.prototype.addTooltipToCards = function () {
        var _this = this;
        if (document.body.classList.contains('safari-browser') && this.gameui.isMobile()) {
            this.addTooltipToBottomForSafari();
            return;
        }
        var tooltipHTML = this.getTooltipHTML();
        dojo.query('.a-card').forEach(function (node) {
            var cardID = 'card-id-' + dojo.attr(node, 'card-id');
            dojo.attr(node, 'id', cardID);
            _this.gameui.addTooltipHtml(cardID, tooltipHTML, _this.gameui.isDesktop() ? 600 : 0);
        });
    };
    TooltipHandler.prototype.addTooltipToBottomForSafari = function () {
        if (!document.body.classList.contains('safari-browser') || !this.gameui.isMobile())
            return;
        var tooltipHTML = this.getTooltipHTML();
        document.querySelector('.safari-mobile-revealed-cards-container').innerHTML = tooltipHTML;
    };
    TooltipHandler.prototype.getTooltipHTML = function () {
        var suitRowsHTML = '';
        for (var suit in this.playedCards) {
            var suitCards = Object.values(this.playedCards[suit]); //convert dict to array for sorting
            suitCards.sort(function (a, b) { return b.rank - a.rank; });
            suitRowsHTML += '<div class="suit-row">' + this.gameui.createCardIcons(suitCards) + '</div>';
        }
        var tooltipHTML = dojo.string.substitute(this.gameui.jstpl_tooltip_wrapper, { suit_rows: suitRowsHTML, tooltip_title: _('Cards Revealed') });
        return tooltipHTML;
    };
    TooltipHandler.prototype.addNewPlayedCard = function (newPlayedCardsData) {
        for (var _i = 0, newPlayedCardsData_1 = newPlayedCardsData; _i < newPlayedCardsData_1.length; _i++) {
            var cardData = newPlayedCardsData_1[_i];
            if (!this.playedCards.hasOwnProperty(cardData.suit))
                this.playedCards[cardData.suit] = {};
            this.playedCards[cardData.suit][cardData.rank] = cardData;
        }
        this.addTooltipToCards();
    };
    return TooltipHandler;
}());
define([
    "dojo", "dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter"
], function (dojo, declare) {
    return declare("bgagame.ninjan", ebg.core.gamegui, new GameBody());
});

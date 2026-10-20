type RoundRecapStep = { player_id: number, card: CardData, action: 'take' | 'place' | 'zombie', pile_index: number | null, taken_cards: CardData[], auto: boolean };
type RoundRecap = { round: number, piles_before: CardData[][], revealed: CardData[], steps: RoundRecapStep[] };

class RecapHandler{
    private readonly stepTimeout: number = 10000; //fallback to current state if an animation never completes
    private readonly stepGap: number = 300;

    private playing: boolean = false;
    private finishCurrentRecap: ((failed: boolean) => void) | null = null;
    private deferredNotifs: (() => void)[] = [];
    private replayButton: HTMLDivElement = null;

    constructor(private gameui: GameBody, private recapData: RoundRecap | null, autoplayEligible: boolean) {
        this.ensureButton();

        if(!this.shouldAutoplay(autoplayEligible))
            return;

        this.setPlaying(true); //block interaction right away, animations start after the interface settles
        setTimeout(() => { this.play(true); }, 500);
    }

    public isPlaying(): boolean { return this.playing; }

    public setRecapData(recapData: RoundRecap | null | undefined): void {
        if(recapData === undefined) //notifications from before this feature don't carry recap data
            return;

        this.recapData = recapData;
        this.ensureButton();
    }

    public deferWhilePlaying(callback: () => void): boolean { //live notifications wait until the recap has restored the current state
        if(!this.playing)
            return false;

        this.deferredNotifs.push(callback);
        return true;
    }

    public markRoundSeenLive(round: number): void {
        if(!this.gameui.myself || this.gameui.isSpectator || this.gameui.isReplay() || this.gameui.instantaneousMode)
            return;

        this.setSeen(round);
    }

    public ensureButton(): void { //status bar can be re-rendered by BGA, so this is called on every action button update
        let pageTitle: HTMLDivElement = $('page-title');
        if(!pageTitle)
            return;

        if(!this.replayButton || !pageTitle.contains(this.replayButton)){
            const label = _('Replay last round');

            if(getComputedStyle(pageTitle).position == 'static')
                pageTitle.style.position = 'relative';

            this.replayButton = dojo.create('div', {id: 'ninjan-replay-button', class: 'replay-round-button', role: 'button', tabindex: 0, title: label, 'aria-label': label, innerHTML: '<i class="fa fa-history"></i>'});
            dojo.place(this.replayButton, pageTitle, 'first');
            this.gameui.addTooltipHtml(this.replayButton.id, '<div class="tooltip-wrapper replay-round-tooltip">' + label + '</div>', this.gameui.isDesktop() ? 400 : 0);

            dojo.connect(this.replayButton, 'onclick', () => { this.play(false); });
            dojo.connect(this.replayButton, 'onkeydown', (event: KeyboardEvent) => {
                if(event.key != 'Enter' && event.key != ' ')
                    return;
                event.preventDefault();
                this.play(false);
            });
        }

        let isVisible = !!this.recapData && !this.playing && !this.gameui.isAnimatingNotification;
        this.replayButton.style.display = isVisible ? '' : 'none';
        dojo.toggleClass(pageTitle, 'replay-round-button-visible', isVisible);
    }

    private shouldAutoplay(autoplayEligible: boolean): boolean {
        if(!autoplayEligible || !this.recapData || !this.gameui.myself || this.gameui.isSpectator)
            return false;

        if(this.gameui.isReplay() || this.gameui.instantaneousMode)
            return false;

        return !this.isSeen(this.recapData.round);
    }

    private play(isAutoplay: boolean): void {
        if(!this.recapData || (this.playing && !isAutoplay) || this.finishCurrentRecap || this.gameui.isAnimatingNotification)
            return;

        const recap: RoundRecap = JSON.parse(JSON.stringify(this.recapData));
        const currentState = this.gameui.pileHandler.getStateSnapshot();
        const currentScores: Record<number, number> = {};
        const scoreAfterSteps: Record<number, number> = {};

        for(let playerID in this.gameui.players){
            currentScores[playerID] = this.gameui.scoreCtrl[playerID] ? this.gameui.scoreCtrl[playerID].getValue() : 0;
            scoreAfterSteps[playerID] = currentScores[playerID];
        }

        for(let step of recap.steps){ //derive scores before the round from the current scores
            if(step.action == 'take' && scoreAfterSteps.hasOwnProperty(step.player_id))
                scoreAfterSteps[step.player_id] -= step.taken_cards.reduce((sum, cardData) => sum + Number(cardData.rank), 0);
        }

        let finished = false;
        let watchdog: number = null;

        const finish = (failed: boolean) => {
            if(finished)
                return;
            finished = true;
            clearTimeout(watchdog);

            this.restoreCurrentState(currentState, currentScores);

            if(isAutoplay) //set even after a failure so a broken recap doesn't autoplay on every load
                this.setSeen(recap.round);

            if(failed)
                console.error('Round recap failed, showing current state');

            this.finishCurrentRecap = null;
            this.setPlaying(false);

            const deferredNotifs = this.deferredNotifs;
            this.deferredNotifs = [];
            deferredNotifs.forEach((callback) => { callback(); });
        };
        this.finishCurrentRecap = finish;

        const runAnimation = (animate: (done: () => void) => void, next: () => void) => {
            if(finished)
                return;

            clearTimeout(watchdog);
            watchdog = setTimeout(() => { finish(true); }, this.stepTimeout);

            let isDone = false;
            const done = () => {
                if(isDone || finished)
                    return;
                isDone = true;
                clearTimeout(watchdog);
                setTimeout(() => { if(!finished) next(); }, this.stepGap);
            };

            try {
                animate(done);
            } catch (e) {
                console.error(e);
                finish(true);
            }
        };

        const runStep = (stepIndex: number) => {
            if(stepIndex >= recap.steps.length){
                finish(false);
                return;
            }

            const step = recap.steps[stepIndex];
            const reason = step.action == 'take' ? 'take' : (step.action == 'place' ? 'place_under' : 'zombie');
            const pileIndex: any = step.action == 'zombie' ? 'zombie' : step.pile_index;
            const cardIconsData = step.action == 'take' ? step.taken_cards : [step.card];

            runAnimation((done) => {
                if(step.action == 'take' && this.gameui.scoreCtrl[step.player_id]){
                    scoreAfterSteps[step.player_id] += step.taken_cards.reduce((sum, cardData) => sum + Number(cardData.rank), 0);
                    this.gameui.scoreCtrl[step.player_id].toValue(scoreAfterSteps[step.player_id]);
                }

                this.gameui.pileHandler.animatePileTaken(step.player_id, pileIndex, step.card, reason, step.auto, cardIconsData, done);
            }, () => { runStep(stepIndex + 1); });
        };

        try {
            this.setPlaying(true);

            for(let playerID in scoreAfterSteps){
                if(this.gameui.scoreCtrl[playerID])
                    this.gameui.scoreCtrl[playerID].setValue(scoreAfterSteps[playerID]);
            }

            this.gameui.pileHandler.renderState(recap.piles_before, []);
            this.gameui.updateStatusText(dojo.string.substitute(_('Replaying round ${round}...'), {round: recap.round}));

            runAnimation((done) => { this.gameui.pileHandler.animatePileQueue(recap.revealed, false, done); }, () => { runStep(0); });
        } catch (e) {
            console.error(e);
            finish(true);
        }
    }

    private restoreCurrentState(currentState: { pilesData: CardData[][], pileQueueData: CardData[] }, currentScores: Record<number, number>): void {
        try {
            this.gameui.pileHandler.renderState(currentState.pilesData, currentState.pileQueueData);

            const gamestate = this.gameui.gamedatas.gamestate;
            if(gamestate.name == 'gameEnd' && currentState.pileQueueData.length > 0) //same as setup, queue stays visible at gameEnd
                this.gameui.pileHandler.pileQueueContainer.style.display = 'inline-block';

            for(let playerID in currentScores){
                if(this.gameui.scoreCtrl[playerID])
                    this.gameui.scoreCtrl[playerID].setValue(currentScores[playerID]);
            }

            this.gameui.updatePageTitle();

            if(gamestate.name == 'takePile' && gamestate.args && gamestate.args.possible_piles)
                this.gameui.pileHandler.showPossiblePiles(gamestate.args.possible_piles);

            this.gameui.tooltipHandler.addTooltipToCards();
        } catch (e) {
            console.error('Could not restore current state after round recap', e);
        }
    }

    private setPlaying(playing: boolean): void {
        this.playing = playing;
        dojo.toggleClass(dojo.body(), 'round-recap-playing', playing);
        this.ensureButton();
    }

    private getSeenKey(round: number): string { return 'ninjan_recap_seen_' + this.gameui.table_id + '_' + this.gameui.player_id + '_' + round; }

    private isSeen(round: number): boolean {
        try {
            return window.localStorage.getItem(this.getSeenKey(round)) !== null;
        } catch (e) {
            return false; //localStorage unavailable, autoplay on each load
        }
    }

    private setSeen(round: number): void {
        try {
            window.localStorage.setItem(this.getSeenKey(round), '1');
        } catch (e) {}
    }
}

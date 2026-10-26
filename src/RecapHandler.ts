type RoundRecapStep = { player_id: number, card: CardData, action: 'take' | 'place' | 'zombie', pile_index: number | null, taken_cards: CardData[], auto: boolean, piles_after?: CardData[][], queue_after?: CardData[] }; //piles_after/queue_after are missing on steps recorded before they were added
type RoundRecap = { round: number, piles_before: CardData[][], revealed: CardData[], steps: RoundRecapStep[] };
type RecapSeenMarker = { round: number, steps: number }; //seen: the reveal of that round and its first `steps` steps

class RecapHandler{
    private readonly stepTimeout: number = 10000; //fallback to current state if an animation never completes
    private readonly stepGap: number = 300;

    private playing: boolean = false;
    private finishCurrentRecap: ((failed: boolean) => void) | null = null;
    private deferredNotifs: (() => void)[] = [];
    private replayButton: HTMLDivElement = null;
    private pageTitlePositioned: boolean = false;
    private pendingSeenRecap: RoundRecap | null = null; //live notification that arrived while the tab was hidden

    constructor(private gameui: GameBody, private recapData: RoundRecap | null, autoplayEligible: boolean) {
        this.ensureButton();
        document.addEventListener('visibilitychange', () => { this.onVisibilityChange(); });
        this.pruneSeenMarkers();

        const autoplaySeenSteps = this.getAutoplaySeenSteps(autoplayEligible);
        if(autoplaySeenSteps === undefined)
            return;

        this.setPlaying(true); //block interaction right away, animations start after the interface settles
        setTimeout(() => { this.play(true, autoplaySeenSteps); }, 500);
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

    //a live reveal (no steps yet) or step counts as seen if the tab is visible when it arrives or becomes visible before its
    //animation ends: a notification reaches a tab while another tab (the acting player's, in Studio) is in front
    public markSeenLive(recapData: RoundRecap): void {
        if(!this.gameui.myself || this.gameui.isSpectator || this.gameui.isReplay() || this.gameui.instantaneousMode)
            return;

        this.pendingSeenRecap = null;
        if(document.visibilityState === 'visible'){
            this.advanceSeenMarker(recapData);
            return;
        }

        console.log('Round recap: tab hidden, seen marker waits for the tab to show before this animation ends', {round: recapData.round, steps: recapData.steps.length});
        this.pendingSeenRecap = recapData;
    }

    public onLiveNotificationReleased(): void { //the live animation ended
        if(!this.pendingSeenRecap)
            return;

        console.log('Round recap: animation ended with the tab hidden, seen marker not advanced', {round: this.pendingSeenRecap.round, steps: this.pendingSeenRecap.steps.length});
        this.pendingSeenRecap = null;
    }

    private onVisibilityChange(): void {
        if(document.visibilityState !== 'visible' || !this.pendingSeenRecap)
            return;

        const recapData = this.pendingSeenRecap;
        this.pendingSeenRecap = null;
        this.advanceSeenMarker(recapData);
    }

    private advanceSeenMarker(recapData: RoundRecap): void { //the marker only grows over what was seen without a gap
        const marker = this.getSeenMarker();
        const round = Number(recapData.round);
        const stepCount = recapData.steps.length;

        if(stepCount == 0 ? (!marker || marker.round < round) : (marker && marker.round == round && marker.steps == stepCount - 1)){
            this.setSeenMarker(round, stepCount);
            console.log('Round recap: seen marker advanced', {from: marker, to: {round: round, steps: stepCount}});
        } else
            console.log('Round recap: seen marker not advanced, an earlier part was missed or already counted', {stored: marker, round: round, steps: stepCount});
    }

    public ensureButton(): void { //status bar can be re-rendered by BGA, so this is called on every action button update
        let pageTitle: HTMLDivElement = $('page-title');
        if(!pageTitle)
            return;

        if(this.isLiveGameEnded()){ //no recap once the game has ended, a running replay is left to finish and restore the final board
            this.removeButton(pageTitle);
            return;
        }

        if(!this.replayButton || !pageTitle.contains(this.replayButton)){
            const label = _('Replay last round');

            if(getComputedStyle(pageTitle).position == 'static'){
                pageTitle.style.position = 'relative';
                this.pageTitlePositioned = true;
            }

            this.replayButton = dojo.create('div', {id: 'ninjan-replay-button', class: 'replay-round-button', role: 'button', tabindex: 0, title: label, 'aria-label': label, innerHTML: '<i class="fa fa-history"></i>'});
            dojo.place(this.replayButton, pageTitle, 'first');
            this.gameui.addTooltipHtml(this.replayButton.id, '<div class="tooltip-wrapper replay-round-tooltip">' + label + '</div>', this.gameui.isDesktop() ? 400 : 0);

            dojo.connect(this.replayButton, 'onclick', () => { this.play(false, null); });
            dojo.connect(this.replayButton, 'onkeydown', (event: KeyboardEvent) => {
                if(event.key != 'Enter' && event.key != ' ')
                    return;
                event.preventDefault();
                this.play(false, null);
            });
        }

        let isVisible = !!this.recapData && !this.playing && !this.gameui.isAnimatingNotification;
        this.replayButton.style.display = isVisible ? '' : 'none';
        dojo.toggleClass(pageTitle, 'replay-round-button-visible', isVisible);
    }

    private removeButton(pageTitle: HTMLDivElement): void {
        if(this.replayButton){
            this.gameui.removeTooltip(this.replayButton.id);
            dojo.destroy(this.replayButton);
            this.replayButton = null;
        }

        dojo.removeClass(pageTitle, 'replay-round-button-visible');
        if(this.pageTitlePositioned){
            pageTitle.style.position = '';
            this.pageTitlePositioned = false;
        }
    }

    private isLiveGameEnded(): boolean { return this.gameui.gamedatas.gamestate.name == 'gameEnd' && !this.gameui.isReplay(); } //archive/replay mode keeps the recap at gameEnd

    //how many steps autoplay starts after: null replays the reveal too, undefined means no autoplay
    private getAutoplaySeenSteps(autoplayEligible: boolean): number | null | undefined {
        if(!autoplayEligible || !this.recapData || !this.gameui.myself || this.gameui.isSpectator || this.isLiveGameEnded() || this.gameui.isReplay() || this.gameui.instantaneousMode){
            console.log('Round recap autoplay: not eligible', {autoplayEligible: autoplayEligible, hasRecap: !!this.recapData});
            return undefined;
        }

        const marker = this.getSeenMarker();
        const recap = this.recapData;
        const recapRound = Number(recap.round);
        const log = (replay: string) => { console.log('Round recap autoplay', {storedMarker: marker, recapRound: recapRound, recapSteps: recap.steps.length, replay: replay}); };

        if(!marker || marker.round < recapRound){
            log('reveal and all ' + recap.steps.length + ' steps');
            return null;
        }

        if(marker.round > recapRound || marker.steps >= recap.steps.length){
            log('nothing, already seen');
            return undefined;
        }

        const lastSeenStep = marker.steps > 0 ? recap.steps[marker.steps - 1] : null;
        const boardSource = !lastSeenStep ? 'revealed cards in the queue' : (lastSeenStep.piles_after && lastSeenStep.queue_after ? 'server snapshot' : 'steps applied to the board before the round');
        log('steps ' + (marker.steps + 1) + ' to ' + recap.steps.length + ', starting ' + (marker.steps == 0 ? 'after the reveal' : 'after step ' + marker.steps) + ' (board: ' + boardSource + ')');
        return marker.steps;
    }

    //the board after the first stepCount steps: the server's snapshot of the last one, else the steps applied to the board before the round
    private getBoardAfterSteps(recap: RoundRecap, stepCount: number): { pilesData: CardData[][], pileQueueData: CardData[] } {
        const lastStep = stepCount > 0 ? recap.steps[stepCount - 1] : null;
        if(lastStep && lastStep.piles_after && lastStep.queue_after)
            return { pilesData: lastStep.piles_after, pileQueueData: lastStep.queue_after };

        const pilesData: CardData[][] = JSON.parse(JSON.stringify(recap.piles_before));
        let pileQueueData: CardData[] = JSON.parse(JSON.stringify(recap.revealed));

        for(let step of recap.steps.slice(0, stepCount)){ //same as the server: a taken pile is replaced by the played card, a placed card goes on the bottom, a zombie's card leaves the table
            pileQueueData = pileQueueData.filter((cardData) => Number(cardData.card_id) != Number(step.card.card_id));

            if(step.action == 'take')
                pilesData[step.pile_index] = [step.card];
            else if(step.action == 'place')
                (pilesData[step.pile_index] = pilesData[step.pile_index] || []).push(step.card);
        }

        return { pilesData: pilesData, pileQueueData: pileQueueData };
    }

    private play(isAutoplay: boolean, seenSteps: number | null): void { //seenSteps: start on the board after that many steps, null replays from the reveal
        if(!this.recapData || (this.playing && !isAutoplay) || this.finishCurrentRecap || this.gameui.isAnimatingNotification || (!isAutoplay && this.isLiveGameEnded()))
            return;

        const recap: RoundRecap = JSON.parse(JSON.stringify(this.recapData));
        const firstStep = seenSteps === null ? 0 : seenSteps;
        const currentState = this.gameui.pileHandler.getStateSnapshot();
        const currentQueueLayout = this.gameui.pileHandler.getQueueLayoutSnapshot();
        const currentScores: Record<number, number> = {};
        const scoreAfterSteps: Record<number, number> = {};

        for(let playerID in this.gameui.players){
            currentScores[playerID] = this.gameui.scoreCtrl[playerID] ? this.gameui.scoreCtrl[playerID].getValue() : 0;
            scoreAfterSteps[playerID] = currentScores[playerID];
        }

        for(let step of recap.steps.slice(firstStep)){ //derive scores before the replayed steps from the current scores
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

            this.restoreCurrentState(currentState, currentQueueLayout, currentScores);

            if(isAutoplay) //set even after a failure so a broken recap doesn't autoplay on every load
                this.setSeenMarker(recap.round, recap.steps.length);

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

            this.gameui.updateStatusText(dojo.string.substitute(_('Replaying round ${round}...'), {round: recap.round}));

            if(seenSteps === null){
                this.gameui.pileHandler.renderState(recap.piles_before, []);
                runAnimation((done) => { this.gameui.pileHandler.animatePileQueue(recap.revealed, false, done); }, () => { runStep(0); });
            } else { //the board as it was after the last seen step, the revealed cards already in the queue
                const board = this.getBoardAfterSteps(recap, seenSteps);
                this.gameui.pileHandler.renderState(board.pilesData, board.pileQueueData);
                setTimeout(() => { if(!finished) runStep(firstStep); }, this.stepGap);
            }
        } catch (e) {
            console.error(e);
            finish(true);
        }
    }

    private restoreCurrentState(currentState: { pilesData: CardData[][], pileQueueData: CardData[] }, currentQueueLayout: QueueLayout, currentScores: Record<number, number>): void {
        try {
            this.gameui.pileHandler.renderState(currentState.pilesData, currentState.pileQueueData);

            const gamestate = this.gameui.gamedatas.gamestate;
            if(this.isLiveGameEnded()){ //game ended during the replay, leave the queue exactly as the live game left it
                this.gameui.pileHandler.applyQueueLayoutSnapshot(currentQueueLayout);
                this.gameui.pileHandler.onLeavingStateTakePiles(); //in case the replay started before takePile was left
            } else if(gamestate.name == 'gameEnd' && currentState.pileQueueData.length > 0) //same as setup, queue stays visible at gameEnd
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

    private static readonly SEEN_KEY_PREFIX = 'ninjan_recap_seen_';
    private static readonly SEEN_MARKER_MAX_AGE = 30 * 24 * 60 * 60 * 1000; //other tables' markers older than 30 days are deleted
    private static readonly SEEN_MARKER_MAX_COUNT = 20; //and only the newest 20 are kept

    private getSeenKey(): string { return RecapHandler.SEEN_KEY_PREFIX + this.gameui.table_id + '_' + this.gameui.player_id; }

    private getSeenMarker(): RecapSeenMarker | null {
        try {
            const marker = JSON.parse(window.localStorage.getItem(this.getSeenKey()));
            return marker && isFinite(marker.round) && isFinite(marker.steps) ? {round: Number(marker.round), steps: Number(marker.steps)} : null;
        } catch (e) {
            return null; //localStorage unavailable or unreadable, autoplay from the reveal
        }
    }

    private setSeenMarker(round: number, steps: number): void {
        try {
            window.localStorage.setItem(this.getSeenKey(), JSON.stringify({round: Number(round), steps: Number(steps), time: Date.now()}));
        } catch (e) {}
    }

    private pruneSeenMarkers(): void { //old per-round keys (<prefix><table>_<player>_<round>) go, as do other tables' stale or surplus markers
        try {
            const currentKey = this.getSeenKey();
            const otherMarkers: { key: string, time: number }[] = [];
            const keysToRemove: string[] = [];

            for(let i = 0; i < window.localStorage.length; i++){
                const key = window.localStorage.key(i);
                if(!key || key.indexOf(RecapHandler.SEEN_KEY_PREFIX) !== 0 || key == currentKey)
                    continue;

                if(/^\d+_\d+_\d+$/.test(key.substring(RecapHandler.SEEN_KEY_PREFIX.length))){
                    keysToRemove.push(key);
                    continue;
                }

                let time = 0; //markers written before the time was stored count as stale
                try { time = Number(JSON.parse(window.localStorage.getItem(key)).time) || 0; } catch (e) {}
                otherMarkers.push({key: key, time: time});
            }

            otherMarkers.sort((a, b) => b.time - a.time);
            otherMarkers.forEach((marker, index) => {
                if(index >= RecapHandler.SEEN_MARKER_MAX_COUNT || Date.now() - marker.time > RecapHandler.SEEN_MARKER_MAX_AGE)
                    keysToRemove.push(marker.key);
            });

            keysToRemove.forEach((key) => { window.localStorage.removeItem(key); });
            if(keysToRemove.length > 0)
                console.log('Round recap: removed old seen markers', keysToRemove);
        } catch (e) {}
    }
}

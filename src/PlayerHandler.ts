class PlayerHandler{
    public overallPlayerBoard: HTMLDivElement;
    public hand: HandHandler;

	constructor(private gameui: GameBody, public playerID: number, private playerName: string, public playerColor: string, private playerNo: number) {
		this.overallPlayerBoard = $('overall_player_board_' + this.playerID);
	}

	public setHand(handData, sortCardsBy, selectedCardID):void {
		this.hand = new HandHandler(this.gameui, this, handData, sortCardsBy, selectedCardID);
    }
}
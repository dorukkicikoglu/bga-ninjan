class PrefHandler{
	constructor(private gameui: GameBody, private prefNameToIndex: Record<string, number>[] ) { 
		this.gameui.bga.userPreferences.onChange = (prefIndex: number, prefValue: string) => { this.onGameUserPreferenceChanged(prefIndex, prefValue); };
	}

    private onGameUserPreferenceChanged(prefIndex: number, prefValue: string): void{
    	switch (prefIndex) {
            case 110:
                this.gameui.backgroundHandler.flyingCharactersPreferenceChanged(parseInt(prefValue) == 1);
            break;

            case 101:
                if(parseInt(prefValue) == 2 && this.gameui.gamedatas.gamestate.name != 'selectCard' && this.gameui.myself && this.gameui.myself.hand.selectedCardID){ //revert card selection
                    if(this.gameui.myself && dojo.query('.a-card[selected=true]', this.gameui.myself.hand.handContainer).length > 0)
                	   this.gameui.ajaxAction('actRevertCardSelectionPreSelection', {}, true, false);
                	dojo.query('.a-card', this.gameui.myself.hand.handContainer).attr('selected', 'false');
                }
            break;
        }
    }

    private getNumericPrefIndex(prefIndex) {
        if(this.gameui.prefs.hasOwnProperty(prefIndex))
            return prefIndex;
        else if(this.prefNameToIndex.hasOwnProperty(prefIndex))
            return this.prefNameToIndex[prefIndex];
        return null;
    }

    public setPref(prefIndexStr: string, newValue: number) {
        const prefIndex: number = this.getNumericPrefIndex(prefIndexStr);
        this.gameui.bga.userPreferences.set(prefIndex, newValue);
    }

    public getPref(prefIndex) {
        let prefIndexNum = prefIndex;
        if (typeof prefIndex === "string" && !/^\d+$/.test(prefIndex)) {
            if (!this.prefNameToIndex.hasOwnProperty(prefIndex)) {
                console.error('Pref index not found', prefIndex);
                return null;
            }
            prefIndexNum = this.prefNameToIndex[prefIndex];
        }

        return this.gameui.bga.userPreferences.get(prefIndexNum);
    }
}




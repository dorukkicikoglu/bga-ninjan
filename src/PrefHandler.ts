class PrefHandler{
	constructor(private gameui: GameBody, private prefNameToIndex: Record<string, number>[] ) { 
		(this.gameui.onGameUserPreferenceChanged as any) = (prefIndex, prefValue) => { this.onGameUserPreferenceChanged(prefIndex, prefValue); };
	}

    private onGameUserPreferenceChanged(prefIndex: number, prefValue: string): void{
		this.gameui.prefs[prefIndex].value = prefValue.toString();
		
    	switch (prefIndex) {
            case 110:
                this.gameui.backgroundHandler.flyingCharactersPreferenceChanged(parseInt(prefValue) == 1);
            break;

            case 101:
                if(parseInt(prefValue) == 2 && this.gameui.gamedatas.gamestate.name != 'selectCard' && this.gameui.myself && this.gameui.myself.hand.selectedCardID){ //revert card selection
                    if(this.gameui.myself && dojo.query('.a-card[selected=true]', this.gameui.myself.hand.handContainer).length > 0)
                	   this.gameui.ajaxcallwrapper('actRevertCardSelectionPreSelection', {}, true, false);
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

    public setPref(prefIndex, newValue) {
        prefIndex = this.getNumericPrefIndex(prefIndex);

        let optionSel = 'option[value="' + newValue + '"]';
        dojo.query('#preference_control_' + prefIndex + ' > ' + optionSel + ', #preference_fontrol_' + prefIndex + ' > ' + optionSel).attr('selected', true);

        this.gameui.prefs[prefIndex].value = newValue.toString();

        let select = $('preference_control_' + prefIndex);
        if(dojo.isIE)
            select.fireEvent('onchange');
        else {
            let event = document.createEvent('HTMLEvents');
            event.initEvent('change', false, true);
            select.dispatchEvent(event);
        }
    }

    public getPref(prefIndex) {
        prefIndex = this.getNumericPrefIndex(prefIndex);
        if(prefIndex === null)
            return null;
        return parseInt(this.gameui.prefs[prefIndex].value);
    }
}




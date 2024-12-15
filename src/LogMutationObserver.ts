class LogMutationObserver{
	private nextTimestampValue:string = '';

    constructor(private gameui: GameBody) {
		this.observeLogs();
    }

    private observeLogs(): void{
        let observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node: HTMLDivElement) => {
                        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'div' && node.classList.contains('log')){
                            let classTag = dojo.query('*[log-class-tag]', node);
                            if(classTag.length > 0){
                                dojo.addClass(node, 'a-game-log ' + dojo.attr(classTag[0], 'log-class-tag'));
                                classTag.forEach(dojo.destroy);
                            }
                            
                            dojo.query('.playername', node).forEach((playerName) => { dojo.attr(playerName, 'player-color', this.gameui.rgbToHex(dojo.style(playerName, 'color'))); });

                            if(dojo.hasClass(node, 'selected-cards-log')){
                                dojo.attr(node, 'first-selected-cards-log', Array.from(node.parentNode.children).some(sibling => sibling !== node && sibling.classList.contains("selected-cards-log")) ? 'false' : 'true'); //the first new-hand-long will have no margin-top or margin-bottom
                            } else if(dojo.hasClass(node, 'take-pile-log')){
                                if(this.gameui.isDesktop()){
                                    let cardIcons: HTMLDivElement = dojo.query('.card-icons-container', node)[0];
                                    cardIcons.style.width = 'calc(100% - ' + (10 + this.gameui.getPos(dojo.query('.playername', node)[0]).w + this.gameui.getPos(dojo.query('.log-arrow', node)[0]).w)  + 'px)';
                                }
                            }

                            if(this.gameui.isDesktop() && dojo.hasClass(node, 'a-game-log')){
                                let timestamp = dojo.query('.timestamp', node);
                                if(timestamp.length > 0){
                                    this.nextTimestampValue = timestamp[0].innerText;
                                } else if(this.observeLogs.hasOwnProperty('nextTimestampValue')){
                                    let newTimestamp: HTMLDivElement = dojo.create('div', {class: 'timestamp'});
                                    newTimestamp.innerHTML = this.nextTimestampValue;
                                    dojo.place(newTimestamp, node);
                                }
                            }
                        }
                    });
                }
            });
        });

        // Configure the MutationObserver to observe changes to the container's child nodes
        let config = {
            childList: true,
            subtree: true // Set to true if you want to observe all descendants of the container
        };

        // Start observing the container
        observer.observe($('logs'), config);
        observer.observe($('chatbar'), config); //mobile notifs
    }
}
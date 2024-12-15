class BackgroundHandler{
    private backgroundContainer: HTMLDivElement;
    private scissors: HTMLDivElement;
    private paper: HTMLDivElement;
    private rock: HTMLDivElement;

    private scissorsAngle: number = 0;

    private paperSide: number = -1;
    private flyingAnimationOn = false;
    private flyingAnimationManuallySet = false;
    private flyingTimeout : number;

	constructor(private gameui: GameBody) { 
    	this.displayBackground();
	}

    private displayBackground(){
        this.backgroundContainer = dojo.place(this.gameui.jstpl_background_container, dojo.body(), 'first');

        this.scissors = dojo.query('.bg-scissors', this.backgroundContainer)[0];
        this.paper = dojo.query('.bg-paper', this.backgroundContainer)[0];
        this.rock = dojo.query('.bg-rock', this.backgroundContainer)[0];

        this.setScissorsTime();
    }

    private setScissorsTime(){
        let maxAngle = 10;
        let maxStep = 4.5;
        let minStep = 3.5;

        let step = minStep + (Math.random() * (maxStep - minStep))
        let direction: number;

        if(this.scissorsAngle + maxStep > maxAngle)
            direction = -1;
        else if(this.scissorsAngle - maxStep < -1 * maxAngle)
            direction = 1;
        else direction = (Math.floor(Math.random() * 2) * 2) - 1; //-1 or +1 
        
        this.scissorsAngle += step * direction;

        let time = 2500 + Math.random() * 4000;
        
        this.scissors.style.transform = 'rotate(' + this.scissorsAngle + 'deg)';
        this.scissors.style.transition = 'transform ' + (time / 1000) + 's ease-in-out';

        setTimeout(() => { this.setScissorsTime(); }, time - 100);
    }

    private setPaperTime(){
        if(!this.flyingAnimationOn)
            return;

        let possibleSides = [0, 1, 2, 3];
        if(this.paperSide >= 0)
            possibleSides.splice(this.paperSide, 1);

        this.paperSide = possibleSides[Math.floor(Math.random() * possibleSides.length)];
        this.paper.style.transform = null;

        let cords: {start: {x: number, y: number}, end: {x: number, y: number}};
        let paperPos = dojo.position(this.paper); //dojo.position because background-container is out of overall-content which might have zoom property
        let bodyPos = dojo.window.getBox();
        let topBarHeight = this.gameui.getPos($('topbar')).h;
        let rightSideWidth = this.gameui.isMobile() ? 0 : this.gameui.getPos($('right-side')).w;


        function getRandomPosAtSide(orientation: string): number{ 
            return (orientation == 'vertical') ? 
                topBarHeight + Math.random() * (bodyPos.h - paperPos.h - topBarHeight) : 
                Math.random() * (bodyPos.w - paperPos.w - rightSideWidth); 
        }

        if(this.paperSide == 0)
            cords = {start: {x: -1.2 * paperPos.w, y: getRandomPosAtSide('vertical')}, end: {x: 1.2 * bodyPos.w, y: getRandomPosAtSide('vertical')}};
        else if(this.paperSide == 1)
            cords = {start: {x: getRandomPosAtSide('horizontal'), y: -1.2 * paperPos.h}, end: {x: getRandomPosAtSide('horizontal'), y: 1.2 * bodyPos.h}};
        else if(this.paperSide == 2)
            cords = {start: {x: 1.2 * bodyPos.w, y: getRandomPosAtSide('vertical')}, end: {x: -1.2 * paperPos.w, y: getRandomPosAtSide('vertical')}};
        else if(this.paperSide == 3)
            cords = {start: {x: getRandomPosAtSide('horizontal'), y: 1.2 * bodyPos.h}, end: {x: getRandomPosAtSide('horizontal'), y: -1.2 * paperPos.h}};

        let deltaX = cords.end.x - cords.start.x;
        let deltaY = cords.end.y - cords.start.y;
        let angleDegrees = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        angleDegrees = (angleDegrees + 360) % 360;

        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        let speed : number;
        if(this.gameui.isDesktop())
            speed = this.paperSide % 2 == 0 ? 0.588 : 0.27;
        else speed = this.paperSide % 2 == 0 ? 0.34 : 0.23;

        speed *= (0.8 + Math.random() * 0.4);

        let time = distance / speed;

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

        let delayToNextAnim = 18000 + Math.random() * 15000;

        clearTimeout(this.flyingTimeout);
        this.flyingTimeout = setTimeout(() => { this.setPaperTime(); }, time + delayToNextAnim);
    }

    public flyingCharactersPreferenceChanged(pref_value){ 
        let manuallySet = this.flyingAnimationManuallySet; //it's automatically called on page load on first time
        this.flyingAnimationManuallySet = true;

        dojo.attr(this.rock, 'hover-fast', pref_value ? 'true' : 'false');
        
        if(this.flyingAnimationOn === pref_value)
            return;

        this.flyingAnimationOn = pref_value;

        if(pref_value){ //turned on
            if(manuallySet)
                this.setPaperTime(); //fly instantly if manually turned on
            else setTimeout(() => { this.setPaperTime(); }, 15000 + Math.random() * 10000);
        } else {
            clearTimeout(this.flyingTimeout);
        }
    }
}
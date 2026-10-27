class AnimationHandler{
	constructor(private gameui: GameBody) {}

	public animateProperty(args): ReturnType<typeof dojo.animateProperty> {
        args = this.addEasing(args);
        return dojo.animateProperty(args);
    }

    public animateOnObject(args: Record<string, any>, ignoreGoToPositionChange: boolean = false): ReturnType<typeof dojo.animateProperty>{
        let initialGoToPos = args.goTo ? this.gameui.getPos(args.goTo) : null;

        if(!args.hasOwnProperty('properties'))
            args.properties = {};

        let dojoAnim;

        let arg_beforeBegin = args.hasOwnProperty('beforeBegin') ? args.beforeBegin : function(obj){ return obj; };
        let arg_onBegin = args.hasOwnProperty('onBegin') ? args.onBegin : function(obj){ return obj; };
        args.beforeBegin = (properties) => {
            args = arg_beforeBegin(args);

            let nodePos = this.gameui.getPos(args.node);
            let goToPos = (!ignoreGoToPositionChange && document.contains(args.goTo)) ? this.gameui.getPos(args.goTo) : initialGoToPos; // animate to initial position if goTo is not contained in DOM anymore

            let startScaleValues = {x: 1, y: 1};
            let nodeTranformMatrix = dojo.style(args.node, 'transform');
            const match = nodeTranformMatrix.match(/^matrix\(([^\)]+)\)$/);
            if (match && match.length >= 2) {
                const values = match[1].split(',').map(parseFloat);
                startScaleValues = {x: values[0], y: values[3]};
            }
            let endScaleValues = {x: startScaleValues.x * goToPos.w / nodePos.w, y: startScaleValues.y * goToPos.h / nodePos.h}

            let startW = dojo.style(args.node, 'width');
            let startH = dojo.style(args.node, 'height');

            let nodeTransformOrigin = dojo.style(args.node, 'transform-origin');
            let splitValues = nodeTransformOrigin.split(' ');
            nodeTransformOrigin = {x: parseFloat(splitValues[0]) / startW, y: parseFloat(splitValues[1]) / startH};

            if(!args.hasOwnProperty('fixX') || !args.fixX)
                dojoAnim.properties.left = {start: dojo.style(args.node, 'left'), end: dojo.style(args.node, 'left') + (goToPos.x - nodePos.x) + ((endScaleValues.x - startScaleValues.x) * nodeTransformOrigin.x * startW)};
            if(!args.hasOwnProperty('fixY') || !args.fixY)
                dojoAnim.properties.top = {start: dojo.style(args.node, 'top'), end: dojo.style(args.node, 'top') + (goToPos.y - nodePos.y) + ((endScaleValues.y - startScaleValues.y) * nodeTransformOrigin.y * startH)};

            if(JSON.stringify(startScaleValues) != JSON.stringify(endScaleValues))
                dojoAnim.properties.scale = endScaleValues.x + ' ' + endScaleValues.y;
        }

        args.onBegin = function(properties){
            args = arg_onBegin(args);
        }

        args = this.addEasing(args);

        dojoAnim = dojo.animateProperty(args);
        return dojoAnim;
    }

    private addEasing(args: Record<string, any>): ReturnType<typeof dojo.animateProperty>{
        if(!args.hasOwnProperty('easing'))
            return args;

        if(dojo.fx.easing.hasOwnProperty(args.easing))
            args.easing = dojo.fx.easing[args.easing]
        else delete args.easing;

        return args;
    }

    public fadeOutAndDestroy(node: HTMLDivElement): ReturnType<typeof dojo.animateProperty>{ return dojo.animateProperty({ node: node, properties: {opacity: 0}, duration: 300, onEnd: () => { dojo.destroy(node); } }).play(); }
}

class AnimationScope{ //collects a recap's animations and timeouts so skipping it can stop all of them at once
    private animations: ReturnType<typeof dojo.animateProperty>[] = [];
    private timeouts: number[] = [];
    private stopped: boolean = false;

    public add<T extends ReturnType<typeof dojo.animateProperty>>(animation: T): T {
        this.stopped ? this.neutralize(animation) : this.animations.push(animation);
        return animation;
    }

    public setTimeout(callback: () => void, delay: number): number {
        const timeout = window.setTimeout(callback, delay);
        this.stopped ? clearTimeout(timeout) : this.timeouts.push(timeout);
        return timeout;
    }

    public stop(): void { //stopped animations don't fire onEnd, so the combines and chains holding them never continue
        this.stopped = true;
        this.timeouts.forEach((timeout) => { clearTimeout(timeout); });
        this.animations.forEach((animation) => { this.neutralize(animation); });
        this.timeouts = [];
        this.animations = [];
    }

    private neutralize(animation: ReturnType<typeof dojo.animateProperty>): void {
        animation.play = () => animation; //a chain or combine may still try to start it
        animation.stop();
    }
}
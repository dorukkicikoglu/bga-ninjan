class ImageLoadHandler{
    private images: { [key: string]: { imageName: string; loaded: boolean } };

    constructor(private gameui: GameBody, propNames: string[]) {
        this.images = {};

        let style = getComputedStyle(document.body);
        for(let imageTag of propNames){
            let imageCSSURL = style.getPropertyValue('--image-source-' + imageTag);
            let imageNameMinified = imageCSSURL.match(/url\((?:'|")?.*\/(.*?)(?:'|")?\)/)[1];

            let imageName = imageNameMinified.replace('_minified', '');

            this.gameui.dontPreloadImage(imageName);
            this.images[imageTag] = {imageName: imageName, loaded: false};
        }

        for(let imageTag in this.images)
            this.loadImage(imageTag);
    }

    public loadImage(imageTag: string) {
        let imageName = this.images[imageTag].imageName;
        let img = new Image();
        img.src = g_gamethemeurl + 'img/' + imageName;

        img.onerror = () => { console.error('Error loading image: ' + imageName); };
        img.onload = () => {
            document.documentElement.style.setProperty('--image-source-' + imageTag, 'url(' + img.src + ')');
            this.images[imageTag].loaded = true;
        };
    }
}
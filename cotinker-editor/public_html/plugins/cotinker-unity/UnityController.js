/* global sharedArray */

class UnityController {
    constructor(loaderUrl, config, canvas) {
        this.loaderUrl = loaderUrl;
        this.config = config;
        this.canvas = canvas;

        console.log("UnityController constructed:", this.config, this.loaderUrl, this.canvas);

        this.unityInstance = null;
    }

    startUnity() {
        const self = this;

        if(this.unityInstance != null) {
            return;
        }

        return new Promise((resolve, reject)=>{
            const loaderScript = document.createElement("script");
            loaderScript.src = self.loaderUrl;
            loaderScript.onload = () => {
                createUnityInstance(self.canvas, self.config, (progress)=>{
                    console.log("Unity loading progress:", progress * 100);
                }).then((unityInstance)=>{
                    self.unityInstance = unityInstance;
                    console.log("Unity loaded!");
                    resolve();
                })
            }

            self.canvas.parentElement.appendChild(loaderScript);
        });
    }

    async destroy() {
        await this.stopUnity();
        this.unityInstance = null;
    }

    async stopUnity() {
        await this.unityInstance.Quit();
    }

    sendOSC(address, ...args) {
        let oscData = new OSC.Message(address, ...args).pack();
        this.unityInstance.SendMessage("JSBridge", "setupSharedArray", oscData.length);
        sharedArray.set(oscData);
        this.unityInstance.SendMessage("JSBridge", "createOSCMessageFromArrayAndInject");
    }

    static createEmptyUnitySlide() {
        let slide = WebstrateComponents.Tools.loadTemplate("unitySlideTpl");
        WPMv2.stripProtection(slide);

        return slide;
    }

    static createEmptyUnityJSControlSlide() {
        let slide = WebstrateComponents.Tools.loadTemplate("unityJSControlSlideTpl");
        WPMv2.stripProtection(slide);

        return slide;
    }
}

window.UnityController = UnityController;


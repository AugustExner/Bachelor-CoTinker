/* global Uploader, UUIDGenerator, webstrate */

enqueueAfterLoad(()=>{
    /*
     * Disable the hover screenshot button

    let live = new LiveElement("slide canvas");

    live.forEach((canvas)=>{
        canvas.addEventListener("mouseenter", ()=>{
            showCanvasScreenShotButton(canvas);
        });

        canvas.addEventListener("mouseleave", (evt)=>{
            hideCanvasScreenShotButton(evt.relatedTarget);
        });
    });
     */

    let screenshotButton = null;

    let latestScreenshots = [];

    function showCanvasScreenShotButton(canvas) {
        hideCanvasScreenShotButton();

        let bounds = canvas.getBoundingClientRect();

        screenshotButton = document.createElement("button");
        screenshotButton.innerHTML = "SS";
        screenshotButton.classList.add("screenshot");
        screenshotButton.style.position = "absolute";

        canvas.parentNode.appendChild(screenshotButton);

        let buttonBounds = screenshotButton.getBoundingClientRect();
        screenshotButton.style.left = (bounds.right-buttonBounds.width-8)+"px";
        screenshotButton.style.top = (bounds.bottom-buttonBounds.height-8)+"px";

        screenshotButton.addEventListener("click", ()=>{
            postScreenshot(canvas);
        })
    }

    function hideCanvasScreenShotButton(mouseTarget) {
        if(screenshotButton !=  null && mouseTarget != screenshotButton) {
            screenshotButton.remove();
            screenshotButton = null;
        }
    }

    function postScreenshot(canvas) {
        canvas.toBlob((blob) => {
            let uuid = UUIDGenerator.generateUUID();
            let screenshotName = "canvasScreenshot-"+uuid+".png";
            let thumbnailName = "canvasScreenshot-thumbnail-"+uuid+".jpg";
            Uploader.upload(location.href, blob, screenshotName).then(()=>{
                let img = document.createElement("img");
                img.onload = ()=>{
                    console.log("Img loaded");
                    Uploader.uploadImageResized(img, 320, 240, thumbnailName, location.href).then(()=>{
                        webstrate.signal({
                            cmd: "CoTinker.PostScreenshot",
                            screenshotUrl: location.href+screenshotName,
                            thumbnailUrl: location.href+thumbnailName,
                            fullWidth: canvas.width
                        }, [window.controllerId]);
                    });
                }
                img.src = location.href+screenshotName;
            });
        });
    }

    class CanvasGrabber {
        constructor() {
            const self = this;

            this.lastScreenshots = [];

            webstrate.on("signal", (msg)=>{
                switch(msg.cmd) {
                    case "CoTinker.CanvasGrabber.Grab": {
                        self.sendScreenshots();
                        break;
                    }

                    case "CoTinker.CanvasGrabber.Post": {
                        self.postScreenshot(msg.index);
                        break;
                    }
                }
            })
        }

        async sendScreenshots() {
            const self = this;

            this.lastScreenshots.forEach((obj)=>{
                obj.fullsize = null;
                obj.thumbnail = null;
                obj.base64Thumbnail = null;
                obj.canvas = null;
            });

            this.lastScreenshots = [];
            
            let canvasList = cQuery("slide canvas");
            
            if (typeof html2canvas !== undefined){
                let fullSlideCapture = await html2canvas(document.querySelector("slide[transient-activation='current']"));
                if (fullSlideCapture){
                    canvasList.push(fullSlideCapture);
                }
            }

            for(let canvas of canvasList) {
                await new Promise((resolve)=>{
                    canvas.toBlob((fullSizeBlob) => {
                        let img = document.createElement("img");
                        img.onload = ()=>{
                            Uploader.resizeImage(img, 320, 240).then((thumbnailBlob)=>{
                                const reader = new FileReader();
                                reader.readAsDataURL(thumbnailBlob);
                                reader.onloadend = () => {
                                    const base64data = reader.result;
                                    self.lastScreenshots.push({
                                        fullWidth: canvas.width,
                                        fullHeight: canvas.height,
                                        fullsize: fullSizeBlob,
                                        thumbnail: thumbnailBlob,
                                        base64Thumbnail: base64data,
                                        canvas: canvas
                                    });
                                    resolve();
                                }
                            });
                            URL.revokeObjectURL(img.src);
                        }
                        img.src = URL.createObjectURL(fullSizeBlob);
                    },'image/jpeg',0.9);
                });
            }

            webstrate.signal({
                cmd: "CoTinker.CanvasGrabber.Screenshots",
                screenshots: this.lastScreenshots.map((screenshotObj)=>{return screenshotObj.base64Thumbnail})
            }, [window.controllerId]);
        }

        postScreenshot(index) {
            let screenShotObj = this.lastScreenshots[index];

            if(screenShotObj != null) {
                let uuid = UUIDGenerator.generateUUID();
                let screenshotName = "canvasScreenshot-"+uuid+".jpg";
                let thumbnailName = "canvasScreenshot-thumbnail-"+uuid+".jpg";
                Uploader.upload(location.href.split("?")[0], screenShotObj.fullsize, screenshotName).then(()=>{
                    Uploader.upload(location.href.split("?")[0], screenShotObj.thumbnail, thumbnailName).then(()=>{
                        webstrate.signal({
                            cmd: "CoTinker.PostScreenshot",
                            screenshotUrl: location.href.split("?")[0]+screenshotName,
                            thumbnailUrl: location.href.split("?")[0]+thumbnailName,
                            fullWidth: screenShotObj.fullWidth,
                            fullHeight: screenShotObj.fullHeight
                        }, [window.controllerId]);
                    });
                });
            }
        }
    }

    window.CanvasGrabber = CanvasGrabber;

    window.setupCanvasGrabber = ()=>{
        CanvasGrabber.instance = new CanvasGrabber();
    }
})

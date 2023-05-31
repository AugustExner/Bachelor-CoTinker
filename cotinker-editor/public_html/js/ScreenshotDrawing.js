/* global PixiCanvas, cQuery, WebstrateComponents, CaviTouch */

enqueueAfterLoad(()=>{
    function initScreenshotDrawing() {
        let live = new LiveElement(".drawable");

        function resizePixiCanvas(drawable) {
            let imgWidth = drawable.getAttribute("data-width");
            let imgHeight = drawable.getAttribute("data-height");
            let imgAspect = imgWidth / imgHeight;

            let drawableBounds = drawable.getBoundingClientRect();
            let drawableAspect = drawableBounds.width / drawableBounds.height;

            let scaledWidth = drawableBounds.width;
            let scaledHeight = drawableBounds.height;

            let canvas = drawable.querySelector(".canvas canvas");

            canvas.style.position = "absolute";
            canvas.style.left = 0;
            canvas.style.top = 0;

            if(drawableAspect < imgAspect) {
                scaledHeight = scaledWidth / imgAspect;

                canvas.style.top = ((drawableBounds.height - scaledHeight) / 2.0) + "px";
            } else if(drawableAspect > imgAspect) {
                scaledWidth = scaledHeight * imgAspect;
                canvas.style.left = ((drawableBounds.width - scaledWidth) / 2.0) + "px";
            }

            canvas.style.width = scaledWidth+"px";
            canvas.style.height = scaledHeight+"px";
        }

        live.forEach((drawable) => {
            new CaviTouch(drawable, {
                'preventDefaultEvents': [],
                'stopPropagationEvents': [],
            });
            drawable.addEventListener("caviTap", ()=>{
                if(!cQuery(drawable).closest(".mobileMessage").hasTransientClass("drawmode")) {
                    openDrawing(drawable);
                }
            });

            let imgWidth = drawable.getAttribute("data-width");
            let imgHeight = drawable.getAttribute("data-height");

            drawable.pixi = new PixiCanvas(cQuery(drawable).find(".canvas"), imgWidth, imgHeight, true);
            drawable.pixi.offsetBasedOnCanvas = true;
            drawable.pixi.disableDrawing = true;
            cQuery(drawable.querySelector(".canvas")).addTransientClass("disabled");

            let thumbnailImg = drawable.querySelector("img.thumbnail");

            document.body.addEventListener('animationend', (evt) => {
                if(evt.animationName === "stepAppears") {
                    resizePixiCanvas(drawable);
                }
            });

            window.addEventListener("resize", ()=>{
                resizePixiCanvas(drawable);
            });

            if(thumbnailImg.complete) {
                resizePixiCanvas(drawable);
            } else {
                drawable.querySelector("img.thumbnail").onload = () => {
                    resizePixiCanvas(drawable);
                }
            }

            drawable.querySelector(".canvas").webstrate.on("nodeAdded", function(node) {
                if(node.matches("c")) {
                    drawable.pixi.fromSavedPath(node);
                }
            });
            drawable.querySelector(".canvas").webstrate.on("nodeRemoved", function(node) {
                if(node.matches("c")) {
                    drawable.pixi.removedSavedPath(node);
                }
            });
        });

        function openDrawing(drawable) {
            let drawingPanelTpl = WebstrateComponents.Tools.loadTemplate("#screenShotDrawingPanelTpl");

            cQuery(drawable).closest(".mobileMessage").addTransientClass("drawmode");

            let fullSizeImageUrl = drawable.getAttribute("data-full-image");

            let thumbnailImg = drawable.querySelector("img");

            let fullsizeImage = document.createElement("img");
            fullsizeImage.classList.add("fullsize");

            fullsizeImage.onload = ()=>{

                drawable.pixi.disableDrawing = false;
                drawable.pixi.mode = "DRAW";
                drawable.pixi.color = "white";

                cQuery(drawable.querySelector(".canvas")).removeTransientClass("disabled");

                drawingPanelTpl.querySelectorAll(".color").forEach((color)=>{
                    color.addEventListener("click", ()=>{
                        let wantedColor = color.getAttribute("data-color");
                        drawable.pixi.color = wantedColor;
                        drawable.pixi.mode = "DRAW";
                    });
                });

                drawingPanelTpl.querySelector(".eraser").addEventListener("click", ()=>{
                    drawable.pixi.mode = "ERASE";
                });

                drawingPanelTpl.querySelector(".close").addEventListener("click", ()=>{
                    fullsizeImage.remove();
                    drawingPanelTpl.remove();
                    cQuery(drawable).closest(".mobileMessage").removeTransientClass("drawmode");
                    drawable.pixi.disableDrawing = true;
                    cQuery(drawable.querySelector(".canvas")).addTransientClass("disabled");

                    resizePixiCanvas(drawable);
                });

                drawable.parentNode.appendChild(drawingPanelTpl);

                resizePixiCanvas(drawable);
            }

            fullsizeImage.src = fullSizeImageUrl;
            drawable.insertBefore(fullsizeImage, thumbnailImg);
        }
    }

    window.initScreenshotDrawing = initScreenshotDrawing;
})
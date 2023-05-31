/*global cQuery, webstrate, LiveElement, WebstrateComponents */

enqueueAfterLoad(async ()=>{

    function setupMobile() {
        console.log("Mobile setup...");

        let iOS = /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

        //Only run fixes on iOS
        if(iOS) {
            console.log("ENABLING IOS FIX!");

            //Disable ipad panning, updated to work in ios 11.3
            document.addEventListener("touchmove", function(event) {
                if (event.scale !== 1) { event.preventDefault(); }
            }, {passive: false});

            //Disable pinch zoom
            document.addEventListener("gesturestart", function(event) {
                event.preventDefault();
            });

            //Double tap to zoom?
            /*
            document.addEventListener("touchend", function(event) {
                event.preventDefault();
            }, {passive: false});
            */
        }

        const urlParams = new URLSearchParams(window.location.search);

        cQuery(document.documentElement).addTransientClass("mobile");
        window.view = false;
        window.viewId = urlParams.get('view');
        if (!webstrate.clients.includes(window.viewId) && !window.cotinkerConfig.controllerOnly) {
            failedController(); // The computer left in the meantime
            return;
        }
        webstrate.signal("CoTinker.Controller.Join", window.viewId);

        EditorControllerMobile.instance = new EditorControllerMobile(window.viewId);

        webstrate.on("clientPart", function clientLeft(clientId) {
            if (window.viewId == clientId) { // We are mobile and our computer just left us
                failedController();
            }
        });

        webstrate.on("reconnect", function () {
            // We are mobile and just came back online, try to join the view again
            if (!webstrate.clients.includes(window.viewId)) {
                failedController(); // The computer left in the meantime
            } else {
                webstrate.signal("CoTinker.Controller.Join", window.viewId);
            }
        });

        if (navigator.wakeLock != null) {
            debugMobile("Wakelock supported!");
            try {
                window.wakeLockSentinel = navigator.wakeLock.request();
            } catch(e) {
                debugMobile("Unable to get wakeLock:", e);
            }
        } else {
            debugMobile("Wakelock not supported!");
        }

        window.id = new Identification();

        //Setup navigation and chat
        let chat = WebstrateComponents.Tools.loadTemplate("mobileChat");
        let navigation = WebstrateComponents.Tools.loadTemplate("mobileNavigation");

        document.body.querySelector("assignment").appendChild(chat);
        document.body.querySelector("assignment").appendChild(navigation);

        if(window.cotinkerConfig.disableSidebarNavigation) {
            navigation.style.display = "none";
        }

        document.querySelector("#messenger").addEventListener("submit", (evt)=>{
            evt.preventDefault();

            let inputField = document.querySelector('#messenger input[type="text"]');
            Steps.instance.postMessage(inputField.value);
            inputField.value = null;
            
            // Blur everything in the form
            document.querySelectorAll("#messenger *").forEach((el)=>{
               el.blur(); 
            });
        });
        
        document.querySelector('#messenger input[type="text"]').addEventListener("focus", (evt)=>{
            scrollToBottom(); 
        });

        document.querySelector(".post-image").addEventListener("click", ()=>{
            //webstrate.signal({cmd: "CoTinker.CanvasGrabber.Grab"}, [window.viewId]);
            uploadImage().then((result) => {
                let img = new Image();
                img.addEventListener("load", ()=>{
                    Steps.instance.postScreenshot(location.pathname + result.full, location.pathname + result.thumb, img.width, img.height);
                });

                img.src = location.pathname + result.full;

                Tagger.tag("uploadImage");
            });
        });

        Steps.instance = new Steps(document.querySelector(".assignment-navigation button.previous"), document.querySelector(".assignment-navigation button.next"), document.querySelector(".assignment-navigation .stepCounter"));

        let liveInputChecked = new LiveElement("assignment input, assignment select, assignment textarea");

        let inputObserver = new MutationObserver((mutations)=>{
            mutations.forEach((mutation)=>{
                let form = mutation.target.closest("form");

                if(form != null) {
                    form.reset();
                }
            });
        });

        liveInputChecked.forEach((input)=>{
            if(input.hasAttribute("nosync")) {
                //Skip if nosync attribute is present
                return;
            }

            input.addEventListener("input", ()=>{
                persistInputValue(input);
            });

            inputObserver.observe(input, {
                attributes: true,
                characterData: true,
                childList: true,
                subtree: true
            });
        });

        webstrate.on("signal", (msg, clientId)=>{
            switch(msg.cmd) {
                case "CoTinker.PostScreenshot":{
                    Steps.instance.postScreenshot(msg.screenshotUrl, msg.thumbnailUrl, msg.fullWidth, msg.fullHeight);
                    break;
                }

                case "CoTinker.CanvasGrabber.Screenshots":{
                    console.log("Got screenshots: ", msg.screenshots);
                    showThumbnailDialog(msg.screenshots);
                    break;
                }
            }

        });

        initScreenshotDrawing();
    }

    function showThumbnailDialog(screenshots) {
        let dialogTpl = WebstrateComponents.Tools.loadTemplate("#thumbnailDialogTpl");

        let dialog = new mdc.dialog.MDCDialog(dialogTpl);

        screenshots.forEach((screenshot, index)=>{
            let itemTpl = WebstrateComponents.Tools.loadTemplate("#thumbnailItemTpl");

            itemTpl.querySelector("img").src = screenshot;

            itemTpl.addEventListener("click", ()=>{
                dialog.close(""+index);
            });

            dialogTpl.querySelector(".mdc-image-list").appendChild(itemTpl);
        });

        dialogTpl.querySelector(".mdc-image-list .mdc-image-list__item").setAttribute("tabindex", -1);

        document.body.appendChild(dialogTpl);
        mdc.autoInit(dialogTpl);

        dialog.listen("MDCDialog:closing", function(event) {
            console.log("Dialog closed:", event);

            let action = event.detail.action;

            if(action !== "close" && action != null) {
                webstrate.signal({
                    cmd:"CoTinker.CanvasGrabber.Post",
                    index: parseInt(action)
                }, [window.viewId]);
            }

            dialogTpl.remove();
        });

        dialog.open();
    }

    function persistInputValue(input) {
        let inputValue = input.value;
        let fieldName = input.getAttribute("fieldname");

        if(input instanceof HTMLTextAreaElement) {
            input.innerHTML = input.value;
        } else if(input instanceof HTMLSelectElement) {
            input.querySelectorAll("option").forEach((option)=>{
                if(option.value === input.value) {
                    option.setAttribute("selected", true);
                } else {
                    option.removeAttribute("selected");
                }
            })
        } else if(input instanceof HTMLInputElement) {
            let type = input.getAttribute("type");

            switch(type) {
                case "radio":
                case "checkbox":
                    let form = input.closest("form");
                    form.querySelectorAll("input[name='"+input.getAttribute("name")+"']").forEach((otherInput)=>{
                        if(otherInput !== input) {
                            otherInput.removeAttribute("checked");
                        }
                    });
                    if(input.checked) {
                        input.setAttribute("checked", "true");
                        inputValue = "checked";
                    } else {
                        input.removeAttribute("checked");
                        inputValue = "checked";
                    }
                    break;

                default:
                    input.setAttribute("value", input.value);
            }
        }

        if(input.tagTimeoutId != null) {
            clearTimeout(input.tagTimeoutId);
        }

        input.tagTimeoutId = setTimeout(()=>{
            Tagger.tag("answerGiven", {inputValue, fieldName});
            input.tagTimeoutId = null;
        }, 1000);
    }

    function failedController() {
        console.trace();

        if(window.cotinkerConfig.controllerOnly) {
            //Controller can not fail, when we are controller only mode
            return;
        }

        document.querySelector("html").appendChild(WebstrateComponents.Tools.loadTemplate("reconnect"));
        window.id?.destroy();
    }

    window.setupMobile = setupMobile;
    

    window.enableScreenshots = () => {
        let helpButton = document.querySelector(".post-image");
        helpButton.classList.remove("removed");
    }
    window.disableScreenshots = () => {
        let helpButton = document.querySelector(".post-image");
        helpButton.classList.add("removed");
    }    
});

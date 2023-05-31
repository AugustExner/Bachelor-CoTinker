/*global cQuery, webstate*/

enqueueAfterLoad(async ()=>{
    async function setupView() {
        const self = this;                
        window.view = true;
        
        if (!cotinkerConfig.disableGettingStarted){
            await showGettingStarted();
        }

        Tagger.saveOriginalFragments();

        EditorControllerView.instance = new EditorControllerView();

        webstrate.on("clientPart", function clientLeft(clientId) {
            if (window.controllerId == clientId) { // We are computer and our mobile just left us
                if (cotinkerConfig.iframeController || cotinkerConfig.sidebarController){
                    //Remove iframe, so we are ready for the reconnect event
                    document.querySelector("transient.iframeController, transient.sidebarController").remove();
                }

                EditorControllerView.instance.setController(null);
                showGettingStarted();
            }
        });

        webstrate.on("signal", function (message, senderId, node) {
            if (message == "CoTinker.Controller.Join") {
                window.controllerId = senderId;
                EditorControllerView.instance.setController(window.controllerId);
                hideGettingStarted();
            } else if(message.cmd === "CoTinker.RunOnScreen") {
                let possibleFunction = window[message.functionName];
                if(possibleFunction != null && typeof possibleFunction === "function") {
                    possibleFunction(message.options);
                }
            } else if(message.cmd === "CoTinker.Notify") {
                Notifications.instance.present("", message.notifyMsg);
            } else if(message.cmd === "CoTinker.DebugMobile") {
                let json = JSON.parse(message.debugMsg);
                console.log("[Mobile]: ", ...json);
            } else if(message.cmd === "CoTinker.MsgFromMobile") {
                window.msgFromMobileCallbacks.forEach((callback)=>{
                    callback(JSON.parse(message.msg));
                });
            }
        });
        
        // Allow folding/unfolding of individual steps in assignment when viewed as a sidebar in view
        document.body.addEventListener("click", (evt)=>{
            if (evt.target.tagName=="H1"){
                let step = evt.target.closest("step");
                if (step){
                    let expandSelf = true;
                    if (step.classList.contains("expanded")){
                        expandSelf = false;
                    }
                    document.querySelectorAll("step").forEach((step)=>{
                       step.classList.remove("expanded");
                    });
                    if (expandSelf){
                        step.classList.add("expanded");
                    }
                }
            }
        });
                    
        if(!window.cotinkerConfig.disableCollaboration) {
            setupCollaboration();
            setupAudioChat();
            setupHelpMe();

            await Collaboration.instance.localControllerJoined();
        }
        Slides.instance = new Slides();
        setupCanvasGrabber();
        setupNotifications();
        
        // Check if someone specified a step with #yadayada in the URL
        let hash = window.location.hash.substring(1);
        if (hash){
            console.log("Saw hash from URL, trying to switch step: "+hash);
            let potentialStep = document.querySelector("steps step[name='"+hash+"']");
            if (potentialStep){
                switchStep(potentialStep);
            }
        }        
        
        cQuery(document.documentElement).addTransientClass("view");
    }

    async function showGettingStarted() {
        const urlSearch = new URLSearchParams(window.location.search);

        let link = location.origin+location.pathname + "?mobile&view=" + webstrate.clientId;
        console.log(link);
        if (urlSearch.get('floaty') != null){
            cotinkerConfig.iframeController = true;
        }
        if (urlSearch.get('sidebar') != null){
            cotinkerConfig.sidebarController = true;
        }
        
        
        if (cotinkerConfig.iframeController || cotinkerConfig.sidebarController){
            let transient = document.createElement("transient");
            let frame = document.createElement("iframe");
            let minimizeHandle = document.createElement("minimizer");
            minimizeHandle.addEventListener("click", ()=>{
                transient.classList.toggle("minimized");
            })
            transient.appendChild(minimizeHandle);
            transient.appendChild(frame);
            document.documentElement.appendChild(transient);
            
            if (cotinkerConfig.iframeController) {
                transient.classList.add("iframeController");
            } else if (cotinkerConfig.sidebarController) {
                transient.classList.add("sidebarController");
            }
            frame.src = link;
            return; // We don't have to show QR code
        }

        if (urlSearch.get('ignoreGettingStarted') != null) return;
        await WPMv2.require([{package: "qrcodejs", repository: "/wpm_js_libs?raw"}]);
        let template = WebstrateComponents.Tools.loadTemplate("gettingStarted");
        new QRCode(template.querySelector(".qrcode"), {
            text: link,
            width: 2560,
            height: 2560,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        document.querySelector("html").appendChild(template);
    }

    function hideGettingStarted() {
        document.querySelectorAll(".slide.gettingStarted").forEach((slide) => {
            slide.remove();
        });
    }

    window.setupView = setupView;
});

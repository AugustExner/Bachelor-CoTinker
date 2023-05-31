async function setupShareFrame() {
    //Setup unity share page, hardcoded for now
    let unityShare = document.body.getAttribute("data-unityShare");
    let shareUrl = "/"+unityShare+"?signal";

    let shareFrame = document.createElement("iframe");
    shareFrame.classList.add("unityShareFrame");
    shareFrame.src = shareUrl;
    shareFrame.addEventListener("transcluded", function one() {
        shareFrame.removeEventListener("transcluded", one);
        console.log("Share frame ready!");
    });
    let transient = document.createElement("transient");
    transient.appendChild(shareFrame);
    transient.style.display = "none";
    document.body.appendChild(transient);

    let websocket = null;

    window.publishToShareFrame = (address, ...values)=>{
        let groupName = document.body.getAttribute("data-group-name");
        shareFrame.contentWindow.webstrate.signal({group: groupName, address, values});

        //Also publish to websocket
        if(websocket == null) {
            websocket = new WebSocket("ws://localhost:8080");
            websocket.addEventListener("open", (evt)=>{
                console.log("Websocket open!", evt);
            });
            websocket.addEventListener("error", (evt)=>{
                console.log("Websocket error!", evt);
                websocket = null;
            });
            websocket.addEventListener("close", (evt)=>{
                console.log("Websocket close!", evt);
                websocket = null;
            });
        } else {
            if(websocket.readyState === WebSocket.OPEN) {
                let data = new OSC.Message(address, ...values).pack();
                websocket.send(data);
            }
        }
    }
}

async function setupBT(button) {
    if (window.bt == null) {
        await WPMv2.require(["cotinker-cavibt", "cotinker-cavi-shared-sensors"]);

        let sensorPublish = new CaviSharedSensors();

        if (!await CaviBT.supportsBT()) {
            document.querySelector("button.connect").setAttribute("disabled", "true");
            document.querySelector(".connectionStatus").textContent = "Ikke understøttet";
            return;
        }

        const bt = new CaviBT();
        window.bt = bt;

        bt.onMessage((msg) => {
            msg = msg.trim();
            if (msg.startsWith("s:")) {
                let split = msg.split(":");
                sensorPublish.publishSensor("Lydniveau", parseInt(split[1]));
            } else if (msg.startsWith("l:")) {
                let split = msg.split(":");
                sensorPublish.publishSensor("Lysniveau", parseInt(split[1]));
            } else if (msg.startsWith("c:")) {
                let split = msg.split(":");
                sensorPublish.publishSensor("Kompas retning", parseInt(split[1]));
            } else if (msg.startsWith("t:")) {
                let split = msg.split(":");
                sensorPublish.publishSensor("Temperatur", parseInt(split[1]));
            } else if (msg.startsWith("a:")) {
                let split = msg.split(":");
                sensorPublish.publishSensor("Acceleration", parseInt(split[1]) + ", " + parseInt(split[2]) + ", " + parseInt(split[3]));
            } else if (msg.startsWith("r:")) {
                let split = msg.split(":");
                sensorPublish.publishSensor("Rotation", parseInt(split[1]) + ", " + parseInt(split[2]));
            } else if (msg.startsWith("m:")) {
                let split = msg.split(":");
                sensorPublish.publishSensor("Magnetisk styrke", parseInt(split[1]) + ", " + parseInt(split[2]));
            } else if (msg.startsWith("v:")) {
                let split = msg.split(":");
                sensorPublish.publishSensor("Value", split[1]);
            } else if (msg.startsWith("u")) {
                let split = msg.split(":");

                let address = split[1];
                let values = split.slice(2).map((v)=>{
                    if(v.includes(".") || v.includes(",")) {
                        return parseFloat(v);
                    } else {
                        return parseInt(v);
                    }
                });

                console.log("Got unity osc:", address, values);

                publishToShareFrame(address, ...values);

                //Try to find unity controller
                let slide = document.querySelector("slide[transient-activation='current']");
                if(slide?.unityController != null) {
                    slide.unityController.sendOSC(address, ...values);
                }
            }
        });
    }

    async function connectBT() {
        await window.bt.connect();
        await window.bt.startReading();

        button.classList.add("connected");

    }

    button.addEventListener("pointerup", () => {
        if (!button.classList.contains("connected")) {
            connectBT();
        }
    });

    window.bt.onDisconnected(() => {
        try {
            button.classList.remove("connected");
        } catch (e) {
            //Ignore
        }
    });

    if (window.bt.isConnected()) {
        button.classList.add("connected");
    }
}

enqueueAfterLoad(() => {

    function setupBTButton() {
        let btButton = WebstrateComponents.Tools.loadTemplate("#btButtonTpl");
        cQuery(".cotinker-top-bar").prepend(btButton);

        setupBT(btButton);
    }

    function setupResetButton() {
        let resetButton = WebstrateComponents.Tools.loadTemplate("#resetButtonTpl");
        cQuery(".cotinker-top-bar").prepend(resetButton);

        resetButton.addEventListener("click", () => {
            let ok = confirm("Er du sikker på du vil genskabe den oprindelige kode?");
            if (!ok) {
                return;
            }

            console.log("Resetting makecode...");

            let revision = document.body.getAttribute("data-original-revision");

            console.log("Original revision:", revision);

            if (revision != null && makeController?.currentlyLinkedCodeFragment != null) {
                let currentCodeFragmentId = makeController.currentlyLinkedCodeFragment.html[0].id;

                console.log("Current code fragment id:", currentCodeFragmentId);

                if (currentCodeFragmentId != null) {
                    fetch(location.pathname + revision + "?raw").then((response) => {
                        response.text().then((text) => {
                            let domParser = new DOMParser();

                            let parsedDocument = domParser.parseFromString(text, "text/html");

                            let loadedFragmentHtml = parsedDocument.querySelector("#" + currentCodeFragmentId);

                            if (loadedFragmentHtml != null) {
                                let loadedFragment = Fragment.setupFragment(cQuery(loadedFragmentHtml));

                                if (loadedFragment != null) {
                                    makeController.currentlyLinkedCodeFragment.raw = loadedFragment.raw;
                                }
                            }
                        });
                    });
                }
            }
        });
    }

    window.setupResetButton = setupResetButton;

    window.addEventListener("keyup", (evt)=>{
        if(evt.key === "PageDown") {
            Steps.nextStep();
        } else if(evt.key === "PageUp") {
            Steps.prevStep();
        }
    });

    if (window.view) {
        //View
        setupShareFrame();
        setupBTButton();

        //Save version
        if (document.body.getAttribute("data-original-revision") == null) {
            document.body.setAttribute("data-original-revision", webstrate.version);
        }
    }
});

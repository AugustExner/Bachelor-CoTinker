class DataLogger {
    constructor(loggerFragment) {
        const self = this;

        this.fragment = Fragment.one(loggerFragment);

        this.callbacks = new Map();

        this.fragment.registerOnFragmentChangedHandler((context)=>{
            if(context !== "dataLoggerSelf") {
                //Update from someone else, ie. from webstrates
                //Trigger update callbacks

                self.fragment.require().then((json)=>{
                    self.callbacks.forEach((cb, key)=>{
                        let data = json[key];

                        if(data != null) {
                            cb.forEach((cbEntry)=>{
                                cbEntry(data);
                            });
                        }
                    });
                });
            }
        });
    }

    async logData(type, value) {
        let json = {};
        try {
            json = await this.fragment.require();
        } catch(e) {
            console.warn("Unable to load old data, resetting...");
        }

        let now = Date.now();

        let newSeries = false;

        let data = json[type];
        if(data == null) {
            data = [];
            json[type] = data;

            newSeries = true;

        }

        data.push({time: now, value});

        this.fragment.executeObserverless(()=>{
            this.fragment.raw = JSON.stringify(json, null, 2);
        }, "dataLoggerSelf");

        if(newSeries) {
            this.enumerateCallbacks("series", (callback)=>{
                callback(Object.keys(json));
            });
        }

        this.enumerateCallbacks(type, (callback)=>{
            callback(data);
        });
    }

    enumerateCallbacks(type, callback) {
        let callbacks = this.callbacks.get(type);

        if(callbacks != null) {
            callbacks.forEach((c)=>{
                callback(c);
            });
        }
    }

    async getDataSeries() {
        let data = await this.fragment.require();

        return Object.keys(data);
    }

    async getSeries(key) {
        let data = await this.fragment.require();

        return data[key];
    }

    async getAllData() {
        return await this.fragment.require();
    }

    registerUpdateCallback(type, callback) {
        let callbackArray = this.callbacks.get(type);
        if(callbackArray == null) {
            callbackArray = [];
            this.callbacks.set(type, callbackArray);
        }
        callbackArray.push(callback);
    }

    unregisterUpdateCallback(type, callback) {
        let callbackArray = this.callbacks.get(type);
        if(callbackArray != null) {
            callbackArray.splice(callbackArray.indexOf(callback), 1);
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

        //Handle data logging
        bt.onMessage((msg)=>{
            let split = msg.split(":");

            //Only log data of single value
            if(split.length === 2) {
                dataLogger.logData(split[0], parseFloat(split[1]));
            }
        });

        bt.onMessage((msg) => {
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
            }
        });
    }

    async function connectBT() {
        if(await window.bt.connect()) {
            button.classList.add("connected");
        }
    }

    button.addEventListener("pointerup", async () => {
        if (!button.classList.contains("connected")) {
            await connectBT();
        }
    });

    window.bt.onDisconnected(() => {
        button.classList.remove("connected");
    });

    if (window.bt.isConnected()) {
        button.classList.add("connected");
    }
}

enqueueAfterLoad(() => {

    function setupNavigation() {
        let navigation = WebstrateComponents.Tools.loadTemplate("navigationTpl");

        cQuery(".cotinker-top-bar").append(navigation);

        navigation.querySelector(".prevButton").addEventListener("pointerup", () => {
            Steps.prevStep();
            console.log("Prev");
        });

        navigation.querySelector(".nextButton").addEventListener("pointerup", () => {
            Steps.nextStep();
            console.log("Next");
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.matches("step")) {
                    Steps.updateIndicator(navigation.querySelector(".stepCounter"));
                }
            });
        });

        observer.observe(document.querySelector("steps"), {
            attributes: true,
            attributeFilter: ["class", "data-slide", "data-slide-mode"],
            subtree: true,
            childList: true
        });

        Steps.updateIndicator(navigation.querySelector(".stepCounter"));
    }

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

    if (window.view) {
        window.dataLogger = new DataLogger("#data");

        //View
        setupBTButton();
        setupNavigation();

        //Save version
        if (document.body.getAttribute("data-original-revision") == null) {
            document.body.setAttribute("data-original-revision", webstrate.version);
        }
    }
});

window.addEventListener("keyup", (evt)=>{
    if(evt.key === "PageDown") {
        Steps.nextStep();
    } else if(evt.key === "PageUp") {
        Steps.prevStep();
    }
})

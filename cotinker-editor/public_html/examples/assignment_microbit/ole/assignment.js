function killVideoPlayback() {
    document.querySelectorAll("video").forEach((video) => {
        video.pause();
        video.currentTime = 0;
    });
    document.querySelectorAll(".videoContainer").forEach((videoContainer) => {
        videoContainer.classList.remove("playing");
    });
}

function playPause(container) {
    let video = container.querySelector("video");
    if (video.paused) {
        console.log("Playing video!");
        video.play();
        container.classList.add("playing");
    } else {
        console.log("Pausing video!");
        video.pause();
        container.classList.remove("playing");
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
    let codeLibraryIframe = null;
    const codeLibraryReady = new Promise((resolve) => {
        let codeLibraryWebstrate = document.body.getAttribute("data-code-library");
        if (codeLibraryWebstrate == null || codeLibraryWebstrate.trim().length === 0) {
            console.warn("No codelibrary webstrate defined!");
        } else {
            //Setup
            codeLibraryIframe = document.createElement("iframe");
            let transient = document.createElement("transient");

            transient.appendChild(codeLibraryIframe);
            transient.style.display = "none";
            codeLibraryIframe.src = location.origin + "/" + codeLibraryWebstrate;

            codeLibraryIframe.webstrate.on("transcluded", async () => {
                resolve();
            });

            document.body.appendChild(transient);
        }
    });

    function saveCurrentCodeToLibrary() {
        if (makeController != null) {
            let json = makeController.getCurrentProjectJSON();

            if (json != null) {
                let codeName = prompt("Giv jeres kode et navn:");
                if (codeName == null || codeName.trim().length === 0) {
                    return;
                }

                //Clone json
                json = Object.assign({}, json);

                json.header.meta.caviId = "kodebibliotek";

                console.log(codeLibraryReady);

                codeLibraryReady.then(() => {
                    let codeLibrary = codeLibraryIframe.contentDocument.querySelector("code-library");
                    if (codeLibrary == null) {
                        codeLibrary = codeLibraryIframe.contentDocument.createElement("code-library");
                        codeLibraryIframe.contentDocument.body.appendChild(codeLibrary);
                    }

                    let code = codeLibraryIframe.contentDocument.createElement("code");
                    code.setAttribute("data-code-name", codeName);
                    code.setAttribute("data-group-name", document.body.getAttribute("data-group-name"));
                    code.setAttribute("data-timestamp", "" + Date.now());
                    code.textContent = JSON.stringify(json, null, 2);

                    codeLibrary.appendChild(code);
                });
            }
        }
    }


    function loadFromLibrary(code) {
        Fragment.one("#kodebibliotek").raw = code;
    }

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

    setupNavigation();

    function setupBTButton() {
        let btButton = WebstrateComponents.Tools.loadTemplate("#btButtonTpl");
        cQuery(".cotinker-top-bar").prepend(btButton);

        setupBT(btButton);
    }

    window.setupBTButton = setupBTButton;

    function setupSaveButton() {
        let saveButton = WebstrateComponents.Tools.loadTemplate("#saveButtonTpl");
        cQuery(".cotinker-top-bar").prepend(saveButton);

        saveButton.addEventListener("click", () => {
            saveCurrentCodeToLibrary();
        });
    }

    window.setupSaveButton = setupSaveButton;

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

    function setupLoadButton() {
        let loadButton = WebstrateComponents.Tools.loadTemplate("#loadButtonTpl");
        cQuery(".cotinker-top-bar").prepend(loadButton);

        function findCode() {
            let options = [];

            codeLibraryIframe.contentDocument.querySelectorAll("code-library code").forEach((code) => {
                let option = document.createElement("option");
                option.textContent = code.getAttribute("data-code-name") + " (" + code.getAttribute("data-group-name") + ")";
                option.value = code.textContent;

                options.push(option);
            });

            return options;
        }

        loadButton.addEventListener("click", () => {
            let codeSelector = cQuery("dialog#loadCode .codeSelector");
            codeSelector.empty();

            findCode().forEach((option) => {
                codeSelector[0].appendChild(option);
            });

            document.querySelector("dialog#loadCode").showModal();
        });
    }

    window.setupLoadButton = setupLoadButton;

    if (window.view) {
        //View
        window.saveCurrentCodeToLibrary = saveCurrentCodeToLibrary;
        window.loadFromLibrary = loadFromLibrary;

        let selectCodeDialog = document.querySelector("dialog#loadCode");
        dialogPolyfill.registerDialog(selectCodeDialog);

        selectCodeDialog.addEventListener("close", () => {
            if (selectCodeDialog.returnValue === "load") {
                let selectedCode = cQuery("dialog#loadCode .codeSelector")[0].value;
                loadFromLibrary(selectedCode);
            }
        });

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

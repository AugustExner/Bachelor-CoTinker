/*global EventSystem, Cauldron, Fragment, EdgeDocker, QRCode, MenuSystem, webstrate, cQuery */

//Setup turn server, for webstrates webrtc stuff
webstrate.config.peerConnectionConfig = {
    iceServers: [
        {urls: "stun:130.225.18.147:3478", username: "video", credential: "strate"},
        {urls: "turn:130.225.18.147:3478", username: "video", credential: "strate"},
//        {urls: "stun:80.210.69.32:3478", username: "video", credential: "strate"},
//        {urls: "turn:80.210.69.32:3478", username: "video", credential: "strate"}
    ],
    iceTransportPolicy: "relay"
};

let wpmLoadingDone = false;
let runAfterLoadQueue = [];

window.escapeHTML = (htmlStr) => {
    return htmlStr.replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function enqueueAfterLoad(callback) {
    if(wpmLoadingDone) {
        await callback();
    } else {
        runAfterLoadQueue.push(callback);
    }
}

WPMBoot.onLoaded(async ()=>{
    // Create function on window to install Cauldron editor
    window.cauldronEditor = async () => {
        if(typeof Cauldron === "undefined") {
            await WPMv2.require("cotinker-cauldron");
        }

        if (typeof localCauldronEditor === "undefined") {
            window.localCauldronEditor = new Cauldron.Cauldron();
        }
        localCauldronEditor.open();
    }

    //Run when/if Cauldron is initialized
    EventSystem.registerEventCallback("Cauldron.OnInit", () => {
        //Insert Cauldron view menu item
        MenuSystem.MenuManager.registerMenuItem("Cauldron.View", {
            label: "Popout editor",
            order: 1000, //Order us very low priority, so near the end of the menu
            onAction: () => {
                window.open(location.href + "?edit");
            }
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const editorMode = urlParams.get('edit');
    if (editorMode != null && editorMode !== false) {
        Fragment.disableAutorun = true;
        EventSystem.registerEventCallback("Cauldron.OnInit", ({detail: {cauldron: cauldron}}) => {
            EventSystem.triggerEvent("Cauldron.Dock", {
                pos: EdgeDocker.MODE.MAXIMIZED
            });
        });
        await cauldronEditor();

        //Skip the rest of loader.js as we are now in cauldron edit mode
        return;
    }

    const controllerOnlyMode = urlParams.get('controllerOnly');
    if (controllerOnlyMode != null && controllerOnlyMode !== false) {
        window.cotinkerConfig.controllerOnly = true;
    }

    const statsMode = urlParams.get('stats');
    if (statsMode != null && statsMode !== false) {
        // Skip the rest of the normal load process as we are now in stats mode
        window.cotinkerConfig.skipEverything = true;

        WPMBoot.onLoaded(async ()=>{        
            await WPMv2.require( "cotinker-analytics");
            stubShowAnalytics();
        });
    }

    const passiveMode = urlParams.get('passive');
    if (passiveMode != null && passiveMode !== false) {
        // Skip the rest of the normal load process as we are now in stats mode
        window.cotinkerConfig.skipEverything = true;
        webstrate.signal("passiveLoadDone");
    }

    // Check if we need to continue or stop here
    if (window.cotinkerConfig.skipEverything){
        // Skip the rest of loader.js as a plugin has requested to take over
        Fragment.disableAutorun = true;        
        return;
    }

    enqueueAfterLoad(()=>{
        //Hide parts of UI we do not want
        let transient = document.createElement("transient");
        let style = document.createElement("style");
        transient.appendChild(style);
        document.head.appendChild(transient);

        let styleSheet = style.sheet;

        console.log("Adding style rules!");
        let ruleIndex = 0;

        if(window.cotinkerConfig.hideSendNote) {
            styleSheet.insertRule(".assignment-chat { display: none !important; }", ruleIndex);
            ruleIndex++;
        }

        if(window.cotinkerConfig.hideCollabButtons) {
            styleSheet.insertRule(".collabButton { display: none !important; }", ruleIndex);
        }
    });

    // Perform normal loading
    wpmLoadingDone = true;
    for(let callback of runAfterLoadQueue) {
        await callback();
    }
});

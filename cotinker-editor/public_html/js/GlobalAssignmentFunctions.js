/* global webstrate, WPMv2, EventSystem, Fragment, Cauldron, WebstrateComponents */

enqueueAfterLoad(async ()=>{
    /* ------------- Global Helper functions for teacher code ------------- */

    /**
     * Open the CodeEditor for a given array of fragments.
     * @param fragments - The fragments to open in the editor
     * @returns {Promise<void>}
     */
    window.openEditor = async function openEditor(fragments=[], parent=false, showConsole=true){
        if(typeof Cauldron === "undefined") {
            await WPMv2.require("cotinker-cauldron");
        }

        // Open Cauldron
        if(typeof slimCauldronEditor === "undefined") {
            window.slimCauldronEditor = new Cauldron.CauldronSlim(showConsole);
        }
        await slimCauldronEditor.open(parent);

        // Load some fragments into the tabs
        if (!Array.isArray(fragments)) fragments = [fragments];
        fragments.forEach((fragmentRef)=>{
            EventSystem.triggerEvent("Cauldron.Open.FragmentEditor", {
                fragment: Fragment.one(fragmentRef)
            });
        });
    }

    /**
     * Close the CodeEditor
     */
    window.closeEditor = function(){
        if (typeof window.slimCauldronEditor !== "undefined"){
            window.slimCauldronEditor.close();
        }
    }

    window.isEditorOpen = function() {
        if(window.slimCauldronEditor != null) {
            return window.slimCauldronEditor.isOpen();
        }

        return false;
    }

    window.runOnScreen = function(functionName, options) {
        webstrate.signal({cmd: "CoTinker.RunOnScreen", functionName, options}, [window.viewId]);
    }

    window.debugMobile = function() {
        webstrate.signal({cmd: "CoTinker.DebugMobile", debugMsg: JSON.stringify(Array.from(arguments))}, [window.viewId]);
    }

    window.sendMsgToScreen = function(msg) {
        webstrate.signal({cmd: "CoTinker.MsgFromMobile", msg: JSON.stringify(msg)}, [window.viewId]);
    }

    window.msgFromMobileCallbacks = [];
    window.onMessageFromMobile = function(callback) {
        window.msgFromMobileCallbacks.push(callback);

        return {
            "remove": ()=>{
                window.msgFromMobileCallbacks.splice(window.msgFromMobileCallbacks.indexOf(callback), 1);
            }
        }
    }

    /**
     * Jump to a specified line, column of the given fragment
     * @param fragmentSelector
     * @param line
     * @param col
     */
    window.jumpTo = function(fragmentSelector, line=0, col=0){
        if(window.view) {
            EditorControllerView.instance.jumpTo(fragmentSelector, line, col);
        } else {
            EditorControllerMobile.instance.sendJumpTo(fragmentSelector, line, col);
        }
    };

    /**
     * Broadcast that selections should be cleared
     * @param fragmentSelector
     */
    window.broadcastSelectionCleared = function(fragmentSelector){
        if(window.view) {
            EditorControllerView.instance.broadcastSelectionCleared(fragmentSelector);
        } else {
            EditorControllerMobile.instance.sendBroadcastSelectionCleared(fragmentSelector);
        }
    };

    /**
     * Broadcast a selection
     * @param fragmentSelector
     * @param startLine
     * @param startCol
     * @param endLine
     * @param endCol
     */
    window.broadcastSelection = function(fragmentSelector, startLine, startCol, endLine, endCol){
        if(window.view) {
            EditorControllerView.instance.broadcastSelection(fragmentSelector, startLine, startCol, endLine, endCol);
        } else {
            EditorControllerMobile.instance.sendBroadcastSelection(fragmentSelector, startLine, startCol, endLine, endCol);
        }
    };
    
    window.openAssignment = function(){
        if(window.view) {
            cQuery(document.body).addTransientClass("assignment");
        }
    }
    window.closeAssignment = function(){
        if(window.view) {
            cQuery(document.body).removeTransientClass("assignment");
        }
    }

    window.closeSidebar = function() {
        document.querySelector(".sidebarController").classList.add("minimized");
    }

    window.openSidebar = function() {
        document.querySelector(".sidebarController").classList.remove("minimized");
    }

    window.uploadImage = function() {
        return new Promise((resolve, reject)=>{
            let uploadInput = document.createElement("input");
            uploadInput.setAttribute("type", "file");
            uploadInput.setAttribute("accept", "image/*;capture=camera");
            uploadInput.style.display = "none";

            document.body.appendChild(uploadInput);

            uploadInput.click();
            uploadInput.remove();
            uploadInput.addEventListener("change", (evt) => {
                if(uploadInput.files.length === 0) {
                    reject();
                }

                let reader = new FileReader();
                reader.addEventListener("load", (evt) => {
                    let randomName = UUIDGenerator.generateUUID("image", 10)+".jpg";
                    let randomNameThumb = UUIDGenerator.generateUUID("image", 10)+".jpg";

                    let img = new Image();
                    img.addEventListener("load", ()=>{
                        //Rescale image, and convert to jpg
                        Uploader.uploadImageResized(img, 1920, 1080, randomName, location.pathname).then(()=>{
                            Uploader.uploadImageResized(img, 480, 270, randomNameThumb, location.pathname).then(()=> {
                                resolve({full: randomName, thumb: randomNameThumb});
                            });
                        }).catch((e)=>{
                            console.warn(e);
                            reject();
                        });
                    });
                    img.src = reader.result;
                });

                reader.readAsDataURL(uploadInput.files[0]);
            });
        });
    }
});

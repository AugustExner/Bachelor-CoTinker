class MakeController {
    /**
     * Creates a MakeController instance and inserts it into target element
     * @param {HTMLElement} target
     * @returns {MakeController}
     */
    constructor(target) {        
        const self = this;
        this.pendingMessages = {}; // Keep track of queries that provide an answer
        this.currentlyLinkedCodeFragment = null;
        this.blockFilters = {};
        this.latestReadHash = "";
        this.waitingMessages = [];
        this.connected = false;
        this.ignoreMakeCodeChanges = true;
        this.currentProjectJSON = {};

        // Setup iframe
        this.frame = document.createElement("iframe");
        this.frame.setAttribute("data-load-state", "loading");
        this.frame.setAttribute("allow", "usb; autoplay;");
        target.appendChild(this.frame);
        this.messageCallback = this.receiveMessage.bind(this);
        window.addEventListener("message", this.messageCallback, false);

        this.iframeLoadedPromise = new Promise((resolve)=>{
            self.frame.onload = ()=>{
                //Check for creating new project modal

                console.log("iframe loaded!");
                resolve();
            }
        });
        this.frame.src="https://makecode.microbit.org/stable/?controller=1#editor";

        // Setup import dialog
        this.importDialog = document.createElement("transient");
        this.importDialog.style.position = "absolute";
        this.importDialog.style.background = "rgba(0,0,0,0.9)";
        this.importDialog.style.left = "0";
        this.importDialog.style.top = "0";
        this.importDialog.style.right = "0";
        this.importDialog.style.bottom = "0";
        this.importDialog.style.display = "none";
        this.importDialog.style.color = "white";
        this.importDialog.style.justifyContent = "center";
        this.importDialog.style.alignItems = "center";
        this.importDialog.style.flexDirection = "column";
        let importButton = document.createElement("button");
        importButton.innerHTML = "Import .HEX";
        importButton.addEventListener("click", ()=>{
            self.importHEX();
        });        
        this.importDialog.appendChild(document.createElement("h1"));
        this.importDialog.appendChild(importButton);
        target.appendChild(this.importDialog);

        this.workspacesaveCount = 0;

        function getProjectHash(projectJSON){ 
            let text = projectJSON.text;
            
            // Perform unifying corrections to project to weed out useless changes
            if (text["main.blocks"]){                
                // Ignore minimized for comment blocks                            
                text["main.blocks"] = text["main.blocks"].replaceAll("comment minimized=\"true\"", "comment");
                
                // Re-write all blocks so that minX = 0 and minY = 0 and rest of blocks are relative to that
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(text["main.blocks"],"text/xml");
                let minX = Infinity;
                let minY = Infinity;
                xmlDoc.querySelectorAll("block[x]").forEach((block)=>{
                    let x = parseInt(block.getAttribute("x"));
                    let y = parseInt(block.getAttribute("y"));

                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                });
                xmlDoc.querySelectorAll("block[x]").forEach((block)=>{
                    let x = parseInt(block.getAttribute("x"));
                    let y = parseInt(block.getAttribute("y"));

                    block.setAttribute("x", x-minX);
                    block.setAttribute("y", y-minY);
                });

                text["main.blocks"] = new XMLSerializer().serializeToString(xmlDoc);
            }
             
            let tutorial = projectJSON?.header?.tutorial;
            return JSON.stringify(text)+JSON.stringify(tutorial);
        }
        
        this.onCodeFragmentChanged = async function onCodeFragmentChanged(context){
            if(context === webstrate.clientId) {
                //This was a fragment change we did ourselves
                return;
            }

            //Clean childnodes, since we only want 1 state
            Array.from(self.currentlyLinkedCodeFragment.getTextContentNode().childNodes).forEach((child, index)=>{
                if(index > 0) {
                    child.remove();
                }
            });

            // STUB: Improve this for multi-user experience, avoid overwriting each other's simultaneous edits if there are no clashes...            
            let code = self.currentlyLinkedCodeFragment.raw;
            
            if (code.trim()===""){
                // Empty fragment, show import helper dialog
                let title = "Import MakeCode .HEX File";
                if (self.currentlyLinkedCodeFragment.id){
                    title += " into #"+self.currentlyLinkedCodeFragment.id;
                }
                self.showImportDialog(title);
            } else {
                self.hideImportDialog();
                let projectJSON = JSON.parse(code);
                let newHash = getProjectHash(projectJSON);
                if (newHash === self.latestReadHash){
                    console.log("FRAG => VOID beacause too similar", projectJSON, self.currentProjectJSON);
                } else {
                    //Try to make it detectable when project is saved
                    projectJSON.header.targetVersion = "0.0.0";

                    console.log("FRAG => MAKE", projectJSON, self.currentProjectJSON);
                    self.currentProjectJSON = projectJSON;
                    self.latestReadHash = newHash;
                    await self.loadProject(projectJSON);
                }
            }
        };
        this.onMakeCodeChanged = function onMakeCodeChanged(projectJSON){
            // STUB: Improve this for multi-user experience, avoid overwriting each other's simultaneous edits if there are no clashes...
            if (self.currentlyLinkedCodeFragment && !self.ignoreMakeCodeChanges){
                const restriction = self.currentlyLinkedCodeFragment.html[0].getAttribute("data-restrict");

                //HACK: Only allow loading a project that has same caviId, if currentProject had a cavi id.
                if(restriction != null) {
                    if (restriction != projectJSON.header?.meta?.caviId) {
                        console.warn("MAKE => VOID because CaviID did not match:", restriction, projectJSON);
                        return;
                    }
                }

                /*
                    Functions and variables always have id (or functionid) on them. So this test needs to be more clever
                */
                // Avoid sending updates with IDs that temporarily appear during compilation
                if (projectJSON?.text["main.blocks"]){
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(projectJSON.text["main.blocks"], "application/xml");

                    let varIds = [];

                    doc.querySelectorAll("variables variable").forEach((variable)=>{
                        varIds.push(variable.getAttribute("id"));
                    });

                    let nonVarElementsWithId = [];



                    doc.querySelectorAll("[id]").forEach((elmWithId)=>{
                        let id = elmWithId.getAttribute("id");
                        if(!varIds.includes(id)) {
                            nonVarElementsWithId.push(elmWithId);
                        }
                    });

                    if(nonVarElementsWithId.length > 0) {
                        console.log("MAKE => VOID because weird IDs on elements", nonVarElementsWithId, projectJSON);
                        return;
                    }
                }



                // Avoid sending update if program is essentially unchanged
                let newHash = getProjectHash(projectJSON);
                if (self.latestReadHash === newHash){ 
                    console.log("MAKE => VOID because too similar", projectJSON, self.currentProjectJSON);
                    return;
                }
                
                // OK then, send it
                console.log("MAKE => FRAG", projectJSON, self.currentProjectJSON);
                self.currentProjectJSON = projectJSON;
                self.latestReadHash = newHash;
                Tagger.tag("userChangedCode", {
                    fragmentId: self.currentlyLinkedCodeFragment.html[0].getAttribute("id")
                });
                self.currentlyLinkedCodeFragment.executeObserverless(()=>{
                    //Attempt hack to fix double text add inside the textcontentnode
                    //Remove all other children, we only want 1 text child node
                    Array.from(self.currentlyLinkedCodeFragment.getTextContentNode().childNodes).forEach((child)=>{
                        child.remove();
                    });

                    let newTextContent = document.createTextNode(JSON.stringify(projectJSON));
                    self.currentlyLinkedCodeFragment.html[0].appendChild(newTextContent);
                }, webstrate.clientId, false);
            }
        };
        this.onTutorialFragmentChanged = function onTutorialFragmentChanged(fragment){
            self.loadTutorial(fragment.raw);
        };        
    }

    // Receive controller messages from the frame
    receiveMessage(ev) {
        const editor = this.frame.contentWindow;
        const msg = ev.data;
        const self = this;

        if (msg.type === "pxthost") {
            console.log(msg.action);

            if(msg.action != null) {
                if (msg.action === "workspacesync") {
                    console.log("---> MakeCode: Workspace Sync Request <--");
                    msg.projects = [];
                    editor.postMessage(msg, "*");

                    return;
                } else if (msg.action === "workspaceloaded") {
                    console.log("---> MakeCode: Workspace Loaded <--");
                    setTimeout(() => {
                        //Also wait for iframe to think its loaded
                        self.iframeLoadedPromise.then(()=>{

                            //Wait for 5 workspace saved, before we send delayed messages

                            let intervalId = setInterval(()=>{
                                if(self.workspacesaveCount >= 5) {
                                    console.log("Saw 5 workspacesave!");
                                    clearInterval(intervalId);
                                    self.connected = true;
                                    self.waitingMessages.forEach(({msg, resolve}) => {
                                        console.log("Sending delayed message ", msg);
                                        editor.postMessage(msg, "*");
                                        if(!msg.response) {
                                            resolve();
                                        }
                                    });
                                    self.waitingMessages = [];
                                    this.frame.setAttribute("data-load-state", "loaded");
                                }
                            }, 10);
                        });
                    }, 0);
                } else if (msg.action === "workspacesave") {
                    this.workspacesaveCount++;

                    if (this.currentlyLinkedCodeFragment) {
                        this.onMakeCodeChanged(msg.project);
                    }
                } else {
                    console.warn("Unknown pxthost message from makecode", msg);
                }
            }
        } else if (msg.type === "pxteditor") {
            const req = this.pendingMessages[msg.id];
            if (req){
                if (req.msg.action === "renderblocks") {
                    const img = document.createElement("img");
                    img.src = msg.resp;
                    req.resolve(img);
                } else if (req.msg.action === "importproject"){
                    console.log("--> Importing project code completed <--");
                    this.ignoreMakeCodeChanges = false; 
                    req.resolve(true); // TODO: provide true/false if it worked or some other feedback?
                } else {
                    console.warn("Unknown pxteditor message from makecode", msg);
                }
            }
        }
        delete this.pendingMessages[msg.id];
    }              
    
    sendMessage(action, options={}) {
        const editor = this.frame.contentWindow;
        const msg = {
            type: "pxteditor",
            id: Math.random().toString(),
            action: action
        };
        Object.assign(msg, options);
        
        switch (action){
            case "importproject":
            case "renderblocks":
                msg.response = true;
        }

        return new Promise((resolve, reject)=>{
            if (msg.response){
                // We keep track of this msg for a later response
                // and don't return immediately
                this.pendingMessages[msg.id] = {msg, resolve, reject};
            }
            if (this.connected){
                editor.postMessage(msg, "*");
                if(!msg.response) {
                    resolve();
                }
            } else {
                console.log("Delaying message to MakeCode editor, since not connected:",msg);
                this.waitingMessages.push({msg, resolve});
            }                    
        });
    }
    
    /**
     * Show a popup with pairing options
     */
    pair(){
        return this.sendMessage("pair");
    }

    switchToJavascript(){
        return this.sendMessage("switchjavascript");
    }
    switchToBlocks(){
        return this.sendMessage("switchblocks");
    }    
    restrictLanguages(mode){
        /*            "python-only",
            "javascript-only",
            "blocks-only",
            "no-blocks",
            "no-python",
            "no-javascript",*/
        return this.sendMessage("setlanguagerestriction", {restriction: mode});
    }        
    
    hideSimulator(){
        return this.sendMessage("hidesimulator");
    }
    stopSimulator(){
        return this.sendMessage("stopsimulator");
    }    

    /**
     * Imports a project into the current environment (potentially overwriting
     * fragment if linked)
     * @param {type} projectJSON
     */
    async loadProject(projectJSON){
        this.ignoreMakeCodeChanges = true; // Avoid updating fragments due to spurious events while loading

        //Set targetVersion to dummy, triggers workspacesaved?

        await this.sendMessage("importproject", {
            project: projectJSON,
            filters: this.blockFilters,
            searchBar: false
        });
    }
          
    /**
     * Uses the given JSON fragment as backing store for program and block code
     * @param {type} fragment
     * @param {type} filters
     * @returns {undefined}
     */
    async linkFragment(fragment, filters={}){
        if (this.currentlyLinkedCodeFragment != null){
            this.unlinkFragment(this.currentlyLinkedCodeFragment);
        }
        this.latestReadHash = "";       
        this.blockFilters = filters;

        // Initial import of fragment into editor(s)
        this.currentlyLinkedCodeFragment = fragment;
        await this.onCodeFragmentChanged();
        
        // Listen for changes in fragment and cause re-imports
        fragment.registerOnFragmentChangedHandler(this.onCodeFragmentChanged);
    }
    unlinkFragment(fragment){
        fragment.unRegisterOnFragmentChangedHandler(this.onCodeFragmentChanged);
        this.currentlyLinkedCodeFragment = null;
    }
    
    /**
     * Loads the given markdown code as a tutorial and launches it
     * @param {type} markdown
     */
    loadTutorial(markdown){
        this.sendMessage("importtutorial", {
            markdown: markdown
        });        
    }
    
    /**
     * Loads the given Markdown fragment as a tutorial an launches it, while
     * monitoring changes to the fragment and updating the tutorial.
     * @param {type} fragment
     * @returns {undefined}
     */
    linkTutorial(fragment){
        fragment.registerOnFragmentChangedHandler(this.onTutorialFragmentChanged);
        this.onTutorialFragmentChanged(fragment);
    }
    
    /**
     * Opens a file dialog to import a HEX file into the current environment - 
     * replaces the current program code (also if linked to a fragment)
     */
    importHEX(){
        let self = this;
        let input = document.createElement("input");
        
        input.setAttribute("type", "file");
        input.addEventListener("change", ()=>{
            console.log(input);
            let file = input.files[0];
            console.log("Importing ", file.name);
            let reader = new FileReader();
            reader.onload = (ev) => {
                self.ignoreMakeCodeChanges = false; // We are using MakeCode to import to json
                let result = reader.result;
                self.frame.contentWindow.postMessage({
                    type: "importfile",
                    filename: file.name,
                    parts: [result]
                }, "*");
            };
            reader.readAsText(file);
        });
        input.click(); 
    }
    
    showImportDialog(message="Import into Fragment"){
        this.importDialog.querySelector("h1").innerText = message;
        this.importDialog.style.display = "flex";        
    }
    
    hideImportDialog(){
        this.importDialog.style.display = "none";
    }
    
    destroy(){
        if (this.currentlyLinkedCodeFragment != null){
            this.unlinkFragment(this.currentlyLinkedCodeFragment);
            this.currentlyLinkedCodeFragment = null;
        }
        this.frame.remove();
        this.importDialog.remove();
        window.removeEventListener("message", this.messageCallback);
    }

    getCurrentProjectJSON() {
        return this.currentProjectJSON;
    }
}

window.MakeController = MakeController;

enqueueAfterLoad(async ()=>{
    class Collaborator {
        constructor() {
            this.name = "Unknown";
            this.controller = null;
            this.voice = false;
            this.view = null;
            this.speaking = false;
            this.muted = false;
        }
    }

    class Collaboration {
        constructor() {
            const self = this;

            this.collaborationHtml = WebstrateComponents.Tools.loadTemplate("#collaborationTpl");

            cQuery(".cotinker-top-bar").prepend(this.collaborationHtml);

            this.collaborators = [];

            this.localControllerResolve = null;
            this.localControllerPromise = new Promise((resolve)=>{
                this.localControllerResolve = resolve;
            });

            webstrate.on("signal", (msg, clientId)=>{
                self.handleSignal(msg, clientId);
            });

            webstrate.on("clientJoin", (clientId)=>{
                self.handleClientJoin(clientId);
            });

            webstrate.on("clientPart", (clientId)=>{
                self.handleClientPart(clientId);
            });

            EventSystem.registerEventCallback("CoTinker.AudioChat.UserLeft", ({detail: {clientId: clientId}})=>{
                let collaborator = self.getCollaboratorFromView(clientId, false);

                if(collaborator != null) {
                    collaborator.voice = false;
                    this.updateCollaborationPanel();
                }
            });

            EventSystem.registerEventCallback("CoTinker.AudioChat.UserJoined", ({detail: {clientId: clientId}})=>{
                let collaborator = self.getCollaboratorFromView(clientId, true);

                collaborator.voice = true;

                this.updateCollaborationPanel();
            });

            EventSystem.registerEventCallback("CoTinker.AudioChat.Speaking", ({detail: {clientId: clientId}})=>{
                let collaborator = self.getCollaboratorFromView(clientId, false);

                collaborator.speaking = true;

                this.updateCollaborationPanel();
            });

            EventSystem.registerEventCallback("CoTinker.AudioChat.Silent", ({detail: {clientId: clientId}})=>{
                let collaborator = self.getCollaboratorFromView(clientId, false);

                collaborator.speaking = false;

                this.updateCollaborationPanel();
            });

            EventSystem.registerEventCallback("CoTinker.AudioChat.MuteStatus", ({detail: {muted: muted, client: clientId}})=> {
                let collaborator = this.getCollaboratorFromView(clientId, true);
                collaborator.muted = muted;
                console.log("Changed mute status for: ", clientId, muted);
                this.updateCollaborationPanel();
            });


            //Ping all unknown clients for data
            setInterval(()=>{
                let clientsToPing = webstrate.clients.filter((client)=>{
                    let knownClient = self.collaborators.find((collaborator)=>{
                        return collaborator.view === client || collaborator.controller === client;
                    });

                    return client !== webstrate.clientId && knownClient == null;
                });

                webstrate.signal({cmd: "CoTinker.Collaboration.Ping"}, clientsToPing);
            }, 2000);
        }

        async localControllerJoined() {
            await this.localControllerPromise;
        }

        getCollaboratorFromView(view, createIfNotFound=false) {
            let collaborator = this.collaborators.find((collaborator)=>{ return collaborator.view === view});

            if(createIfNotFound && collaborator == null) {
                collaborator = new Collaborator();
                collaborator.view = view;
                this.collaborators.push(collaborator);
            }

            return collaborator;
        }

        getCollaboratorFromController(controller, createIfNotFound) {
            let collaborator = this.collaborators.find((collaborator)=>{ return collaborator.controller === controller});

            if(createIfNotFound && collaborator == null) {
                collaborator = new Collaborator();
                collaborator.controller = controller;
                this.collaborators.push(collaborator);
            }

            return collaborator;
        }

        handleSignal(msg, clientId) {
            switch(msg.cmd) {
                case "CoTinker.Identification.Name": {
                    //When joining from a mobile, the view is our "real" id
                    console.log("Got identification:", msg);

                    let collaborator = this.getCollaboratorFromView(msg.payload.view, true);

                    collaborator.name = msg.payload.name;
                    collaborator.view = msg.payload.view;
                    collaborator.controller = clientId;

                    //If this is our controller, resolve promise
                    if(msg.payload.view === webstrate.clientId) {
                        console.log("Got controller:", collaborator.controller);
                        this.localControllerResolve();
                    }

                    this.updateCollaborationPanel();

                    break;
                }
            }
        }

        handleClientJoin(clientId) {
            webstrate.signal({cmd: "CoTinker.Collaboration.Ping"}, [clientId]);
        }

        handleClientPart(clientId) {
            const self = this;

            this.collaborators.forEach((collaborator)=>{
                if(collaborator.controller === clientId) {
                    collaborator.controller = null;
                    console.log("Controller left:", clientId, collaborator);
                }

                if(collaborator.view === clientId) {
                    collaborator.view = null;
                    console.log("View left:", clientId, collaborator);
                }
            });

            this.collaborators = this.collaborators.filter((collaborator)=>{
                return collaborator.view != null;
            })

            this.updateCollaborationPanel();
        }

        updateCollaborationPanel() {
            this.collaborationHtml.querySelector(".usercount").innerHTML = ""+this.collaborators.length;

            let collaborationOverview = this.collaborationHtml.querySelector(".collaborationOverview");

            while(collaborationOverview.lastChild != null) {
                collaborationOverview.removeChild(collaborationOverview.lastChild);
            }

            this.collaborators.forEach((collaborator)=>{
                let entry = WebstrateComponents.Tools.loadTemplate("#collaborationEntryTpl");

                entry.querySelector(".name").innerHTML = collaborator.name;

                if(webstrate.clientId === collaborator.view) {
                    entry.classList.add("self");
                }

                if(collaborator.controller != null) {
                    entry.classList.add("controllerEnabled");
                }

                if(collaborator.muted === true) {
                    entry.classList.add("muted");
                }

                if(collaborator.voice) {
                    entry.classList.add("voiceEnabled");

                    let volume = AudioChat.instance.getVolume(collaborator.view);

                    entry.querySelector(".volume .slider").value = volume;

                    entry.querySelector(".volume .slider").addEventListener("input", ()=>{
                        AudioChat.instance.setVolume(collaborator.view, entry.querySelector(".volume .slider").value / 100.0);
                    });
                }


                if(collaborator.speaking) {
                    entry.classList.add("voiceSpeaking");
                }

                collaborationOverview.appendChild(entry);
            });
        }
    }

    window.Collaboration = Collaboration;

    window.setupCollaboration = ()=> {
        Collaboration.instance = new Collaboration();
    }
});

class CaviSharedSensors {
    constructor() {
        const self = this;

        this.jsonChangeCallbacks = [];
        this.connectResolve = null;
        this.connectReject = null;
        this.connectPromise = new Promise((resolve, reject)=>{
            self.connectResolve = resolve;
            self.connectReject = reject;
        });

        this.setupIframe();
    }

    async waitForConnect() {
        console.log("Waiting for shared sensor connect!");
        await this.connectPromise;
        console.log("Done waiting!");
    }

    destroy() {
        if(this.transient != null) {
            this.transient.remove();
            this.iframe = null;
            this.transient = null;
        }
    }

    setupIframe() {
        const self = this;

        let sensorPublishWebstrateId = document.body.getAttribute("data-sensor-publish-webstrate");

        if(sensorPublishWebstrateId != null) {
            this.iframe = document.createElement("iframe");
            this.transient = document.createElement("transient");
            this.transient.style.display = "none";

            this.iframe.webstrate.on("transcluded", function oneShot(){
                self.iframe.webstrate.off("transcluded", oneShot);

                self.setupObserver();

                console.log("Found shared sensor webstrate!");

                self.connectResolve();
            });

            this.iframe.src = location.origin + "/" + sensorPublishWebstrateId;

            this.transient.appendChild(this.iframe);
            document.body.appendChild(this.transient);
        } else {
            console.warn("No sensor publish webstrateid set.");
            self.connectReject();
        }
    }

    setupObserver() {
        const self = this;

        let observer = new this.iframe.contentWindow.MutationObserver((mutations)=>{
            let triggeredCallbacks = new Set();
            mutations.forEach((mutation)=>{
                if(mutation.target.matches != null) {
                    self.jsonChangeCallbacks.forEach((callbackEntry)=>{
                        if(mutation.target.matches("."+callbackEntry.className)) {
                            triggeredCallbacks.add(callbackEntry.callback);
                        }
                    })
                }

                if(mutation.addedNodes != null) {
                    mutation.addedNodes.forEach((node)=>{
                        if(node.matches != null) {
                            self.jsonChangeCallbacks.forEach((callbackEntry)=>{
                                if(node.matches("."+callbackEntry.className)) {
                                    triggeredCallbacks.add(callbackEntry.callback);
                                }
                            })
                        }
                    });
                }
                if(mutation.removedNodes != null) {
                    mutation.removedNodes.forEach((node)=>{
                        if(node.matches != null) {
                            self.jsonChangeCallbacks.forEach((callbackEntry)=>{
                                if(node.matches("."+callbackEntry.className)) {
                                    triggeredCallbacks.add(callbackEntry.callback);
                                }
                            })
                        }
                    });
                }
            });

            triggeredCallbacks.forEach((callback)=>{
                callback();
            })
        });

        observer.observe(this.iframe.contentDocument.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    async publishSensor(name, value) {
        if(this.iframe == null) {
            return;
        }

        let groupName = document.body.getAttribute("data-group-name");
        let webstrateId = webstrate.webstrateId;

        let groupsDiv = this.iframe.contentDocument.querySelector("#groups");
        if(groupsDiv == null) {
            groupsDiv = this.iframe.contentDocument.createElement("div", {approved: true});
            groupsDiv.id = "groups";
            groupsDiv.classList.add("groups");
            this.iframe.contentDocument.body.appendChild(groupsDiv);
        }

        let groupDiv = groupsDiv.querySelector("#"+webstrateId);
        if(groupDiv == null) {
            groupDiv = this.iframe.contentDocument.createElement("div", {approved: true});
            groupDiv.id = webstrateId;
            groupDiv.classList.add("group");

            let groupNameDiv = this.iframe.contentDocument.createElement("div", {approved: true});
            groupNameDiv.classList.add("header");
            groupNameDiv.textContent = groupName;
            groupDiv.appendChild(groupNameDiv);

            groupsDiv.appendChild(groupDiv);
        }

        let sensorsDiv = groupDiv.querySelector(".sensors");
        if(sensorsDiv == null) {
            sensorsDiv = this.iframe.contentDocument.createElement("div", {approved: true});
            sensorsDiv.classList.add("sensors");
            groupDiv.appendChild(sensorsDiv);
        }

        let sensorId = name.replaceAll(" ", "_");

        let sensorDiv = groupDiv.querySelector("#"+sensorId);
        if(sensorDiv == null) {
            sensorDiv = this.iframe.contentDocument.createElement("div", {approved: true});
            sensorDiv.classList.add("sensor");
            sensorDiv.id = sensorId;
            sensorsDiv.appendChild(sensorDiv);
        }

        sensorDiv.innerHTML = "<span class='name'>"+name+"</span><span class='value'>"+value+"</span>";

        await this.iframe.contentWindow.webstrate.dataSaved();
    }

    async publishJson(json, id, className) {
        let fragmentId = webstrate.webstrateId+"-"+id;

        let fragment = this.iframe.contentDocument.querySelector("code-fragment#"+fragmentId);

        if(fragment == null) {
            fragment = this.iframe.contentDocument.createElement("code-fragment");
            fragment.setAttribute("data-type", "application/json");
            fragment.id = fragmentId;
            fragment.classList.add(className);
            WPMv2.stripProtection(fragment);
            this.iframe.contentDocument.body.appendChild(fragment);
        }

        while(fragment.lastChild != null) {
            fragment.lastChild.remove();
        }

        let textNode = document.createTextNode(JSON.stringify(json, null, 2));
        fragment.appendChild(textNode);

        await this.iframe.contentWindow.webstrate.dataSaved();
    }

    async getJson(className) {
        let result = [];

        for(let fragment of this.iframe.contentDocument.querySelectorAll("code-fragment[data-type='application/json']."+className)){
            let json = JSON.parse(fragment.textContent);
            result.push(json);
        }

        return result;
    }

    registerJsonChangeListener(className, callback) {
        this.jsonChangeCallbacks.push({className, callback});
    }
}

window.CaviSharedSensors = CaviSharedSensors;

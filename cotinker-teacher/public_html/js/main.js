const instances = [];

class CotinkerInstance {
    constructor(webstrateId, groupName, html) {
        const self = this;

        this.webstrateId = webstrateId;
        this.groupName = groupName;
        this.html = html;

        this.ready = false;

        this.setupIframe().then(()=>{
            //Rerender now that iframe is ready
            self.render();
        });

        this.render();
    }

    startObserver() {
        const self = this;

        this.observer = new MutationObserver((mutations)=>{
            mutations.forEach((mutation)=>{
                if(mutation.target.matches("step")) {
                    self.render();
                }
            });
        });

        this.observer.observe(this.iframe.contentDocument.querySelector("steps"), {
            attributes: true,
            attributeFilter: ["class"],
            subtree: true
        })
    }

    render() {
        const self = this;

        if(this.htmlTransient != null) {
            this.htmlTransient.remove();
        }

        this.htmlTransient = document.createElement("transient");
        this.html.appendChild(this.htmlTransient);


        let remove = document.createElement("a");
        remove.href = "#";
        remove.innerHTML = "&#10006;";
        remove.title = "Remove";
        remove.classList.add("remove");
        remove.addEventListener("click", ()=>{
            if(confirm("Are you sure you want to delete: "+self.groupName)) {
                this.delete();
            }
        });

        let url = location.origin + "/" + this.webstrateId;
        let statsLink = document.createElement("a");
        statsLink.href = url+"?stats";
        statsLink.innerHTML = "S";
        statsLink.title = "Statistics";

        let link = document.createElement("a");
        link.classList.add("groupName");
        link.classList.add("cell");
        link.title = "Link to '"+this.groupName+"'";
        link.href = url;
        link.target = "_blank";
        link.textContent = this.groupName;


        let stepsSelect = document.createElement("select");
        stepsSelect.classList.add("steps");
        stepsSelect.classList.add("cell");

        let controls = document.createElement("controls");
        controls.classList.add("cell");
        controls.appendChild(remove);
        controls.appendChild(statsLink);

        this.htmlTransient.appendChild(link);
        this.htmlTransient.appendChild(controls);
        this.htmlTransient.appendChild(stepsSelect);

        if(this.ready) {
            let steps = this.iframe.contentDocument.querySelectorAll("step");

            stepsToSelect(steps, stepsSelect, (stepName)=>{
                self.switchToStep(stepName);
            });
        }
    }

    switchToStep(stepName) {
        if(this.ready) {
            let step = this.iframe.contentDocument.querySelector("[name='"+stepName+"']");
            this.iframe.contentWindow.switchStep(step);
            this.render();
        } else {
            console.log("Not ready!");
        }
    }

    delete() {
        this.html.remove();
        this.iframeTransient.remove();
        this.observer.disconnect();
        instances.splice(instances.indexOf(this), 1);
    }

    setupIframe() {
        const self = this;

        return new Promise((resolve, reject)=>{
            self.iframe = document.createElement("iframe");
            self.iframe.src = location.origin + "/" + self.webstrateId + "?passive";
            self.iframe.webstrate.on("transcluded", ()=>{
                self.ready = true;
                console.log("Iframe ready:", self.webstrateId, self.groupName);

                self.startObserver();

                resolve();
            });

            self.iframeTransient = document.createElement("transient");
            self.iframeTransient.style.display = "none";

            self.iframeTransient.appendChild(self.iframe);

            document.body.appendChild(self.iframeTransient);
        });
    }
}

function stepsToSelect(steps, select, onInput, addDefault=false) {
    let currentSelection = null;

    steps.forEach((step, index)=>{
        let option = document.createElement("option");
        let name = step.getAttribute("name");
        let desc = step.getAttribute("data-description");

        option.textContent = (index+1) + " - " + name;
        //option.setAttribute("title", desc);
        option.value = name;

        select.appendChild(option);

        if(step.classList.contains("current")) {
            currentSelection = name;
        }
    });

    if(addDefault) {
        let defaultOption = document.createElement("option");
        defaultOption.textContent = "Select step";
        defaultOption.value = "";
        select.insertBefore(defaultOption, select.firstChild);
        currentSelection = "";
    }

    if(currentSelection != null) {
        select.value = currentSelection;
    }

    select.addEventListener("input", ()=>{
        onInput(select.value);
    });
}

webstrate.on("loaded", async ()=>{
    await WPMv2.require("/wpm_js_libs?raw #cQuery");

    let template = document.querySelector(".template").innerText.trim();
    let sensorPublishWebstrateId = document.querySelector(".sensorPublish").innerText.trim();
    let codeLibraryWebstrate = document.querySelector(".codeLibrary").innerText.trim();

    setupStepsSelector();

    document.querySelector(".toggleSetup").addEventListener("click", ()=>{
        let tab = document.body.getAttribute("transient-tab");
        if (tab=="setup"){
            document.body.setAttribute("transient-tab","");

            //We just exited setup, reload config
            template = document.querySelector(".template").innerText.trim();
            sensorPublishWebstrateId = document.querySelector(".sensorPublish").innerText.trim();
            codeLibraryWebstrate = document.querySelector(".codeLibrary").innerText.trim();
            setupStepsSelector();
        } else {
            document.body.setAttribute("transient-tab","setup");
        }
    });

    document.querySelector(".sensorPublishPage").addEventListener("pointerup", ()=>{
        window.open(location.origin + "/" + sensorPublishWebstrateId, "_blank");
    });

    document.querySelector(".create").addEventListener("pointerup", ()=>{
        const url = location.origin + "/" + template + "/?copy&passive=true";

        let groupName = prompt("Group name?");

        if(groupName == null || groupName.trim().length === 0) {
            //Cancel was pressed, or no name entered
            return;
        }

        let iframe = document.createElement("iframe");
        iframe.src = url;

        let transient = document.createElement("transient");
        transient.appendChild(iframe);
        transient.style.display = "none";

        document.body.classList.add("wait");

        iframe.webstrate.on("transcluded", async (webstrateId)=>{

            iframe.contentDocument.querySelector("head title").textContent = "CoTinker - "+groupName;

            iframe.contentDocument.body.setAttribute("data-group-name", groupName);
            iframe.contentDocument.body.setAttribute("data-sensor-publish-webstrate", sensorPublishWebstrateId);
            iframe.contentDocument.body.setAttribute("data-code-library", codeLibraryWebstrate);
            iframe.contentDocument.body.setAttribute("data-original-revision", iframe.contentWindow.webstrate.version);

            await iframe.contentWindow.webstrate.dataSaved();

            iframe.contentWindow.webstrate.on("signal", (msg, sender, node)=>{
                if(msg === "passiveLoadDone") {
                    transient.remove();
                }
            });

            document.body.classList.remove("wait");

            let ul = document.querySelector(".groups");

            let li = document.createElement("li", {approved: true});
            //Fix for firefox classList.add and webstrates protected
            if(li.getAttribute("class") == null) {
                li.setAttribute("class", "");
            }
            li.classList.add("group");
            li.setAttribute("data-webstrate", webstrateId);
            li.setAttribute("data-group-name", groupName);

            ul.appendChild(li);
        });

        document.body.appendChild(transient);
    });

    cQuery("ul.groups").liveQuery("li.group", {
        added: (elm)=>{
            let groupName = elm.getAttribute("data-group-name");
            let webstrateId = elm.getAttribute("data-webstrate");

            instances.push(new CotinkerInstance(webstrateId, groupName, elm));
        }
    });

    function setupStepsSelector() {
        let iframe = document.createElement("iframe");
        iframe.src = location.origin + "/" + template+"?passive";

        let transient = document.createElement("transient");
        transient.appendChild(iframe);
        transient.style.display = "none";

        let stepsSelect = document.querySelector("select.steps");
        stepsSelect.innerHTML = "";

        iframe.webstrate.on("transcluded", async (webstrateId)=>{
            //Got template, find steps
            let steps = iframe.contentDocument.querySelectorAll("step");

            stepsToSelect(steps, stepsSelect, (stepName)=>{
                instances.forEach((instance)=>{
                    instance.switchToStep(stepName);
                });

                stepsSelect.value = "";
            }, true);

            iframe.contentWindow.webstrate.on("signal", (msg, sender, node)=>{
                if(msg === "passiveLoadDone") {
                    transient.remove();
                }
            });
        });

        document.body.appendChild(transient);
    }
});


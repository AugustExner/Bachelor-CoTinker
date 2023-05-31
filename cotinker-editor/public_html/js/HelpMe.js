/* global WebstrateComponents, webstrate */

enqueueAfterLoad(async ()=>{
    class HelpMe {
        static pingForHelp() {
            return new Promise((resolve)=>{
                let transient = document.createElement("transient");
                transient.style.display = "none";
                let iframe = document.createElement("iframe");
                iframe.src = "/cotinker-helpdesk?requestHelp="+location.href;

                iframe.webstrate.on("transcluded", function oneshot() {
                    iframe.webstrate.off("transcluded", oneshot);
                    iframe.contentDocument.body.webstrate.on("signal", (msg)=>{
                        console.log("Msg:", msg);
                        if(msg === "RequestDone") {
                            transient.remove();
                            resolve();
                        }
                    });
                });

                transient.appendChild(iframe);
                document.body.appendChild(transient);
            });
        }

        static cancelHelpRequest() {
            return new Promise((resolve)=>{
                let transient = document.createElement("transient");
                transient.style.display = "none";
                let iframe = document.createElement("iframe");
                iframe.src = "/cotinker-helpdesk?cancelHelp="+location.href;

                iframe.webstrate.on("transcluded", function oneshot() {
                    iframe.webstrate.off("transcluded", oneshot);
                    iframe.contentDocument.body.webstrate.on("signal", (msg)=>{
                        console.log("Msg:", msg);
                        if(msg === "CancelDone") {
                            transient.remove();
                            resolve();
                        }
                    });
                });

                transient.appendChild(iframe);
                document.body.appendChild(transient);
            });
        }

        constructor() {
            const self = this;

            this.dialogTpl = WebstrateComponents.Tools.loadTemplate("#getHelpDialogTpl");
            this.helpStatusTpl = WebstrateComponents.Tools.loadTemplate("#helpStatusTpl");
            this.helpButtonTpl = WebstrateComponents.Tools.loadTemplate("#helpButtonTpl");
            this.helpRequestTpl = WebstrateComponents.Tools.loadTemplate("#helpRequestTpl");
            this.helpCancelTpl = WebstrateComponents.Tools.loadTemplate("#helpCancelTpl");

            this.dialog = new WebstrateComponents.ModalDialog(this.dialogTpl, {
                title: "Remote Help",
                classes: ["helpBox"]
            });

            document.querySelector("html").appendChild(this.dialog.html);

            self.switchPanelTo(self.helpButtonTpl);

            this.helpButtonTpl.addEventListener("click", ()=>{
                self.switchPanelTo(self.helpRequestTpl);
                document.querySelector(".helpButton").classList.add("helpRequested");

                let collaborator = Collaboration.instance.getCollaboratorFromView(webstrate.clientId, false);
                let name = collaborator==null?"Unknown":collaborator.name;

                webstrate.signal({
                    cmd: "CoTinker.Notify",
                    notifyMsg: "\""+name+"\" requested help from the helpdesk"
                });
                HelpMe.pingForHelp().then(()=>{
                    self.switchPanelTo(self.helpStatusTpl);
                });
            });

            this.helpStatusTpl.querySelector(".cancel").addEventListener("click", ()=>{
                self.switchPanelTo(this.helpCancelTpl);
                document.querySelector(".helpButton").classList.remove("helpRequested");
                let collaborator = Collaboration.instance.getCollaboratorFromView(webstrate.clientId, false);
                let name = collaborator==null?"Unknown":collaborator.name;

                webstrate.signal({
                    cmd: "CoTinker.Notify",
                    notifyMsg: "\""+name+"\" cancelled the request for help from the helpdesk"
                });
                HelpMe.cancelHelpRequest().then(()=>{
                    self.switchPanelTo(this.helpButtonTpl);
                })
            })
        }

        switchPanelTo(panel) {
            this.dialogTpl.querySelector(".helpArea").innerHTML = "";
            this.dialogTpl.querySelector(".helpArea").appendChild(panel);
        }

        showHelpDialog() {
            this.dialog.open();
        }
    }

    window.HelpMe = HelpMe;

    window.setupHelpMe = ()=>{
        HelpMe.instance = new HelpMe();

        let helpButton = document.querySelector(".helpButton");
        if(helpButton != null) {
            helpButton.addEventListener("click", () => {
                HelpMe.instance.showHelpDialog();
            });
        }
    }
    
    window.enableHelp = ()=>{
        let helpButton = document.querySelector(".helpButton");
        helpButton.classList.remove("removed");
    }
    window.disableHelp = ()=>{
        let helpButton = document.querySelector(".helpButton");
        helpButton.classList.add("removed");
    }
});
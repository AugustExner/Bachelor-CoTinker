/*global webstrate*/

enqueueAfterLoad(async ()=>{
    class Identification {
        constructor(){
            const self = this;

            if (this.getName()){
                this.broadcast();
                this.tagMobileJoined();
            } else {
                this.showIdentificationPopup();
            }

            this.clientJoinHandler = (clientId) => {
                self.broadcast(clientId);
            };

            webstrate.on("clientJoin", this.clientJoinHandler);

            this.signalHandler = (msg, clientId)=>{
                if(msg.cmd === "CoTinker.Collaboration.Ping") {
                    self.broadcast(clientId);
                }
            };

            webstrate.on("signal", this.signalHandler);
        }

        destroy() {
            webstrate.off("clientJoin", this.clientJoinHandler);
            webstrate.off("signal", this.signalHandler);
        }

        tagMobileJoined() {
            setTimeout(()=>{
                if (Tagger){
                    Tagger.tag("mobileUserJoined");
                }
            },0);
        }

        getName() {
            // Check for a webstrate-wide cookie first (logged in users)
            if (webstrate.user.cookies) {
                let cookieName = webstrate.user.cookies.anywhere.get(Identification.COOKIE);
                if (cookieName && cookieName.trim().length > 0) {
                    return escapeHTML(cookieName);
                }
            }

            // Check for local browser cookie
            let cookieName = Cookies.get(Identification.COOKIE);

            if (cookieName && cookieName.trim().length > 0) {
                return escapeHTML(cookieName);
            }

            return false;
        }

        setName(name) {
            //Escape name
            name = escapeHTML(name);

            if (webstrate.user.cookies) {
                webstrate.user.cookies.anywhere.set(Identification.COOKIE, name);
            }
            Cookies.set(Identification.COOKIE, name, { expires: 200 });
        }

        showIdentificationPopup(){
            const self = this;

            let popup = WebstrateComponents.Tools.loadTemplate("identification");
            // TODO: Prepopulate name if already known (for edit purposes)

            cQuery(popup).one("form").addEventListener("submit", (evt)=>{
                evt.preventDefault();
                self.setName(evt.target.elements['name'].value);
                self.hideIdentificationPopup();
                self.broadcast();
                self.tagMobileJoined();

            });
            document.querySelector("html").appendChild(popup); 
        };
        hideIdentificationPopup(){
            document.querySelectorAll(".identificationPopup").forEach((popup)=>{
                popup.remove();
            });
        };

        /**
         * Tell everyone who we are
         * @returns {undefined}
         */
        broadcast(target=false){
            let name = this.getName();

            if(name) {
                let payload = {name: name, view: window.viewId};

                if (target) {
                    webstrate.signal({cmd: "CoTinker.Identification.Name", payload: payload}, [target]);
                } else {
                    webstrate.signal({cmd: "CoTinker.Identification.Name", payload: payload});
                }
            }
        }
    }

    window.Identification = Identification;
    window.Identification.COOKIE = "cotinker-identification-name";    
});

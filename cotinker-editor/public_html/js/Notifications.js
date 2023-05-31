enqueueAfterLoad(async ()=>{
    class Notifications {
        constructor(){
            this.lastTag = null;            
            this.ourDiv = WebstrateComponents.Tools.loadTemplate("notificationArea");

            if(cotinkerConfig.disableNotifications !== true) {
                document.body.appendChild(this.ourDiv);
            }

            this.timer = null;
            
            let self = this;
            
            Tagger.addChangeListener(()=>{
                Tagger.getTags().then((tags)=>{
                    let newestTag = tags[tags.length-1];
                    if (newestTag){
                        if (!this.lastTag || newestTag.timestamp != this.lastTag.timestamp){
                            switch (newestTag.event){
                                case "stepForward":
                                    this.assignmentNotification(newestTag.name, "⏭&#xfe0e;");
                                    break;
                                case "stepBack":
                                    this.assignmentNotification(newestTag.name, "⏮&#xfe0e;");
                                    break;
                                case "mobileUserJoined":
                                    this.assignmentNotification(newestTag.name, "Joined");
                                    break;
                                default:
                            }
                            this.lastTag = newestTag;
                        }
                    }
                });
            });
        }
        
        collabNotification(username, text){
            this.ourDiv.querySelector(".icon").src = "screen.svg";
            this.present(username, text);
        }

        assignmentNotification(username, text){
            this.ourDiv.querySelector(".icon").src = "mobile.svg";
            this.present(username, text);
        }
        
        present(username="", text=""){
            if(cotinkerConfig.disableNotifications) {
                return;
            }

            let self = this;
            
            self.ourDiv.querySelector(".name").innerHTML = escapeHTML(username);
            self.ourDiv.querySelector(".message").innerHTML = text;
            
            // Toggle the hidden class to restart animations
            self.ourDiv.classList.remove("hidden");            
            setTimeout(()=>{
                self.ourDiv.classList.add("hidden");
            }, 100);
        }
    }
    
    window.Notifications = Notifications;
    
    window.setupNotifications = ()=> {
        Notifications.instance = new Notifications();
    }    
});

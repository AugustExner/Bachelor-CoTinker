/* global cQuery, webstrate, Fragment, EditorManager, MonacoEditor, WebstrateComponents */

enqueueAfterLoad(async () => {
    await WPMv2.require({package: "ModalDialog", repository: "webstrate-components-repos"});

    class FragmentReverter {
        static makeItem(revision, event, timestamp, action, name=false){
            let tagDiv = document.createElement("li");
            tagDiv.classList.add("mdc-list-item");
            tagDiv.classList.add(event.replace(/\s/g, ''));
            tagDiv.setAttribute("data-mdc-auto-init", "MDCRipple");
            tagDiv.setAttribute("data-revision", ""+revision);

            let ripple = document.createElement("span");
            ripple.classList.add("mdc-list-item__ripple");
            tagDiv.appendChild(ripple);
            let textDiv = document.createElement("span");
            textDiv.classList.add("mdc-list-item__text");
            tagDiv.appendChild(textDiv);
            
            let timeDiv = document.createElement("div");
            timeDiv.classList.add("mdc-list-item__primary-text");            
            if (timestamp==="now"){
                timeDiv.innerHTML = "Now";
            } else {
                let date = new Date(timestamp);      
                let today = new Date();
                let isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
                timeDiv.innerHTML = (isToday?"":date.toLocaleDateString("da-DK")+" ")+date.toLocaleTimeString("DE");
            }
            textDiv.appendChild(timeDiv);
            
            let eventDiv = document.createElement("div");
            eventDiv.classList.add("mdc-list-item__secondary-text");            
            
            let eventDisplay = "";
            switch (event){
                case "userEditingStarted":
                    eventDisplay = "🖉&#xfe0e;<sup>▶&#xfe0e;</sup>"
                    break;
                case "userEditingStopped":
                    eventDisplay = "🖉&#xfe0e;<sup>⏸&#xfe0e;</sup>"
                    break;
                default:
                    eventDisplay = event;
            }
            
            eventDiv.innerHTML = (name?name+" ":"") + eventDisplay;
            textDiv.appendChild(eventDiv);

            tagDiv.addEventListener("click", ()=>{
                action(revision);
            });

            return tagDiv;
        }
        
        static presentRevertDialog(source) {
            let fragment = Fragment.one(source);

            if (fragment == null) {
                throw new Error("Unable to find fragment from source");
            }

            if (!fragment.html[0].hasAttribute("id")) {
                throw new Error("Codestrate fragment must have an id");
            }

            let fragmentId = fragment.html[0].getAttribute("id");

            if (document.querySelectorAll("#" + fragmentId).length > 1) {
                throw new Error("Codestrate fragment must have a unique id");
            }

            let currentVersion = webstrate.version;

            let fragmentReverterDialogTpl = WebstrateComponents.Tools.loadTemplate("#fragmentReverterDialogTpl");

            let versionSelector = fragmentReverterDialogTpl.querySelector("input.version");
            let editorArea = fragmentReverterDialogTpl.querySelector(".editorArea");
            let tagsDiv = fragmentReverterDialogTpl.querySelector(".tags");

            let domParser = new DOMParser();

            let currentlyLoadedRevision = -1;
            let currentlyLoadedFragmentRaw = null;

            let wantedRevision = -1;

            function loadRevision(revision) {
                selectListItemFromRevision(revision);

                versionSelector.value = revision;
                cQuery(editorArea).empty();

                editorArea.classList.add("loading");

                wantedRevision = revision;

                fetch(location.href+revision+"?raw").then((response)=>{
                    response.text().then((text)=>{
                        if(revision !== wantedRevision) {
                            //Someone requested another revision, skip this
                            return;
                        }
                        let parsedDocument = domParser.parseFromString(text, "text/html");

                        let loadedFragmentHtml = parsedDocument.querySelector("#"+fragmentId);

                        if(loadedFragmentHtml != null) {
                            let loadedFragment = Fragment.setupFragment(cQuery(loadedFragmentHtml));

                            if(loadedFragment != null) {

                                let fragmentEditor = EditorManager.createEditor(loadedFragment, {
                                    editor: MonacoEditor,
                                    readOnly: true,
                                    mode: "component"
                                });

                                if (fragmentEditor.length > 0) {
                                    editorArea.appendChild(fragmentEditor[0].html[0]);
                                    editorArea.classList.remove("loading");
                                    currentlyLoadedRevision = revision;
                                    currentlyLoadedFragmentRaw = loadedFragment.raw;
                                } else {
                                    throw new Error("Unable to create editor for fragment [#"+fragmentId+"] in revision "+revision);
                                }
                            } else {
                                throw new Error("Unable to load fragment [#"+fragmentId+"] in revision "+revision);
                            }
                        } else {
                            throw new Error("Unable to find fragment [#"+fragmentId+"] in revision "+revision);
                        }
                    })
                }).catch((err)=>{
                    console.error("Unable to load revision: ", revision, err);
                });
            }

            function selectListItemFromRevision(revision) {
                let listItem = cQuery(fragmentReverterDialogTpl).find(".mdc-list-item[data-revision='"+revision+"']")[0];

                if(listItem != null) {
                    let foundIndex = -1;

                    cQuery(fragmentReverterDialogTpl).find(".mdc-list")[0].MDCList.listElements.forEach((listElement, index)=>{
                        if(listItem === listElement) {
                            foundIndex = index;
                        }
                    });

                    cQuery(fragmentReverterDialogTpl).find(".mdc-list")[0].MDCList.selectedIndex = foundIndex;
                }
            }


            versionSelector.setAttribute("max", currentVersion);
            versionSelector.value = currentVersion;


            versionSelector.addEventListener("input", ()=>{
                loadRevision(versionSelector.value);
            });

            cQuery(tagsDiv).empty();
            
            // Current version
            tagsDiv.appendChild(FragmentReverter.makeItem(currentVersion, "latest", "now", loadRevision, false));

            // Older versions
            Tagger.getTags().then((tags)=>{
                tags.reverse().forEach((tag)=>{
                    if(tag.fragmentId == null) {
                        //Skip this tag, its not about a fragment
                        return;
                    }

                    if(Fragment.one("#"+tag.fragmentId) !== fragment) {
                        //Skip this tag, its not about our fragment
                        return;
                    }
                    
                    tagsDiv.appendChild(FragmentReverter.makeItem(tag.version, tag.event, tag.timestamp, loadRevision, tag.name));
                });

                mdc.autoInit(fragmentReverterDialogTpl);
            });

            let dialog = new WebstrateComponents.ModalDialog(fragmentReverterDialogTpl, {
                title: "Revert Code",
                classes: ["fragmentReverter"]
            });

            document.querySelector("html").appendChild(dialog.html);

            fragmentReverterDialogTpl.querySelector("button.revert").addEventListener("click", ()=>{
                dialog.close("revert");
            });

            fragmentReverterDialogTpl.querySelector("button.cancel").addEventListener("click", ()=>{
                dialog.close("cancel");
            });

            EventSystem.registerEventCallback("ModalDialog.Closed", ({detail: {dialog: evtDialog, action: action}})=>{
                if(evtDialog === dialog) {
                    if(action === "revert") {
                        if(currentVersion !== wantedRevision && wantedRevision !== -1) {
                            console.log("Reverting to revision:", wantedRevision);
                            fragment.raw = currentlyLoadedFragmentRaw;

                            let collaborator = Collaboration.instance.getCollaboratorFromView(webstrate.clientId, false);
                            let name = collaborator==null?"Unknown":collaborator.name;

                            let msg = "\"" + name + "\" reverted the fragment ["+fragmentId+"] to revision "+wantedRevision;

                            webstrate.signal({
                                cmd: "CoTinker.Notify",
                                notifyMsg: msg
                            });
                            Tagger.tag("revertedFragment", {
                                fragmentId: getFragmentId(fragment)
                            });
                        } else {
                            console.log("Already at revision:", wantedRevision);
                        }
                    }
                }
            });

            dialog.open();

            mdc.autoInit(fragmentReverterDialogTpl);

            loadRevision(currentVersion);
        }
    }

    window.FragmentReverter = FragmentReverter;
    
    // Register into Cauldron menu
    EventSystem.registerEventCallback("Cauldron.OnInit", () => {
        MenuSystem.MenuManager.registerMenuItem("Cauldron.Editor.Toolbar", {
            label: "Revert Code",
            icon: IconRegistry.createIcon(["mdc:restore"]),
            tooltip: "Restore an older version of this code",
            order: 200,
            onAction: (menuItem) => {
                FragmentReverter.presentRevertDialog(menuItem.menu.context);
            }
        });
    });
});

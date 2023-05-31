enqueueAfterLoad(async ()=>{
    const tagFragment = Fragment.one("#cotinkerTags");

    let counter = 0;

    class Tagger {
        static tag(event, extraTagData={}) {
            let username = "n/a";

            try {
                if (id != null) {
                    username = id.getName();
                }
            } catch(e) {
                if(window.view && Collaboration.instance != null) {
                    let collaborator = Collaboration.instance.getCollaboratorFromView(webstrate.clientId);
                    if(collaborator != null) {
                        username = collaborator.name;
                    }
                } else {
                    //Try to find name from iframe?
                    document.querySelectorAll("iframe").forEach((iframe)=>{
                        if(iframe.src.indexOf("mobile") > -1) {
                            if(iframe.contentWindow.id != null) {
                                username = iframe.contentWindow.id.getName();
                            }
                        }
                    })
                }
            }

            let tagData = {
                event:event,
                name:username,
                userId:webstrate.user.userId,
                version: webstrate.version,
                timestamp:Date.now()
            }

            Object.assign(tagData, extraTagData);

            Tagger.tagQueue.push(tagData);

            Tagger.requestTagging();
        }

        static async requestTagging() {
            if(Tagger.tagPromise == null) {
                Tagger.tagPromise = Tagger.getTags();

                let data = await Tagger.tagPromise;

                Tagger.tagQueue.forEach((tagData)=>{
                    data.push(tagData);
                });

                tagFragment.raw = JSON.stringify(data, null, 2);

                console.log("Tags complete:", Tagger.tagQueue.slice());

                Tagger.tagQueue = [];

                Tagger.tagPromise = null;
            }
        }

        static async getTags() {
            try {
                let data = await tagFragment.require();

                if(!Array.isArray(data)) {
                    data = [];
                }

                return data;
            } catch(e) {
                console.warn("Unable to retrieve tags: ", e);
            }

            return [];
        }
        
        static addChangeListener(listener){
            tagFragment.registerOnFragmentChangedHandler(listener);
        }

        static saveOriginalFragments() {
            Tagger.getTags().then((tags) => {
                if (tags.length === 0) {
                    //No tags found, set up original tag for each code-fragment
                    document.querySelectorAll("assignment code-fragment").forEach((codeFragment) => {
                        let id = codeFragment.getAttribute("id");
                        if (id != null) {
                            Tagger.tag("original", {
                                fragmentId: id
                            });
                        }
                    });
                }
            });
        }
    }

    Tagger.tagQueue = [];
    Tagger.tagPromise = null;

    window.Tagger = Tagger;

    //Setup tagging based on editing
    let editing = new Set();
    let editorChangedTimeout = new Map();

    function getFragmentId(fragment) {
        if (fragment.html[0].hasAttribute("id")) {
            return fragment.html[0].getAttribute("id");
        } else {
            return null;
        }
    }

    window.getFragmentId = getFragmentId;

    function queueEditorChangedTag(editor) {
        if (editorChangedTimeout.has(editor.fragment)) {
            clearTimeout(editorChangedTimeout.get(editor.fragment));
        }
        let timeoutId = setTimeout(() => {
            Tagger.tag("userEditingStopped", {
                fragmentId: getFragmentId(editor.fragment)
            });
            editorChangedTimeout.delete(editor.fragment);
            editing.delete(editor.fragment);
        }, 2000);

        editorChangedTimeout.set(editor.fragment, timeoutId);
    }

    EventSystem.registerEventCallback("Codestrates.Editor.BeforeModelChanged", ({detail: {editor: editor}}) => {
        if (!editing.has(editor.fragment)) {
            //Tag editing started
            editing.add(editor.fragment);
            Tagger.tag("userEditingStarted", {
                fragmentId: getFragmentId(editor.fragment)
            });
        }
    });

    EventSystem.registerEventCallback("Codestrates.Editor.AfterModelChanged", ({detail: {editor: editor}}) => {
        queueEditorChangedTag(editor);
    });
});

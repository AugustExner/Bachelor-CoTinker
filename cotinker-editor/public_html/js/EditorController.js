/* global Fragment, webstrate, EventSystem */

enqueueAfterLoad(()=>{

    function checkFragment(fragmentSelector) {
        let fragment = Fragment.one(fragmentSelector);

        return fragment != null;
    }

    class EditorControllerMobile {
        constructor(viewId) {
            this.viewId = viewId;
        }

        sendJumpTo(fragmentSelector, line, col) {
            if(!checkFragment(fragmentSelector)) {
                console.log("Unable to find fragment:", fragmentSelector);
                return;
            }

            this.send({
                cmd: "CoTinker.JumpTo",
                fragmentSelector: fragmentSelector,
                line: line,
                col: col
            });
        }

        sendBroadcastSelectionCleared(fragmentSelector) {
            if(!checkFragment(fragmentSelector)) {
                console.log("Unable to find fragment:", fragmentSelector);
                return;
            }
            this.send({
                cmd: "CoTinker.BroadcastSelectionCleared",
                fragmentSelector: fragmentSelector
            });
        }

        sendBroadcastSelection(fragmentSelector, startLine, startCol, endLine, endCol) {
            if(!checkFragment(fragmentSelector)) {
                console.log("Unable to find fragment:", fragmentSelector);
                return;
            }

            this.send({
                cmd: "CoTinker.BroadcastSelection",
                fragmentSelector: fragmentSelector,
                startLine: startLine,
                startCol: startCol,
                endLine: endLine,
                endCol: endCol
            });
        }

        send(msg) {
            webstrate.signal(msg, [this.viewId]);
        }
    }

    class EditorControllerView {
        constructor() {
            const self = this;

            this.controllerId = null;

            webstrate.on("signal", (msg)=>{
                self.handleSignal(msg);
            })

            this.initEditorSelectionEngine();
        }

        handleSignal(msg) {
            switch(msg.cmd) {
                case "CoTinker.JumpTo": {
                    jumpTo(msg.fragmentSelector, msg.line, msg.col);
                    break;
                }
                case "CoTinker.BroadcastSelection": {
                    broadcastSelection(msg.fragmentSelector, msg.startLine, msg.startCol, msg.endLine, msg.endCol);
                    break;
                }
                case "CoTinker.BroadcastSelectionCleared": {
                    broadcastSelectionCleared(msg.fragmentSelector);
                    break;
                }
            }
        }

        setController(controllerId) {
            this.controllerId = controllerId;
        }

        broadcastSelection(fragmentSelector, startLineOrSelectionTag, startCol, endLine, endCol) {
            let fragment = Fragment.one(fragmentSelector); // Ensure that this is a real fragment
            if(fragment != null) {
                fragment.html[0].setAttribute("data-editor-selection", JSON.stringify({
                    startLine: startLineOrSelectionTag,
                    startCol: startCol,
                    endLine: endLine,
                    endCol: endCol
                }));
            }
        }

        broadcastSelectionCleared(fragmentSelector) {
            let fragment = Fragment.one(fragmentSelector); // Ensure that this is a real fragment
            if(fragment != null) {
                fragment.html[0].removeAttribute("data-editor-selection");
            }
        }

        findTag(fragment, selectionTag) {
            let code = fragment.raw;

            let startSearch = "@start:"+selectionTag+"@";
            let endSearch = "@end:"+selectionTag+"@";

            let startIndex = code.indexOf(startSearch);
            let endIndex = code.indexOf(endSearch);

            let upToStartSplit = code.substr(0, startIndex+1+startSearch.length).split("\n");
            let upToEndSplit = code.substr(0, endIndex-1).split("\n");

            let startLine = upToStartSplit.length;
            let startCol = upToStartSplit[upToStartSplit.length-1].length;
            let endLine = upToEndSplit.length;
            let endCol = upToEndSplit[upToEndSplit.length-1].length;

            //Check for */ after startSearch and increment startCol accordingly
            let lengthUpToAndIncludingEndComment = code.indexOf("*/", startIndex) + 2 - (startIndex+startSearch.length);
            let codeAfterStartTag = code.substr(startIndex+startSearch.length, lengthUpToAndIncludingEndComment);
            if(codeAfterStartTag.trim() === "*/") {
                startCol+=lengthUpToAndIncludingEndComment;
            }

            return {
                startIndex: startIndex,
                endIndex: endIndex,
                startLine: startLine, //Dont select the tag line
                startCol: startCol,
                endLine: endLine, //Selection does not include the given line
                endCol: endCol
            }
        }

        jumpTo(fragmentSelector, lineOrSelectionTag, col) {
            let fragment = Fragment.one(fragmentSelector);

            if(fragment != null) {
                if(typeof lineOrSelectionTag === "string") {
                    //Find line and col for jumptag start
                    let tag = this.findTag(fragment, lineOrSelectionTag);
                    lineOrSelectionTag = tag.startLine;
                    col = tag.startCol;

                    if(tag.startIndex === -1) {
                        //Tag not found, skip jump
                        return;
                    }
                }

                EventSystem.triggerEvent("Cauldron.Open.FragmentEditor", {
                    fragment: fragment,
                    line: lineOrSelectionTag,
                    column: col
                });
            }
        }

        initEditorSelectionEngine() {
            const self = this;

            let selectionObservers = new Map();

            let editorLive = new LiveElement(".codestrates-editor-core");

            editorLive.forEach((editorHtml)=>{

                let decorations = [];

                function setupSelection(editor) {
                    requirejs(["vs/editor/editor.main"], () => {
                        if(editor.editor != null) {
                            let selection = JSON.parse(editor.fragment.html[0].getAttribute("data-editor-selection"));

                            let newDecorations = [];

                            if (selection != null) {
                                if(typeof selection.startLine === "string") {
                                    //Find line and col for selectiontag start and end
                                    let tag = self.findTag(editor.fragment, selection.startLine);

                                    //Check that we found both start and end tags.
                                    if(tag.startIndex !== -1 && tag.endIndex !== -1) {
                                        newDecorations.push({
                                            range: new monaco.Range(tag.startLine, tag.startCol, tag.endLine, tag.endCol),
                                            options: {inlineClassName: 'coTinkerInlineHighlight'}
                                        });
                                    }

                                } else {
                                    newDecorations.push({
                                        range: new monaco.Range(selection.startLine, selection.startCol, selection.endLine, selection.endCol),
                                        options: {inlineClassName: 'coTinkerInlineHighlight'}
                                    });
                                }
                            }

                            decorations = editor.editor.deltaDecorations(decorations, newDecorations);
                        }
                    });
                }

                let editor = cQuery(editorHtml).data("Editor");

                setupSelection(editor);

                let observer = new MutationObserver((mutations)=>{
                    setupSelection(editor);
                })

                observer.observe(editor.fragment.html[0], {
                    attributes: true,
                    attributeFilter: ["data-editor-selection"]
                });

                selectionObservers.set(editorHtml, observer);
            });

            editorLive.removed((editorHtml)=>{
                let observer = selectionObservers.get(editorHtml);

                if(observer != null) {
                    observer.disconnect();
                }

                selectionObservers.delete(editorHtml);
            });
        }
    }

    window.EditorControllerView = EditorControllerView;
    window.EditorControllerMobile = EditorControllerMobile;

    EditorControllerMobile.instance = null;
    EditorControllerView.instance = null;
});

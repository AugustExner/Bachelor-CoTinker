//const frag = Fragment.one("#step3");
class createStepEditor {
    constructor(fragment, editorid) {
        this.fragment = fragment;
        this.editorid = editorid;

        this.frag = Fragment.one(fragment);
        this.editor = EditorManager.createEditor(this.frag, {
            mode: "inline"
        })[0];
        const editorDiv = document.querySelector(this.editorid);
        editorDiv.appendChild(this.editor.html[0]);
        this.editor.html[0].style.height = "100%";
        editorDiv.style.height = (this.frag.raw.split("\n").length + 1) + "em";
        editorDiv.style.maxHeight = "25em";
        editorDiv.style.marginLeft = "1em";
        editorDiv.style.marginRight = "1em";
        this.editor.onSizeChanged();

        this.frag.registerOnFragmentChangedHandler(async () => {
            editorDiv.style.height = (this.frag.raw.split("\n").length + 1) + "em";
            this.editor.onSizeChanged();
        });
    }
}


 /*create() {
        const editor = EditorManager.createEditor(this.frag, {
            mode: "inline"
        })[0];
        const editorDiv = document.querySelector(this.editorid);
        editorDiv.appendChild(editor.html[0]);
        editor.html[0].style.height = "100%";
        editorDiv.style.height = "20em";
        editorDiv.style.marginLeft = "1em";
        editorDiv.style.marginRight = "1em";
        editor.onSizeChanged();

        return editor;
    }*/


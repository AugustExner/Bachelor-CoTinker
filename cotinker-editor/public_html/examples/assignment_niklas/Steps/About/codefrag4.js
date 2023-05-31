//Find fragment
const frag = Fragment.one("#about1");
console.log("hej");

//Opret editor til fragment
const editor = EditorManager.createEditor(frag, {
    mode: "inline"
})[0];


//Find indsæt punkt
document.querySelector("#editor4").appendChild(editor.html[0]);

editor.html[0].style.height = "100%";
editor.onSizeChanged();

onStepUnloaded(()=>{
    editor.unload();
});



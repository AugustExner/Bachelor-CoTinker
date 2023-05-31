//Find fragment
const frag = Fragment.one("#step0");
console.log("hej");

//Opret editor til fragment
const editor = EditorManager.createEditor(frag, {
    mode: "inline"
})[0];


//Find indsæt punkt
document.querySelector("#editor10").appendChild(editor.html[0]);

editor.html[0].style.height = "100%";
editor.onSizeChanged();

onStepUnloaded(()=>{
    editor.unload();
});

async function reset(){
    await Fragment.one("#step0").require();
    Tagger.tag("modelReset");
    pause();
}
await reset();


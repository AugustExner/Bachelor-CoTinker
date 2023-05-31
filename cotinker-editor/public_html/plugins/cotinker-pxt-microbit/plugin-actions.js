MenuSystem.MenuManager.registerMenuItem("CoTinker.SlideInsertMenu", {
    label: "MakeCode: micro:bit",
    icon: IconRegistry.createIcon("mdc:note_add"),
    onAction: (menuItem)=>{
        let slide = document.createElement("slide");
        slide.innerHTML = `
<code-fragment data-type="text/javascript" name="MakeCode Init">
    // Insert MakeCode editor in this slide
    let ourSlide = fragmentSelfReference.html[0].closest("slide");
    if (!ourSlide.makeController){
        let transient = document.createElement("transient");
        transient.classList.add("makecode-view");
        ourSlide.appendChild(transient);
        ourSlide.makeController = new MakeController(transient);
        ourSlide.makeController.stopSimulator();
        ourSlide.makeController.hideSimulator();                
        
        onSlideUnloaded(()=>{
            ourSlide.makeController.destroy();
            ourSlide.makeController = false;
            transient.remove();
        });
    }
</code-fragment>
<code-fragment name="Program Code" class="cotinker-microbit-template-program" data-type="application/json">
</code-fragment>
<code-fragment data-type="text/javascript" name="Environment Configuration">
    let slide = fragmentSelfReference.html[0].closest("slide");
    let make = slide.makeController;
    let program = slide.querySelector(".cotinker-microbit-template-program");

    await make.linkFragment(Fragment.one(program), {
        "blocks": {
            "pxt-on-start": 1,
            "device_button_event": 1
        },                    
        "defaultState": 0
    });                
</code-fragment>`;

        WPMv2.stripProtection(slide);
        menuItem.menu.superMenu.context.context.appendChild(slide);
    }
});

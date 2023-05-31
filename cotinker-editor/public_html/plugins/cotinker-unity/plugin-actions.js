MenuSystem.MenuManager.registerMenuItem("CoTinker.SlideInsertMenu", {
    label: "Unity WebGL",
    icon: IconRegistry.createIcon("mdc:note_add"),
    onAction: (menuItem)=>{
        menuItem.menu.superMenu.context.context.appendChild(UnityController.createEmptyUnitySlide());
    }
});

MenuSystem.MenuManager.registerMenuItem("CoTinker.SlideInsertMenu", {
    label: "Unity JS Control",
    icon: IconRegistry.createIcon("mdc:note_add"),
    onAction: (menuItem)=>{
        menuItem.menu.superMenu.context.context.appendChild(UnityController.createEmptyUnityJSControlSlide());
    }
});

MenuSystem.MenuManager.registerMenuItem("CoTinker.SlideInsertMenu", {
    label: "Unity JS Control + Unity WebGL",
    icon: IconRegistry.createIcon("mdc:note_add"),
    onAction: (menuItem)=>{
        let jsControl = UnityController.createEmptyUnityJSControlSlide();
        let unityWebgl = UnityController.createEmptyUnitySlide();

        Array.from(jsControl.children).forEach((child)=>{
            unityWebgl.appendChild(child);
        });

        menuItem.menu.superMenu.context.context.appendChild(unityWebgl);
    }
});

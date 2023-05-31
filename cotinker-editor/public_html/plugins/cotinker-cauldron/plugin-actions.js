if (typeof MenuSystem !== "undefined"){
    let linkStep = function linkStep(step){
        // TODO: Show a UI to link a step to a slide
        step.setAttribute("data-slide", "");
        step.setAttribute("data-slide-mode", "");
    }
    
    let addStepMenu = MenuSystem.MenuManager.createMenu("CoTinker.StepInsertMenu");
    
    MenuSystem.MenuManager.registerMenuItem("TreeBrowser.TreeNode.ContextMenu", {
        label: "Insert Step...",
        order: -1,
        group: "inserters",
        groupOrder: 0,        
        icon: IconRegistry.createIcon("mdc:note_add"),                                
        onOpen: (menu)=>{
            return menu.context.type == "DomTreeNode" && menu.context.context.nodeName.toLowerCase() == "steps";
        },
        submenu: addStepMenu
    });

    MenuSystem.MenuManager.registerMenuItem("TreeBrowser.TreeNode.ContextMenu", {
        label: "Make Current",
        order: -1,
        group: "actions",
        groupOrder: 0,        
        icon: IconRegistry.createIcon("mdc:keyboard_return"),                                
        onOpen: (menu)=>{
            return menu.context.type == "DomTreeNode" && menu.context.context.nodeName.toLowerCase() == "step" && !menu.context.context.classList.contains("current");
        },
        onAction: (menuItem)=>{
            document.querySelectorAll("assignment step").forEach((step)=>{
               step.classList.remove("current"); 
            });
            menuItem.menu.context.context.classList.add("current");
        }
    });    
    
    MenuSystem.MenuManager.registerMenuItem("CoTinker.StepInsertMenu", {
        label: "Empty",
        icon: IconRegistry.createIcon("mdc:insert_drive_file"),
        onAction: (menuItem) =>{
            let step = document.createElement("step");
            WPMv2.stripProtection(step);
            menuItem.menu.superMenu.context.context.appendChild(step);
            linkStep(step);
        }
    });     
    
    MenuSystem.MenuManager.registerMenuItem("CoTinker.StepInsertMenu", {
        label: "MarkDown",
        icon: IconRegistry.createIcon(["code-fragment:text/markdown", "mdc:insert_drive_file"]),                                
        onAction: (menuItem) =>{
            let step = document.createElement("step");
            step.innerHTML = "<code-fragment data-type=\"text/markdown\" auto=\"true\">\n"+
                             "# Step Title\n\n"+
                             "Your text here</code-fragment>";
            WPMv2.stripProtection(step);
            menuItem.menu.superMenu.context.context.appendChild(step);
            linkStep(step);
        }
    });    
    
    let addSlideMenu = MenuSystem.MenuManager.createMenu("CoTinker.SlideInsertMenu");
    
    MenuSystem.MenuManager.registerMenuItem("TreeBrowser.TreeNode.ContextMenu", {
        label: "Insert Slide...",
        order: -1,
        group: "inserters",
        groupOrder: 0,
        icon: IconRegistry.createIcon("mdc:note_add"),                                
        onOpen: (menu)=>{
            return menu.context.type == "DomTreeNode" && menu.context.context.nodeName.toLowerCase() == "slides";
        },
        submenu: addSlideMenu
    });    
}
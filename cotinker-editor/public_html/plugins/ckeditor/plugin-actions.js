EventSystem.registerEventCallback("Cauldron.OnInit", () => {
    MenuSystem.MenuManager.registerMenuItem("CoTinker.SlideInsertMenu", {
        label: "Report",
        icon: IconRegistry.createIcon("mdc:note_add"),                                
        onAction: (menuItem)=>{
            let slide = document.createElement("slide");
            let instanceID = Math.floor(Math.random()*10000);
            slide.innerHTML = `
            <div id="menuID" class="reportMenu"></div>
            <report>
                <div id="reportContentID" class="reportContent" contenteditable="true">
                    <h1>Report Title</h1>
                    <p>Your text goes here ... </p>
                </div>
            </report>
            <div id="barID" class="reportBar"></div>
            <code-fragment name="Report Environment" data-type="text/javascript">
openAssignment();
ReportEditor.makeEditable("reportContentID", "menuID", "barID");

onSlideUnloaded(()=>{
    closeAssignment();
    ReportEditor.makeUneditable("reportContentID", "menuID", "barID");
});
            </code-fragment>`.replaceAll("reportContentID", "reportContent"+instanceID).replaceAll("menuID", "myMenu"+instanceID).replaceAll("barID", "myBar"+instanceID);
            
            WPMv2.stripProtection(slide);
            menuItem.menu.superMenu.context.context.appendChild(slide);
        }
    });       
});

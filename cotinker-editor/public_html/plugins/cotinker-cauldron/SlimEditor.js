/**
 * A trimmed down variant of the Cauldron editor
 * @memberOf Cauldron
 * @alias Cauldron
 */
class CauldronSlim extends Cauldron.Cauldron {
    /**
     * Create a new slim Cauldron editor
     */
    constructor(showConsole) {
        let goldenLayoutContent =                     {
            type: "row",
            content: [
                {
                    type: "column",
                    width: 75,
                    content: [
                        {
                            type: "stack",
                            id: "editors",
                            isClosable: false,
                            content: []
                        }
                    ]
                }
            ]
        };

        if(showConsole) {
            console.log("Adding console...");

            goldenLayoutContent.content[0].content.push({
                type: "component",
                componentName: "Console",
                componentState: {},
                height: 25
            });
        }

        super({
            edgeDockerMode: EdgeDocker.MODE.MINIMIZED,
            edgeDockerLoadMode: false,
            console: showConsole,
            inspector: false,
            actionMenu: false,
            mainMenu: false,
            tabContextMenu: false,
            dragAndDrop: false,
            goldenLayoutSaveState: false,
            goldenLayoutConfig: {
                settings: {
                    showPopoutIcon: false,
                    constrainDragToContainer: true
                },
                content: [goldenLayoutContent]
            }
        });

        console.log(this);
    }

    /**
     * Opens Cauldron IDE
     */
    async open(optionalParentElement=false) {
        if (this.isOpen()) {
            this.close();
        }

        await super.open(optionalParentElement);
    }
    
    /**
     * Closes Cauldron IDE
     */
    close() {
        if(!this.isOpen()){
            //Don't close if not open
            return;
        }

        this.goldenLayout.root.getItemsById("editors")[0].contentItems.slice().forEach((editor)=>{
            editor.container.close();
        });

        super.close();
    }
}

window.Cauldron.CauldronSlim = CauldronSlim;

/**
 * CoTinker plugin for initializing CKEditor4 in the CoTinker environment
 */
class ReportEditor {    
    static async makeEditable(elementID, menuElementID, statusbarElementID){
        let targetElement = document.querySelector("#"+elementID);
        await WPMv2.require("cotinker-ckeditor");
        targetElement.setAttribute("contenteditable", "true"); 

        if (!targetElement.editor){
            window.CKEDITOR.config.sharedSpaces = {
                top: menuElementID,
                bottom: statusbarElementID 
            };

            targetElement.editor = ReportEditor.__inline(elementID, {
                  height: 260,
                  width: 700
            });            
        }
    }

    static async makeUneditable(elementID, menuElementID, statusbarElementID){
        let targetElement = document.querySelector("#"+elementID);
        targetElement.removeAttribute("tabindex");
        targetElement.removeAttribute("spellcheck");
        targetElement.removeAttribute("contenteditable");
        if (targetElement.editor){
            targetElement.editor.destroy(true);
            targetElement.editor = null;
        }
    }
    
    /**
     * This is core/creators/inline.js:inline with the initial data writeback
     * commented out to avoid a modification-storm right when loading the editor.
     * 
     * @param {type} element
     * @param {type} instanceConfig
     * @returns {CKEDITOR.editor|ReportEditor.__inline.editor}
     */
    static __inline( element, instanceConfig ) {
        element = CKEDITOR.editor._getEditorElement( element );

        if ( !element ) {
                return null;
        }

        // (#4461)
        if ( CKEDITOR.editor.shouldDelayEditorCreation( element, instanceConfig ) ) {
                CKEDITOR.editor.initializeDelayedEditorCreation( element, instanceConfig, 'inline' );
                return null;
        }

        var textarea = element.is( 'textarea' ) ? element : null,
                editorData = textarea ? textarea.getValue() : element.getHtml(),
                editor = new CKEDITOR.editor( instanceConfig, element, CKEDITOR.ELEMENT_MODE_INLINE );

        if ( textarea ) {
                editor.setData( editorData, null, true );

                //Change element from textarea to div
                element = CKEDITOR.dom.element.createFromHtml(
                        '<div contenteditable="' + !!editor.readOnly + '" class="cke_textarea_inline">' +
                                textarea.getValue() +
                        '</div>',
                        CKEDITOR.document );

                element.insertAfter( textarea );
                textarea.hide();

                // Attaching the concrete form.
                if ( textarea.$.form )
                        editor._attachToForm();
        } else {
                // If editor element does not have contenteditable attribute, but config.readOnly
                // is explicitly set to false, set the contentEditable property to true (#3866).
                if ( instanceConfig && typeof instanceConfig.readOnly !== 'undefined' && !instanceConfig.readOnly ) {
                        element.setAttribute( 'contenteditable', 'true' );
                }

                // Initial editor data is simply loaded from the page element content to make
                // data retrieval possible immediately after the editor creation.
                editor.setData( editorData, null, true );
        }

        // Once the editor is loaded, start the UI.
        editor.on( 'loaded', function() {
                editor.fire( 'uiReady' );

                // Enable editing on the element.
                editor.editable( element );

                // Editable itself is the outermost element.
                editor.container = element;
                editor.ui.contentsElement = element;

                // Load and process editor data.
                //editor.setData( editor.getData( 1 ) );

                // Clean on startup.
                editor.resetDirty();

                editor.fire( 'contentDom' );

                // Inline editing defaults to "wysiwyg" mode, so plugins don't
                // need to make special handling for this "mode-less" environment.
                editor.mode = 'wysiwyg';
                editor.fire( 'mode' );

                // The editor is completely loaded for interaction.
                editor.status = 'ready';
                editor.fireOnce( 'instanceReady' );
                CKEDITOR.fire( 'instanceReady', null, editor );

                // give priority to plugins that relay on editor#loaded for bootstrapping.
        }, null, null, 10000 );

        // Handle editor destroying.
        editor.on( 'destroy', function() {
                var container = editor.container;
                // Remove container from DOM if inline-textarea editor.
                // Show <textarea> back again.
                // Editor can be destroyed before container is created (#3115).
                if ( textarea && container ) {
                        container.clearCustomData();
                        container.remove();
                }

                if ( textarea ) {
                        textarea.show();
                }

                editor.element.clearCustomData();

                delete editor.element;
        } );

        return editor;        
    }
}

window.ReportEditor = ReportEditor;

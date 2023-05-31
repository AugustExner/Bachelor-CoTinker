/**
 *  HTML Decorator
 *  Decorates HTML nodes in a tree
 * 
 *  Copyright 2020, 2021 Rolf Bagge, Janus B. Kristensen, CAVI,
 *  Center for Advanced Visualization and Interacion, Aarhus University
 *    
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
**/

/**
 * Decorator that decorates HTML elements
 */
class TreeBrowserStepDecorator {
    /**
     * Attempts to decorate the given TreeNode
     * @param {TreeNode} node - The node to decorate
     * @returns {boolean} True/False depending on if the node was decorated
     */
    static decorate(node) {
        if(node.type === "DomTreeNode" && node.context.tagName === "STEP") {
            TreeBrowserHtmlDecorator.decorate(node);
            let icon = IconRegistry.createIcon("mdc:menu_open");
            node.setProperty("icon", icon);
            
            let checkCurrent = function checkCurrent(){
                if (node.context.classList.contains("current")){
                    icon.style.color = "green";
                    icon.title = "Current Step";
                } else {
                    icon.style.color = "";
                    icon.title = "";
                }
            };
            
            let observer = new MutationObserver((mutations)=>{
                checkCurrent();
            });
            observer.observe(node.context, {attributes:true});
            checkCurrent();
            return true;
        }

        return false;
    }
}

window.TreeBrowserStepDecorator = TreeBrowserStepDecorator;

TreeGenerator.registerDecorator(TreeBrowserStepDecorator, 1);
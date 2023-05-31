/**
 * This function clones a template, fills in some predefined strings with
 * information from the product database and inserts it in the target node.
 * @param {type} node The product HTML node to render into
 */
window.renderProduct = function renderProduct(node){
    // Load the template
    let template = document.querySelector("#"+node.sourceTemplateID);
    if (!template) {
        throw Error("No template for this product");
    }   
    let product = node.product;
    let templateClone = template.content.firstElementChild.outerHTML;

    // Replace some content in the template
    let basicProperties = ["name", "description", "picture", "details"];
    basicProperties.forEach(property=>{
        templateClone = templateClone.replaceAll("{"+property+"}", product[property]);
    });
    
    // Update the HTML in the page
    node.innerHTML = templateClone;

};

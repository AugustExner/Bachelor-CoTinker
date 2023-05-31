
const frag = Fragment.one("#step3grann");

let toggleFunction = null;

async function reloadStep3Code() {
    console.log("Reloading!");
    let code = await frag.require();
    toggleFunction = code.toggle;
}

await reloadStep3Code();

document.querySelector("#testbutton").addEventListener("click", ()=>{
    toggleFunction();
});

frag.registerOnFragmentChangedHandler(async ()=>{
    reloadStep3Code();
});


// Reload Json product page
const fragJson = Fragment.one("#json");
const items = document.querySelector("#webshop-items");

fragJson.registerOnFragmentChangedHandler(async () => {
    reloadProductJson();
});

async function reloadProductJson() {
    products = await getProducts();
    // clear products
    console.log("Clearing products")
    await clearProducts();
    //console.log(webstrate.assets);
    // Add all products to product view
    console.log("Showing products...");
    products.forEach(async product => {
        console.log("Showing product")
        await showProductPage(product);
    });
}

async function showProductPage(product){
    const productTemplate = document.querySelector("#productTemplate");
    let clone = productTemplate.content.firstElementChild.cloneNode(true);
    webstrate.assets.every(element => {
        if (element.fileName === product.image) {
            console.log("Found asset!", product.image);
            clone.querySelector("#image").src = product.image;
            return false;
        }
        return true;
    });
    
    clone.querySelector("#name").innerHTML = product.name;
    clone.querySelector("#description").innerHTML = product.description;
    clone.querySelector("#price").innerHTML = product.price + "€";

    clone.querySelector("#add-to-cart-button").addEventListener("click", ()=> {
        addProductToCart(product.name, product.image);
    });

    let li = document.createElement("div");
    li.classList.add("grid-item");
    //WPMv2.stripProtection(clone);
    li.appendChild(clone);
    items.appendChild(li);
}

async function getProducts(){
    let products = [];
    try {
        products = await Fragment.one("#json").require();
    } catch (ex){
        console.log("couldnt find json elements");
        // Ignore
    }
    return products;
}

async function clearProducts() {
    while (items.firstChild) {
        items.removeChild(items.firstChild);
    }
}

webstrate.on("loaded", () => {
    reloadProductJson();
})

// cart items reload add

const cart = document.querySelector("#cart-items");
const fragAdd = Fragment.one("#addQuantity");
let addFunction = null;

fragAdd.registerOnFragmentChangedHandler(async () => {
    await reloadCartItems();
});

async function reloadCartItems() {
    Array.from(cart.children).forEach(child => {
        const templateButton = document.querySelector("#cart-item-template");
        let clone = templateButton.content.firstElementChild.querySelector("#cart-item-plus-button").cloneNode(true);
    
        child.replaceChild(clone,child.querySelector("#cart-item-plus-button"));
    });

    let codeAdd = await fragAdd.require();
    let addFunction = codeAdd.addQuantity;

    Array.from(cart.children).forEach(child => {
        child.querySelector("#cart-item-plus-button").addEventListener("click", ()=>{
            addFunction(child);
        });
    });
}



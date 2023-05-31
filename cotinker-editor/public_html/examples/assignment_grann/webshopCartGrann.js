const cartItems = document.querySelector("#cart-items");
const template = document.querySelector("#cart-item-template");
const cartStatus = document.querySelector("#cart-status");
const cart = document.querySelector("#cart");
const cartMenuBar = document.querySelector("#cart-menubar");
//import { reloadCartItems } from "./reloadCode";
//reloadCartItems = require('reloadCode');

function toggleCart() {
    if(cart.style.display === "block") {
        cart.style.display = "none";
    } else {
        cart.style.display = "block";
    }
}

async function addProductToCart(name, image) {
    var alreadyExist = false;
    Array.from(cartItems.children).every(child => {
        if (child.querySelector(".cart-item-product-name").innerHTML === name) {
            child.querySelector(".cart-item-count").innerHTML = Number(child.querySelector(".cart-item-count").innerHTML) + 1;
            alreadyExist = true;
            return false;
        }
        
        return true;
    });

    if(!alreadyExist) {
        let clone = template.content.firstElementChild.cloneNode(true);
        clone.querySelector(".cart-item-image").src = image;
        clone.querySelector(".cart-item-product-name").innerHTML = name;
        
        const fragAdd = Fragment.one("#addQuantity");
        let codeAdd = await fragAdd.require();
        let eventAdd = codeAdd.addQuantity;

        await clone.querySelector("#cart-item-plus-button").addEventListener("click", () => {
            eventAdd(clone);
        });
        /*clone.querySelector("#cart-item-plus-button").addEventListener("click", () => {
            addQuantity(clone);
        });*/

        cartItems.appendChild(clone);
    }

    updateCartStatus();
}

/*function addQuantity(element) {
    const node = element.querySelector(".cart-item-count");
    node.innerHTML = Number(node.innerHTML) + 1;
}*/

function subtractQuantity(element) {
    const node = element.querySelector(".cart-item-count");
    node.innerHTML = Number(node.innerHTML) - 1;

    if (Number(node.innerHTML) <= 0) {
        element.remove();
    }
    updateCartStatus();
}

function updateCartStatus() {
    if(cartItems.children.length > 0) {
        cartStatus.style.display = "none";
    } else {
        cartStatus.style.display = "block";
    }
}
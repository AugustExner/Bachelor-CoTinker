function addQuantity(element) {
    const node = element.querySelector(".cart-item-count");
    node.innerHTML = Number(node.innerHTML) + 1;
}

exports.addQuantity = addQuantity

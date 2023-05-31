const VIEWS = {
    "SEARCH": "SEARCH",
    "PRODUCT": "PRODUCT"
};
let currentView = null;

async function search(query=""){
    WebshopHistory.addHistory(()=>{
        let searchField = document.querySelector(".search input");
        searchField.value = query;
        search(query);
    });

    let products = await getProducts();
    
    let searchResultArea = document.querySelector("#searchResults");
    let template = document.querySelector("#searchResultTemplate");
    searchResultArea.innerHTML = "";

    // Add products to search results
    if (typeof searchFilter === "function"){
        products.forEach(product=>{
            let node = document.createElement("div");
            node.classList.add("product");
            node.product = product;
            node.sourceTemplateID = template.id;
            node.productID = product.id;
            
            try {
                if(!searchFilter(product, query)) {
                    //This product was rejected
                    return;
                }
            } catch (searchException){
                searchResultArea.appendChild(node);
                node.innerHTML = "<font style='color:darkorange'> Code runtime exception ["+searchException+"]</font>";
                return;
            }
                
            searchResultArea.appendChild(node);
            try {
                renderProduct(node);
            } catch (renderException){
                node.innerHTML = "<font style='color:darkorange'> Code runtime exception ["+renderException+"]</font>";
            }
            node.addEventListener("click", ()=>{
                showProductPage(product);
            });
        });
    } else {
        searchResultArea.innerHTML = "<font style='color:red'> Code compile exception ["+searchFilter+"]</font>";
    }

    switchView(VIEWS.SEARCH);
}

async function updateProductViews(){
    let products = await getProducts();
    document.querySelectorAll(".product").forEach(node=>{
        let product = products.find((product)=>{
            return product.id === node.productID;
        });

        node.product = product;

        try {
            renderProduct(node);
        } catch (ex){
            node.innerHTML = "<font style='color:darkorange'> Code runtime exception ["+ex+"]</font>";
        }
    });

    console.log("View is "+currentView);
    if(currentView == VIEWS.SEARCH) {
        doSearch();
    } else if(currentView == VIEWS.PRODUCT) {
        setupProductViewBackButton();
    }
}

async function getProducts(){
    let products = [];
    try {
        products = await Fragment.one("#ShopProducts").require();
    } catch (ex){
        // Ignore
    }    
    return products;
}

function switchView(view){
    currentView = view;
    document.querySelector(".shop").setAttribute("view",view.toLowerCase());
}

function setupProductViewBackButton() {
    document.querySelector("#productView").querySelector(".backButton").addEventListener("click", ()=>{
        history.back();
    });
}

function showProductPage(product){
    WebshopHistory.addHistory(()=>{
        showProductPage(product);
    });

    let template = document.querySelector("#productTemplate");
    let productViewArea = document.querySelector("#productView");
    let node = document.createElement("div");
    node.classList.add("product");
    node.product = product;
    node.sourceTemplateID = template.id;
    node.productID = product.id;
    productViewArea.innerHTML = "";
    productViewArea.appendChild(node);
    renderProduct(node);

    setupProductViewBackButton();

    switchView(VIEWS.PRODUCT);
}



if (!window.webshopInitialized){
    Fragment.one("#ShopLayout").registerOnFragmentChangedHandler(context=>{
        setTimeout(()=>{search("");}, 0);
    });

    Fragment.one("#ShopProducts").registerOnFragmentChangedHandler(context=>{
        setTimeout(()=>{updateProductViews();},0);
    });
    Fragment.one("#ShopTemplates").registerOnFragmentChangedHandler(context=>{
        setTimeout(()=>{updateProductViews();},0);
    });
    Fragment.one("#RenderProduct").registerOnFragmentChangedHandler(async context=>{
        // TODO: Maybe setTimeout here to avoid running on every key-press?    
        try {
            await Fragment.one("#RenderProduct").require(); // reload js
        } catch (ex){
            window.renderProduct = function renderProductError(node){
                node.innerHTML = "<font style='color:red'> Code compile error ["+ex+"]</font>";
            };
        }
        setTimeout(()=>{updateProductViews();},0);
    });
    Fragment.one("#SearchFilter").registerOnFragmentChangedHandler(async context=>{
        // TODO: Maybe setTimeout here to avoid running on every key-press? 
        try {
            await Fragment.one("#SearchFilter").require(); // reload js
        } catch (ex){
            window.searchFilter = ex;
        }
        setTimeout(()=>{doSearch();},0);
    });
    

    let searchField = document.querySelector(".search input");
    function doSearch() {
        if(searchTimeout != null) {
            window.clearTimeout(searchTimeout);
        }

        searchTimeout = window.setTimeout(()=>{
            searchTimeout = null;
            search(searchField.value);
        }, 250);
    }

    let searchTimeout = null;

    searchField.addEventListener("input", ()=>{
        doSearch();
    });

    let logo = document.querySelector(".header .logo");
    logo.addEventListener("click", ()=>{
        search("");
    });
    
    window.webshopInitialized = true;
}

setTimeout(()=>{search()},0);                

WebshopHistory.setup();

// When navigating away from slide, avoid multiple listeners
if (typeof onSlideUnloaded === "function"){
    onSlideUnloaded(()=>{
        WebshopHistory.destroy();
    });    
}


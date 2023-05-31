function updateExtremelyStupidSafariVH(){
    let vh = window.innerHeight * 0.01; // First we get the viewport height and we multiple it by 1% to get a value for a vh unit

    // Then we set the value in the --vh custom property to the root of the document
    let sheet = getTransientStylesheet();
    while (sheet.cssRules.length > 0){
        sheet.deleteRule(0);
    }
    sheet.insertRule("html{--vh:"+`${vh}px`+"; height: calc(var(--vh, 1vh) * 100); }/* Safari workaround */");
}

function insanelyMessedUpSafariQuirks(){
    let isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
                   navigator.userAgent &&
                   navigator.userAgent.indexOf('CriOS') == -1 &&
                   navigator.userAgent.indexOf('FxiOS') == -1;

    if (isSafari){
        // Fixes https://bugs.webkit.org/show_bug.cgi?id=141832 with a workaround
        updateExtremelyStupidSafariVH();
        window.addEventListener('resize', updateExtremelyStupidSafariVH);
        window.addEventListener('orientationchange', ()=>{window.scrollTo(0, 0)});
    }
}

function getTransientStylesheet() {
    let transientSheet = cQuery("transient[transient-data-owner=quirks] style")[0];
    if (!transientSheet){
        let container = document.createElement("transient");
        container.setAttribute("transient-data-owner","quirks");
        transientSheet = document.createElement("style");
        container.appendChild(transientSheet);
        document.body.appendChild(container);
    }
    return transientSheet.sheet;
}

enqueueAfterLoad(async ()=>{
    const urlParams = new URLSearchParams(window.location.search);
    const isMobile = urlParams.get('mobile');
    window.controllerId = null;
    
    insanelyMessedUpSafariQuirks();

    if (isMobile != null && isMobile !== false) {
        setupMobile();
    } else {
        setupView();
    }
    
    document.querySelector("body").setAttribute("transient-loaded-state", "loaded");
});

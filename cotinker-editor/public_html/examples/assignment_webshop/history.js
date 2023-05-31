class WebshopHistory {
    static setup() {
        if(WebshopHistory.initialized) {
            return;
        }

        WebshopHistory.initialized = true;

        console.log("Setting up history!");

        //Hijack back/forward buttons with custom history states
        history.pushState(-1, null); //Back
        history.pushState(0, null); //Neutral
        history.pushState(1, null); //Forward

        //Go back 1 state, which puts us at 0 (Neutral)
        history.go(-1);

        //Listen for history pop state events
        window.addEventListener("popstate", WebshopHistory.handlePopState);
    }

    static handlePopState(evt) {
        //Only handle state change if we went to -1 or 1
        if(Math.abs(evt.state) === 1) {
            //Go back to neutral state
            history.go(-evt.state);

            if(evt.state === -1) {
                WebshopHistory.goBack();
            } else {
                WebshopHistory.goForward();
            }
        }
    }

    static destroy() {
        if(!WebshopHistory.initialized) {
            return;
        }

        WebshopHistory.history = [];
        window.removeEventListener("popstate", WebshopHistory.handlePopState);
        WebshopHistory.initialized = false;

        console.log("History destroyed!");
    }

    /**
     * Add a callback to the history stack, will be called if returning to this place in history
     * @param {function} callback - The callback to call if returning to this state in history
     */
    static addHistory(callback) {
        WebshopHistory.history.push(callback);
    }

    /**
     * Goes back one history step if possible
     *
     * @private
     */
    static goBack() {
        //To go back in shop, we need at least 2 history items, because first one is current page
        if(WebshopHistory.history.length >= 2) {
            //Pop current page
            WebshopHistory.history.pop();

            //Pop last page
            let callback = WebshopHistory.history.pop();
            callback();
        }
    }

    /**
     * Does nothing, we do not support forward history traversal
     *
     * @private
     */
    static goForward() {
        console.groupCollapsed("Going Forward, not supported!");
        console.trace();
        console.groupEnd();
    }
}

WebshopHistory.history = [];
WebshopHistory.initialized = false;
window.WebshopHistory = WebshopHistory;

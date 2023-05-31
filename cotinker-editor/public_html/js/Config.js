/* global WebstrateComponents, webstrate */
class Config {
    constructor() {
        this.iframeController = false; /* Show mobile view as a floating iframe */
        this.sidebarController = false; /* Show mobile view as a sidebar */
        this.skipEverything = false; /* Used by plugins like Cauldron ?edit or ?stats to replace UI with own view */
        this.disableCollaboration = false; //Disable collaboration module
        this.hideCollabButtons = false; // The communications buttons
        this.hideSendNote = false; //Hide send note tool
        this.disableSidebarNavigation = false; //Disable the prev/next navigation in sidebar
        this.disableNotifications = false;
        this.disableGettingStarted = false; // Do not show QR code overlay
        this.slidePrefix = ""; // Potentially use a different set of slides on this device
        this.language = "da"; // Set a language profile for any parts of the site that support it
    }
};

window.cotinkerConfig = new Config();

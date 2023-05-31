/* global cQuery, Fragment */

enqueueAfterLoad(()=>{

    class Slides {
        constructor() {
            this.currentSlide = null;

            this.currentSlideId = null;
            this.currentSlideMode = null;

            this.slideUnloadCallbacks = [];
            this.modeUnloadCallbacks = [];

            this.switchSlide(document.body.getAttribute("data-selected-slide"), true);

            this.setupObserver();

            console.log("Slide engine created");
        }

        setupObserver() {
            const self = this;

            let observer = new MutationObserver((mutations)=>{
                let shouldSwitch = false;

                mutations.forEach((mutation)=>{
                    if(mutation.attributeName === "data-selected-slide") {
                        if(mutation.oldValue !== document.body.getAttribute("data-selected-slide")) {
                            shouldSwitch = true;
                        }
                    } else if(mutation.attributeName === "data-selected-slide-mode") {
                        if(mutation.oldValue !== document.body.getAttribute("data-selected-slide-mode")) {
                            shouldSwitch = true;
                        }
                    }
                });

                if(shouldSwitch) {
                    self.switchSlide(document.body.getAttribute("data-selected-slide"));
                }
            });

            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ["data-selected-slide", "data-selected-slide-mode"],
                attributeOldValue: true
            });
        }

        static selectSlide(slideId, slideMode) {
            if(slideId != null) {
                document.body.setAttribute("data-selected-slide", slideId, {approved: true});
            } else {
                document.body.removeAttribute("data-selected-slide");
            }

            if(slideMode != null) {
                document.body.setAttribute("data-selected-slide-mode", slideMode, {approved: true});
            } else {
                document.body.removeAttribute("data-selected-slide-mode");
            }
        }

        async switchSlide(slideId, firstSwitch=false) {
            if(this.currentSlide != null) {
                if(this.currentSlideId === slideId) {
                    //Requesting same slide, don't do anything, but maybee update slide mode
                    await this.updateSlideMode();
                    return;
                }

                //Also unload mode
                if(this.currentSlideMode != null) {
                    await this.onUnloadMode();
                }

                //Slide is changing, call unload slide callbacks
                await this.onUnloadSlide();

                this.doSlideCleanup();
            }

            this.currentSlideId = slideId;

            if(slideId != null) {
                console.log("Loading slide:", this.currentSlideId);

                this.currentSlide = document.querySelector("slide#" + cotinkerConfig.slidePrefix + slideId);

                await this.doSlideSetup(firstSwitch);
            }
        }

        async onUnloadMode() {
            console.log("Unloading mode:", this.currentSlideMode);
            for(let callback of this.modeUnloadCallbacks) {
                await callback();
            }
            this.modeUnloadCallbacks = [];
            this.currentSlideMode = null;
        }

        async onUnloadSlide() {
            console.log("Unloading slide:", this.currentSlideId);
            for(let callback of this.slideUnloadCallbacks) {
                await callback();
            }
            this.slideUnloadCallbacks = [];
        }

        cleanFragmentSelections() {
            cQuery("code-fragment").forEach((fragment)=>{
                fragment.removeAttribute("data-editor-selection");
            });
        }

        doSlideCleanup() {
            //Close any open cauldron editor
            closeEditor();

            this.cleanFragmentSelections();

            this.currentSlide.removeAttribute("transient-activation");
            this.currentSlide = null;
        }

        async updateSlideMode(firstSwitch=false) {
            const self = this;

            //Remove all old slide modes
            document.querySelectorAll("slide").forEach((slide)=>{
                slide.removeAttribute("data-slide-mode");
            });

            let mode = document.body.getAttribute("data-selected-slide-mode");

            if(mode !== this.currentSlideMode && this.currentSlideMode != null) {
                //Run unload mode callback, as we are changing mode
                await this.onUnloadMode();
            }

            if(!firstSwitch) {
                this.cleanFragmentSelections();
            }

            console.log("updateSlideMode", mode, this.currentSlideMode);

            if(mode != null) {
                console.log("Loading mode:", mode);
                this.currentSlide.setAttribute("data-slide-mode", mode);

                //Run all mode-fragments inside slide
                for(let fragment of this.currentSlide.querySelectorAll('code-fragment[data-slide-mode="' + mode + '"]')) {
                    fragment = Fragment.one(fragment);
                    await fragment.require({
                        context: {
                            onSlideModeUnloaded: (callback)=>{
                                self.modeUnloadCallbacks.push(callback);
                            },
                            slideReference: self.currentSlide
                        }
                    });
                    if(fragment.supportsAutoDom() && fragment.auto) {
                        await fragment.insertAutoDom();
                    }
                }
            } else {
                this.currentSlide.removeAttribute("data-slide-mode");
            }

            this.currentSlideMode = mode;
        }

        async doSlideSetup(firstSwitch=false) {
            const self = this;

            if(this.currentSlide == null) {
                console.warn("Something is wrong, no current slide inside doSlideSetup!");
                return;
            }

            this.currentSlide.setAttribute("transient-activation", "current");

            //Run all code-fragments inside slide
            let allFragments = this.currentSlide.querySelectorAll("code-fragment:not([data-slide-mode])");
            for(let fragment of allFragments) {
                if(fragment.matches(".cotinker-noauto")) {
                    continue;
                }

                try {
                    fragment = Fragment.one(fragment);
                    await fragment.require({
                        context: {
                            onSlideUnloaded: (callback)=>{
                                self.slideUnloadCallbacks.push(callback);
                            },
                            slideReference: self.currentSlide
                        }
                    });
                    if(fragment.supportsAutoDom() && fragment.auto) {
                        await fragment.insertAutoDom();
                    }
                } catch (ex){
                    console.log("Error running fragment in slide", ex);
                }
            }

            await this.updateSlideMode(firstSwitch);
        }
    }

    Slides.instance = null;

    window.Slides = Slides;
});

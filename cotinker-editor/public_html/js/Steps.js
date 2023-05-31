/* global WPMv2, WebstrateComponents, webstrate, Fragment, cQuery */

function scrollToBottom() {
    let assignment = document.querySelector("assignment");
    assignment.scrollTop = Math.max(0, assignment.scrollHeight - window.innerHeight);
}

function scrollToTop() {
    let assignment = document.querySelector("assignment");
    assignment.scrollTop = 0;
}

function switchStep(step){
    // Remove current from any step that had it
    document.querySelectorAll("step.current").forEach((step)=>{
        step.classList.remove("current");
    })

    // Apparently firefox does not approve attributes correctly when using classList.add
    // So lets make sure we have the class attribute to change.
    if(!step.hasAttribute("class")) {
        step.setAttribute("class", "current", {approved: true});
    } else {
        step.classList.add("current");
    }    
}

enqueueAfterLoad(async ()=>{
    class Steps {
        constructor(prevButton, nextButton, indicator) {
            this.init(prevButton, nextButton, indicator);

            this.stepUnloadCallbacks = [];

            console.log("Step engine created");
        }

        init(prevButton, nextButton, indicator) {
            const self = this;

            this.prevButton = prevButton;
            this.nextButton = nextButton;
            this.indicator = indicator;

            this.prevButton.addEventListener("click", ()=>{
                Steps.prevStep();
            });

            this.nextButton.addEventListener("click", ()=>{
                Steps.nextStep();
            });

            let firstStep = document.querySelector("step.current");

            if (document.querySelector("step.current") == null) {
                //We had no step, get first
                firstStep = document.querySelector("steps step:first-child");
            }

            this.setupObserver();

            //Setup first step
            Steps.makeCurrent(firstStep);
        }

        setupObserver() {
            const self = this;
            this.observer = new MutationObserver((mutations)=>{
                mutations.forEach((mutation)=>{
                    if(mutation.target.matches("step")) {
                        switch (mutation.type) {
                            case "attributes": {
                                if (mutation.attributeName === "class") {
                                    if (mutation.target.classList.contains("current")) {
                                        //This was made current
                                        self.doStepSetup(mutation.target);
                                    } else {
                                        //No longer current
                                        self.doStepCleanup(mutation.target);
                                    }
                                } else if (mutation.attributeName === "data-slide" || mutation.attributeName === "data-slide-mode") {
                                    if (mutation.target.slideTimerId != null) {
                                        clearTimeout(mutation.target.slideTimerId);
                                    }

                                    mutation.target.slideTimerId = setTimeout(() => {
                                        self.doSetupSlide(mutation.target);
                                    }, 500);
                                }
                            }

                            case "childList": {
                                //Check we have a current slide, if not, fix this.
                                let currentStep = document.querySelector("step.current");

                                if (currentStep == null) {
                                    //We had no step, get first
                                    let firstStep = document.querySelector("steps step:first-child");

                                    Steps.makeCurrent(firstStep);
                                }
                            }
                        }

                        Steps.updateIndicator(self.indicator);
                    }
                });
            })

            this.observer.observe(document.querySelector("steps"), {
                attributes: true,
                attributeFilter: ["class", "data-slide", "data-slide-mode"],
                subtree: true,
                childList: true
            })
        }

        static nextStep() {
            let currentStep = document.querySelector("step.current");
            if(currentStep.nextElementSibling != null) {
                Steps.makeCurrent(currentStep.nextElementSibling);

                let stepName = currentStep.nextElementSibling.getAttribute("name");
                let slideName = currentStep.nextElementSibling.getAttribute("data-slide");
                let slideMode = currentStep.nextElementSibling.getAttribute("data-slide-mode");
                Tagger.tag("stepForward", {stepName, slideName, slideMode});
            }
        }

        static prevStep() {
            let currentStep = document.querySelector("step.current");
            if(currentStep.previousElementSibling != null) {
                Steps.makeCurrent(currentStep.previousElementSibling);

                let stepName = currentStep.previousElementSibling.getAttribute("name");
                let slideName = currentStep.previousElementSibling.getAttribute("data-slide");
                let slideMode = currentStep.previousElementSibling.getAttribute("data-slide-mode");
                Tagger.tag("stepBack", {stepName, slideName, slideMode});
            }
        }

        static makeCurrent(step) {
            switchStep(step);
        }

        doStepCleanup(step) {
            step.removeAttribute("transient-already-current");

            //Check if we are typing
            if(document.activeElement != null && document.activeElement.matches("input.message")) {
                let input = document.activeElement;
                let oldValue = input.value;
                input.value = "";
                input.blur();

                if(oldValue.trim().length > 0) {
                    step.setAttribute("transient-chat-message", oldValue);
                }
            }

            this.stepUnloadCallbacks.forEach((callback)=>{
                callback();
            });
            this.stepUnloadCallbacks = [];
        }

        doSetupSlide(step) {
            let slide = step.getAttribute("data-slide");
            let mode = step.getAttribute("data-slide-mode");

            if(slide?.trim() === "") {
                slide = null;
            }

            if(mode?.trim() === "") {
                mode = null;
            }

            Slides.selectSlide(slide, mode);
        }

        doStepSetup(step) {
            //Already setup, skip
            if(step.hasAttribute("transient-already-current")) {
                return;
            }

            //Mark we are setting it up
            step.setAttribute("transient-already-current", "true");

            const self = this;

            //Select slide if present
            this.doSetupSlide(step);

            //Allow mutation handler to insert ops in websocket
            setTimeout(async ()=>{
                //Run all code-fragments inside step
                let codeFragments = step.querySelectorAll("code-fragment");
                for(let fragment of codeFragments) {
                    fragment = Fragment.one(fragment);
                    console.log("Loading:", fragment);
                    await fragment.require({
                        context: {
                            onStepUnloaded: (callback)=>{
                                self.stepUnloadCallbacks.push(callback);
                            },
                            stepReference: step
                        }
                    });

                    if(fragment.supportsAutoDom() && fragment.auto) {
                        await fragment.insertAutoDom();
                    }
                }
            }, 0);

            if(step.previousElementSibling == null) {
                this.prevButton.classList.add("disabled");
            } else {
                this.prevButton.classList.remove("disabled");
            }

            if(step.nextElementSibling == null) {
                this.nextButton.classList.add("disabled");
            } else {
                this.nextButton.classList.remove("disabled");
            }

            scrollToTop();

            if(step.hasAttribute("transient-chat-message")) {
                let oldValue = step.getAttribute("transient-chat-message");
                step.removeAttribute("transient-chat-message");

                if(oldValue.trim() > 0) {
                    let input = document.querySelector("input.message");
                    input.value = oldValue;
                    input.focus();
                }
            }
        }

        static updateIndicator(indicator) {
            let currentStep = document.querySelector("step.current");
            let steps = cQuery("steps step");

            let stepIndex = -1;

            steps.forEach((s, index)=>{
                if(s=== currentStep) {
                    stepIndex = index;
                }
            });

            indicator.innerHTML = (stepIndex+1)+"/"+steps.length;
        }

        postMessage(message) {
            if(message == null || message.trim().length === 0) {
                //Skip empty messages
                return;
            }

            let currentStep = document.querySelector("step.current");
            if(currentStep != null) {
                let mobileMessage = WebstrateComponents.Tools.loadTemplate("mobileMessage");

                mobileMessage.querySelector(".author").innerHTML = id.getName();
                mobileMessage.querySelector(".author").setAttribute("userid", webstrate.user.userid);
                mobileMessage.querySelector(".timestamp").innerHTML = new Date().toLocaleTimeString('da-dk', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'                    
                });
                mobileMessage.querySelector(".message").innerHTML = message;

                // Ensure that there is a stretch div before the first message
                if (!document.querySelector("step.current .stretch")){
                    let stretch = document.createElement("div");
                    stretch.classList.add("stretch");
                    WPMv2.stripProtection(stretch);
                    currentStep.appendChild(stretch);
                }
                
                // Append message
                WPMv2.stripProtection(mobileMessage);
                currentStep.appendChild(mobileMessage);

                scrollToBottom();

                Tagger.tag("chatMessage");
            }
        }

        postScreenshot(screenshotUrl, thumbnailUrl, fullWidth, fullHeight) {
            let currentStep = document.querySelector("step.current");
            if(currentStep != null) {

                let mobileMessage = WebstrateComponents.Tools.loadTemplate("mobileMessage");

                mobileMessage.querySelector(".author").innerHTML = id.getName();
                mobileMessage.querySelector(".author").setAttribute("userid", webstrate.user.userid);
                mobileMessage.querySelector(".timestamp").innerHTML = new Date().toLocaleTimeString('da-dk', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    year: 'numeric'
                });

                let img = document.createElement("img");
                img.classList.add("thumbnail");
                img.src = thumbnailUrl;

                let drawingDiv = document.createElement("div");
                drawingDiv.classList.add("drawable");
                drawingDiv.setAttribute("data-full-image", screenshotUrl);
                drawingDiv.setAttribute("data-width", fullWidth);
                drawingDiv.setAttribute("data-height", fullHeight);

                let canvasDiv = document.createElement("div");
                canvasDiv.classList.add("canvas");

                drawingDiv.appendChild(canvasDiv);
                drawingDiv.appendChild(img);

                mobileMessage.querySelector(".message").innerHTML = "";
                mobileMessage.querySelector(".message").appendChild(drawingDiv);

                // Ensure that there is a stretch div before the first message
                if (!document.querySelector("step.current .stretch")){
                    let stretch = document.createElement("div");
                    stretch.classList.add("stretch");
                    WPMv2.stripProtection(stretch);
                    currentStep.appendChild(stretch);
                }

                // Append image
                WPMv2.stripProtection(mobileMessage);
                currentStep.appendChild(mobileMessage);

                scrollToBottom();

                Tagger.tag("screenshot");
            }
        }
    }

    Steps.instance = null;

    window.Steps = Steps;
});

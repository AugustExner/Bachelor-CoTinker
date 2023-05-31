class CTAnalytics {
    /**
     * The data source, typically the #cotinkerTags fragment
     * @param {type} source
     * @returns {CTAnalytics}
     */
    constructor(source) {
        this.sourceFragment = Fragment.one(source);
    }

    /**
     * Returns promise with self-updating vega view
     * @param {type} element The target element to embed into
     * @returns {undefined}
     */
    async embedStepGraph(element) {
        let self = this;
        await wpm.requireExternal("https://cdn.jsdelivr.net/npm/vega@5.20.2");
        await wpm.requireExternal("https://cdn.jsdelivr.net/npm/vega-lite@5.1.1");
        await wpm.requireExternal("https://cdn.jsdelivr.net/npm/vega-embed@6.18.2");

        let graphSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: window.innerWidth * 0.75,
            height: window.innerHeight * 0.75,
            "autosize": {
                "type": "fit",
                "resize": true,
                "contains": "padding"
            },
            //formatting the size of the graph
            data: {
                name: "steps"
            },
            //type of the graph
            mark: {
                type: 'line',
                strokeWidth: 1, //width of the line
                //orient: 'vertical',
                point: {
                    type: 'point',
                    size: 70
                }
            },
            encoding: {
                y: {
                    field: 'currentStep', //which property of the object we want
                    type: 'nominal',
                    sort: 'descending',
                    axis: {
                        title: "Steps"
                    }
                },
                x: {
                    field: 'normalisedTimeInSeconds',
                    type: 'quantitative',
                    axis: {
                        title: 'Time spent',
                        tickMinStep: 1
                    }
                },
                order: {
                    field: 'normalisedTimeInSeconds', type: 'quantitative'
                }
            }
        };
        let embedded = await vegaEmbed(element, graphSpec);

        async function updateStepData(){
                let data = self.generateArrayOfSteps(await self.sourceFragment.require());

                console.log(data);

                embedded.view.data("steps", data);
                await embedded.view.runAsync();
        }
        updateStepData();
        
        // Auto-update this when fragment changes
        this.sourceFragment.registerOnFragmentChangedHandler(updateStepData);

        return embedded;
    }

    async embedEventGraph(element) {
        let self = this;
        await wpm.requireExternal("https://cdn.jsdelivr.net/npm/vega@5.20.2");
        await wpm.requireExternal("https://cdn.jsdelivr.net/npm/vega-lite@5.1.1");
        await wpm.requireExternal("https://cdn.jsdelivr.net/npm/vega-embed@6.18.2");

        let graphSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: window.innerWidth * 0.75,
            height: window.innerHeight * 0.75,
            "autosize": {
                "type": "fit",
                "resize": true,
                "contains": "padding"
            },
            //formatting the size of the graph
            data: {
                name: "events"
            },
            //type of the graph
            mark: {
                type: 'bar',
                //strokeWidth: 1 //width of the line
            },
            encoding: {
                y: {
                    aggregate: 'sum', //which property of the object we want
                    field: 'count',
                    type: 'quantitative',
                    // sort: "descending",
                    axis: {
                        title: "Number of kinds of events",
                        tickMinStep: 1
                    }
                },
                x: {
                    field: 'name',
                    type: 'ordinal',
                    axis: {
                        title: 'Students'
                    }
                },
                color: {
                    field: "type",
                    type: "nominal",
                    //scale: {
                    //  domain: ["messages", "steps", "codeEditing"],
                    // range: ["#e7ba52", "#c7c7c7", "#aec7e8"]
                }
            }
        };

        let embedded = await vegaEmbed(element, graphSpec);

        async function updateEventData(){
                let data = self.countEvents(await self.sourceFragment.require());
                embedded.view.data("events", data);
                await embedded.view.runAsync();
        }
        updateEventData();

        // Auto-update this when fragment changes
        this.sourceFragment.registerOnFragmentChangedHandler(updateEventData);       

        return embedded;

    }

    // Function to generate array of events with steps and timestamps
    generateArrayOfSteps(eventArray) {
        let self = this;

        // Array to hold mapped events with normalised time
        let normalisedEvents = []; //normalise by starting at time 0
        // Epoch time of user joining
        let currentStep = 1;
        let startTime; //undefined temporary variable, might be defined or not
        for (let event of eventArray) {
            if (event.event === "mobileUserJoined") {
                startTime = event.timestamp;
                normalisedEvents.push(self.generateTimeStepObject(startTime, event.timestamp, currentStep));
                break;
                //after finding the first 'mobileuserjoined' event the loop breaks (many more of such events but we only care about the first of those)
            }
        }
        if (startTime) {
            //if startTime exists (overwritten from undefined by the previous loop)
            for (let event of eventArray) {
                if (event.event === "stepForward") {
                    currentStep++;
                    normalisedEvents.push(self.generateTimeStepObject(startTime, event.timestamp, currentStep));

                } else if (event.event === "stepBack") {
                    currentStep--;
                    normalisedEvents.push(self.generateTimeStepObject(startTime, event.timestamp, currentStep));
                }
            }
        } else {
            console.log("Invalid data. No start time registered. :-(")
        }

        return normalisedEvents;
    }

    generateTimeStepObject(starttime, timestamp, currentStep) {
        let normalisedTime = timestamp - starttime; // Time in MS from start time
        let normalisedTimeInSeconds = Math.floor(normalisedTime / 1000);

        return {
            // user: user,
            normalisedTimeInSeconds: normalisedTimeInSeconds,
            timestamp: timestamp,
            currentStep: currentStep
        };
    }

    countEvents(eventArray) {
        // Find unique names
        let uniqueNames = [];
        for (let event of eventArray) {
            if (!uniqueNames.includes(event.name) && event.name !== "n/a") {
                uniqueNames.push(event.name);
            }
        } 

        let selectEvents = ['chatMessage', 'stepForward', 'stepBack', 'userEditingStarted', 'userChangedCode'];
        let eventCounts = []; // In here we will add objects of form {name: X, count: Y}
        for (let name of uniqueNames) { // Generate objects for each username
            for (let type of selectEvents) {
                eventCounts.push({
                    name: name,
                    type: type,
                    count: 0
                });
            }
        }

        for (let event of eventArray) {
            if (event.event === "chatMessage") {
                for (let messagesObj of eventCounts) {
                    if (messagesObj.name === event.name && messagesObj.type === event.event) {
                        messagesObj.count++;
                    }
                }
            }
            if (event.event === "stepForward" || event.event === "stepBack") {
                for (let stepsObj of eventCounts) {
                    if (stepsObj.name === event.name && (stepsObj.type === event.event)) {
                        stepsObj.count++;
                    }
                }
            }
            if (event.event === "userEditingStarted" || event.event === "userChangedCode") {
                for (let codeEditingObj of eventCounts) {
                    if (codeEditingObj.name === event.name && codeEditingObj.type === event.event) {
                        codeEditingObj.count++;
                    }
                }
            }
        }

        return eventCounts;
    }
}
window.CTAnalytics = CTAnalytics;

window.stubShowAnalytics = function stubShowAnalytics(){
    // Show a simple hardcoded page with analytics graphs
    let analytics = new CTAnalytics("#cotinkerTags");
    let parent = document.createElement("slide");
    parent.style.position = "absolute";        
    parent.style.width = "100%";
    parent.style.height = "100%";
    parent.style.overflow = "auto";
    parent.style.display = "block";
    document.querySelector("html").appendChild(parent);

    let header = document.createElement("h1");
    header.textContent = "Statistics";
    parent.appendChild(header);

    // Steps that people went through
    let stepGraphElement = document.createElement("div");
    parent.appendChild(stepGraphElement);
    analytics.embedStepGraph(stepGraphElement);

    // Actions that were taken
    let eventGraphElement = document.createElement("div");
    parent.appendChild(eventGraphElement);
    analytics.embedEventGraph(eventGraphElement);    
}

function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function renderValueInto(value, valueField) {
    let valueType = typeof value;
    switch (valueType) {
        case "boolean":
            if (value) {
                valueField.innerHTML = "<span class='mark' style='color:green'>✓</span>";
            } else {
                valueField.innerHTML = "<span class='mark' style='color:red'>✗</span>";
            }
            break;
        case "undefined":
            valueField.innerHTML = "<span class='mark' style='color:cyan'>?</span>";
            break;
        case "object":
            if (value instanceof Array) {
                valueField.innerHTML = "<ul><li>" + value.map(s => {
                    if (typeof s === "object") {
                        return renderObject(s);
                    } else {
                        return ("" + s).replace("<", "&lt;");
                    }
                }).join("</li><li>") + "</li></ul>";
            } else {
                // TODO: escape
                valueField.innerHTML = renderObject(value);
            }
            break;
        default:
            valueField.innerText = value;
    }
}

function renderLocation(input) {
    let result = "<table>";
    if (input.hasOwnProperty("continent"))
        result += "<tr><th>Kontinent</th><td>" + input.continent.names.en + "</td></tr>";
    if (input.hasOwnProperty("country"))
        result += "<tr><th>Land</th><td>" + input.country.names.en + "</td></tr>";
    try {
        if (input.hasOwnProperty("subdivisions"))
            result += "<tr><th>Område</th><td>" + input.subdivisions.map(s => s.names.en).join(", ") + "</td></tr>";
    } catch (ex) {
    }
    if (input.hasOwnProperty("city"))
        result += "<tr><th>By</th><td>" + input.city.names.en + "</td></tr>";

    result += "<tr><th>Koordinater</th><td>" + input.location.latitude + " " + input.location.longitude + "</td></tr>";
    result += "<tr><th>Kort</th><td><img class='locationmap' src='https://www.mapquestapi.com/staticmap/v5/map?key=qPTr5MUHQXszNPS88WgDZfl5Z4tM4Fg8&type=hyb&size=250,160&locations=" + input.location.latitude + "," + input.location.longitude + "&zoom=2&defaultMarker=circle-end'></td></tr>";
    return result + "</table>";
}

function renderObject(input) {
    if (input === null)
        return "null";

    if (input instanceof Date) {
        return input.toLocaleString();
    }

    if (input.hasOwnProperty("location") && input.location.hasOwnProperty("latitude") && input.location.hasOwnProperty("longitude")) {
        return renderLocation(input);
    }

    return "<table><tr>" + Object.entries(input).map(([key, value]) => {
        if (value.startsWith && value.startsWith("data:image")) {
            return "<th>" + key + "</th><td><img src='" + value + "'></td>";
        } else if (typeof value === "object") {
            return "<th>" + key + "</th><td>" + renderObject(value) + "</td></tr>";
        } else {
            return "<th>" + key + "</th><td>" + value + "</td>";
    }
    }).join("</tr><tr>") + "</tr></table>";
}

async function getUberTracker() {
    if (window.uberTracker)
        return window.uberTracker;
    await WPMv2.require([{
            "package": "UberTracker",
            "repository": "wpm_js_libs"
        }]);
    window.uberTracker = new UberTracker();
    return window.uberTracker;
}

function getStudentName() {
    let name = null;
    try {
        if(window.view) {
            name = Collaboration.instance.getCollaboratorFromView(webstrate.clientId).name.replace("\"", "'");
        } else {
            name = window.id.getName().replace("\"", "'");
        }
    } catch(e) {
        console.warn("Unable to retrieve name:", e);
        throw new Error("Unable to get name for student (View: "+window.view+", Identification: "+window.id+")");
    }

    return name;
}

async function getStudentData() {
    let name = getStudentName();

    let fragment = Fragment.one(document.querySelector("assignment code-fragment.studentdata[student=\"" + name + "\"]"));
    let data = {};
    if (fragment) {
        try {
            data = await fragment.require();
        } catch(e) {
            console.warn("Error retrieving old student data:", e);
        }
    }

    return data;
}

function saveStudentData(data) {
    let name = getStudentName();
    let fragment = document.querySelector("assignment code-fragment[student=\"" + name + "\"]");
    if (!fragment) {
        fragment = Fragment.create("application/json");
        fragment.html[0].setAttribute("student", name);
        fragment.html[0].classList.add("studentdata");
        let parent = document.querySelector("assignment");
        WPMv2.stripProtection(fragment.html[0]);
        parent.appendChild(fragment.html[0]);
        console.debug("Creating studentdata for the first time for "+name);
    }
    setTimeout(() => {
        // Timeout to be sure that the fragment has been fragmentified by codestrates
        Fragment.one(fragment).raw = JSON.stringify(data);
    }, 0);
}

// Intentially leaks fingerprinting information into the webstrate
async function storeFingerprint() {
    async function updateFingerprint(fingerprint) {
        let data = await getStudentData();
        data.fingerprint = fingerprint;
        await saveStudentData(data);
    }

    let handleUncaughtException = function handleUncaughtException(evt) {
        console.debug("Error loading fingerprinting, probabely blocked by some addblocker.", evt);
        updateFingerprint({
            "components": {
                "domBlockers": {
                    "value": "Fingerprint.js blev blokeret af browseren.",
                    "duration": 12
                }
            },
            "version": "3.3.6"
        });
    };

    window.addEventListener("unhandledrejection", handleUncaughtException);
    await WPMv2.require([{
        "package": "fingerprintjs",
        "repository": "wpm_js_libs"
    }]);
    window.removeEventListener("unhandledrejection", handleUncaughtException);

    let fingerprinter = await FingerprintJS.load();
    let fingerprint = await fingerprinter.get();
    await updateFingerprint(fingerprint);
}

// Intentially leaks connection information from the UberTracker client session into the webstrate
async function storeServersideInfo(){
    let uberTracker = await getUberTracker();
    await uberTracker.ready();
    let session = uberTracker.clientData;
    
    let data = await getStudentData();
    data.serverside = {};
    ["ip","rdns","location","agent","accept","language","encoding"].forEach((v)=>{
        data.serverside[v] = session[v];
    });
    saveStudentData(data);
}

// Injects a self-updating table showing fingerprints from all studentdata fragments
function embedFingerprintingTable(target, options={}){
    if (target.comparisonTable) return; // Already loaded, do nothing
    
    this.render =  async function renderFingerprintTable(){
        console.debug("Rendering fingerprint table");
        let table = document.createElement("table");
        let headerTemplate = document.querySelector("#comparison-header").content;
        let headerCellTemplate = document.querySelector("#comparison-header-cell").content;
        let rowTemplate = document.querySelector("#comparison-row").content;
        let cellTemplate = document.querySelector("#comparison-cell").content;

        let header = headerTemplate.cloneNode(true);

        // Find the different kinds of data
        let indices = [];
        for (const fragment of document.querySelectorAll("assignment code-fragment.studentdata[student]")){
            let json = await Fragment.one(fragment).require();

            if ((!json.fingerprint) || (!json.fingerprint.components)){
                console.warn("Weirdness detected --- weird");
                continue;
            }

            Object.keys(json.fingerprint.components).forEach(component=>{
                if (!indices.includes(component)){
                    indices.push(component);
                }
            });
        }
        indices = ["fingerprint", ...indices];

        let dataPointNames = {
            "audio": "Lyd", /* A deep description: https://fingerprint.com/blog/audio-fingerprinting/ Inspired by and based on https://github.com/cozylife/audio-fingerprint */
            "canvas": "Tegnefunktioner",
            "colorGamut": "Farveprofil",
            "colorDepth": "Farvedybde",
            "contrast": "Kontrastindstilling", /* high/low/forced */
            "cookiesEnabled": "Cookies Tilladt",
            "cpuClass": "CPU Type",
            "deviceMemory": "Hukomelse",
            "domBlockers": "Ad-blockers",
            "fontPreferences": "Tekstvisning", /* min size, size of M etc */
            "fonts": "Fonte", /* available fonts tests */
            "forcedColors": "Specielle farver", /* CSS windows forced colours (high contrast etc.) */
            "hardwareConcurrency": "Multithreading", /* threads */
            "hdr": "Høj Dynamisk Farvedybde",
            "indexedDB": "Databaser",
            "invertedColors": "Inverterede Farver", /* css media query */
            "languages": "Sprog",
            "localStorage": "Datalager",
            "math": "Matematiske Udregninger", 
            "monochrome": "Sort/hvid Skærm",
            "openDatabase": "Web SQL",
            "osCpu": "OS og CPU Type",
            "platform": "Platform",
            "plugins": "Udviddelser",
            "reducedMotion": "Undgå Animationer", /* css media query prefers reduced motion */
            "screenFrame": "Skærmareal",
            "screenResolution": "Skærmopløsning", /* inside browser */
            "sessionStorage": "Midlertidig Data",
            "timezone": "Tidszone",
            "touchSupport": "Trykfølsomhed",
            "vendor": "Browserproducent",
            "vendorFlavors": "Browsertype",
            "fingerprint": "Fingeraftryk"
        };
        let dataPointDescriptions = {
            "audio": "Analyse af lydprocesseringsstystemet", 
            "canvas": "Analyse af tegnefunktionerne",
            "colorGamut": "Hvordan skærmen er kalibreret",
            "colorDepth": "Antal bits brugt til at repræsentere farver",
            "contrast": "Om systemet bruger høj-kontrast farver",
            "cookiesEnabled": "Kan cookies gemmes på systemet?",
            "cpuClass": "Typen af processor",
            "deviceMemory": "Tilgængelig RAM",
            "domBlockers": "Undersøg om noget blokkerer visse elementer",
            "fontPreferences": "Analyse af visning af tekst",
            "fonts": "Hvilke specielle fonte er tilgængelige", 
            "forcedColors": "Tvinger systemet visning til synshæmmede",
            "hardwareConcurrency": "Hvor mange tråde kan afvikles samtidigt",
            "hdr": "Kan skærmen vise meget lyse/svage farver",
            "indexedDB": "Er indexedDB tilgængelig",
            "invertedColors": "Foreslår systemet at lave alle farver modsat",
            "languages": "Sprogpreferencer (i rækkefølge)",
            "localStorage": "Er localStorage tilgængeligt",
            "math": "Hvor præcist udregner sytemet cos/sin osv", 
            "monochrome": "Er skærmen begrænset til 2 farver",
            "openDatabase": "Er denne database tilgængelig",
            "osCpu": "Hvordan rapporterer systemet sin CPU",
            "platform": "Hvad kalder systemet sin platform",
            "plugins": "Har brugeren installeret extensions",
            "reducedMotion": "Er handikap-indstillingen for begrænset bevægelse aktiveret", 
            "screenFrame": "Information om hele skærmen",
            "screenResolution": "Bredde/højde i pixels i browseren",
            "sessionStorage": "Er sessionStorage tilgængelig",
            "timezone": "Urets indstilling",
            "touchSupport": "Hvor mange touch-punkter understøttes",
            "vendor": "Navnet på udvikleren",
            "vendorFlavors": "Navnet på browseren",
            "fingerprint": "Det samlede ID som systemet har opbygget baseret på resten af informationen"
        };                    
        
        if (window.cotinkerConfig && window.cotinkerConfig.language && window.cotinkerConfig.language === "en"){
            dataPointNames = {
                "audio": "Audio", /* A deep description: https://fingerprint.com/blog/audio-fingerprinting/ Inspired by and based on https://github.com/cozylife/audio-fingerprint */
                "canvas": "Graphics",
                "colorGamut": "Colour Profile",
                "colorDepth": "Colour Depth",
                "contrast": "Contrast Settings", /* high/low/forced */
                "cookiesEnabled": "Cookies Enabled",
                "cpuClass": "CPU Type",
                "deviceMemory": "Memory",
                "domBlockers": "Ad-blockers",
                "fontPreferences": "Font Properties", /* min size, size of M etc */
                "fonts": "Fonts", /* available fonts tests */
                "forcedColors": "Forced Colours", /* CSS windows forced colours (high contrast etc.) */
                "hardwareConcurrency": "Multithreading", /* threads */
                "hdr": "High Dynamic Range Colours",
                "indexedDB": "Databases",
                "invertedColors": "Inverterted Colours", /* css media query */
                "languages": "Languages",
                "localStorage": "Storages",
                "math": "Math", 
                "monochrome": "Monochrome Colours",
                "openDatabase": "Web SQL",
                "osCpu": "OS and CPU Type",
                "platform": "Platform",
                "plugins": "Plugins",
                "reducedMotion": "Reduced Motion", /* css media query prefers reduced motion */
                "screenFrame": "Screen Area",
                "screenResolution": "Screen Resolution", /* inside browser */
                "sessionStorage": "Session Storage",
                "timezone": "Timezone",
                "touchSupport": "Touch Support",
                "vendor": "Browser Vendor",
                "vendorFlavors": "Browser Type",
                "fingerprint": "Fingerprint"
            };
            dataPointDescriptions = {
                "audio": "Analysis of the audio processesing system", 
                "canvas": "Analysis of the canvas drawing functions",
                "colorGamut": "Calibration of the screen colours",
                "colorDepth": "Number of bits used to represent colours",
                "contrast": "Is the system using high-contrast colours?",
                "cookiesEnabled": "Can cookies be stored?",
                "cpuClass": "Type of processor",
                "deviceMemory": "Amounf of RAM",
                "domBlockers": "Does anything block certain DOM elements?",
                "fontPreferences": "Analysis text rendering",
                "fonts": "Special fonts available", 
                "forcedColors": "Colours for visually impaired enabled?",
                "hardwareConcurrency": "How many CPU threads can be used simultaneously?",
                "hdr": "Does the screen support very bright/dim colours?",
                "indexedDB": "Is indexedDB available?",
                "invertedColors": "Does the system want to invert colours?",
                "languages": "Language preferences (in order)",
                "localStorage": "Is localStorage available?",
                "math": "How precise does the system calculate cos/sin etc?", 
                "monochrome": "Is the screen limited to 2 colours?",
                "openDatabase": "Is this database available?",
                "osCpu": "The CPU repported by the OS",
                "platform": "What does the OS call the platform it runs on?",
                "plugins": "Any enabled plugins",
                "reducedMotion": "Handicap setting for avoiding animation on screen", 
                "screenFrame": "Information about the screen",
                "screenResolution": "Width/height of the browser in pixels",
                "sessionStorage": "Is sessionStorage available?",
                "timezone": "System clock setting",
                "touchSupport": "How many simultaneous touch points are supported",
                "vendor": "Company Name",
                "vendorFlavors": "Browseren Name",
                "fingerprint": "The combined ID produced by the fingerprinting algorithm"
            };     
        }

        // One row for each data point
        let tableBody = document.createElement("tbody");
        let rows = {};
        indices.forEach(index=>{
            rows[index] = rowTemplate.cloneNode(true);
            rows[index].querySelector(".title").innerText = dataPointNames[index]?dataPointNames[index]:index;
            rows[index].querySelector(".description").innerText = dataPointDescriptions[index]?dataPointDescriptions[index]:"";
        });

        let seed = target.getAttribute("data-seed");
        let random = mulberry32(seed);
        let students = Array.from(document.querySelectorAll("assignment code-fragment.studentdata[student]"));
        students = students.map((student)=>{
            return {
                random: random(),
                student: student
            };
        });
        students.sort((s1, s2)=>{
            return s1.random - s2.random;
        });
        students = students.map((student)=>{return student.student;});

        // Fill the table with the data for each student
        for (const fragment of students){
            let json = await Fragment.one(fragment).require();
            if ((!json.fingerprint) || (!json.fingerprint.components)){
                continue;
            }
            json = json.fingerprint;

            // Add final fingerprint to rows
            json.components["fingerprint"] = {value:json.visitorId};

            let headerCell = headerCellTemplate.cloneNode(true);
            headerCell.querySelector(".student").innerHTML = fragment.getAttribute("student");
            let ourName = getStudentName();
            if (ourName===fragment.getAttribute("student")){
                cQuery(headerCell.querySelector(".student")).addTransientClass("self");
            }
            header.querySelector("tr").appendChild(headerCell);

            indices.forEach(index=>{
                let rowCell = cellTemplate.cloneNode(true);

                let value = json.components[index]?json.components[index].value:null;
                let valueField = rowCell.querySelector(".value");
                renderValueInto(value, valueField);

                rows[index].querySelector("tr").appendChild(rowCell);
            });
        }


        // Combine it all
        table.appendChild(header);
        indices.forEach(index=>{
            tableBody.appendChild(rows[index]);
        });
        table.appendChild(tableBody);
        target.innerHTML = "";
        target.appendChild(table);

        //Enable reveal mechanic
        let revealInput = target.querySelector("input.reveal");
        revealInput.addEventListener("change", ()=>{
            if(revealInput.checked) {
                table.querySelectorAll(".comparison-table th .student").forEach((student)=>{
                    cQuery(student).removeTransientClass("anonymous");
                });
            } else {
                table.querySelectorAll(".comparison-table th .student").forEach((student)=>{
                    cQuery(student).addTransientClass("anonymous");
                });
            }
        });
    };

    target.comparisonTable = this;
    autoRenderOnChange(target);
}

function embedServersideTable(target, options={}){
    if (target.comparisonTable) return; // Already loaded, do nothing

    this.render = async function renderServersideTable(){
        console.debug("Rendering serverside tracking table");
        let table = document.createElement("table");
        let headerTemplate = document.querySelector("#comparison-header").content;
        let headerCellTemplate = document.querySelector("#comparison-header-cell").content;
        let rowTemplate = document.querySelector("#comparison-row").content;
        let cellTemplate = document.querySelector("#comparison-cell").content;

        let dataPointNames = {
            "ip": "IP",
            "rdns": "Omvendt DNS",
            "location": "Internet Placering",
            "agent": "Browser",
            "accept": "MIME-typer",
            "language": "Sprog",
            "encoding": "Komprimering"
        };
        let dataPointDescriptions = {                    
            "ip": "Internet-addresse",
            "rdns": "Forbindelsens navn hos internetudbyderen",
            "location": "Udbyderens lokation",
            "agent": "Browser-streng fra HTTP forespørgsel",
            "accept": "Understøttede hjemmeside-formater",
            "language": "Sendt til serveren i HTTP forespørgsel",
            "encoding": "Understøttede komprimeringsalgoritmer"
        };                   
        
        if (window.cotinkerConfig && window.cotinkerConfig.language && window.cotinkerConfig.language === "en"){
            dataPointNames = {
                "ip": "IP",
                "rdns": "Reverse DNS",
                "location": "Internet Location",
                "agent": "Browser",
                "accept": "MIME-types",
                "language": "Languages",
                "encoding": "Compression"
            };
            dataPointDescriptions = {                    
                "ip": "Internet-address",
                "rdns": "Connection identifier from ISP",
                "location": "Suppliers Connection Point",
                "agent": "Browser-string from HTTP request",
                "accept": "Supported transmission-formats",
                "language": "As part of HTTP request to server",
                "encoding": "Supported compression algorithms"
            };            
        }


        let indices = Object.keys(dataPointNames);                    
        let header = headerTemplate.cloneNode(true);

        // One row for each data point
        let tableBody = document.createElement("tbody");
        let rows = {};
        indices.forEach(index=>{
            rows[index] = rowTemplate.cloneNode(true).firstElementChild;
            console.debug("it is", rowTemplate.cloneNode(true), rows[index]);
            rows[index].querySelector(".title").innerText = dataPointNames[index]?dataPointNames[index]:index;
            rows[index].querySelector(".description").innerText = dataPointDescriptions[index]?dataPointDescriptions[index]:"";
            tableBody.appendChild(rows[index]);
        });

        let seed = parseInt(target.getAttribute("data-seed"));
        let random = mulberry32(seed);
        let students = Array.from(document.querySelectorAll("assignment code-fragment.studentdata[student]"));
        students = students.map((student)=>{
            return {
                random: random(),
                student: student
            };
        });
        students.sort((s1, s2)=>{
            return s1.random - s2.random;
        });
        students = students.map((student)=>{return student.student});

        // Fetch tracking data
        for (const fragment of students){
            console.debug("Building for ",fragment);
            let json = await Fragment.one(fragment).require();

            if (!json.serverside){
                console.warn("Tracking weirdness detected --- weird");
                continue;
            }

            // Add to header
            let headerCell = headerCellTemplate.cloneNode(true);
            headerCell.querySelector(".student").innerText = fragment.getAttribute("student");
            let ourName = getStudentName();
            if (ourName===fragment.getAttribute("student")){
                cQuery(headerCell.querySelector(".student")).addTransientClass("self");
            }
            header.querySelector("tr").appendChild(headerCell);

            // Add basic info to rows
            for (let [index, value] of Object.entries(json.serverside)){
                if (rows[index]){
                    let cell = cellTemplate.cloneNode(true).firstElementChild;
                    rows[index].appendChild(cell);

                    let valueField = cell.querySelector(".value");
                    renderValueInto(value, valueField);
                }
            }
        }           

        // Combine it all
        table.appendChild(header);
        table.appendChild(tableBody);
        target.innerHTML = "";
        target.appendChild(table);

        //Enable reveal mechanic
        let revealInput = target.querySelector("input.reveal");
        revealInput.addEventListener("change", ()=>{
            if(revealInput.checked) {
                table.querySelectorAll(".comparison-table th .student").forEach((student)=>{
                    cQuery(student).removeTransientClass("anonymous");
                });
            } else {
                table.querySelectorAll(".comparison-table th .student").forEach((student)=>{
                    cQuery(student).addTransientClass("anonymous");
                });
            }
        });
    };

    target.comparisonTable = this;
    autoRenderOnChange(target);
}

function embedStatisticsTable(target, options={}){
    this.render = async function renderUberTrackerStatisticsTable() {
        console.debug("Building UberTracker statistics table");
        let table = document.createElement("table");
        let headerTemplate = document.querySelector("#comparison-header").content;
        let headerCellTemplate = document.querySelector("#comparison-header-cell").content;
        let rowTemplate = document.querySelector("#comparison-row").content;
        let cellTemplate = document.querySelector("#comparison-cell").content;

        let dataPointNames = {
            "minTime": "Start",
            "maxTime": "Slut",
            "timeSpent": "Tidsforbrug",
            "subsessions": "Sidevisninger",
            "averagePointerSpeed": "Markørhastighed",
            "maxPointerSpeed": "Markørhastighed (Max)",
            "pointerDistance": "Markørdistance",
            "averageAPM": "Inputs/min",
            "maxAPM": "Inputs/min (Max)",
            "events": "Begivenheder",
            "eventTypes": "Begivenheder"
        };
        let dataPointDescriptions = {
            "minTime": "Første event modtaget",
            "maxTime": "Sidste event modtaget",
            "timeSpent": "Samlet tid brugt",
            "subsessions": "Besøgte undersider ialt",
            "averagePointerSpeed": "Gennemsnitlig hastighed i pixels",
            "maxPointerSpeed": "Maksimal hastighed i pixels",
            "pointerDistance": "Samlet antal pixels tilbagelagt",
            "averageAPM": "Gennemsnitligt antal per minut",
            "maxAPM": "Maksimalt antal per minut",
            "events": "Samlet antal datapunkter",
            "eventTypes": "Datapunkter fordelt på type"
        };
        
        if (window.cotinkerConfig && window.cotinkerConfig.language && window.cotinkerConfig.language === "en"){
            dataPointNames = {
                "minTime": "Start",
                "maxTime": "End",
                "timeSpent": "Time Used",
                "subsessions": "Pageviews",
                "averagePointerSpeed": "Average Pointer Speed",
                "maxPointerSpeed": "Pointer Speed (Max)",
                "pointerDistance": "Pointer Distance",
                "averageAPM": "Inputs/min",
                "maxAPM": "Inputs/min (Max)",
                "events": "Events",
                "eventTypes": "Events"
            };
            dataPointDescriptions = {
                "minTime": "First event received",
                "maxTime": "Last event received",
                "timeSpent": "Total time spent",
                "subsessions": "Number of subpages visited",
                "averagePointerSpeed": "Average speed in pixels",
                "maxPointerSpeed": "Maximal speed in pixels",
                "pointerDistance": "Total distance travelled in pixels",
                "averageAPM": "Average number per minute",
                "maxAPM": "Maximal number of actions per minute",
                "events": "Total number of events",
                "eventTypes": "Events overview per type"
            };
        }

        let indices = Object.keys(dataPointNames);
        let header = headerTemplate.cloneNode(true);

        // One row for each data point
        let tableBody = document.createElement("tbody");
        let rows = {};
        indices.forEach(index => {
            rows[index] = rowTemplate.cloneNode(true).firstElementChild;
            console.debug("it is", rowTemplate.cloneNode(true), rows[index]);
            rows[index].querySelector(".title").innerText = dataPointNames[index] ? dataPointNames[index] : index;
            rows[index].querySelector(".description").innerText = dataPointDescriptions[index] ? dataPointDescriptions[index] : "";
            tableBody.appendChild(rows[index]);
        });

        let cellValue = function (row) {
            let cell = cellTemplate.cloneNode(true).firstElementChild;
            rows[row].appendChild(cell);
            return cell.querySelector(".value");
        }

        let seed = parseInt(target.getAttribute("data-seed"));
        let random = mulberry32(seed);
        let students = Array.from(document.querySelectorAll("assignment code-fragment.studentdata[student]"));
        students = students.map((student) => {
            return {
                random: random(),
                student: student
            };
        });
        students.sort((s1, s2) => {
            return s1.random - s2.random;
        });
        students = students.map((student) => {
            return student.student
        });

        // Fetch tracking data
        let uberTracker = await getUberTracker();
        for (const fragment of students) {
            console.debug("Building for ", fragment);
            let json = await Fragment.one(fragment).require();

            if (!json.ubertracked) {
                console.warn("Tracking weirdness detected --- weird");
                continue;
            }

            // Add to header
            let headerCell = headerCellTemplate.cloneNode(true);
            headerCell.querySelector(".student").innerText = fragment.getAttribute("student");
            let ourName = getStudentName();
            if (ourName === fragment.getAttribute("student")) {
                cQuery(headerCell.querySelector(".student")).addTransientClass("self");
            }
            header.querySelector("tr").appendChild(headerCell);


            // Prepare stats info
            let output = {};
            for (let subsession of json.ubertracked){
                let statistics = await uberTracker.getStatistics(subsession.subsession);

                // Calculate pointer distance
                let moves = await uberTracker.getEventsFromSubsession(subsession.subsession, {types: ["pointermove"]});
                let distance = 0;
                if (moves && moves.length > 0) {
                    let currentX = moves[0].data.x;
                    let currentY = moves[0].data.y;
                    for (let move of moves) {
                        distance += Math.sqrt((Math.pow(currentX - move.data.x, 2)) + (Math.pow(currentY - move.data.y, 2)));
                        currentX = move.data.x;
                        currentY = move.data.y;
                    }
                }
                statistics.pointerDistance = distance;
                statistics.subsessions = 1;

                for (let [index, value] of Object.entries(statistics)) {
                    switch (index){
                        case "minTime": 
                            if (!output[index]){
                                output[index] = value;
                            } else {
                                output[index] = Math.min(value, output[index]);
                            }
                            break;
                        case "maxTime":
                        case "maxPointerSpeed":
                        case "maxAPM":
                            if (!output[index]){
                                output[index] = value;
                            } else {
                                output[index] = Math.max(value, output[index]);
                            }
                            break;         
                        case "eventTypes":
                            if(output[index] == null) {
                                output[index] = {};
                            }
                            Object.keys(value).forEach((type)=>{
                                if(output[index][type] == null) {
                                    output[index][type] = 0;
                                }

                                output[index][type] += value[type];
                            });

                            break
                        default:
                            if (!output[index]){
                                output[index] = value;
                            } else {
                                output[index] += value;
                            }
                    }
                }
            }

            // Add stats info to rows
            for (let [index, value] of Object.entries(output)) {
                if (rows[index]) {
                    if (index === "averagePointerSpeed" || index==="averageAPM"){
                        value /= json.ubertracked.length;
                    }
                    if (index === "minTime" || index === "maxTime") {
                        value = new Date(parseInt(value));
                    }
                    if (index === "averagePointerSpeed" || index === "maxPointerSpeed") {
                        try {
                            value = value.toFixed(1) + " pixels/s";
                        } catch(e) {
                            // Ignore
                        }
                    }
                    if (index === "pointerDistance") {
                        try {
                            value = Math.floor(value) + " pixels";
                        } catch (e){
                            // ignore
                        }
                    }

                    if(index === "eventTypes") {
                        //Pass along
                    }

                    renderValueInto(value, cellValue(index));
                }
            }

            // TODO: Calc inactive time

            // Calc timeSpent
            if (output.minTime && output.maxTime) {
                renderValueInto(((parseInt(output.maxTime) - parseInt(output.minTime)) / 1000) + "s", cellValue("timeSpent"));
            }
        }

        // Combine it all
        table.appendChild(header);
        table.appendChild(tableBody);
        target.innerHTML = "";
        target.appendChild(table);

        //Enable reveal mechanic
        let revealInput = target.querySelector("input.reveal");
        revealInput.addEventListener("change", () => {
            if (revealInput.checked) {
                table.querySelectorAll(".comparison-table th .student").forEach((student) => {
                    cQuery(student).removeTransientClass("anonymous");
                });
            } else {
                table.querySelectorAll(".comparison-table th .student").forEach((student) => {
                    cQuery(student).addTransientClass("anonymous");
                });
            }
        });
    };
    
    target.comparisonTable = this;
    autoRenderOnChange(target);
}

function embedNavigationTable(target, options={}){

    let defaultOptions = {
        showExternalNavigation: true,
        showWindowBlur: false
    }

    options = Object.assign({}, defaultOptions, options);

    this.render = async function renderUberTrackerStatisticsTable() {
        console.debug("Building UberTracker navigation table");
        
        let rowTemplate = document.querySelector("#comparison-row").content;
        let cellTemplate = document.querySelector("#comparison-cell").content;        
        let table = document.createElement("table");
        let tableBody = document.createElement("tbody");
        
        let uberTracker = await getUberTracker();
        await uberTracker.ready();
        
        // Create navigator for each student
        let students = Array.from(document.querySelectorAll("assignment code-fragment.studentdata[student]"));
        for (const fragment of students) {
            console.debug("Building for ", fragment);
            let json = await Fragment.one(fragment).require();

            if (!json.ubertracked) {
                console.warn("Tracking weirdness detected --- weird");
                continue;
            }            

            let eventsToRender = ["navigation", "unload"];

            if(options.showWindowBlur) {
                eventsToRender.push(...["windowfocus", "windowblur"]);
            }

            // Find the sessions
            let subsessions = await Promise.all(json.ubertracked.map(async (subsession)=>{
                return {
                    id: subsession.subsession,
                    url: subsession.data.url,
                    events: await uberTracker.getEventsFromSubsession(subsession.subsession, {types: eventsToRender}),
                    stats: await uberTracker.getStatistics(subsession.subsession)
                };
            }));

            subsessions = subsessions.filter((s)=>{
                return s.stats.minTime != null && s.stats.maxTime != null;
            });

            subsessions.sort((s1, s2)=>{
                return s1.stats.minTime - s2.stats.minTime;
            });

            // Helper functions for drawing D3 stuff
            function findNavigationTarget(time, url) {
                let relative = true;
                if (url != null && (url.startsWith("http") || url.startsWith("//"))){
                    relative = false;
                }

                return subsessions.find((subsession)=>{
                    //Skip already used subsessions
                    if(subsession.used) {
                        return false;
                    }

                    let subsessionUrl = subsession.url;
                    if(relative) {
                        subsessionUrl = subsessionUrl.substring(subsessionUrl.lastIndexOf("/")+1);
                    }

                    if(url == null || subsessionUrl === url) {
                        let timeDiff = Math.abs(subsession.stats.minTime - time);

                        if(timeDiff < 2000) {
                            return true;
                        }
                    }

                    return false;
                });
            }


            function createExternalNavigationNode(navigation){
                let subsessionNode = {
                    name: navigation.data.url,
                    class: "externalNavigation",
                    navigation: navigation,      
                    time: navigation.time,
                    children: []
                };
                return subsessionNode;
            }

            function createNavigationNode(subsession) {
                let name = subsession.url.trim();
                if(name.endsWith("/")) {
                    name = name.substring(0, name.length-1);
                }
                name = name.substring(name.lastIndexOf("/"));

                let navigationNode = {
                    name: name,
                    subsession: subsession,
                    time: subsession.stats.minTime,
                    children: [],
                    class: "navigation"
                };

                renderSubsession(navigationNode, subsession);

                return navigationNode;
            }

            function createUnloadNode(subsession, unload) {
                //Check for any navigation event, close to the unload event
                let foundNavigation = subsession.events.find((evt)=>{
                    if(evt.type !== "navigation") {
                        return false;
                    }

                    return Math.abs(evt.time-unload.time) < 1000;
                });

                if(foundNavigation == null) {
                    //An unload exists with no close navigation, try to find target subsession
                    let navigationTarget = findNavigationTarget(unload.time, null);
                    if(navigationTarget != null) {
                        //lastNavigationSeen = Math.max(lastNavigationSeen, unload.time);
                        return createNavigationNode(navigationTarget);
                    }
                }

                return null;
            }

            function createCustomNode(name, className, time) {
                let customNode = {
                    name: name,
                    class: className,
                    time: time,
                    children: []
                };

                return customNode;
            }

            function handleUnloadEvent(subsession, event) {
                return createUnloadNode(subsession, event);
            }

            function handleNavigationEvent(subsession, event) {
                let target = findNavigationTarget(event.time, event.data.url);
                if(target != null) {
                    return createNavigationNode(target);
                } else if (options.showExternalNavigation){
                    return createExternalNavigationNode(event);
                }
                return null;
            }

            function handleWindowBlurEvent(subsession, event) {
                return createCustomNode("Blur", "blur", event.time);
            }

            function handleWindowFocusEvent(subsession, event) {
                return createCustomNode("Focus", "focus", event.time);
            }

            function renderSubsession(parentNode, subsession) {
                console.debug("Looking at:", subsession);
                subsession.used = true;

                subsession.events.sort((e1, e2)=>{
                    return e1.time - e2.time;
                });

                let currentNode = parentNode;

                let lastNavigationTime = 0;

                //Now render each event inside this subsession
                subsession.events.forEach((event)=>{
                    let nodeToAdd = null;
                    switch(event.type) {
                        case "unload": {
                            let navigationNode = handleUnloadEvent(subsession, event);
                            if (navigationNode != null) {
                                lastNavigationTime = event.time;
                                currentNode.children.push(navigationNode);
                            }
                            break;
                        }

                        case "navigation": {
                            let navigationNode = handleNavigationEvent(subsession, event);
                            if (navigationNode != null) {
                                lastNavigationTime = event.time;
                                currentNode.children.push(navigationNode);
                            }
                            break;
                        }

                        case "windowblur": {
                            nodeToAdd = handleWindowBlurEvent(subsession, event);
                            break;
                        }

                        case "windowfocus": {
                            nodeToAdd = handleWindowFocusEvent(subsession, event);
                            break;
                        }

                        default:
                            console.log("Unhandled event:", event);
                    }

                    if(nodeToAdd != null) {
                        currentNode.children.push(nodeToAdd);
                        currentNode = nodeToAdd;
                    }
                });

                if(subsession.stats.maxTime - lastNavigationTime > 2000) {
                    //Add close event
                    let closeNode = createCustomNode("Closed", "closed", subsession.stats.maxTime);
                    currentNode.children.push(closeNode);
                }
            }
            
            // Build the graph
            console.debug("Loading subsession explorer for: ", subsessions);
            if(subsessions.length === 0) {
                console.warn("No subsessions found!");
                continue;
            }

            let data = {"name": "Start", "children": [], "class": "root"};
            let subsessionNode = createNavigationNode(subsessions[0]);
            data.children.push(subsessionNode);
            let chart = Tree(data, {
                label: (d, n) => {
                    return options.labelMapper?options.labelMapper(d,n):d.name;
                },
                title: (d,n) => {
                    return d.name;
                },
                onClick: async (d, n) => {
                    if (options.clickHandler) options.clickHandler(d,n);
                },
                className: (d,n) => {
                    if(d.class != null) {
                        return d.class;
                    }
                    return "";
                },
                width: 1000,
                nodeHeight: 50,
                r: 5
            });
            
            
            // Insert into row
            let row = rowTemplate.cloneNode(true);
            row.querySelector(".title").innerText = fragment.getAttribute("student");
            row.querySelector(".description").innerText = "";
            let cell = cellTemplate.cloneNode(true);
            cell.querySelector(".value").appendChild(chart);
            chart.classList.add("d3navigator");

            row.querySelector("tr").appendChild(cell);
            tableBody.appendChild(row);
        }

        // Combine it all
        table.appendChild(tableBody);
        target.innerHTML = "";
        target.appendChild(table);
    };
    
    target.comparisonTable = this;
    autoRenderOnChange(target);
}

function autoRenderOnChange(target){
    // Don't redraw too often if many clients join simultaneously
    let redrawTimer;
    function renderTable(){
        clearTimeout(redrawTimer);
        redrawTimer = setTimeout(()=>{
            target.comparisonTable.render();
        }, 100);
    }

    // Setup observers/callbacks to redraw when new people join or when existing fragments are updated with new info
    renderTable();
    let liveData = new LiveElement("assignment code-fragment.studentdata[student]");
    liveData.forEach(data=>{
        renderTable();
        setTimeout(()=>{
            Fragment.one(data).registerOnFragmentChangedHandler(()=>{
                renderTable();
            });
        },0);
    });
}



/** Renders an iframe+svg combo with input events **/
async function renderEventVisualizer(subsession){
    let tracker = await getUberTracker();

    let svg = await tracker.visualizeSubsession(subsession.id, {
        drag: {
            strokeDash: "4"
        }
    });

    let svgWidth = parseFloat(svg.getAttribute("width"));
    let svgHeight = parseFloat(svg.getAttribute("height"));

    let theDIV = document.createElement("div");
    theDIV.classList.add("visualizer");

    let noTrackParam = "track=false";
    if(subsession.url.indexOf("?") === -1){
        noTrackParam = "?"+noTrackParam;
    } else {
        noTrackParam = "&"+noTrackParam;
    }

    let iframe = document.createElement("iframe");
    iframe.src = subsession.url + noTrackParam;

    iframe.width = svgWidth;
    iframe.height = svgHeight;

    let scroller = document.createElement("div");
    scroller.appendChild(iframe);
    scroller.appendChild(svg);
    scroller.classList.add("scroll");
    theDIV.appendChild(scroller);

    function resizeSVG() {
        let containerBounds = scroller.getBoundingClientRect();

        let widthRatio = containerBounds.width / svgWidth;

        svg.style.transform = "scale("+widthRatio+")";
        svg.style.transformOrigin = "top left";

        iframe.style.transform = "scale("+widthRatio+")";
        iframe.style.transformOrigin = "top left";
    }

    let observer = new ResizeObserver((evt)=>{
        resizeSVG();
    });

    observer.observe(scroller);
    theDIV.setAttribute("tabindex", 0);
    return theDIV;
}

/** A textual list of timestamps+events **/
async function renderEventLog(subsession, options={}){
    const DRAG_MIN_DISTANCE = 10;

    //Create UberTracker
    let tracker = await getUberTracker();

    //Fetch some events
    let events = await tracker.getEventsFromSubsession(subsession.id, options);

    const GROUPS = {
        "OTHER": 1,
        "INPUT": 2,
        "KEYBOARD": 3,
        "MOUSE": 4,
        "FOCUS": 5,
        "HOVER": 6,
        "NAVIGATE": 7
    }

    let items = new vis.DataSet();
    let groups = new vis.DataSet([
        //{id: GROUPS.OTHER, content: "other", order: 10},
        {id: GROUPS.FOCUS, content: "Focus", order: 15},
        {id: GROUPS.HOVER, content: "Hover", order: 18},
        {id: GROUPS.MOUSE, content: "Mouse", order: 20},
        {id: GROUPS.NAVIGATE, content: "Navigate", order: 25},
        //{id: GROUPS.KEYBOARD, content: "keyboard", order: 30},
        //{id: GROUPS.INPUT, content: "input", order: 40},
    ]);

    let min = 99999999999999;
    let max = 0;

    let lastWindowBlurEvent = null;
    let lastPointerDownEvent = null;
    let justDragged = false;
    let pointerOverMap = new Map();
    let inputMap = new Map();
    let elementFocusMap = new Map();

    let lastId = -1;

    function getTagsString(event) {
        let result = "";
        if(event.data?.tags?.length > 0) {
            let tags = [];

            event.data.tags.forEach((tag)=>{
                if(event.data?.elementTags?.indexOf(tag) !== -1) {
                    tags.push("<b>"+tag+"</b>");
                } else {
                    tags.push(tag);
                }
            });

            result += " ["+tags+"]";
        }

        return result;
    }

    function addItem(event, overrideOptions) {
        lastId++;

        let item = {
            id: lastId,
            content: event.type,
            type: "point",
            title: "",
            start: new Date(event.time),
            group: GROUPS.OTHER,
            className: event.type
        };

        if(overrideOptions.start != null) {
            overrideOptions.start = new Date(overrideOptions.start);
        }

        if(overrideOptions.end != null) {
            overrideOptions.end = new Date(overrideOptions.end);
        }

        if(overrideOptions.tooltip != null) {
            overrideOptions.title = overrideOptions.tooltip;
            delete overrideOptions.tooltip;
        }

        Object.assign(item, overrideOptions);

        if(item.content != null) {
            item.content = item.content.charAt(0).toUpperCase() + item.content.slice(1);
        }

        item.title += getTagsString(event);

        items.add(item);
    }

    events.forEach((event, index)=>{
        if(event.data.tags != null && event.data.elementTags == null) {
            //Simulate new elementTags
            event.data.elementTags = event.data.tags;
        }

        if(event.type === "pointerdown") {
            lastPointerDownEvent = event;
            justDragged = false;
        } else if(event.type === "windowblur") {
            lastWindowBlurEvent = event;
        } else if(event.type === "pointerover") {
            let key = event.data.path;
            pointerOverMap.set(key, event);
        } else if(event.type === "elementfocus") {
            let key = event.data.path;
            elementFocusMap.set(key, event);
        } else if(event.type === "pointerup") {

            //Define small distance where it is not a drag
            let distance = Math.sqrt(Math.pow(event.data.x - lastPointerDownEvent.data.x, 2) + Math.pow(event.data.y - lastPointerDownEvent.data.y, 2));

            if(distance > DRAG_MIN_DISTANCE) {
                addItem(event, {
                    type: "range",
                    content: "drag",
                    start: lastPointerDownEvent.time,
                    end: event.time,
                    tooltip: "Distance: "+distance+"px",
                    group: GROUPS.MOUSE,
                    className: "drag"
                });

                justDragged = true;
            }
        } else if(event.type === "windowfocus") {
            let blurStart = min;
            if(lastWindowBlurEvent != null) {
                blurStart = lastWindowBlurEvent.time;
            }
            addItem(event, {
                type: "background",
                content: "unfocused",
                start: blurStart,
                end: event.time,
                group: null,
                className: "unfocused"
            });
        } else if(event.type === "click") {
            if(!justDragged) {
                addItem(event, {
                    tooltip: "("+event.data.x+", "+event.data.y+")",
                    group: GROUPS.MOUSE
                });
            }
        } else if(event.type === "windowresize") {
            /*
            addItem(event, {
                tooltip: "("+event.data.width+"x"+event.data.height+")",
                group: GROUPS.OTHER
            });
             */
        } else if(event.type === "pointerout") {
            let key = event.data.path;
            let pointerOverEvent = pointerOverMap.get(key);
            pointerOverMap.delete(key);

            if(pointerOverEvent != null) {
                addItem(event, {
                    content: getTagsString(event),
                    type: "range",
                    start: pointerOverEvent.time,
                    end: event.time,
                    group: GROUPS.HOVER
                });
            }
        } else if(event.type === "elementblur") {
            let key = event.data.path;
            let elementFocusEvent = elementFocusMap.get(key);
            elementFocusMap.delete(key);

            if(elementFocusEvent != null) {
                addItem(event, {
                    content: getTagsString(event),
                    type: "range",
                    start: elementFocusEvent.time,
                    end: event.time,
                    group: GROUPS.FOCUS
                });
            }
        } else if(event.type === "keyup" || event.type === "keydown") {
            if(event.data.keyCode != null) {
                /*
                addItem(event, {
                    content: event.type+": "+window.keyboardMap[event.data.keyCode],
                    group: GROUPS.KEYBOARD
                });
                 */
            }
        } else if(event.type === "input") {
            inputMap.set(event.data.path, event);
        } else if(event.type === "actionsperminute") {
            /*
            addItem(event, {
                content: "apm: "+event.data.apm
            });
             */
        } else if(event.type === "pointerspeed") {
            /*
            addItem(event, {
                content: "speed: "+event.data.speed.toFixed(0)+"px/sek"
            });
             */
        } else if(event.type === "navigation") {
            addItem(event, {
                content: "navigate",
                title: event.data.url,
                group: GROUPS.NAVIGATE
            });
        } else {
            console.debug("Unhandled event:", event);
        }

        min = Math.min(min, event.time);
        max = Math.max(max, event.time);
    });

    pointerOverMap.forEach((pointerOverEvent)=>{
        addItem(pointerOverEvent, {
            group: GROUPS.MOUSE
        });
    });

    /*
    inputMap.forEach((inputEvent)=>{
        addItem(inputEvent, {
            content: "input",
            tooltip: "Value: "+inputEvent.data.value,
            group: GROUPS.INPUT
        });
    });
     */

    let container = document.createElement("div");
    container.classList.add("viz-timeline");

    let timeline = new vis.Timeline(container, items, {
        min: new Date(min - 1000),
        max: new Date(max + 1000),
        zoomMin: 1000 * 5,
        zoomMax: 1000 * 60,
        start: new Date(min - 1000),
        end: new Date(max + 1000),
        minHeight: 100,
        maxHeight: 1000,
        orientation: "top",
        selectable: false,
        order: (i1, i2)=>{
            return i1.start - i2.start;
        },
        format: {
            minorLabels: (date, scale, step)=>{
                if(scale === "millisecond") {
                    return parseInt(date.format("SSS")) + "ms";
                } else if(scale === "second") {
                    return parseInt(date.format("ss"))+"s";
                } else if(scale === "minute") {
                    return parseInt(date.format("mm"))+"m";
                } else if(scale === "hour") {
                    return parseInt(date.format("HH"))+"t";
                }

                return "Unhandled!";
            },
            majorLabels: (date, scale, step)=>{
                if(scale === "millisecond") {
                    return date.format("HH:mm:ss");
                } else if(scale === "second") {
                    return date.format("HH:mm");
                } else if(scale === "minute") {
                    return date.format("HH");
                } else if(scale === "hour") {
                    return date.format("MMMM Do YYYY");
                }

                return "Unhandled!";
            }
        }

    });

    timeline.setGroups(groups);

    return container;
}

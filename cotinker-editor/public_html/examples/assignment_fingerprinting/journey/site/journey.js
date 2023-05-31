// Request WPMv2 from GitHub
const request = new XMLHttpRequest();
request.open('GET', 'https://raw.githubusercontent.com/Webstrates/WPM/master/WPMv2.js', false);
request.send(null);
if(!(request.status===200)) throw new Error("Cannot load WPMv2");
eval(request.responseText);

// Start UberTracker
async function startTracking() {
    WPMv2.registerRepository("wpm_js_libs", "https://raw.githubusercontent.com/Webstrates/WebstrateLibraryRepository/master/libraries.html");
    await WPMv2.require({"repository": "wpm_js_libs", "package": "UberTracker"});

    let tracker = new UberTracker();
    await tracker.ready();

    AddAdder.tracker = tracker;

    const urlParams = new URLSearchParams(location.search);

    if (urlParams.get("track") !== "false") {
        tracker.startTracking();
    } else {
        console.log("Skipping tracking!");
    }

    //Define ads map, of tag to ads
    let ads = {
        "frivillig": [
            "<a href='https://headspace.dk/' target='_blank' data-tag='reklame-frivillig-headspace'><img src='frivillig1.png'></a>",
            "<a href='https://www.ms.dk/' target='_blank' data-tag='reklame-frivillig-samvirke'><img src='frivillig2.png'></a>",
            "<a href='https://www.girltalk.dk/' target='_blank' data-tag='reklame-frivillig-girltalk'><img src='frivillig3.png'></a>",
            "<a href='https://exis.dk/' target='_blank' data-tag='reklame-frivillig-exis'><img src='frivillig4.png'></a>"
        ],
        "udlandsstudier": [
            "<a href='https://www.toronto.com/' target='_blank' data-tag='reklame-studier-toronto'><img src='studier1.png'></a>",
            "<a href='http://studer.dk' target='_blank' data-tag='reklame-studier-studer'><img src='studier3.png'></a>",
            "<a href='http://ud.dk' target='_blank' data-tag='reklame-studier-ud'><img src='studier4.png'></a>"
        ],
        "hiking": [
            "<a href='http://tryit.dk' target='_blank' data-tag='reklame-hiking-tryit1'><img src='hiking1.png'></a>",
            "<a href='http://tryit.dk' target='_blank' data-tag='reklame-hiking-tryit2'><img src='hiking2.png'></a>",
            "<a href='http://hike.com' target='_blank' data-tag='reklame-hiking-hike'><img src='hiking3.png'></a>",
            "<a href='http://goforit.com' target='_blank' data-tag='reklame-hiking-goforit'><img src='hiking4.png'></a>"
        ],
        "sport": [
            "<a href='http://tryit.dk' target='_blank' data-tag='reklame-sport-tryit'><img src='sport1.png'></a>",
            "<a href='http://sporting.com' target='_blank' data-tag='reklame-sport-sporting'><img src='sport2.png'></a>",
            "<a href='http://vand.dk' target='_blank' data-tag='reklame-sport-vand'><img src='sport4.png'></a>"
        ],
        "højskole": [
            "<a href='http://tryit.dk' target='_blank' data-tag='reklame-højskole-tryit'><img src='hskole1.png'></a>",
            "<a href='http://together.com' target='_blank' data-tag='reklame-højskole-together1'><img src='hskole2.png'></a>",
            "<a href='http://together.com' target='_blank' data-tag='reklame-højskole-together2'><img src='hskole3.png'></a>"
        ],
        "koncert": [
            "<a href='http://hearme.com' target='_blank' data-tag='reklame-koncert-hearme1'><img src='koncert1.png'></a>",
            "<a href='http://hearme.com' target='_blank' data-tag='reklame-koncert-hearme2'><img src='koncert2.png'></a>",
            "<a href='http://listen.dk' target='_blank' data-tag='reklame-koncert-listen'><img src='koncert3.png'></a>",
            "<a href='http://hearme.com' target='_blank' data-tag='reklame-koncert-hearme3'><img src='koncert4.png'></a>"
        ],
        "no-match": [
            "<a href='hvemervi.htm' target='_blank' data-tag='reklame-generelt-afslappende'><img src='generelt10.jpg'></a>"
        ]
    };

    //Go through all elements with class ".ad" and insert ads
    for(let adContainer of document.querySelectorAll(".ad")) {
        await AddAdder.embedAd(adContainer, ads);
    }
}
startTracking();

// Serve ads
class AddAdder {
    static async embedAd(adContainer, adMap) {
        if(AddAdder.cachedNavigationEvent == null) {
            //Find subsession from today
            let subsessions = await AddAdder.tracker.getSubsessions();

            console.log("Subsessions total:", subsessions);

            let subsessionsToday = subsessions.filter((subsession)=>{
                let today = new Date();
                let subsessionCreated = new Date(subsession.data.time);

                return today.getDate() == subsessionCreated.getDate() && today.getMonth() == subsessionCreated.getMonth() && today.getFullYear() == subsessionCreated.getFullYear();
            });
            console.log("Subsessions from today:", subsessionsToday);

            //Find first navigation event with tags
            let foundNavigation = null;

            let allowedTags = [
                "højskole",
                "koncert",
                "hiking",
                "sport",
                "udlandsstudier",
                "frivillig"
            ];

            for(let subsession of subsessionsToday) {
                let navigationEvents = await AddAdder.tracker.getEventsFromSubsession(subsession.subsession, {
                    types: ["navigation"]
                });

                for(let event of navigationEvents) {
                    let foundAllowedTag = false;
                    for(let allowedTag of allowedTags) {
                        if(event.data.tags?.indexOf(allowedTag) > -1) {
                            foundAllowedTag = true;
                            break;
                        }
                    }

                    if(foundAllowedTag) {
                        foundNavigation = event;
                        break;
                    }
                }

                if(foundNavigation != null) {
                    break;
                }
            }

            console.log("Found navigation:", foundNavigation);

            AddAdder.cachedNavigationEvent = foundNavigation!=null?foundNavigation:{data:{tags:[]}};
        }

        let foundTag = "no-match";

        for(let tag of AddAdder.cachedNavigationEvent.data.tags) {
            if(adMap.hasOwnProperty(tag)) {
                foundTag = tag;
                break;
            }
        }

        let ads = adMap[foundTag];

        let randomAdIndex = Math.floor(Math.random() * ads.length);

        adContainer.innerHTML = ads[randomAdIndex];
    }
}
AddAdder.tracker = null;

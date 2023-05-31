// Request WPMv2 from GitHub
const request = new XMLHttpRequest();
request.open('GET', 'https://raw.githubusercontent.com/Webstrates/WPM/master/WPMv2.js', false);
request.send(null);
if(!(request.status===200)) throw new Error("Cannot load WPMv2");
eval(request.responseText);

//Start UberTracker
async function startTracking() {
    WPMv2.registerRepository("wpm_js_libs", "https://raw.githubusercontent.com/Webstrates/WebstrateLibraryRepository/master/libraries.html");
    await WPMv2.require({"repository": "wpm_js_libs", "package": "UberTracker"});

    let tracker = new UberTracker();
    await tracker.ready();

    const urlParams = new URLSearchParams(location.search);

    if (urlParams.get("track") !== "false") {
        tracker.startTracking();
    } else {
        console.log("Skipping tracking!");
    }
}

// Fetch templates into document
async function getTemplates(){
    let templates = document.createElement("templates");
    templates.innerHTML = await (await fetch( 'templates.html' )).text();
    document.head.appendChild(templates);
    
    // Insert all relevant templates automagically    
    document.body.prepend(document.querySelector("#header").content.cloneNode(true));
    document.querySelectorAll("[template]").forEach(target=>{
        let templateClone = document.querySelector("#"+target.getAttribute("template")).content.cloneNode(true);
        target.replaceWith(templateClone);
    });
}

function setupLinks() {
    document.querySelectorAll("[data-link]").forEach((elm)=>{
        let url = elm.getAttribute("data-link");
        elm.addEventListener("click", (evt)=>{
            if(evt.ctrlKey) {
                window.open(url, "_BLANK");
            } else {
                window.open(url, "_SELF");
            }
        });
    });
}

function discoverActivePage() {
    let fileName = location.pathname.substring(location.pathname.lastIndexOf("/")+1);
    fileName = fileName.substring(0, fileName.indexOf(".html"));

    let topPageCategory = fileName.split("-")[0];

    let topMenuElm = document.querySelector(".topmenu [data-link*='"+topPageCategory+"']");
    let subMenuElm = document.querySelector(".subheader [data-link*='"+fileName+"']");

    console.log(topMenuElm, subMenuElm);

    if(topMenuElm != null) {
        topMenuElm.classList.add("active");
    }
    if(subMenuElm != null) {
        subMenuElm.classList.add("active");
    }
}

function setupQuiz() {
    document.querySelectorAll(".multiple-choice").forEach((questionnaire)=>{
        questionnaire.querySelectorAll(".question").forEach((question)=>{
            let form = question.nextElementSibling;
            let correctAnswerText = question.getAttribute("data-answer").toLowerCase().trim();

            let answers = Array.from(form.querySelectorAll("label"));
            let correctAnswerLabel = answers.find((answer)=>{
                return answer.textContent.toLowerCase().trim() === correctAnswerText;
            });

            function checkAnswer(answer) {
                answers.forEach((elm)=>{
                    elm.classList.remove("correct");
                    elm.classList.remove("wrong");
                });

                if(answer === correctAnswerLabel) {
                    //Correct
                    answer.classList.add("correct");
                } else {
                    //Wrong!
                    answer.classList.add("wrong");
                    correctAnswerLabel.classList.add("correct");
                }
            }

            answers.forEach((answer)=>{
                answer.querySelector("input").addEventListener("click", (evt)=>{
                    checkAnswer(answer);

                    localStorage.setItem(question.textContent, answer.textContent);
                });
            });

            //Load saved answer
            let savedAnswer = localStorage.getItem(question.textContent);
            if(savedAnswer != null) {
                let savedAnswerLabel = answers.find((answer) => {
                    return answer.textContent.toLowerCase().trim() === savedAnswer.toLowerCase().trim();
                });

                if(savedAnswerLabel != null) {
                    savedAnswerLabel.querySelector("input").click();
                }
            }
        });
    });
}

async function init() {
    await getTemplates();

    setupLinks();

    discoverActivePage();

    setupQuiz();

    await startTracking();
}

init();

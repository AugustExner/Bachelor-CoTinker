function toggle() {
    var content = document.getElementById("content");
    if (content.style.display === "none") {
      content.style.display = "block";
    } else {
      content.style.display = "none";
    }
    console.log("hej jeg er en knap42")
}

exports.toggle = toggle;
function toggleDiv() {
  var div1 = document.getElementById("div1");
  var div2 = document.getElementById("div2");
  var p = document.getElementById("papa");
  var s = document.getElementById("sss");

  if (div1.style.display !== "none") {
    div1.style.display = "none";
    p.style.display = "none";
    div2.style.display = "block";
    s.style.display = "block";
  } else {
    div1.style.display = "block";
    p.style.display = "block";
    s.style.display = "none";
    div2.style.display = "none";

  }
}



function toggleImage() {
  var img = document.getElementById("myImg");
  if (img.style.display === "none") {
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }
}

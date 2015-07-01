var TouchEvents = {
    click: "ontouchstart" in window ? "touchstart" : "click",
    move: "ontouchstart" in window ? "touchmove" : "mousemove",
    start: "ontouchstart" in window ? "touchstart" : "mousedown",
    end: "ontouchstart" in window ? "touchend" : "mouseup"
};

// ------------- START Add event on tab header
document.getElementsByClassName('tab-header')[0].addEventListener(TouchEvents.click, function(e){
   var target = e.target;
    if(!e.target.classList.contains("current") && e.target.classList.contains("table-title")){
        Array.prototype.forEach.call(document.querySelectorAll(".table-title, .tab"), function(elt, index){
            elt.classList.remove("current");
        });
        target.classList.add("current");
        document.getElementsByClassName(target.getAttribute('data-tab'))[0].classList.add('current');
    }
});


// ------------- END Add event on tab header

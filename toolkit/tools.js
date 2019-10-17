
'use strict'


function createWellList (element,wellList){
	var select = document.getElementById(element); 
	var options = wellList;

	for(var i = 0; i < options.length; i++) {
	  var opt = options[i];
	  var el = document.createElement("option");
	  el.textContent = opt;
	  el.value = opt;
	  select.appendChild(el);
	}
}





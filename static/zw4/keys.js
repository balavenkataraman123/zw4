var divisDownKeys = {};
var mouseDown = false;

var arrowKeySensitivity = 20;
function onKeyDown(event) {
	var keyCode = event.code;
	if (true) {
		divisDownKeys[keyCode] = true;
		if (keyCode == "Digit6") {
			showDebug = !showDebug;
		}
		if (keyCode == "KeyB") {
			IHP.drawLines = !IHP.drawLines;
		}
	}
}
function onKeyUp(event) {
	keyCode = event.code;
	divisDownKeys[keyCode] = false;
}
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
function processArrowKeys() {
	if (divisDownKeys["ArrowUp"]) {onCameraTurn({movementX: 0, movementY: -arrowKeySensitivity});}
	if (divisDownKeys["ArrowDown"]) {onCameraTurn({movementX: 0, movementY: arrowKeySensitivity});}
	if (divisDownKeys["ArrowLeft"]) {onCameraTurn({movementX: -arrowKeySensitivity, movementY: 0});}
	if (divisDownKeys["ArrowRight"]) {onCameraTurn({movementX: arrowKeySensitivity, movementY: 0});}
}

addEventListener("mousedown", function() {mouseDown = true;});
addEventListener("mouseup", function() {mouseDown = false;});

setInterval(processArrowKeys, 20);

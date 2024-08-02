var downKeys = {};

window.onkeydown = function(e) {
    downKeys[e.code] = true;
    if (e.code == "KeyW" ) {
        Body.applyForce(player.matter, player, {x: 0, y: -0.4});
    }
}

window.onkeyup = function(e) {
    downKeys[e.code] = false;
}
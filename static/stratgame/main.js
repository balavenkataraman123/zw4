var cw=0, ch=0, canvas, ctx, player, gameObjects = [];
var playerLevel = 1; var maxLevel = 1; var le;
// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Body = Matter.Body,
    Collision = Matter.Collision,
    Vector = Matter.Vector;

var engine = Engine.create();
var wall;
var imgurls = ["brick.png", "dont touch.png", "finish.png", "player.png"];
var imgs = {};
var patterns = {};
var online = false;

window.onload = function() {
    console.log("window.onload called");

    canvas = document.getElementById("canv");
    canvas.width = parseInt(
        document.defaultView.getComputedStyle(canvas, "wot do i put here").width.replace("px", ""), 10);
    canvas.height = parseInt(
        document.defaultView.getComputedStyle(canvas, "wot do i put here").height.replace("px", ""), 10);
    cw = canvas.width; ch = canvas.height;
    ctx = canvas.getContext("2d");
    wall = Bodies.rectangle(0, ch-10, cw, 100, { isStatic: true });
    for (var url of imgurls) {
        imgs[url] = new Image();
        imgs[url].src = "/static/stratgame/png/" + url;
        var u = "";
        for (var x of url) {u += x;}
        imgs[url].onload = function() {
            var name = this.src.slice(((online?"https://zombiewars.net":"http://localhost:5000")+"/static/stratgame/png/").length).replace("%20", " ");
            console.log(name);
            patterns[name] =
                ctx.createPattern(imgs[name], "repeat");
        }
    }
    Composite.add(engine.world, wall);
    le = new Level("e");
    le.importData(leveldata["level1"]);
    player = new Player(100, 10);
    gameObjects.push(player);

    setInterval(gameLoop, 1/60);
}

function gameLoop() {
    ctx.clearRect(0,0,cw,ch);
    const dt = 1/60;

    Engine.update(engine);

    for (var go of gameObjects) {
        go.render();
    }
    var v = wall.vertices;
    ctx.fillStyle = "rgb(0,100,0)";
    ctx.fillRect(Math.min(v[0].x, v[1].x, v[2].x, v[3].x),
        Math.min(v[0].y, v[1].y, v[2].y, v[3].y), 
        Math.max(v[0].x, v[1].x, v[2].x, v[3].x) - Math.min(v[0].x, v[1].x, v[2].x, v[3].x),
        Math.max(v[0].y, v[1].y, v[2].y, v[3].y) - Math.min(v[0].y, v[1].y, v[2].y, v[3].y));
    le.render();
    
    if (downKeys["KeyA"]) {
        Body.applyForce(player.matter, player, {x: -0.004, y: 0});
    }
    if (downKeys["KeyD"]) {
        Body.applyForce(player.matter, player, {x: 0.004, y: 0});
    }
}
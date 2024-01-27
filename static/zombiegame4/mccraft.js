// proudly created by Major League Game Development (i.e myself)

var canvas, player;
var dirtPatches = [];
var particles = [];
var mousepos = [0, 0];
var dirtOffset = 10000;
var PHYSICSSTEPS = 3;
const dist = 20;
var invRenderer = false;
var running = true;
var normalRef = [null, ["pos3","pos2"], ["pos1","pos4"], ["pos4","pos1"], ["pos2","pos3"]];
var debugDispNow = {"hitboxes shown": false};
var skyColors = [ // each one lasts for around 1/8 of a day
[0.529, 0.807, 0.921], // sky blue: morning
[0.784, 0.976, 0.98], // a bit lighter: noon
[0.529, 0.807, 0.921], // sky blue: afternoon
[0.98, 0.513, 0.078], // orange: sunset
[0.1, 0.15, 0.2], // dusk
[0.01, 0.07, 0.1], // midnight
[0.337/4, 0.482/4, 0.749/4], // dawn
[0.968, 0.105, 0.278], // sunrise
[0.529, 0.807, 0.921] // morning again
];
var lastInvSelect = 10;
var firstTime = 0;
var audios = {
	"pop": "/static/zombiegame4/gltf/sfx/pop.mp3",
	"tree": "/static/zombiegame4/gltf/sfx/tree.mp3",
	"tree2": "/static/zombiegame4/gltf/sfx/tree2.mp3",
	"rock1": "/static/zombiegame4/gltf/sfx/rockbullet1.mp3",
	"rock2": "/static/zombiegame4/gltf/sfx/rockbullet2.mp3",
	"rock2": "/static/zombiegame4/gltf/sfx/rockbullet3.mp3",
};
var oW, oH;
var readyState = 69; // legacy for compatibility, actually has no function

function vec3_avg(a, b, c, d) {return [(a[0]+b[0]+c[0]+d[0])/2, (a[1]+b[1]+c[1]+d[1])/2, (a[2]+b[2]+c[2]+d[2])/2];}
function vec3_cross(a, b) {
	var out = [0,0,0]; glMatrix.vec3.cross(out, a, b);
	glMatrix.vec3.normalize(out, out); return out;}
function ns2(a, b) {
	return noise.simplex2(a/10, b/10) * noise.simplex2(a/50, b/50)* noise.simplex2(a/50+1423, b/50+100007)*9 +
	noise.simplex2(a*1.5, b*1.5) * noise.simplex2(a/10+100, b/10-69);
}; // for easier typing
function dirtSimplex(a, b) {
	return noise.simplex2(a/10+dirtOffset, b/10+dirtOffset);
}

function debugUpdate() {
	document.getElementById("debugStuff").innerHTML = JSON.stringify(debugDispNow);
	document.getElementById("debugStuff").style.display = showDebug?"block":"none";
}
setInterval(debugUpdate, 20);


var dredy = function() {
	console.log("all things loaded");
	clearInterval(chkHandle);
	document.getElementById("startBtn").innerHTML = "Start!";
	noise.seed(TerrainGen.seed);
	Item.init();
	Bullet.init();
	// size the canvas
	canvas.width = parseInt(
		document.defaultView.getComputedStyle(canvas, "wot do i put here").width.replace("px", ""), 10);
	canvas.height = parseInt(
		document.defaultView.getComputedStyle(canvas, "wot do i put here").height.replace("px", ""), 10);
	gl.viewport(0, 0, canvas.width, canvas.height);

	overlay = document.getElementById("overlay");
	overlay.width = canvas.width;
	overlay.height = canvas.height;
	oCtx = overlay.getContext("2d");
	oCtx.fillStyle = "rgb(0, 0, 0)";
	oCtx.font = "190px Open Sans";
	oW = overlay.width; oH = overlay.height;

	canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
	overlay.onclick = function() {if (!showInv) canvas.requestPointerLock();};
	document.exitPointerLock = document.exitPointerLock ||
						document.mozExitPointerLock;
	canvas.addEventListener("mousemove", onCameraTurn);
	overlay.addEventListener("mousemove", function(e) {mousepos = [e.clientX, e.clientY];});
	canvas.addEventListener("mousedown", ()=>{mouseDown = true;});
	canvas.addEventListener("mouseup", ()=>{mouseDown = false;});
	canvas.addEventListener("wheel", e=>{
		if (e.deltaY > 0) {
			if (player.selected == 3) {player.selected = 0;}
			else if (player.inv[player.selected + 1]) {player.selected += 1;}
		}
		if (e.deltaY < 0) {
			if (player.selected == 0) {player.selected = 3;}
			else if (player.inv[player.selected - 1]) {player.selected -= 1;}
		}
	});

	TerrainGen.init();
	TerrainGen.generate(dist);
	flushUniforms();
	flush("billboardShader");
	flush("t4shader");
	gl.enable(gl.DEPTH_TEST);

	readyState++;
}

function gameHelp() {
	document.getElementById("helpDiv").style.display = "block";
	document.getElementById("helpBtn").innerHTML = "How to Play (scroll down)";
}

function fire(e) {
	if (player.selected) {
		player.selected.shoot();
	}
}

function overlayClick(e) {
	if (invRenderer) {
		invRenderer.selectItem(e.clientX, e.clientY);
	}
}

function startGame() {
	player = new Player();
	invRenderer = new InvRenderer(oCtx, player.stuff, canvas.width * 0.05,
		10, 5);
	canvas.onclick = fire;
	overlay.addEventListener("mousedown", overlayClick);
	playerName = document.getElementById("nameBox").value;
	oCtx.fillText("Loading...", 100, 100);
	requestAnimationFrame(function(t) {firstTime = t;});
    requestAnimationFrame(gameLoop);
    document.getElementById("homeDiv").style.display = "none";
	canvas.requestPointerLock();
	new Zombie(10,10,0, 2,2,2, animators.zombie, 0.05, 10, 100);
}
// var deadSong = new Audio("/static/zombiegame4/songs/pressure.mp3");
// deadSong.currentTime = 40.37;
function ded(reason) {
	document.getElementById("deadDiv").style.display = "block";
	document.getElementById("deadReason").innerHTML = reason;
	running = false;
	deadSong.play();
}

function physicsUpdate(dt) {
	physicsObjects = physicsObjects.filter((p)=>!p.removed);
	for (var blanket of blanketObjects) {
		for (var po of physicsObjects) {
			po.vel[1] -= PhysicsObject.GlobalGravity * dt;
			po.vel[0] *= PhysicsObject.friction ** (1/PHYSICSSTEPS); po.vel[1] *= PhysicsObject.friction ** (1/PHYSICSSTEPS); po.vel[2] *= PhysicsObject.friction ** (1/PHYSICSSTEPS);
			if (!po.kinematic) {
				po.pos[0] += po.vel[0] * dt; po.pos[1] += po.vel[1] * dt; po.pos[2] += po.vel[2] * dt;
			}
			var res = BlanketObject.checkCollideAABB(blanket, po, dt);
			if (res.colliding) {
				if (!po.kinematic) {po.pos = res.suggestedPos};
				po.vel[1] = 0;
			}
		}
	}
	for (var i=0; i<physicsObjects.length; i++) {
		for (var j=i+1; j<physicsObjects.length; j++) {
			if (physicsObjects[i] && physicsObjects[j])
				PhysicsObject.checkCollideAABB(physicsObjects[i], physicsObjects[j], dt);
		}
	}
}

function onCameraTurn(e) {
	mousepos = [e.clientX, e.clientY];
	player.yaw   += e.movementX * 0.1;
	player.pitch -= e.movementY * 0.1;
	if (player.pitch > 89) { player.pitch = 89; }
	if (player.pitch < -89) { player.pitch = -89; }

	var front = glMatrix.vec3.create();
	front[0] = Math.cos(glMatrix.glMatrix.toRadian(player.yaw)) * Math.cos(glMatrix.glMatrix.toRadian(player.pitch));
	front[1] = Math.sin(glMatrix.glMatrix.toRadian(player.pitch));
	front[2] = Math.sin(glMatrix.glMatrix.toRadian(player.yaw)) * Math.cos(glMatrix.glMatrix.toRadian(player.pitch))
	glMatrix.vec3.normalize(player.cameraFront, front);
}
function processNumKeys() {
	for (var i=1; i<=5; i++) {
		if (divisDownKeys["Digit"+i]) {
			player.tSelect = i-1;
		}
	}
	if (player.tSelect != lastInvSelect) {
		clearShaderData("overlayShader");
		player.selected = player.toolbar[player.tSelect];
		if (player.toolbar[player.tSelect]) {
			shaderAddData({
				aBillboardPos: player.selected.model.position, aColor: player.selected.model.color
			}, "overlayShader");
			flush("overlayShader");
		}
	}
	lastInvSelect = player.tSelect;
}

var lastTime = -1;
var DAYLENGTH = 30000;
var COLORLENGTH = DAYLENGTH/8;
function mix(a, b, amount) {
	return a * (1 - amount) + b * amount;
}

function gameLoop(_t) {
	if (!running) {return;}
	_t -= firstTime;
	// color calcs
	var m = _t % DAYLENGTH;
	var dayNum = Math.floor(_t / DAYLENGTH);
	var amount = (m % COLORLENGTH) / COLORLENGTH;
	var ind = Math.floor(m/COLORLENGTH);
	debugDispNow["day number"] = dayNum;
	var color1 = skyColors[ind];
	var color2 = skyColors[ind+1];
	c = [mix(color1[0], color2[0], amount), mix(color1[1], color2[1], amount), mix(color1[2], color2[2], amount)];
	gl.clearColor(c[0], c[1], c[2], 1.0);
	globalFogColor = [...c, 1.0];
	globalFogAmount = 1 - (m/DAYLENGTH+0.9)%1;
	globalFogAmount *= 2.0;
	if (globalFogAmount > 1) {globalFogAmount = 2 - globalFogAmount;}
	globalFogAmount *= 5.0;
	// globalFogAmount = 0; // to make debugging easier;
	debugDispNow["fog amt"] = globalFogAmount;
	var adj = m - 1 * COLORLENGTH; // bc the sun position is a bit wank
	var sunPosition = [Math.sin(adj / DAYLENGTH * 2 * Math.PI) * 50, Math.cos(adj / DAYLENGTH * 2 * Math.PI) * 30, 0];
	lightingInfo[3] = c[0]; lightingInfo[4] = c[1]; lightingInfo[5] = c[2];
	var normalizedSunPosition = glMatrix.vec3.create();
	glMatrix.vec3.normalize(normalizedSunPosition, sunPosition);
	glMatrix.vec3.multiply(normalizedSunPosition, normalizedSunPosition, [1.3, 1.3, 1.3]);
	lightingInfo[0] = normalizedSunPosition[0]; lightingInfo[1] = normalizedSunPosition[1]; lightingInfo[2] = normalizedSunPosition[2];

	oCtx.clearRect(0, 0, overlay.width, overlay.height);
	// player.pos[1] = ns2(player.pos[0], player.pos[2])+2;
	debugDispNow["player pos"] = player.pos;
    var dt;
    if (lastTime == -1) {dt = 0; lastTime = _t;} else {dt = _t - lastTime; lastTime = _t;}
	dt = Math.min(dt, 70);
	if (player.selected) {player.selected.update(dt);}
    dt *= 0.1;
	d_cameraPos[0] = player.pos[0]; d_cameraPos[1] = player.pos[1]; d_cameraPos[2] = player.pos[2];
	var playerSpeed = 0.01 * player.speed;
	if (divisDownKeys["Shift"]) {playerSpeed = 1000;}
    glMatrix.vec3.scale(player.cameraFront, player.cameraFront, playerSpeed * 0.3);
    if(divisDownKeys["KeyA"]) { // a or <
		var crossed = glMatrix.vec3.create();
		var normalized = glMatrix.vec3.create();
		glMatrix.vec3.cross(crossed, player.cameraFront, player.cameraUp);
		glMatrix.vec3.normalize(normalized, crossed);
        glMatrix.vec3.scale(normalized, normalized, playerSpeed * 0.4);
		glMatrix.vec3.subtract(player.vel,
			player.vel,
			normalized);
	}
	if(divisDownKeys["KeyD"]) { // d or >
		var crossed = glMatrix.vec3.create();
		var normalized = glMatrix.vec3.create();
		glMatrix.vec3.cross(crossed, player.cameraFront, player.cameraUp);
		glMatrix.vec3.normalize(normalized, crossed);
        glMatrix.vec3.scale(normalized, normalized, playerSpeed * 0.4);
		glMatrix.vec3.add(player.vel,
			player.vel,
			normalized);
	}
	if(divisDownKeys["KeyW"]) { // w or ^
		glMatrix.vec3.add(player.vel,
			player.cameraFront,
			player.vel);
	}
	if(divisDownKeys["KeyS"]) { // s or down
		glMatrix.vec3.subtract(player.vel,
			player.vel,
			player.cameraFront,);
	}
	if (divisDownKeys["Space"]) {
		player.vel[1] += dt * player.jumpPower;
	}
    glMatrix.vec3.scale(player.cameraFront, player.cameraFront, 1/playerSpeed/0.3);
    var posPlusFront = glMatrix.vec3.create();
    glMatrix.vec3.add(posPlusFront, [player.pos[0], player.pos[1] + 1, player.pos[2]], player.cameraFront);
    glMatrix.mat4.lookAt(modelViewMatrix,
        [player.pos[0], player.pos[1] + 1, player.pos[2]],
        posPlusFront,
        glMatrix.vec3.fromValues(0, 1, 0));
	for (var i=0; i<PHYSICSSTEPS; i++) {
		physicsUpdate(dt/PHYSICSSTEPS);
	}
	
    flushUniforms();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	for (var prop in animators) {
		animators[prop].frameNum = Math.floor(_t*1.33/50%30)+1;
	}

	// mob spawning
	
	/*var x = _t / DAYLENGTH;
	if (Math.random() < 2*Math.abs(x - Math.floor(x + 0.5)) && Math.random() < 0.05) {
		new Zombie(Math.random() * 10, 10, Math.random() * 10, 2,2,2, animators.zombie, 0.05 * Math.random(), 10 * Math.random()
		, 10 + 100 * Math.random());
	}*/

	player.update();
	Item.update();
	Bullet.update(dt);
	updateParticles(particles, dt*10);
	useShader("objShader");
	animators.zombie.bindAttributes();
	Zombie.update(dt);

    useShader("t4shader");
    gl.drawArrays(gl.TRIANGLES, 0, buffers_d.t4shader.data.aVertexPosition.length/3);

	useShader("billboardShader");
	gl.drawArrays(gl.TRIANGLES, 0, buffers_d.billboardShader.data.aCenterOffset.length/3);
	gl.uniform1f(buffers_d.billboardShader.uniform.uAlphaAdj, 0.999);

	useRenderBuffer(Item.address, "billboardShader");
	gl.drawArrays(gl.TRIANGLES, 0, getRBdata(Item.address, "billboardShader").aCorner.length/2);

	gl.useProgram(buffers_d.transformShader.compiled);
	useRenderBuffer(Bullet.address, "transformShader");
	gl.drawArrays(gl.TRIANGLES, 0, getRBdata(Bullet.address, "transformShader").aVertexPosition.length/3);

	useShader("shaderProgram");
	gl.drawArrays(gl.TRIANGLES, 0, buffers_d.shaderProgram.data.aVertexPosition.length/3);

	useShader("objShader");
	gl.drawArrays(gl.TRIANGLES, 0, buffers_d.objShader.data.aColor.length/4);

	useShader("transformShader");
	gl.drawArrays(gl.TRIANGLES, 0, buffers_d.transformShader.data.aVertexPosition.length/3);

	useShader("overlayShader");
	gl.drawArrays(gl.TRIANGLES, 0, buffers_d.overlayShader.data.aBillboardPos.length/3);

	oCtx.drawImage(oTex.resource, oW*0.69, oH * 0.6, oW * 0.3, oW*0.3*oTex.resource.height/oTex.resource.width);
	var offset = 0;
	oCtx.font = "40px Calibri";
	oCtx.fillStyle = "#DDFFDD";
	var renderStuff = {"Wood": player.stuff.Wood, "rocc": player.stuff.rocc,
		"Distilled Water": player.stuff["Distilled Water"], "": "Press E for inventory"};
	for (var prop in renderStuff) {
		oCtx.fillText(prop + ": " + renderStuff[prop], oW*0.71, oH*0.68 + offset);
		offset += 45;
	}
	{ // tools inv
		processNumKeys();
		let ratio = oTex.inv.height / oTex.inv.width;
		let width = oW * 0.4;
		let height = width * ratio;
		let left = oW * 0.5 - width/2;
		let top = oH * 0.85 - height/2;
		let squareWidth = 0.127 * width;
		
		oCtx.drawImage(oTex.inv, left, top, width, height);
		if (player.selected) {
			oCtx.font = "30px Calibri";
			oCtx.fillText(player.selected.name, left + squareWidth * 2, top + 25);
		}
		offset = left + width * 0.044;
		for (var i=0; i<5; i++) {
			// offset, top + height * 0.485, squareWidth, squareWidth
			if (player.toolbar[i]) {
				oCtx.drawImage(oTex.grass, player.toolbar[i].texCoordStart[0]*TEXW, player.toolbar[i].texCoordStart[1]*TEXH,
					player.toolbar[i].texCoordWidth[0]*TEXW, player.toolbar[i].texCoordWidth[1]*TEXH,
					offset, top + height * 0.485, squareWidth, squareWidth);
			}
			if (player.tSelect == i) {
				oCtx.drawImage(oTex.invPointer, offset - 0.02 * oW, top - 0.1 * oH);
			}
			offset += 0.192 * width;
		}

		if (player.selected?.firingDelay > 0 && player.selected?.specs?.delay) {
			oCtx.strokeStyle = "#000000";
			oCtx.strokeRect(oW*0.3, top-oH * 0.1, oW*0.4, oH*0.03);
			oCtx.fillStyle = "#00AAAA";
			oCtx.fillRect(oW*0.3, top-oH * 0.1, oW * 0.4 * (Math.max(0, player.selected.firingDelay/player.selected.specs.delay)), oH*0.03);
		}

		ratio = oTex.defenses.height / oTex.defenses.width;
		width = oW * 0.2;
		height = width * ratio;
		left = oW * 0.03;
		top = oH * 0.8 - height/2;
		squareWidth = 0.29 * width;
		oCtx.drawImage(oTex.defenses, left, top, width, height);
		let coords = [
			[6/width, 65/height],
			[90/width, 65/height],
			[175/width, 65/height],
			[5/width, 151/height],
			[90/width, 151/height],
			[175/width, 151/height]
		];
		for (var i=0; i<6; i++) {
			if (player.towers[i]) {
				// oCtx.drawImage()
			}
		}

		// big inv
		if (showInv) {invRenderer.render(200, 100);}
	}
	// crosshair
	oCtx.fillStyle = "rgb(0,0,0)";
	oCtx.strokeRect(oW*0.48, oH*0.48, oW*0.04, oH*0.04);
	oCtx.fillRect(oW*0.495, oH*0.5-oW*0.005, oW*0.01, oW*0.01);

	// health bar
	oCtx.strokeRect(oW*0.3, oH*0.05, oW*0.4, oH*0.05);
	oCtx.fillStyle = "rgb(" + mix(0, 255, 1-player.health/player.maxHealth) + "," + mix(0, 255, player.health/player.maxHealth) +
		",25)";
	oCtx.fillRect(oW*0.3, oH*0.05, oW*0.4*player.health/player.maxHealth, oH*0.05);
	debugDispNow["player health"] = player.health;

	if (debugDispNow["hitboxes shown"]) {
		for (var i=1; i<physicsObjects.length; i++) {
			physicsObjects[i].drawBox(!physicsObjects[i].kinematic?[0,1,0,1]:[1,0,0,1]);
		}
	}
    requestAnimationFrame(gameLoop);
}
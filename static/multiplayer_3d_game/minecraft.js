// yes, I know the name of this file is minecraft.js.
// I was going to make minecraft but then I had another idea
// and I was too lazy to rename :/

var chunks, gl;
var debugDispNow = {"hi":"hi"};
var locations = {};
var objData = [];

function fakePerlin(x, y) {
	return [Math.sin((x + y) / 2)]
}

function distance(x1, y1, x2, y2) {
	return Math.sqrt((x2-x1)**2 + (y2-y1)**2);
}
var normalRef = [null, ["pos2","pos4"], ["pos3","pos1"], ["pos4","pos2"], ["pos1","pos3"]];
class Block {
	constructor(what, pos1, pos2, pos3, pos4) {
		this.pos1 = pos1;
		this.pos2 = pos2;
		this.pos3 = pos3;
		this.pos4 = pos4;
		this.normals = [];
		for (let i=1; i<5; i++) { // start from 1 because this.pos[1,2,3,4] starts from 1
			var ref = normalRef[i];
			var vec1 = glMatrix.vec3.create();
			var vec2 = glMatrix.vec3.create();
			glMatrix.vec3.subtract(vec1, this[ref[0]], this["pos"+i]);
			glMatrix.vec3.subtract(vec2, this[ref[1]], this["pos"+i]);
			var n = glMatrix.vec3.create();
			glMatrix.vec3.cross(n, vec1, vec2);
			this.normals[i-1] = [n[0], n[1], n[2]];
		}
		this.what = what;
	}
}

class Chunk {
	constructor(coords) {
		this.blocks = {};
		this.depthMap = {};
		this.normals = [];
		for (let x=coords[0] - 0.5; x<coords[0] + 11.5; x++) {
			for (let z=coords[1] - 0.5; z<coords[1] + 11.5; z++) {
				this.depthMap[[x, z]] = getTerrain(x, z);
			}
		}
		var toAdd = [];
		for (let x=coords[0]; x<coords[0] + 10; x++) {
			for (let z=coords[1]; z<coords[1] + 10; z++) {
				this.blocks[[x, z]] = new Block("beanz", 
					[x - 0.5, this.depthMap[[(x - 0.5), (z - 0.5)]], z - 0.5],
					[x - 0.5, this.depthMap[[(x - 0.5), (z + 0.5)]], z + 0.5],
					[x + 0.5, this.depthMap[[(x + 0.5), (z + 0.5)]], z + 0.5],
					[x + 0.5, this.depthMap[[(x + 0.5), (z - 0.5)]], z - 0.5]
				);
				this.normals = this.normals.concat([])
			}
		}
	}
}

class OtherPlayer {

}
class MyPlayer {
	constructor() {
		// thanks to learnOpenGL.com for these values cos dumb at linear algebra :D
		this.cameraPos = glMatrix.vec3.fromValues(0.0, 1.6, 0.0);
		this.hitPos = glMatrix.vec3.fromValues(0.0, 0.1, 0.0);
		this.cameraPointTo = glMatrix.vec3.fromValues(0.0, 1.6, 1.0);
		this.cameraFront = glMatrix.vec3.fromValues(0.0, 0.0, -1.0);
		this.cameraUp = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);
		this.yaw = -90.0;
		this.pitch = 0.0;

		this.velocity = glMatrix.vec3.fromValues(0.0, 0.0, 0.0);
		this.userInputVelocity = glMatrix.vec3.fromValues(0.0, 0.0, 0.0);

		this.acceleration = 0.000000002; // + 0.02 per frame
	}
	updatePos() {
		glMatrix.vec3.add(this.cameraPos, this.cameraPos, this.velocity);
		glMatrix.vec3.add(this.cameraPos, this.cameraPos, this.userInputVelocity);
		glMatrix.vec3.add(this.hitPos, this.hitPos, this.velocity);
		glMatrix.vec3.add(this.hitPos, this.hitPos, this.userInputVelocity);
	}
}

let myPlayer = new MyPlayer();

chunks = {};


function startGame() {
	document.getElementById("homeDiv").style.display = "none";
	canvas.requestPointerLock();
	clearInterval(ambientHandle);
}
var alreadyHelped;
function gameHelp() {
	var h;
	if (!alreadyHelped) {
		h = document.getElementById('helpDiv');
		h.style.display = "block";
	}
	document.getElementById('homeDivInner').scroll({
		top: 1000,
		left: 0,
		behavior: "smooth"
	});
	alreadyHelped = true;
}

function pauseMenu() {
	if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
		var a = document.getElementById('pauseDiv');
		a.style.display = "none";
		console.log("lock on")
	} else {
		var a = document.getElementById('pauseDiv');
		a.style.display = "block";
		console.log("lock off")
	}
}

function getTerrain(x, z) {
	function clamp(val, low, high) {return Math.min(Math.max(val, low), high);}
	var multiplier = clamp((x/6)**2 + (z/6) **2, 0, 4);
	return (noise.simplex2(x/15, z/15)) * (noise.simplex2(x/40,z/40)) * multiplier + multiplier - 3;
}

function mList(list, n) {
	// multiply an array
	var res = [];
	for (let i=0; i<n; i++) {res=res.concat(list);}
	return res;
}
var assdfd;
function divisionOnLoad(gl) {
	noise.seed(6969); // the funny number
	canvas.width = parseInt(
		document.defaultView.getComputedStyle(canvas, "wot do i put here").width.replace("px", ""), 10);
	canvas.height = parseInt(
		document.defaultView.getComputedStyle(canvas, "wot do i put here").height.replace("px", ""), 10);
	gl.viewport(0, 0, canvas.width, canvas.height);
	document.addEventListener("pointerlockchange", pauseMenu, false);
	for (let x=-3; x<3; x++) {
		for (let z=-3; z<3; z++) {
			chunks[[x * 10, z * 10]] = new Chunk([x * 10, z * 10]);
		}
	}
	var values = Object.values(chunks);
	for (let c=0; c<values.length; c++) {
		var chunk = values[c];
		var chunkBlocks = chunk.blocks;
		for (const blockPos in chunkBlocks) {
			var block = chunkBlocks[blockPos];
			var triang1 = block.pos1.concat(block.pos2.concat(block.pos3));
			var n1 = block.normals[0].concat(block.normals[1].concat(block.normals[2]));
			var triang2 = block.pos3.concat(block.pos4.concat(block.pos1));
			var n2 = block.normals[2].concat(block.normals[3].concat(block.normals[0]));
			addPositions(triang1.concat(triang2),
			   [0.0, 0.5,
			    0.0, 0.0,
			    0.5, 0.0,
			    0.5, 0.0,
			    0.5, 0.5,
			    0.0, 0.5], [], n1.concat(n2));
		}
	}
	flush();
	translateModelView(0.0, 0.0, -3.0);
	addBillbPositions([-0.1, 0.1, -6.0,
					   0.1, -0.1, -6.0,
					   0.1, 0.1, -6.0,
					   -0.1, -0.1, -6.0,
					   -0.1, 0.1, -6.0,
					   0.1, -0.1, -6.0,],
					   [0.5, 0.5,
					    1.0, 0.0,
					   1.0, 0.5,
					   0.5, 0.0,
					   0.5, 0.5,
					   1.0, 0.0,]);

	request("/static/multiplayer_3d_game/corn.obj", function(txt) { // jimmy rigged but it works
		var data = parseOBJ(txt);
		request("/static/multiplayer_3d_game/corn.mtl", function(mats) {
			var materials = parseMTL(mats);
			for (const geom of data.geometries) {
				objData.push({
					"materialSpec": materials[geom.material],
					"start": objInfos.position.length/3,
					"num": geom.data.position.length/3
				});
				addObjPositions(geom.data.position,
					mList(materials[geom.material].diffuseColor.concat([1.0]),geom.data.position.length/3),
					geom.data.normal);
				//console.log("geom ", geom);
			}
			//console.log("objinfo ", objInfos)
			flushObj();
		});
		//console.log("objdata", objData);
		locations["arraysLength"] = positions.length/3;
	});
	// addPositions([-100, 0, -100,
	// 			  100, 0, -100,
	// 			  100, 0, 100,
	// 			  100, 0, 100,
	// 			  -100, 0, 100,
	// 			  -100, 0, -100],
	// 			  [0.99, 0.99,0.99, 0.99,0.99, 0.99,0.99, 0.99,0.99, 0.99,0.99, 0.99,]) // remember to include normals
	flush();
	window.gl = gl;
	//assdfd = new ParticleSystem([2.47-2.5, 1.23, 6.96-2.5], D_SQUARE_PLANE, 0, 0, [0.73, 0.746], 0.218);
	assdfd = new ParticleSystem([1.01-2.5, 1.75, -9.82-2.5], D_SQUARE_PLANE, 0, 0, [0.558, 0.652], 0.125);
	canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
	canvas.onclick = function() {canvas.requestPointerLock();};
	document.exitPointerLock = document.exitPointerLock ||
                           document.mozExitPointerLock;
	canvas.addEventListener("mousemove", onCameraTurn);
	setInterval(debugRefresh, 20);
}


function debugRefresh() {
	var disp = "";
	for (x in debugDispNow) {
		var toAdd = "" + x + ": " + debugDispNow[x] + "<br>";
		disp += toAdd;
	}
	document.getElementById("debugStuff").innerHTML = disp;
}


function onCameraTurn(e) {
	myPlayer.yaw   += e.movementX * 0.07;
	myPlayer.pitch -= e.movementY * 0.07;
	if (myPlayer.pitch > 89) { myPlayer.pitch = 89; }
	if (myPlayer.pitch < -89) { myPlayer.pitch = -89; }

	var front = glMatrix.vec3.create();
	front[0] = Math.cos(glMatrix.glMatrix.toRadian(myPlayer.yaw)) * Math.cos(glMatrix.glMatrix.toRadian(myPlayer.pitch));
	front[1] = Math.sin(glMatrix.glMatrix.toRadian(myPlayer.pitch));
	front[2] = Math.sin(glMatrix.glMatrix.toRadian(myPlayer.yaw)) * Math.cos(glMatrix.glMatrix.toRadian(myPlayer.pitch))
	glMatrix.vec3.normalize(myPlayer.cameraFront, front);
}

var ambientHandle;
function onLoad() {
	settings.useTexture = true;
	settings.textStart = [0.5, 0.46875];
	settings.charWidth = 0.03125;
	settings.numCharsPerBreak = 10;
	settings.useLighting = true; // useLighting true is not compatible with useTexture true just saying (cuz reasons)
	settings.lightDir = glMatrix.vec3.fromValues(0.85, 0.8, 0.75);
	settings.lightCol = glMatrix.vec3.fromValues(1, 1, 0.8);
	settings.ambientLight = glMatrix.vec3.fromValues(0.4, 0.4, 0.4);
	initGL("canvas");
	ambientHandle = setInterval(function() {
		onCameraTurn({"movementX": 1, "movementY": 0});
	}, 10);
}

window.onload = onLoad;

var frameSum = 0;
var numFrames = 0;
function loop() {
	var before = Date.now();
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	// wasd
	// var playerVelXZ = Math.sqrt(myPlayer.userInputVelocity[0]**2 + myPlayer.userInputVelocity[2]**2);
	// var tooFast = playerVelXZ > 0.02;
	if(divisDownKeys[65]) { // a or <
		var crossed = glMatrix.vec3.create();
		var normalized = glMatrix.vec3.create();
		glMatrix.vec3.cross(crossed, myPlayer.cameraFront, myPlayer.cameraUp);
		glMatrix.vec3.normalize(normalized, crossed);
		glMatrix.vec3.subtract(myPlayer.userInputVelocity,
			myPlayer.userInputVelocity,
			normalized);
	}
	if(divisDownKeys[68]) { // d or >
		var crossed = glMatrix.vec3.create();
		var normalized = glMatrix.vec3.create();
		glMatrix.vec3.cross(crossed, myPlayer.cameraFront, myPlayer.cameraUp);
		glMatrix.vec3.normalize(normalized, crossed);
		glMatrix.vec3.add(myPlayer.userInputVelocity,
			myPlayer.userInputVelocity,
			normalized);
	}
	if(divisDownKeys[87]) { // w or ^
		glMatrix.vec3.add(myPlayer.userInputVelocity,
			myPlayer.cameraFront,
			myPlayer.userInputVelocity);
	}
	if(divisDownKeys[83]) { // s or down
		glMatrix.vec3.subtract(myPlayer.userInputVelocity,
			myPlayer.userInputVelocity,
			myPlayer.cameraFront,);
	}
	if (divisDownKeys[16]) {
		myPlayer.userInputVelocity[0] *= 0.25;
		myPlayer.userInputVelocity[1] *= 0.25;
		myPlayer.userInputVelocity[2] *= 0.25;
	} else {
		myPlayer.userInputVelocity[0] *= 0.15;
		myPlayer.userInputVelocity[1] *= 0.15;
		myPlayer.userInputVelocity[2] *= 0.15;
	}

	{ // collision detection :(
		// myPlayer.velocity[1] -= 0.005; // ONLY IF PLAYER IS IN AIR
		// get which chunk and block the playr is colliding with
		myPlayer.updatePos(); // would-be next position
		var x = myPlayer.cameraPos[0];
		var z = myPlayer.cameraPos[2];
		var height = getTerrain(x, z) + 2;
		var speedMultiplier = myPlayer.hitPos[1] - height + 2;
		debugDispNow["speed multiplier"] = speedMultiplier;
		//myPlayer.cameraPos[1] = height;
		myPlayer.hitPos[1] = myPlayer.cameraPos[1] - 2;
		// myPlayer.userInputVelocity[0] *= speedMultiplier;
		// myPlayer.userInputVelocity[2] *= speedMultiplier;
	}
	{ // yum yum render em up
		var posPlusFront = glMatrix.vec3.create();
		glMatrix.vec3.add(posPlusFront, myPlayer.cameraPos, myPlayer.cameraFront);
		glMatrix.mat4.lookAt(modelViewMatrix,
			myPlayer.cameraPos,
			posPlusFront,
			myPlayer.cameraUp);
		flushUniforms();

		useShader(shaderProgram);
		gl.drawArrays(gl.TRIANGLES, 0, positions.length/3);
		// user-defined uniforms so flushUniforms() doesn't flush it
		gl.uniform3f(infoStuff.uniformLocations.cameraPos, myPlayer.cameraPos[0], myPlayer.cameraPos[1], myPlayer.cameraPos[2]);
		if (myPlayer.cameraPos[1] < 0) {
			gl.uniform4f(infoStuff.uniformLocations.fogColor, 0.0, 0.0, 1.0, 1.0);
		} else {
			gl.uniform4f(infoStuff.uniformLocations.fogColor, 0.529, 0.808, 0.921, 1.0);
		}

		useShader(textShader);
		gl.uniform4f(infoStuff.uniformLocations.tFogColor, 0.529, 0.808, 0.921, 1.0);
		gl.drawArrays(gl.TRIANGLES, 0, textPositions.length / 2);

		// useShader(objShader);
		// for (const thing of objData) {
		// 	settings.ambientLight = thing.materialSpec.ambientColor;
		// 	flushUniforms();
		// 	gl.drawArrays(gl.TRIANGLES, thing.start, thing.num)
		// }
		settings.ambientLight = glMatrix.vec3.fromValues(0.4, 0.4, 0.4);
		debugDispNow["player pos"] = [...myPlayer.cameraPos];

		useShader(particleShader);
		assdfd.render();
		//assdfd2.render();

		gl.disable(gl.DEPTH_TEST);
		useShader(billboardShader);
		gl.drawArrays(gl.TRIANGLES, 0, billboardPositions.length / 3);
		gl.enable(gl.DEPTH_TEST);
	}
	frameSum += Date.now() - before;
	numFrames += 1;
}

window.setInterval(function() {
	debugDispNow["avg frame time"] = frameSum / numFrames;
	frameSum = 0;
	numFrames = 0;
}, 500);

window.setInterval(loop, 25);
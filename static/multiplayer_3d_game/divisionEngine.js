// WebGL boilerplate code.
// or as I like to call it, a Semi-Abstract WebGL Interface.
// proudly made by Greb. (with some assistance from MDN's tutorials) :D
// also, this code really needs to be cleaned up a bit (will happen soon™)

var canvas, gl, projectionMatrix, modelViewMatrix, infoStuff, buffers, positions, indexes, colors, texCoords, billboardShader, billboardPositions, billboardTexCoords, particleCorners, normals;
var settings = {};
var pushed = [];
var attributeInfo, particleShader, transformShader;
var divisDownKeys = {};
var textShader;
var particleTexCoords, particleCenterOffsets, textTexCoords, textPositions, textColors, particleLifetimes;
var particleVelocities;
var objShader, realBillboardShader;
var objInfos = {"position": [], "color": [], "normal": []};
var realBillboardData = {"offset": [], "corner": [], "texCoord": []};
var theTime = 0;
var activeUnit = 0;
var renderBuffers = { // for now, render buffers are only available for two shaders cuz yeah
	"shaderProgram": [],
	"objShader": [],
};
var transformInfos = {"position": [], "color": [], "normal": [], "rot": [], "translate": []};
var cube = [-1.0, -1.0, 1.0,  1.0, -1.0, 1.0,  1.0, 1.0, 1.0,  -1.0, -1.0, 1.0,  1.0, 1.0, 1.0,  -1.0,  1.0,  1.0,
			 -1.0, -1.0, -1.0,  -1.0, 1.0, -1.0,  1.0, 1.0, -1.0,  -1.0, -1.0, -1.0,  1.0, 1.0, -1.0,  1.0, -1.0, -1.0,
			 -1.0, 1.0, -1.0,  -1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  -1.0, 1.0, -1.0,  1.0, 1.0, 1.0,  1.0, 1.0, -1.0,
			 -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0, 1.0,  -1.0, -1.0, -1.0,  1.0, -1.0, 1.0,  -1.0, -1.0, 1.0,
			 1.0, -1.0, -1.0,  1.0, 1.0, -1.0,  1.0, 1.0, 1.0,  1.0, -1.0, -1.0,  1.0, 1.0, 1.0,  1.0, -1.0, 1.0,
			 -1.0, -1.0, -1.0,  -1.0, -1.0,  1.0,  -1.0, 1.0, 1.0,  -1.0, -1.0, -1.0,  -1.0, 1.0, 1.0,  -1.0,  1.0, -1.0,
];

setInterval(function() {theTime += 0.03;}, 10);

// #4a412a

function compileShaders(vertex, frag, name) {
	var vertexShader = loadShader(gl.VERTEX_SHADER, vertex);
	var fragmentShader = loadShader(gl.FRAGMENT_SHADER, frag);
	var prog = gl.createProgram();
	gl.attachShader(prog, vertexShader);
	gl.attachShader(prog, fragmentShader);
	gl.linkProgram(prog);
	prog.name = name;
	return prog;
}

function initShaders() {
	var mainSource = vsSource;
	if (settings.useTexture) {mainSource = textureVS;}
	if (settings.useLighting) {mainSource = lightVS;}
	const shaderProgram = compileShaders(mainSource, settings.useTexture?textureFS:fsSource, "shaderProgram");

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert('shaders failed lmao bc ' + gl.getProgramInfoLog(shaderProgram));
		return null;
	}

	// ---------billboards--------
	billboardShader = compileShaders(settings.useTexture?textureBillboardVS:billboardVS, settings.useTexture?textureFS:fsSource, "billboardShader");
	if (!gl.getProgramParameter(billboardShader, gl.LINK_STATUS)) {
		alert('billboard shaders failed lmao bc ' + gl.getProgramInfoLog(billboardShader));
	}

	// ---------particles---------
	if (settings.useTexture) {
		particleShader = compileShaders(particleVS, particleFS, "particleShader");
		if (!gl.getProgramParameter(particleShader, gl.LINK_STATUS)) { alert("particle shaders failed lmao bc" + gl.getProgramInfoLog(particleShader)); }
		textShader = compileShaders(textVS, textFS, "textShader");
		if (!gl.getProgramParameter(textShader, gl.LINK_STATUS)) { alert("text shaders failed lmao bc" + gl.getProgramInfoLog(textShader)) }
	}
	// ---------obj files---------
	objShader = compileShaders(lightColorVS, fsSource, "objShader");
	if (!gl.getProgramParameter(objShader, gl.LINK_STATUS)) { alert("obj shaders failed lmao bc" + gl.getProgramInfoLog(objShader)); }
	// ------real billboards------
	realBillboardShader = compileShaders(realBillboardVS, textureFS, "realBillboardShader__");
	if (!gl.getProgramParameter(realBillboardShader, gl.LINK_STATUS)) { alert("billb shaders failed lmao bc" + gl.getProgramInfoLog(realBillboardShader)); }

	// ---transform shaders ig?---
	transformShader = compileShaders(lightColorTransfVS, fsSource, "transformShader");
	if (!gl.getProgramParameter(transformShader, gl.LINK_STATUS)) { alert("transform shaders failed lmao bc" + gl.getProgramInfoLog(transformShader)); }
	return shaderProgram;
}

function useShader(shdr) {
	var locations = infoStuff["attribLocations"][shdr.name];
	var otherData = attributeInfo[shdr.name];
	for (const attrib in locations) {
		createVertexAttribute(locations[attrib], ...otherData[attrib] /*me be using da big brain array destructuring*/);
	}
	gl.useProgram(shdr)
}

function loadShader(type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('shaders failed compiling lmao bc ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

function setBufferData(buffer, data, type = Float32Array, mode = gl.STATIC_DRAW, target = gl.ARRAY_BUFFER) {
	gl.bindBuffer(target, buffer);
	gl.bufferData(target, new type(data), mode);
}

function initBuffers() { // i should dynamically generate the buffers too cuz there's a lot of shaders
						 // or group them into objects like the obj buffers at least
	const positionBuffer = gl.createBuffer();
	positions = [];
	setBufferData(positionBuffer, positions);

	var colorOrTextureBuffer = gl.createBuffer();
	colors = [];
	texCoords = [];
	setBufferData(colorOrTextureBuffer, colors);

	billboardPositions = [];
	const billboardPosBuffer = gl.createBuffer();
	setBufferData(billboardPosBuffer, billboardPositions);

	billboardTexCoords = [];
	var billboardTexCoordBuffer;
	if (settings.useTexture) {
		billboardTexCoordBuffer = gl.createBuffer();
		setBufferData(billboardTexCoordBuffer, billboardTexCoords);
	}

	const particleCornerBuffer = gl.createBuffer();
	particleCorners = [];
	const particleTexCoordBuffer = gl.createBuffer();
	particleTexCoords = [];
	const particleOffsetBuffer = gl.createBuffer();
	particleCenterOffsets = [];
	const particleLifetimeBuffer = gl.createBuffer();
	particleLifetimes = [];
	const particleVelocityBuffer = gl.createBuffer();
	particleVelocities = [];
	setBufferData(particleVelocityBuffer, particleVelocities);
	setBufferData(particleLifetimeBuffer, particleLifetimes);
	setBufferData(particleCornerBuffer, particleCorners);
	setBufferData(particleTexCoordBuffer, particleTexCoords);
	setBufferData(particleOffsetBuffer, particleCenterOffsets);

	const textPositionBuffer = gl.createBuffer();
	textPositions = [];
	setBufferData(textPositionBuffer, textPositions);
	const textTexCoordBuffer = gl.createBuffer();
	textTexCoords = [];
	setBufferData(textTexCoordBuffer, textTexCoords);
	const textColorBuffer = gl.createBuffer();
	textColors = [];
	setBufferData(textColorBuffer, textColors);

	const normalBuffer = gl.createBuffer();
	normals = [];
	setBufferData(normalBuffer, normals);

	const objBuffers = {"position": gl.createBuffer(),
						"color": gl.createBuffer(),
						"normal": gl.createBuffer()};
	for (let prop in objBuffers) {
		setBufferData(objBuffers[prop], objInfos[prop]);
	}

	const transfBuffers = {"position": gl.createBuffer(),
						"color": gl.createBuffer(),
						"normal": gl.createBuffer(),
					    "rot": gl.createBuffer(),
					    "translate": gl.createBuffer()};
	for (let prop in transfBuffers) {
		setBufferData(transfBuffers[prop], transformInfos[prop]);
	}

	const realBillboardBuffers = {
		"offset": gl.createBuffer(),
		"corner": gl.createBuffer(),
		"texCoord": gl.createBuffer()
	};
	for (let prop in realBillboardBuffers) {setBufferData(realBillboardBuffers[prop], realBillboardData[prop]);}

	const indexBuffer = gl.createBuffer();
	indexes = [];
	setBufferData(indexBuffer, indexes, Uint32Array, gl.STATIC_DRAW, gl.ELEMENT_ARRAY_BUFFER);

	return {
		"position": positionBuffer,
		"color": colorOrTextureBuffer,
		"texCoord": colorOrTextureBuffer,
		"billboardPosition": billboardPosBuffer,
		"billboardTexCoord": billboardTexCoordBuffer,
		"particleOffset": particleOffsetBuffer,
		"particleCorner": particleCornerBuffer,
		"particleTexCoord": particleTexCoordBuffer,
		"lifetime": particleLifetimeBuffer,
		"particleVel": particleVelocityBuffer,
		"textPosition": textPositionBuffer,
		"textTexCoord": textTexCoordBuffer,
		"textColor": textColorBuffer,
		"normal": normalBuffer,
		"obj": objBuffers,
		"realBillb": realBillboardBuffers,
		"transf": transfBuffers,
		"index": indexBuffer,
	}
}

function addPositions(pos, color, index = [], normal = []) {
	positions = positions.concat(pos);
	if (settings.useTexture) {
		texCoords = texCoords.concat(color)
	} else {
		colors = colors.concat(color);
	}
	indexes = indexes.concat(index);
	normals = normals.concat(normal);
}

function addTransformedPositions(pos, color, normal, rotate, translate) {
	transformInfos.position = transformInfos.position.concat(pos);
	transformInfos.color = transformInfos.color.concat(color);
	transformInfos.normal = transformInfos.normal.concat(normal);
	transformInfos.rot = transformInfos.rot.concat(rotate);
	transformInfos.translate = transformInfos.translate.concat(translate);
}

function flushTransformedPositions() {
	for (let prop in buffers.transf) {
		setBufferData(buffers.transf[prop], transformInfos[prop]);
	}
}

function addBillbPositions(pos, texCoords = false) {
	billboardPositions = billboardPositions.concat(pos);
	if (settings.useTexture) {
		billboardTexCoords = billboardTexCoords.concat(texCoords);
	}
}

function addObjPositions(pos, color, normal) { // indexing support will be added soon™ (aka never, at least until my GPU dies)
	objInfos.position = objInfos.position.concat(pos);
	objInfos.color = objInfos.color.concat(color);
	objInfos.normal = objInfos.normal.concat(normal);
}

function flush() {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	if (settings.useTexture) {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.billboardTexCoord);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(billboardTexCoords), gl.STATIC_DRAW);
	} else {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.billboardPosition);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(billboardPositions), gl.STATIC_DRAW);

	setBufferData(buffers.normal, normals);


	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indexes), gl.STATIC_DRAW);
}

function flushBillb() { // flushes ONLY the (fake) billboards
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.billboardTexCoord);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(billboardTexCoords), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.billboardPosition);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(billboardPositions), gl.STATIC_DRAW);
}

function flushObj() {
	for (let prop in buffers.obj) {
		setBufferData(buffers.obj[prop], objInfos[prop]);
	}
}

function flushRealBillb() {
	for (let prop in buffers.realBillb) {
		setBufferData(buffers.realBillb[prop], realBillboardData[prop]);
	}
}

function setPositions(pos) {
	positions = pos;
}

function setColors(color) {
	colors = color;
}

function translateModelView(toTranslate) {
	glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, toTranslate);
}

function rotateModelView(angle, axis) {
	glMatrix.mat4.rotate(modelViewMatrix, modelViewMatrix, angle, axis);
}

function setModelView(modelView) {
	modelViewMatrix = modelView;
}

function pushModelView() {
	pushed.push(modelViewMatrix);
}

function popModelView() {
	modelViewMatrix = pushed.pop();
}

function flushUniforms() {
	var current = gl.getParameter(gl.CURRENT_PROGRAM);
	gl.useProgram(shaderProgram);
	gl.uniformMatrix4fv(infoStuff.uniformLocations.projectionMatrix,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		infoStuff.uniformLocations.modelViewMatrix,
		false,
		modelViewMatrix);
	gl.uniformMatrix3fv(infoStuff.uniformLocations.lightingInfo, false,
		glMatrix.mat3.fromValues(settings.lightDir[0], settings.lightDir[1], settings.lightDir[2],
		settings.lightCol[0], settings.lightCol[1], settings.lightCol[2],
		settings.ambientLight[0], settings.ambientLight[1], settings.ambientLight[2]));

	gl.useProgram(objShader);
	gl.uniformMatrix4fv(infoStuff.uniformLocations.oPmatrix,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		infoStuff.uniformLocations.oMVM,
		false,
		modelViewMatrix);
	gl.uniformMatrix3fv(infoStuff.uniformLocations.oLightingInfo, false,
		glMatrix.mat3.fromValues(settings.lightDir[0], settings.lightDir[1], settings.lightDir[2],
		settings.lightCol[0], settings.lightCol[1], settings.lightCol[2],
		settings.ambientLight[0], settings.ambientLight[1], settings.ambientLight[2]));

	gl.useProgram(billboardShader)
	gl.uniformMatrix4fv(infoStuff.uniformLocations.bProjectionMatrix,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		infoStuff.uniformLocations.bModelViewMatrix,
		false,
		billboardMVM);

	gl.useProgram(particleShader);
	gl.uniformMatrix4fv(infoStuff.uniformLocations.pProjectionMatrix,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		infoStuff.uniformLocations.pModelViewMatrix,
		false,
		modelViewMatrix);
	var right = glMatrix.vec3.create();
	glMatrix.vec3.cross(right, glMatrix.vec3.fromValues(0.0, 1.0, 0.0), myPlayer.cameraFront,);
	glMatrix.vec3.normalize(right, right);
	gl.uniform3f(infoStuff.uniformLocations.pCameraRight, right[0], right[1], right[2]);
	gl.uniform1f(infoStuff.uniformLocations.pTime, theTime);
	gl.uniform1i(infoStuff.uniformLocations.pSampler, activeUnit);
	gl.useProgram(textShader);
	gl.uniformMatrix4fv(infoStuff.uniformLocations.tProjectionMatrix,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		infoStuff.uniformLocations.tModelViewMatrix,
		false,
		modelViewMatrix);
	gl.useProgram(realBillboardShader);
	gl.uniformMatrix4fv(infoStuff.uniformLocations.rbProj,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		infoStuff.uniformLocations.rbMVM,
		false,
		modelViewMatrix);
	gl.useProgram(transformShader);
	gl.uniformMatrix4fv(infoStuff.uniformLocations.trProj,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		infoStuff.uniformLocations.trMVM,
		false,
		modelViewMatrix);
	gl.uniformMatrix3fv(infoStuff.uniformLocations.trLightingInfo, false,
		glMatrix.mat3.fromValues(settings.lightDir[0], settings.lightDir[1], settings.lightDir[2],
		settings.lightCol[0], settings.lightCol[1], settings.lightCol[2],
		settings.ambientLight[0], settings.ambientLight[1], settings.ambientLight[2]));

	gl.useProgram(current);
}
var supporteds = [];
{
	let supportedString = "abcdefghijklmnopqrstuvwxyz";
	for (let i=0; i<supportedString.length; i++) {
		supporteds.push(supportedString[i]);
	}
}
function addText(text, vertices, color) {
	var unsupporteds = [];
	for (let i=0; i<text.length; i++) {
		var char = text[i];
		if (!supporteds.includes(char)) { unsupporteds.push(char); }
		else {
			var position = supporteds.indexOf(char) * settings.charWidth + settings.textStart[0];
			var head = i * 8;
			textPositions = textPositions.concat([
					-1.0 + head, -1.0,
					 1.0 + head, -1.0,
					 1.0 + head,  1.0,
					-1.0 + head, -1.0,
					 1.0 + head,  1.0,
					-1.0 + head,  1.0]);
			textTexCoords = textTexCoords.concat([
					position, settings.textStart[1],
					position + settings.charWidth, settings.textStart[1],
					position + settings.charWidth, settings.textStart[1] + settings.charWidth,
					position, settings.textStart[1],
					position + settings.charWidth, settings.textStart[1] + settings.charWidth,
					position, settings.textStart[1] + settings.charWidth]);
			for (let j=0; j<6; j++) { textColors = textColors.concat(color); }
			console.log("debug info: position = "+position+"\nadded textTexCoords = "+[
					position, settings.textStart[1],
					position + settings.charWidth, settings.textStart[1],
					position + settings.charWidth, settings.textStart[1] + settings.charWidth,
					position, settings.textStart[1],
					position + settings.charWidth, settings.textStart[1] + settings.charWidth,
					position, settings.textStart[1] + settings.charWidth]);
		}
	}
	if (0 in unsupporteds) { console.warn("addText: unsupported characters: " + unsupporteds); }
	setBufferData(buffers.textPosition, textPositions);
	setBufferData(buffers.textColor, textColors);
	setBufferData(buffers.textTexCoord, textTexCoords);
}

function loadTexture(url) { // MUST BE POWER OF 2 IMAGE
	const tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	// thanx mdn for this code cos i was too lazy to type it up
	const level = 0;
	const internalFormat = gl.RGBA;
	const width = 1;
	const height = 1;
	const border = 0;
	const srcFormat = gl.RGBA;
	const srcType = gl.UNSIGNED_BYTE;
	const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
	gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
		width, height, border, srcFormat, srcType,
		pixel);

	const texImage = new Image();
	texImage.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, texImage);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	}
	texImage.src = url;
	return tex;
}

function bindTexture(tex, unit = 0) {
	gl.activeTexture(gl["TEXTURE"+unit]);
	gl.bindTexture(gl.TEXTURE_2D, tex);
}

function createVertexAttribute(location, buffer, numComponents = 3, type = gl.FLOAT, normalize = false, stride = 0, offset = 0) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(
			  location,
			  numComponents,
			  type,
			  normalize,
			  stride,
			  offset);
	gl.enableVertexAttribArray(location);
}

function finalInit() {
	gl.clearColor(0.529, 0.808, 0.921, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	projectionMatrix = glMatrix.mat4.create();
	glMatrix.mat4.perspective(projectionMatrix,
		60 * Math.PI / 180, // fov
		gl.canvas.clientWidth / gl.canvas.clientHeight, // aspect
		0.1, // zNear
		150.0 // zFar
	);

	modelViewMatrix = glMatrix.mat4.create();
	normalMatrix = glMatrix.mat4.create();

	billboardMVM = glMatrix.mat4.create();

	// set the uniform things
	gl.useProgram(shaderProgram)
	gl.uniformMatrix4fv(infoStuff.uniformLocations.projectionMatrix,
		false,
		projectionMatrix);
	gl.uniformMatrix4fv(
		infoStuff.uniformLocations.modelViewMatrix,
		false,
		modelViewMatrix);
	gl.activeTexture(gl.TEXTURE0);
	//var texture = loadTexture("/static/multiplayer_3d_game/grass.png");
	//console.log(texture)
	//gl.bindTexture(gl.TEXTURE_2D, texture);

	// addText("aad", 0, [0, 1, 0, 1]);
	flush();
}

class Camera {
	constructor(mat) {
		this.mat = mat;
		// thanks to learnOpenGL.com for these values cos dumb at linear algebra :D
		this.pos = glMatrix.vec3.fromValues(0.0, 1.6, 0.0);
		this.pointTo = glMatrix.vec3.fromValues(0.0, 1.6, 1.0);
		this.front = glMatrix.vec3.fromValues(0.0, 0.0, -1.0);
		this.up = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);
		this.yaw = -90.0;
		this.pitch = 0.0;
	}
	turn(angleX, angleY) {
		this.yaw += angleX;
		this.pitch -= angleY;
		var _front = glMatrix.vec3.create();
		_front[0] = Math.cos(glMatrix.glMatrix.toRadian(this.yaw)) * Math.cos(glMatrix.glMatrix.toRadian(myPlayer.pitch));
		_front[1] = Math.sin(glMatrix.glMatrix.toRadian(this.pitch));
		_front[2] = Math.sin(glMatrix.glMatrix.toRadian(this.yaw)) * Math.cos(glMatrix.glMatrix.toRadian(myPlayer.pitch))
		glMatrix.vec3.normalize(this.front, _front);

	}
	// to move camera, just set this.pos manually
	updateMat() {
		var posPlusFront = glMatrix.vec3.create();
		glMatrix.vec3.add(posPlusFront, this.pos, this.front);
		glMatrix.mat4.lookAt(this.mat,
			this.pos,
			posPlusFront,
			this.up);
	}
}

const D_ONE_POINT = function() { return glMatrix.vec3.fromValues(0,0,0); }; // don't use this btw
const D_SQUARE_PLANE = function() {
	return [Math.random()*5, 0, Math.random()*5];
};

class ParticleSystem { // yet another jimmy-rigged contraption
	constructor(position, emitter, startVelocity, lifetime, texCoordStart, texCoordDimension) {
		this.position = position;
		this.emitFunc = emitter;
		this.startVelocity = startVelocity;
		this.particleLifetime = lifetime;
		this.particleCorners = [];
		this.particleTexCoords = [];
		this.particleCenterOffsets = [];
		this.texCoordsCycle = [1, 1, // 149, 179 is the start of the smoke texture, and it is 61x61
							  0, 1,
							  0, 0,
							  1, 1,
							  0, 0,
							  1, 0];
		this.start = particleCenterOffsets.length/3;
		this.velocities = [];
		// offset the texture coordinates
		for (let a=0; a<this.texCoordsCycle.length; a+=2) {
			this.texCoordsCycle[a] *= texCoordDimension;
			this.texCoordsCycle[a+1] *= texCoordDimension;
			this.texCoordsCycle[a] += texCoordStart[0];
			this.texCoordsCycle[a+1]+=  texCoordStart[1];
		}
		var numParticles = 30;
		for (let j=0; j<numParticles/*change later*/; j++) {
			this.cycle = [-1.0, -1.0,
						 1.0, -1.0,
						 1.0, 1.0,
						 -1.0, -1.0,
						 1.0, 1.0,
						 -1.0, 1.0];
			var computed = this.emitFunc();
			var lifetime = Math.random()*5+5;
			var vel = [Math.random()-0.5, Math.random()+0.5, Math.random()-0.5];
			for (let i=0; i<6; i++) {
				// init the values
				particleLifetimes.push(lifetime);
				particleVelocities = particleVelocities.concat(vel);
				this.particleCorners.push(this.cycle[i * 2]);
				this.particleCorners.push(this.cycle[i * 2 + 1]);
				this.particleTexCoords.push(this.texCoordsCycle[i * 2]);
				this.particleTexCoords.push(this.texCoordsCycle[i * 2 + 1]);
				this.particleCenterOffsets = this.particleCenterOffsets.concat(computed);
			}
		}
		setBufferData(buffers.particleVel, particleVelocities);
		setBufferData(buffers.lifetime, particleLifetimes);
		particleCorners = particleCorners.concat(this.particleCorners);
		particleTexCoords = particleTexCoords.concat(this.particleTexCoords);
		particleCenterOffsets = particleCenterOffsets.concat(this.particleCenterOffsets);
		setBufferData(buffers.particleCorner, particleCorners);
		setBufferData(buffers.particleTexCoord, particleTexCoords);
		setBufferData(buffers.particleOffset, particleCenterOffsets);
		this.num = particleCenterOffsets.length/3 - this.start;
	}
	render() {
		gl.uniform3f(infoStuff.uniformLocations.particleEmitter, ...this.position);
		gl.drawArrays(gl.TRIANGLES, this.start, this.num);
	}
}

function createRenderBuffer(prog) { // (sarcasm) original idea: multiple buffers for rendering
	// creates an empty render buffer.
	var toUse = renderBuffers[prog.name];
	var loc = toUse.length;
	var info = attributeInfo[prog.name];
	var toPush = {};
	for (attrib in info) {
		toPush[attrib] = [gl.createBuffer(), []];
		setBufferData(toPush[attrib][0], defaultRB[attrib]);
	}
	toUse.push(toPush);
	return loc;
}
function mList(list, n) {
	// multiply an array
	var res = [];
	for (let i=0; i<n; i++) {res=res.concat(list);}
	return res;
}
var defaultRB = {
	vertexPosition: cube,
	vertexTexCoord: mList([0,0.3], 72),
	vertexNormal: mList([0,1,0], 108),
	vertexColor: "cope"
}
function useRenderBuffer(loc, program) { // doesn't call gl.useProgram so u gotta be careful
	var toUse = renderBuffers[program.name][loc];
	var info = attributeInfo[program.name];
	var locations = infoStuff.attribLocations[program.name];
	for (attrib in info) {
		createVertexAttribute(locations[attrib], toUse[attrib][0], ...info[attrib].slice(1, info[attrib].length));
	}
}

function flushRB(loc, program) {
	var toUse = renderBuffers[program.name][loc];
	for (attrib in toUse) {
		setBufferData(toUse[attrib][0], toUse[attrib][1]);
	}
}

function getRBdata(loc, program) { // get the data for a render buffer so u can edit it
	return renderBuffers[program.name][loc];
}

function parseOBJ(text) { // credits to webglfundamentals.org for this code cuz im too small brain
						  // i should make my own sometime w/indexing tho
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      // the spec says there can be multiple filenames here
      // but many exist with spaces in a single filename
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}
function request(url, callback) {
	var req = new XMLHttpRequest();
	req.open("GET", url);
	req.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {callback(this.responseText);}
	}
	req.send(null);
}

function parseMTL(text) { // I wrote this mtl parser myself but it kinda sux
	var ending = "\n"
	if (text.search("\r") != -1) { // for some reason i saved the mtls with CRLF?
																 // and the github and replit versions were LF?
		ending = "\r\n";
	}
	var splitd = text.split(ending);
	var materials = {};
	var currentMtl = null;
	var currentName = "cope";
	for (const line of splitd) { // I only load the diffuse and ambient color cuz COPE
		if (line.startsWith("Kd")) {
			var args = line.split(" ");
			currentMtl.diffuseColor = [parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3])];
		}
		else if (line.startsWith("Ka")) {
			var args = line.split(" ");
			currentMtl.ambientColor = [parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3])];
		}
		if (line.startsWith("newmtl")) {
			if (currentMtl) { // currentMtl is not null so push it into materials before resetting it
				materials[currentName] = currentMtl;
			}
			currentName = line.split(" ")[1];
			currentMtl = {};
		}
	}
	materials[currentName] = currentMtl; // for the last material
	return materials;
}

var shaderProgram;


function initGL(canvName) {
	canvas = document.getElementById(canvName);
	gl = canvas.getContext("webgl");
	if (gl === null || gl === undefined) { // no webgl for ye
		window.alert("webgl failed lmao");
		return;
	}
	if (gl.getExtension("OES_element_index_uint") == null) {
		window.alert("your browser doesn't support this game. cope harder.");
		return;
	}

	shaderProgram = initShaders();

	infoStuff = { // i really should dynamically generate this as it is getting cluttered but w h a t e v e r
		program: shaderProgram,
		attribLocations: {
			shaderProgram: {
				vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
				vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
				vertexTexCoord: gl.getAttribLocation(shaderProgram, "aTexCoord"),
				vertexNormal: gl.getAttribLocation(shaderProgram, "aVertexNormal"),
			},
			billboardShader: {
				billboardPosition: gl.getAttribLocation(billboardShader, "aBillboardPos"),
				billboardTexCoord: gl.getAttribLocation(billboardShader, "abTexCoord"),
			},
			particleShader: {
				particleCenterOffset: gl.getAttribLocation(particleShader, "aParticleCenterOffset"),
				particleCorner: gl.getAttribLocation(particleShader, "aParticleCorner"),
				particleTexCoords: gl.getAttribLocation(particleShader, "aParticleTexCoords"),
				lifetime: gl.getAttribLocation(particleShader, "aLifetime"),
				velocity: gl.getAttribLocation(particleShader, "aParticleVelocity"),
			},
			textShader: {
				vertexPosition: gl.getAttribLocation(textShader, "aVertexPosition"),
				vertexColor: gl.getAttribLocation(textShader, "aTextColor"),
				vertexTexCoord: gl.getAttribLocation(textShader, "aTexCoord"),
			},
			objShader: {
				vertexPosition: gl.getAttribLocation(objShader, "aVertexPosition"),
				vertexNormal: gl.getAttribLocation(objShader, "aVertexNormal"),
				vertexColor: gl.getAttribLocation(objShader, "aColor"),
			},
			realBillboardShader__: {
				centerOffset: gl.getAttribLocation(realBillboardShader, "aCenterOffset"),
				corner: gl.getAttribLocation(realBillboardShader, "aCorner"),
				texCoord: gl.getAttribLocation(realBillboardShader, "aTexCoord"),
			},
			transformShader: {
				vertexPosition: gl.getAttribLocation(transformShader, "aVertexPosition"),
				vertexNormal: gl.getAttribLocation(transformShader, "aVertexNormal"),
				vertexColor: gl.getAttribLocation(transformShader, "aColor"),
				rotation: gl.getAttribLocation(transformShader, "aYRot"),
				translation: gl.getAttribLocation(transformShader, "aTranslation"),
			}
		},
		uniformLocations: {
			modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
			projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
			lightingInfo: gl.getUniformLocation(shaderProgram, "uLightingInfo"),
			bProjectionMatrix: gl.getUniformLocation(billboardShader, 'uProjectionMatrix'),
			bModelViewMatrix: gl.getUniformLocation(billboardShader, 'ubModelViewMatrix'),
			texSampler: gl.getUniformLocation(shaderProgram, "uSampler"),
			cameraPos: gl.getUniformLocation(shaderProgram, "uCameraPos"),
			fogColor: gl.getUniformLocation(shaderProgram, "uFogColor"),
			particleEmitter: gl.getUniformLocation(particleShader, "uParticleEmitter"),
			pModelViewMatrix: gl.getUniformLocation(particleShader, "uModelViewMatrix"),
			pProjectionMatrix: gl.getUniformLocation(particleShader, "uProjectionMatrix"),
			pCameraRight: gl.getUniformLocation(particleShader, "uCameraRight"),
			pTime: gl.getUniformLocation(particleShader, "uTime"),
			pSampler: gl.getUniformLocation(particleShader, "uSampler"),
			tModelViewMatrix: gl.getUniformLocation(textShader, "uModelViewMatrix"),
			tProjectionMatrix: gl.getUniformLocation(textShader, "uProjectionMatrix"),
			tCameraPos: gl.getUniformLocation(textShader, "uCameraPos"),
			tFogColor: gl.getUniformLocation(textShader, "uFogColor"),
			oMVM: gl.getUniformLocation(objShader, "uModelViewMatrix"),
			oPmatrix: gl.getUniformLocation(objShader, "uProjectionMatrix"),
			oLightingInfo: gl.getUniformLocation(objShader, "uLightingInfo"),
			rbMVM: gl.getUniformLocation(realBillboardShader, "uModelViewMatrix"),
			rbProj: gl.getUniformLocation(realBillboardShader, "uProjectionMatrix"),
			trMVM: gl.getUniformLocation(transformShader, "uModelViewMatrix"),
			trProj: gl.getUniformLocation(transformShader, "uProjectionMatrix"),
			trLightingInfo: gl.getUniformLocation(transformShader, "uLightingInfo")
		}
	};

	buffers = initBuffers();
	finalInit();
	// some info for the vertex attributes
	attributeInfo = {};
	attributeInfo["shaderProgram"] = {
		vertexPosition: [buffers.position],
		vertexColor: [buffers.color, 4, gl.FLOAT, false, 0, 0],
		vertexTexCoord: [buffers.texCoord, 2, gl.FLOAT, false, 0, 0],
		vertexNormal: [buffers.normal]
	};
	attributeInfo["billboardShader"] = {
		billboardPosition: [buffers.billboardPosition],
		billboardTexCoord: [buffers.billboardTexCoord, 2, gl.FLOAT, false, 0, 0],
	};
	attributeInfo["particleShader"] = {
		particleCenterOffset: [buffers.particleOffset],
		particleCorner: [buffers.particleCorner, 2, gl.FLOAT, false, 0, 0],
		particleTexCoords: [buffers.particleTexCoord, 2, gl.FLOAT, false, 0, 0],
		lifetime: [buffers.lifetime, 1, gl.FLOAT, false, 0, 0],
		velocity: [buffers.particleVel, 3, gl.FLOAT, false, 0, 0],
	};
	attributeInfo["textShader"] = {
		vertexPosition: [buffers.textPosition, 2, gl.FLOAT, false, 0, 0],
		vertexColor: [buffers.textColor, 4, gl.FLOAT, false, 0, 0],
		vertexTexCoord: [buffers.textTexCoord, 2, gl.FLOAT, false, 0, 0],
	};
	attributeInfo["objShader"] = {
		vertexPosition: [buffers.obj.position],
		vertexNormal: [buffers.obj.normal],
		vertexColor: [buffers.obj.color, 4, gl.FLOAT, false, 0, 0],
	};
	attributeInfo["realBillboardShader__"] = {
		centerOffset: [buffers.realBillb.offset],
		corner: [buffers.realBillb.corner, 2, gl.FLOAT, false, 0, 0],
		texCoord: [buffers.realBillb.texCoord, 2, gl.FLOAT, false, 0, 0],
	};
	attributeInfo["transformShader"] = {
		vertexPosition: [buffers.transf.position],
		vertexNormal: [buffers.transf.normal],
		vertexColor: [buffers.transf.color, 4, gl.FLOAT, false, 0, 0],
		rotation: [buffers.transf.rot, 1, gl.FLOAT, false, 0, 0],
		translation: [buffers.transf.translate]
	};

	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);

	// complicated stoufvves
	// var cameraPos = glMatrix.vec3.fromValues(0.0, 0.0, 0.0);
	// var cameraTarget = glMatrix.vec3.fromValues(0.0, 0.0, 1.0);
	// var cameraDirection = glMatrix.vec3.create();
	// glMatrix.vec3.normalize(cameraDirection, cameraPos - cameraTarget);
	// var cameraUp = glMatrix.vec3.create();
	// glMatrix.vec3.cross(cameraUp, cameraDirection, cameraRight);
	// var lookAt = glMatrix.mat4.create();
	// glMatrix.mat4.lookAt(lookAt,
	// 	glMatrix.vec3.fromValues())


	divisionOnLoad(gl);
}

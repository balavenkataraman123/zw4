// the Division 3D Engine.
// VERSION 3.0!!!
// proudly made by Greb. (this time with almost no assistance from MDN's tutorials)
// btw MDN is awesome
// TODO: make this library object-oriented

var canvas, gl;
var buffers_d;
var modelViewMatrix = glMatrix.mat4.create();
glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -5]);
var projectionMatrix = glMatrix.mat4.create();
glMatrix.mat4.perspective(projectionMatrix,
	60 * Math.PI / 180, // fov
	16/9, // aspect
	0.1, // zNear
	150.0 // zFar
);
var d_cameraPos = glMatrix.vec3.create();
var bModelViewMatrix = glMatrix.mat4.create();
var lightingInfo = [0, 1, 1.3, 1, 1, 1, 0.5, 0.5, 0.5];
var renderBuffers = {"shaderProgram":[], "objShader":[], "billboardShader":[], "transformShader":[]};
var cube = [-1.0, -1.0, 1.0,  1.0, -1.0, 1.0,  1.0, 1.0, 1.0,  -1.0, -1.0, 1.0,  1.0, 1.0, 1.0,  -1.0,  1.0,  1.0,
			 -1.0, -1.0, -1.0,  -1.0, 1.0, -1.0,  1.0, 1.0, -1.0,  -1.0, -1.0, -1.0,  1.0, 1.0, -1.0,  1.0, -1.0, -1.0,
			 -1.0, 1.0, -1.0,  -1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  -1.0, 1.0, -1.0,  1.0, 1.0, 1.0,  1.0, 1.0, -1.0,
			 -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0, 1.0,  -1.0, -1.0, -1.0,  1.0, -1.0, 1.0,  -1.0, -1.0, 1.0,
			 1.0, -1.0, -1.0,  1.0, 1.0, -1.0,  1.0, 1.0, 1.0,  1.0, -1.0, -1.0,  1.0, 1.0, 1.0,  1.0, -1.0, 1.0,
			 -1.0, -1.0, -1.0,  -1.0, -1.0,  1.0,  -1.0, 1.0, 1.0,  -1.0, -1.0, -1.0,  -1.0, 1.0, 1.0,  -1.0,  1.0, -1.0,
];
var theTime = 0;
var globalFogColor = [1.0, 0.0, 0.0, 0.0, 1.0];
var globalFogAmount = 1.0;
setInterval(function() {theTime += 0.03;}, 10);


function parseShader(s) {
	var attribRegEx = /attribute (vec[0-5]|float) .+?(?=;)/g;
	var uniformRegEx = /uniform (mat[0-5]|sampler2D|vec[0-5]|float|int) .+?(?=;)/g;
	var results = {
		attribute: [],
		uniform: []
	};
	var attribParsed = [...s.matchAll(attribRegEx)];
	var uniParsed = [...s.matchAll(uniformRegEx)];
	for (var x of attribParsed) {
		results.attribute.push(x[0].split(" ")[2]); // push the name of the attribute
	}
	for (var x of uniParsed) {
		results.uniform.push(x[0].split(" ")[2]); // push the name of the uniform
	}
	return results;
}

function loadShader(type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert('shaders failed compiling lmao bc ' + gl.getShaderInfoLog(shader) +
			"\nthe source code was logged in console.");
		dO(source);
		gl.deleteShader(shader);
		return null;
	}

	return shader;
}

function compileShaders(vertex, frag) {
	var vertexShader = loadShader(gl.VERTEX_SHADER, vertex);
	var fragmentShader = loadShader(gl.FRAGMENT_SHADER, frag);
	var prog = gl.createProgram();
	gl.attachShader(prog, vertexShader);
	gl.attachShader(prog, fragmentShader);
	gl.linkProgram(prog);
	return prog;
}

function setBufferData(buf, data) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
}

function processShader(shader) {
	// process a shader.
	// accesses the global variable buffers_d's shader property.
	var info = buffers_d[shader];

	info.compiled = compileShaders(info.vSource, info.fSource);
	var requirements = parseShader(info.vSource);
	// because the fShaders only have uniforms
	requirements.uniform = requirements.uniform.concat(parseShader(info.fSource).uniform);
	for (var attrib of requirements.attribute) {
		info.buffer[attrib].unshift(gl.getAttribLocation(info.compiled, attrib)); // add the attribute location

		var buffer = gl.createBuffer();
		setBufferData(buffer, new Float32Array([]));
		info.buffer[attrib].unshift(buffer); // add the buffer
	}

	for (var uniform of requirements.uniform) {
		info.uniform[uniform] = gl.getUniformLocation(info.compiled, uniform);
	}
}

function initShadersAndBuffers() {
	for (var shader in buffers_d) {
		processShader(shader);
	}
}

function bindVertexAttribute(buffer, location, numComponents = 3, type = gl.FLOAT, normalize = false, stride = 0, offset = 0) {
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

function useShader(name) {
	var info = buffers_d[name];
	gl.useProgram(info.compiled);
	for (var buf in info.buffer) {
		bindVertexAttribute(...info.buffer[buf]);
	}
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

// render to texture stuff

function addPositions(pos, tex, index = [], normal = []) { // backwards compatible with Division 1.0
	if (pos.length != normal.length) {
		console.warn("addPositions: recieved less normals than positions");
	}
	shaderAddData({aVertexPosition: pos, aVertexNormal: normal, aTexCoord: tex}, "shaderProgram");
}

function shaderAddData(datas, shader) { // add data to any shader
	// this way i dont have to write the same thing for every shader
	var d = buffers_d[shader].data;
	if (buffers_d[shader].arrayBuffered) {
		console.warn("shaderAddData: cannot expand arraybuffer");return;
	}
	var dKey;
	for (var prop in datas) {dKey = prop; break;}
	for (var prop in d) {
		if (prop in datas) {
			d[prop] = d[prop].concat(datas[prop]);
		} else {
			console.warn("shaderAddData: " + prop + " was not specified. Filling buffer with 0.");
			d[prop] = d[prop].concat(mList([0], buffers_d[shader].buffer[prop][1] *
				datas[dKey].length / (buffers_d[shader].buffer[dKey].length==2?3:buffers_d[shader].buffer[dKey][1])));
		}
	}
}

function clearShaderData(shader) {
	var d = buffers_d[shader].data;
	for (var prop in d) {
		d[prop] = buffers_d[shader].arrayBuffered?new Float32Array() : [];
	}
}

function flush(shaderName) {
	var info = buffers_d[shaderName];
	for (var property in info.data) {
		var data = buffers_d[shaderName]; // .something idk
		setBufferData(info.buffer[property][0], buffers_d[shaderName].arrayBuffered?
			info.data[property] : new Float32Array(info.data[property]));
	}
}

function flushUniforms() { // WARNING: will switch programs so u gotta switch back
	var locs = buffers_d.shaderProgram.uniform;
	gl.useProgram(buffers_d.shaderProgram.compiled);
	gl.uniformMatrix4fv(locs.uModelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);
	gl.uniformMatrix3fv(locs.uLightingInfo, false, lightingInfo);
	gl.uniform4f(locs.uFogColor, ...globalFogColor);
	gl.uniform1f(locs.uFogAmount, globalFogAmount);
	
	locs = buffers_d.t4shader.uniform;
	gl.useProgram(buffers_d.t4shader.compiled);
	gl.uniformMatrix4fv(locs.uModelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);
	gl.uniformMatrix3fv(locs.uLightingInfo, false, lightingInfo);
	gl.uniform4f(locs.uFogColor, ...globalFogColor);
	gl.uniform1f(locs.uFogAmount, globalFogAmount);

	locs = buffers_d.objShader.uniform;
	gl.useProgram(buffers_d.objShader.compiled);
	gl.uniformMatrix4fv(locs.uModelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);
	gl.uniformMatrix3fv(locs.uLightingInfo, false, lightingInfo);
	gl.uniform4f(locs.uFogColor, ...globalFogColor);
	gl.uniform1f(locs.uFogAmount, globalFogAmount);

	locs = buffers_d.overlayShader.uniform;
	gl.useProgram(buffers_d.overlayShader.compiled);
	gl.uniformMatrix4fv(locs.ubModelViewMatrix, false, bModelViewMatrix);
	gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);

	locs = buffers_d.transformShader.uniform;
	gl.useProgram(buffers_d.transformShader.compiled);
	gl.uniformMatrix4fv(locs.uModelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);
	gl.uniformMatrix3fv(locs.uLightingInfo, false, lightingInfo);
	gl.uniform4f(locs.uFogColor, ...globalFogColor);
	gl.uniform1f(locs.uFogAmount, globalFogAmount);

	locs = buffers_d.billboardShader.uniform;
	gl.useProgram(buffers_d.billboardShader.compiled);
	gl.uniformMatrix4fv(locs.uModelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);
	gl.uniform3f(locs.uCameraPos, false, d_cameraPos[0], d_cameraPos[1], d_cameraPos[2]);
	gl.uniformMatrix3fv(locs.uLightingInfo, false, lightingInfo);
	gl.uniform4f(locs.uFogColor, ...globalFogColor);
	gl.uniform1f(locs.uFogAmount, globalFogAmount);

	locs = buffers_d.particleShader.uniform;
	gl.useProgram(buffers_d.particleShader.compiled);
	gl.uniform1f(locs.uTime, theTime);
	gl.uniformMatrix4fv(locs.uModelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);

	locs = buffers_d.debugShader.uniform;
	gl.useProgram(buffers_d.debugShader.compiled);
	gl.uniformMatrix4fv(locs.uModelViewMatrix, false, modelViewMatrix);
	gl.uniformMatrix4fv(locs.uProjectionMatrix, false, projectionMatrix);
}

function createRenderBuffer(prog) {
	var loc = renderBuffers[prog].length;
	var toPush = {buffers: {}, data: {}};
	for (var attrib in buffers_d[prog].buffer) {
		var buf = gl.createBuffer();
		setBufferData(buf, new Float32Array([]));
		toPush.buffers[attrib] = buf;
		toPush.data[attrib] = [];
	}
	renderBuffers[prog].push(toPush);
	return loc;
}

function useRenderBuffer(loc, program) {
	var toUse = renderBuffers[program][loc];
	var info = buffers_d[program].buffer;
	for (var attrib in info) {
		bindVertexAttribute(toUse.buffers[attrib], ...info[attrib].slice(1));
	}
}

function selectiveRBbind(loc, program, name) {
	var toUse = renderBuffers[program][loc];
	var info = buffers_d[program].buffer;
	bindVertexAttribute(toUse.buffers[name], ...info[name].slice(1));
}

function flushRB(loc, program) {
	var toUse = renderBuffers[program][loc];
	for (attrib in toUse.buffers) {
		setBufferData(toUse.buffers[attrib], toUse.arrayBuffered?toUse.data[attrib]:new Float32Array(toUse.data[attrib]));
	}
}

function getRBdata(loc, program) {
	return renderBuffers[program][loc].data;
}

const D_ONE_POINT = function() {
	return function() {return glMatrix.vec3.fromValues(0, 0, 0);};
}
const D_PLANE = function(w, l) {
	var wStart = -0.5 * w;
	var lStart = -0.5 * l;
	return function() {return glMatrix.vec3.fromValues(Math.random() * w - wStart, 0,
		Math.random() * l - lStart);}
}

class ParticleSystem { // yet another jimmy-rigged contraption
	constructor(position, emitter, startVelocity, lifetime, texCoordStart, texCoordDimension, size,
			timer = Infinity, numCycles = 10) {
		this.position = position;
		this.emitFunc = emitter;
		this.startVelocity = startVelocity;
		this.particleLifetime = lifetime;

		// graphics data
		this.aParticleCorner = [];
		this.aParticleTexCoords = [];
		this.aParticleCenterOffset = [];
		this.aParticleVelocity = [];
		this.aLifetime = [];

		this.start = buffers_d.particleShader.data.aParticleCenterOffset.length/3;
		this.startTime = theTime;
		this.timer = timer;
		this.numCycles = numCycles;
		debugDispNow["numCycles"] = this.numCycles;
		this.texCoordsCycle = [1, 1, // 149, 179 is the start of the smoke texture, and it is 61x61
							  0, 1,
							  0, 0,
							  1, 1,
							  0, 0,
							  1, 0];
		// offset the texture coordinates
		for (let a=0; a<this.texCoordsCycle.length; a+=2) {
			this.texCoordsCycle[a] *= texCoordDimension;
			this.texCoordsCycle[a+1] *= texCoordDimension;
			this.texCoordsCycle[a] += texCoordStart[0];
			this.texCoordsCycle[a+1]+=  texCoordStart[1];
		}
		this.cycle = [-1.0, -1.0,
					 1.0, -1.0,
					 1.0, 1.0,
					 -1.0, -1.0,
					 1.0, 1.0,
					 -1.0, 1.0];
		for (let a=0; a<this.cycle.length; a++) {
			this.cycle[a] *= size
		}
		var numParticles = 30;
		for (let j=0; j<numParticles/*change later*/; j++) {
			var computed = Array.from(this.emitFunc());
			var lifetime = Math.random()*5+5;
			var vel = [Math.random()-0.5, startVelocity * Math.random(), Math.random()-0.5];
			var b = buffers_d.particleShader.data;
			for (let i=0; i<6; i++) {
				// init the values
				this.aLifetime.push(lifetime);
				this.aParticleVelocity = this.aParticleVelocity.concat(vel);
				this.aParticleCorner.push(this.cycle[i * 2]);
				this.aParticleCorner.push(this.cycle[i * 2 + 1]);
				this.aParticleTexCoords.push(this.texCoordsCycle[i * 2]);
				this.aParticleTexCoords.push(this.texCoordsCycle[i * 2 + 1]);
				this.aParticleCenterOffset = this.aParticleCenterOffset.concat(computed);
			}
		}
		shaderAddData(this, "particleShader");
		this.num = buffers_d.particleShader.data.aParticleCenterOffset.length/3 - this.start;
		flush("particleShader");
	}
	render() {
		gl.useProgram(buffers_d.particleShader.compiled);
		gl.uniform3f(buffers_d.particleShader.uniform.uParticleEmitter, ...this.position);
		gl.uniform1f(buffers_d.particleShader.uniform.uStartTime, this.startTime);
		gl.uniform1i(buffers_d.particleShader.uniform.uNumCycles, this.numCycles);
		gl.drawArrays(gl.TRIANGLES, this.start, this.num);
	}
}

function updateParticles(particles) { // to render all particles and delete old ones
	for (let i=0; i<particles.length; i++) {
		particles[i].render();
		particles[i].timer--;
		if (particles[i].timer < 0) {
			particles.splice(i, 1);
			(async () => {
				clearShaderData("particleShader");
				for (let j=0; j<particles.length; j++) {
					shaderAddData(particles[i], "particleShader");
				}
			})();
		}
	}
}

function mList(list, n) {
	// multiply an array
	var res = [];
	for (let i=0; i<n; i++) {res=res.concat(list);}
	return res;
}

function convertToArrayBuffer(shaderName) {
	buffers_d[shaderName].arrayBuffered = true;
	for (var prop in buffers_d[shaderName].data) {
		buffers_d[shaderName].data[prop] = new Float32Array(buffers_d[shaderName].data[prop]);
	}
}

function convertRBArrayBuffer(shaderName, id) {
	renderBuffers[shaderName][id].arrayBuffered = true;
	for (var prop in renderBuffers[shaderName][id].data) {
		renderBuffers[shaderName][id].data[prop] = new Float32Array(renderBuffers[shaderName][id].data[prop])
	}
}

function initGL(canvName) {
	canvas = document.getElementById(canvName);
	gl = canvas.getContext("webgl");
	if (gl === null || gl === undefined) { // no webgl for ye
		window.alert("webgl failed lmao");
		return;
	}
	gl.enable(gl.BLEND);
	buffers_d = {
		t4shader: {
			vSource: lightVS_t4,
			fSource: textureFS_t4,
			compiled: false,
			buffer: {
				aVertexPosition: [],
				aVertexNormal: [],
				aTexCoord1: [2, gl.FLOAT, false, 0, 0], aTexCoord3: [2, gl.FLOAT, false, 0, 0],
				aTexCoord2: [2, gl.FLOAT, false, 0, 0], aTexCoord4: [2, gl.FLOAT, false, 0, 0],
				aMixFactor: [4, gl.FLOAT, false, 0, 0]
			},
			uniform: {},
			data: { // TODO: autogenerate this
				aVertexPosition: [],
				aVertexNormal: [],
				aTexCoord1: [], aTexCoord2: [], aTexCoord3: [], aTexCoord4: [], aMixFactor: []
			}
		},
		shaderProgram: {
			vSource: lightVS,
			fSource: textureFS,
			compiled: false,
			buffer: {
				aVertexPosition: [],
				aVertexNormal: [],
				aTexCoord: [2, gl.FLOAT, false, 0, 0],
			},
			uniform: {},
			data: { // TODO: autogenerate this
				aVertexPosition: [],
				aVertexNormal: [],
				aTexCoord: []
			}
		},
		objShader: {
			vSource: lightColorVS,
			fSource: fsSource,
			compiled: false,
			buffer: {
				aVertexPosition: [],
				aVertexNormal: [],
				aColor: [4, gl.FLOAT, false, 0, 0]
			},
			uniform: {},
			data: {
				aVertexPosition: [],
				aVertexNormal: [],
				aColor: []
			}
		},
		overlayShader: {
			vSource: textureBillboardVS,
			fSource: fsSource,
			compiled: false,
			buffer: {
				aBillboardPos: [],
				aColor: [4, gl.FLOAT, false, 0, 0]
			},
			uniform: {},
			data: {
				aBillboardPos: [],
				aColor: []
			}
		},
		transformShader: {
			vSource: lightColorTransfVS,
			fSource: fsSource,
			compiled: false,
			buffer: {
				aVertexPosition: [],
				aVertexNormal: [],
				aColor: [4, gl.FLOAT, false, 0, 0],
				aYRot: [1, gl.FLOAT, false, 0, 0],
				aTranslation: []
			},
			uniform: {},
			data: {
				aVertexPosition: [],
				aVertexNormal: [],
				aColor: [],
				aYRot: [],
				aTranslation: []
			}
		},
		billboardShader: {
			vSource: realBillboardVS,
			fSource: textureFS,
			compiled: false,
			buffer: {
				aCenterOffset: [],
				aCorner: [2, gl.FLOAT, false, 0, 0],
				aTexCoord: [2, gl.FLOAT, false, 0, 0]
			},
			uniform: {},
			data: {
				aCenterOffset: [],
				aCorner: [],
				aTexCoord: []
			}
		},
		particleShader: {
			vSource: particleVS,
			fSource: particleFS,
			compiled: false,
			buffer: {
				aParticleVelocity: [3, gl.FLOAT, false, 0, 0],
				aParticleCenterOffset: [],
				aParticleCorner: [2, gl.FLOAT, false, 0, 0],
				aParticleTexCoords: [2, gl.FLOAT, false, 0, 0],
				aLifetime: [1, gl.FLOAT, false, 0, 0],
			},
			uniform: {},
			data: {
				aParticleVelocity: [], aParticleCenterOffset: [], aParticleCorner: [],
				aParticleTexCoords: [], aLifetime: [],
			}
		},
		debugShader: {
			vSource: debugVS,
			fSource: fsSource,
			compiled: false,
			buffer: {aID: [1, gl.FLOAT, false, 0, 0]},
			uniform: {},
			data: {aID: []}
		}
	};
	initShadersAndBuffers();
	shaderAddData({aID: [0.0, 1.0]}, "debugShader");
	flush("debugShader");
	try { // if you don't have a divisionOnLoad function or sth idk
		divisionOnLoad(gl);
	} catch (e) {console.warn("divisionOnLoad error:"); console.warn(e);}
}

function debugLine(pos1, pos2, color = [1,0,0,1]) {
	// WARNING: will switch shaders
	useShader("debugShader");
	gl.uniform3f(buffers_d.debugShader.uniform.uPos1, pos1[0], pos1[1], pos1[2]);
	gl.uniform3f(buffers_d.debugShader.uniform.uPos2, pos2[0], pos2[1], pos2[2]);
	gl.uniform4f(buffers_d.debugShader.uniform.uColor, ...color);
	gl.drawArrays(gl.LINES, 0, 2);
}

function loadObj(url, mtlUrl, callback) {
	var res = {"position":[], "normal":[], "color": [], "texCoord": []};
	request(url+"?rand="+Math.random(), function(txt) { // jimmy rigged but it works
		var data = parseOBJ(txt);
		request(mtlUrl+"?rand="+Math.random(), function(mats) {
			var materials = parseMTL(mats);
			for (const geom of data.geometries) {
				res.position = res.position.concat(geom.data.position);
				res.normal = res.normal.concat(geom.data.normal);
				res.texCoord = res.texCoord.concat(geom.data.texcoord);
				res.color = res.color.concat(
					mList(materials[geom.material].diffuseColor.concat([1.0]),geom.data.position.length/3))
				// we don't use any of the mtl specs except for the diffuse color cuz yeah
			}
			callback(res, url);

		});
	});
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
    // const m = keywordRE.exec(line);
	const m = line.split(" ");
	m.unshift(false);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(" ").slice(1);
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
		else if (line.startsWith("map_Kd")) {
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

function loadAnimation(url, mtlUrl, numFrames, callback, debug = false) {
	function dO(a) {if (debug) {console.log(a);}}
	(async function() {
		dO("loading animation");
		var ret = new Array(numFrames+1); ret[0] = "OMFG THIS TOOK ME SO LONG JAVASCRIPT ASYNC IS SO BAD ISTG UR MOM";
		for (var i=1; i<=numFrames; i++) {
			var s = "";
			for (var j=0; j<6-i.toString().length; j++) {
				s += "0";
			}
			s += i.toString();
			loadObj(url+s+".obj", mtlUrl+s+".mtl", function(a, b) {
				var cl = parseInt(b.slice(b.length-9));
				dO("res received");ret[cl] = a;
				var good = true;
				for (var x of ret) {
					dO(cl);
					if (!x) {good = false; break;}
				}
				if (good) {dO("success");callback(ret);}
			})
			dO("loading: " + url + s + ".obj");
		}/*
		dO("enter loop");
		var start = Date.now();
		while (1) {
			dO("loop");
			for (var x of ret) {if (!x) {good = false; break;}}
			if (good) {dO("animation load successful");break;}
			if (Date.now() - start > 5000) {dO("failed loading animation"); return;}
		}*/
	})();
}

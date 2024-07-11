function divisionOnLoad() {}
var allStart = Date.now();
var texW = 2048, texH = 2048;

initGL("canvas");

class AnimationRenderer {
    constructor(data, shaderName) {
        for (var i=0; i<data.length; i++) {
            var a = createRenderBuffer(shaderName);
            if (i == 0) {this.address = a;}
            var d = getRBdata(a, shaderName);
            for (var prop in data[i+1]) {
                d[AnimationRenderer.propertyLookup[shaderName][prop]] = (data[i+1][prop]);
            }
            flushRB(a, shaderName);
        }
        this.frameNum = 10;
        this.length = data.length;
        this.data = data;
        this.shaderName = shaderName;
    }
    bindAttributes() {
        gl.useProgram(buffers_d[this.shaderName].compiled);
        useRenderBuffer(this.address+this.frameNum-1, this.shaderName);
    }
    render(pos, ea) {
        // assumes bindAttributes has already been called
        var old = glMatrix.mat4.create();
        old.set(modelViewMatrix);
        var oldLight = glMatrix.mat3.create();
        oldLight.set(lightingInfo);

        // oml im so smart 😎
        // this basically makes the model view matrix so that the zombie is in the correct position and orientation
        var front = glMatrix.vec3.create();
        front[0] = Math.cos(glMatrix.glMatrix.toRadian(ea[1])) * Math.cos(glMatrix.glMatrix.toRadian(ea[0]));
        front[1] = Math.sin(glMatrix.glMatrix.toRadian(ea[0]));
        front[2] = Math.sin(glMatrix.glMatrix.toRadian(ea[1])) * Math.cos(glMatrix.glMatrix.toRadian(ea[0]));
        glMatrix.vec3.normalize(front, front);
        var posPlusFront = glMatrix.vec3.create();
        glMatrix.vec3.add(posPlusFront, pos, front);
        var look = glMatrix.mat4.create();
        glMatrix.mat4.targetTo(look, pos, posPlusFront, [0,1,0]);
        glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, look);

        // now we must rotate the light direction
        var lightDir = [lightingInfo[0], lightingInfo[1], lightingInfo[2]];
        glMatrix.vec3.rotateX(lightDir, lightDir, [0, 0, 0], glMatrix.glMatrix.toRadian(ea[0]));
        glMatrix.vec3.rotateY(lightDir, lightDir, [0, 0, 0], glMatrix.glMatrix.toRadian(ea[1]));
        lightingInfo[0] = lightDir[0]; lightingInfo[1] = lightDir[1]; lightingInfo[2] = lightDir[2];

        flushUniforms();
        gl.useProgram(buffers_d[this.shaderName].compiled);
        gl.drawArrays(gl.TRIANGLES, 0, this.data[1]["position"].length/3);
        modelViewMatrix = old;
        lightingInfo = oldLight;
        flushUniforms();
    }
    static propertyLookup = {
        "objShader": {
            "position": "aVertexPosition", "color": "aColor", "normal": "aVertexNormal"
        },
        "shaderProgram": {
            "position": "aVertexPosition", "color": "aTexCoord", "normal": "aVertexNormal"
        }
    }
}

bindTexture(loadTexture("./static/zw4/gltf/grass.png?rand_num="+Math.random()), 0);

var models = {nothing: {position: [], color: [], normal: [], texCoord: []}};
var animators = {"zomb_Awajiba": false};
var oTex = {
	"inv": "INVENTORY.png",
	"invPointer": "invselect.png",
    "grass": "grass.png",
};

var itemTexCoords = {
    "Distilled Water": [1792/TEXW, 1280/TEXH],
    "rocc": [1536/TEXW, 1280/TEXH],
    "Wood": [1280/TEXW, 1280/TEXH],
    "Quartz": [1792/TEXW, 1024/TEXH],
    "Iron Ore": [1536/TEXW, 1024/TEXH],
    "Pig Iron": [1280/TEXW, 1024/TEXH],
    "Monocrystalline Silicon": [1024/TEXW, 1024/TEXH],
    "Cobalt-60": [1792/TEXW, 768/TEXH]
};

var objNames = {
    logo: "logo",
    skybox: "skybox",
    gun_MP40: "mp40",
    "gun_MAC M10": "mac10"
};

var hbNames = {
    //
};

var audios = {
	"pop": "./static/worldgentest/gltf/sfx/pop.mp3",
	"tree": "./static/worldgentest/gltf/sfx/tree.mp3",
	"tree2": "./static/worldgentest/gltf/sfx/tree2.mp3",
	"rock1": "./static/worldgentest/gltf/sfx/rockbullet1.mp3",
	"rock2": "./static/worldgentest/gltf/sfx/rockbullet2.mp3",
	"rock3": "./static/worldgentest/gltf/sfx/rockbullet3.mp3",
};

// buffer all the audio
for (var prop in audios) {
    new Audio(audios[prop]);
}

function checker() {}
var loadStart = Date.now();
loadAnimation("./static/zw4/gltf/zombie poses/walk2", "./static/zw4/gltf/zombie poses/walk2", "walk2", 30,
    (res)=>{checker(); animators["zomb_Awajiba"] = new AnimationRenderer(res, "objShader");});

for (var prop in objNames) {
    let pr = prop;
    function cb(res) {models[pr] = res;}
    loadObj("./static/zw4/gltf/"+objNames[prop]+".obj", "./static/zw4/gltf/"+objNames[prop]+".mtl",
        cb);
}

for (var prop in hbNames) {
    let pr = prop;
    function cb(res) {models[pr] = res;}
    loadObjAndHitbox("./static/zw4/gltf/"+hbNames[prop]+".obj", "./static/zw4/gltf/"+hbNames[prop]+".mtl",
        cb);
}

for (var prop in oTex) {
    var img = new Image();
    img.src = ('./static/zw4/gltf/gui/' + oTex[prop]).slice(1);
    oTex[prop] = img;
}

function chk() {
    var good = true;
    for (var prop in objNames) {
        if (!models[prop]) {good = false;}
    }
    for (var prop in hbNames) {
        if (!models[prop]) {good = false;}
    }
    if (good == false) {}

    for (var prop in animators) {
        if (!animators[prop]) {good = false;}
    }
    if (good == false) {}

    for (var prop in oTex) {
        if (!oTex[prop].complete) {
            good = false;
        }
    }
    if (good == false) {}
    if (good) {
        console.log("assets loaded in " + (Date.now() - loadStart));
        console.log("everyting loaded in " + (Date.now() - allStart));
        assetsReady();
        texW = oTex.grass.width;
        texH = oTex.grass.height;
        clearInterval(chkHandle);
    }
}

var chkHandle = setInterval(chk, 70);
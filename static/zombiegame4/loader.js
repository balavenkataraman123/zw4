function divisionOnLoad() {}
var allStart = Date.now();

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
        // oml im so smart 😎
        var front = glMatrix.vec3.create();
        front[0] = Math.cos(glMatrix.glMatrix.toRadian(ea[0])) * Math.cos(glMatrix.glMatrix.toRadian(ea[1]));
        front[1] = Math.sin(glMatrix.glMatrix.toRadian(ea[1]));
        front[2] = Math.sin(glMatrix.glMatrix.toRadian(ea[0])) * Math.cos(glMatrix.glMatrix.toRadian(ea[1]));
        glMatrix.vec3.normalize(front, front);
        var posPlusFront = glMatrix.vec3.create();
        glMatrix.vec3.add(posPlusFront, pos, front);
        var look = glMatrix.mat4.create();
        glMatrix.mat4.targetTo(look, pos, posPlusFront, [0,1,0]);
        glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, look);
        flushUniforms();
        gl.useProgram(buffers_d[this.shaderName].compiled);
        gl.drawArrays(gl.TRIANGLES, 0, this.data[1]["position"].length/3);
        modelViewMatrix = old;
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

bindTexture(loadTexture("/static/zombiegame4/gltf/grass.png?rand_num="+Math.random()), 0);

var models = {elmTree: false, glgun: false, basicbullet: false, rock1: false, rock2: false, rock3: false,
    iron1: false, iron2: false, silicon: false};
var animators = {zombie: false};
var oTex = {
	"resource": "RESOURCE MONITOR.png",
	"inv": "INVENTORY.png",
	"invPointer": "invselect.png",
};

var itemTexCoords = {
    "Distilled Water": [0.875, 0.625],
    "rocc": [0.75, 0.625],
    "Wood": [0.625, 0.625]
};

var objNames = {
    elmTree: "tree1",
    glgun: "GL gun",
    basicbullet: "basicbullet",
    rock1: "rock1",
    rock2: "rock2",
    rock3: "rock3",
    iron1: "iron1",
    iron2: "iron2",
    silicon: "silicon"
};

function checker() {}
var loadStart = Date.now();
loadAnimation("/static/zombiegame4/gltf/zombie poses/walk_", "/static/zombiegame4/gltf/zombie poses/walk_", 30,
    (res)=>{models.zombie = res; checker(); animators.zombie = new AnimationRenderer(res, "objShader");});

for (var prop in objNames) {
    let pr = prop;
    function cb(res) {models[pr] = res;}
    loadObj("/static/zombiegame4/gltf/"+objNames[prop]+".obj", "/static/zombiegame4/gltf/"+objNames[prop]+".mtl",
        cb);
}


for (var prop in oTex) {
    var img = new Image();
    img.src = ('./static/zombiegame4/gltf/gui/' + oTex[prop]).slice(1);
    oTex[prop] = img;
}

function chk() {
    var good = true;
    for (var prop in models) {
        if (!models[prop]) {good = false;}
    }
    if (good == false) {}

    for (var prop in animators) {
        // if (!animators[prop]) {good = false;}
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
        dredy();
    }
}

var chkHandle = setInterval(chk, 70);
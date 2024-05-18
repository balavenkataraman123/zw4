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

bindTexture(loadTexture("./static/zw4/gltf/grass.png?rand_num="+Math.random()), 0);

var models = {nothing: {position: [], color: [], normal: [], texCoord: []}};
var animators = {zombie: false};
var oTex = {
	"resource": "RESOURCE MONITOR.png",
	"inv": "INVENTORY.png",
	"invPointer": "invselect.png",
    "grass": "grass.png",
    "defenses": "DEFENSES.png",
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
    elmTree: "tree1",
    glgun: "GL gun",
    basicbullet: "basicbullet",
    rock1: "rock1",
    rock2: "rock2",
    rock3: "rock3",
    iron1: "iron1",
    iron2: "iron2",
    silicon: "silicon",
    logo: "logo",
    cell1_1: "buildingobj/cell1.1",
    cell1_2: "buildingobj/cell1.2",
    cell2_1: "buildingobj/cell2.1",
    cell2_2: "buildingobj/cell2.2",
    cell3_1: "buildingobj/cell3.1",
    cell3_2: "buildingobj/cell3.2",
    support: "buildingobj/support",
};

var hbNames = {
    hb_cell1_1: "buildingobj/cell1.1.hb",
    hb_cell1_2: "buildingobj/cell1.2.hb",
    hb_cell2_1: "buildingobj/cell2.1.hb",
    hb_cell2_2: "buildingobj/cell2.2.hb",
    hb_cell3_1: "buildingobj/cell3.1.hb",
    hb_cell3_2: "buildingobj/cell3.2.hb",
}

function checker() {}
var loadStart = Date.now();
loadAnimation("./static/zw4/gltf/zombie poses/walk", "./static/zw4/gltf/zombie poses/walk", "walk", 30,
    (res)=>{models.zombie = res; checker(); animators.zombie = new AnimationRenderer(res, "objShader");});

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
        dredy();
    }
}

var chkHandle = setInterval(chk, 70);
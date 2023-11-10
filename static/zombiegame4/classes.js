Array.prototype.removeElement = function(el) {
    for (var i=0; i<this.length; i++) {
        if (this[i] === el) {this.splice(i, 1);}
    }
}
Array.prototype.alist = function(n) {
    var ret  = [];
    for (var x of this) {
        ret.push(x + n);
    }
    return ret;
}

var physicsObjects = [];
var blanketObjects = [];
var items = [];
var zombies = [];
var bullets = [];
// aint no way you have found a wild physics engine
class PhysicsObject {
    constructor(x, y, z, dx, dy, dz, kin, add = true) {
        // very simple physics engine, assumes AABB with x, y, z are the MIDDLE
        // when doing non-AABB collision we assume that the point is at the bottom middle
        this.pos = [x, y, z];
        this.vel = [0, 0, 0];
        this.ignores = new Set();
        this.dx = dx; this.dy = dy; this.dz = dz;
        this.kinematic = kin;
        if (add) {physicsObjects.push(this);}
    }
    drawBox(c = [1,0,0,1]) {
        var tp = this.pos;
        var p = [
            [tp[0]-this.dx, tp[1]-this.dy, tp[2]-this.dz], // ---
            [tp[0]-this.dx, tp[1]+this.dy, tp[2]-this.dz], // -+-
            [tp[0]+this.dx, tp[1]-this.dy, tp[2]-this.dz], // +--
            [tp[0]+this.dx, tp[1]+this.dy, tp[2]-this.dz], // ++-
            [tp[0]+this.dx, tp[1]-this.dy, tp[2]+this.dz], // +-+
            [tp[0]+this.dx, tp[1]+this.dy, tp[2]+this.dz], // +++
            [tp[0]-this.dx, tp[1]-this.dy, tp[2]+this.dz], // --+
            [tp[0]-this.dx, tp[1]+this.dy, tp[2]+this.dz]  // -++
        ]
        debugLine(p[0], p[1], c); debugLine(p[2], p[3], c); debugLine(p[4], p[5], c); debugLine(p[6], p[7], c);
        debugLine(p[1], p[3], c); debugLine(p[3], p[5], c); debugLine(p[5], p[7], c); debugLine(p[7], p[1], c);
        debugLine(p[1-1], p[3-1], c); debugLine(p[3-1], p[5-1], c); debugLine(p[5-1], p[7-1], c); debugLine(p[7-1], p[1-1], c);
    }
    onCollision(o) {}
    onBlanketCollision(o) {}
    static GlobalGravity = 0.01;
    static friction = 0.97; // inverse cuz multiply by friction
    static checkCollideAABB(a1, a2, dt) {
        if (a1.kinematic && a2.kinematic) {return;}
        if (a1.ignores.has(a2.constructor.name) || a2.ignores.has(a1.constructor.name)) {return;}
        // returns bool and assigns a1 and a2's positions and velocities automatically.
        if (a1.kinematic && !a2.kinematic) {
            [a1, a2] = [a2, a1]; // if one of them is kinematic, it will always be a2.
        }
        var ret = {colliding: false, suggestedPos: [NaN, NaN, NaN]};
        var xdist = Math.abs(a1.pos[0] - a2.pos[0]) - (a1.dx + a2.dx);
        var ydist = Math.abs(a1.pos[1] - a2.pos[1]) - (a1.dy + a2.dy);
        var zdist = Math.abs(a1.pos[2] - a2.pos[2]) - (a1.dz + a2.dz);
        if (
            xdist < 0 && ydist < 0 && zdist < 0
        ) {
            ret.colliding = true;
            a1.onCollision(a2); a2.onCollision(a1);
            var m = Math.max(xdist, ydist, zdist);
            if (a2.kinematic) {
                if (m == xdist) {
                    a1.pos[0] += -Math.abs(a1.pos[0] - a2.pos[0]) / (a1.pos[0] - a2.pos[0]) * xdist;
                    a1.vel[0] = 0;
                }
                else if (m == ydist) {
                    a1.pos[1] += -Math.abs(a1.pos[1] - a2.pos[1]) / (a1.pos[1] - a2.pos[1]) * ydist;
                    a1.vel[1] = 0;
                }
               else if (m == zdist) {
                    a1.pos[2] += -Math.abs(a1.pos[2] - a2.pos[2]) / (a1.pos[2] - a2.pos[2]) * zdist;
                    a1.vel[2] = 0;
                }
            } else {
                if (m == xdist) {
                    a1.pos[0] += -Math.abs(a1.pos[0] - a2.pos[0]) / (a1.pos[0] - a2.pos[0]) * xdist/2;
                    a2.pos[0] += Math.abs(a1.pos[0] - a2.pos[0]) / (a1.pos[0] - a2.pos[0]) * xdist/2;
                    a1.vel[0] = 0; a2.vel[0] = 0;
                }
                else if (m == ydist) {
                    a1.pos[1] += -Math.abs(a1.pos[1] - a2.pos[1]) / (a1.pos[1] - a2.pos[1]) * ydist/2;
                    a2.pos[1] += Math.abs(a1.pos[1] - a2.pos[1]) / (a1.pos[1] - a2.pos[1]) * ydist/2;
                    a1.vel[1] = 0; a2.vel[1] = 0;
                }
               else if (m == zdist) {
                    a1.pos[2] += -Math.abs(a1.pos[2] - a2.pos[2]) / (a1.pos[2] - a2.pos[2]) * zdist/2;
                    a2.pos[2] += Math.abs(a1.pos[2] - a2.pos[2]) / (a1.pos[2] - a2.pos[2]) * zdist/2;
                    a1.vel[2] = 0; a2.vel[2] = 0;
                }
            }
            return true;
        }
        return false;
    }
}

class BlanketObject {
    constructor(genFunc, xstart, xend, ystart, yend, add = true) {
        // a blanket like thing that can collide
        // make sure genFunc is a fast function or else performance go down into yo mom's a__
        this.genFunc = genFunc;
        this.xstart = xstart;
        this.xend = xend;
        this.zstart = ystart;
        this.zend = yend;
        if (add) {blanketObjects.push(this);}
    }
    onCollision() {}
    static checkCollideAABB(blanket, aabb, dt) {
        // returns an Object
        // {colliding: bool, suggestedPos: Array(3)}
        var ret = {colliding: false, suggestedPos: [NaN, NaN, NaN]};
        var height = blanket.genFunc(aabb.pos[0], aabb.pos[2]);
        if (aabb.pos[0] > blanket.xstart && aabb.pos[0] < blanket.xend &&
            aabb.pos[2] > blanket.zstart && aabb.pos[2] < blanket.zend &&
            aabb.pos[1] - aabb.dy/2 < height && aabb.pos[1] + aabb.dy/2 > height) {
            ret.colliding = true;
            aabb.onBlanketCollision(blanket, dt);
            blanket.onCollision(aabb, dt);
            ret.suggestedPos = aabb.pos;
            if (aabb.pos[1] - height > 0) {
                ret.suggestedPos[1] = height + aabb.dy/2;
            } else {
                ret.suggestedPos[1] = height - aabb.dy/2;
            }
        }
        return ret;
    }
}

class Player extends PhysicsObject {
    constructor() {
        super(0, 10, 0, 2, 2, 2);
        this.yaw = 0.0; this.pitch = 0.0;
        this.cameraFront = glMatrix.vec3.create();
        this.cameraUp = glMatrix.vec3.fromValues(0, 1, 0);
        this.jumpPower = 0.02;
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 1;
        this.invSelect = 0;
        this.avgPos = [0, 10, 0];
        this.inv = [{name: "GL Gun", model: models.glgun}, false, false, false, false];
        this.selected = this.inv[0];
        this.iframe = false;
        this.resources = {
            "Wood": 0, "rocc": 0, "Distilled Water": 0
        };
    }
    takeDamage(damage) {
        if (!this.iframe) {
            this.health -= damage;
            this.iframe = true;
            var t = this;
            setTimeout(function() {t.iframe = false;}, 500);
        }
    }
    update() {
        this.selected = this.inv[this.invSelect]; // avoid typing so much
        const latencyFactor = 0.03; // how much the avgPos lags behind the pos
        for (var i=0; i<3; i++) {
            this.avgPos[i] = this.avgPos[i] * (1-latencyFactor) + this.pos[i] * latencyFactor;
        }
    }
}

class Item extends PhysicsObject {
    constructor(pos = [0,12,0], name = "potato", texCoordStart = [0,0], texCoordWidth = [0.1, 0.1], size = 0.5, add = true) {
        super(pos[0], pos[1], pos[2], 0.5, 0.5, 0.5, false);
        this.pos = pos;
        size /= 2;
        this.size = size;
        this.texCoordStart = texCoordStart;
        this.texCoordWidth = texCoordWidth;
        this.tcsAdj = [this.texCoordStart[0], this.texCoordStart[1] + this.texCoordWidth[1]];
        this.tcwAdj = [this.texCoordWidth[0], -this.texCoordWidth[1]]
        this.name = name;
        if (add) {
            items.push(this);
            this.refreshData(pos);
            flushRB(Item.address, "billboardShader");
        }
    }
    refreshData() {
        var size = this.size;
        var data = getRBdata(Item.address, "billboardShader");
        var texCoordStart = this.tcsAdj;
        var texCoordWidth = this.tcwAdj;
        data.aCenterOffset = data.aCenterOffset.concat(mList(this.pos, 6));
        data.aCorner = data.aCorner.concat([-size, -size, -size, size, size, -size, -size, size, size, -size, size, size]);
        data.aTexCoord = data.aTexCoord.concat([texCoordStart[0], texCoordStart[1], texCoordStart[0], texCoordStart[1] + texCoordWidth[1],
            texCoordStart[0] + texCoordWidth[0], texCoordStart[1], texCoordStart[0], texCoordStart[1] + texCoordWidth[1], texCoordStart[0] + texCoordWidth[0],
            texCoordStart[1], texCoordStart[0] + texCoordWidth[0], texCoordStart[1] + texCoordWidth[1]]);
    }
    onCollision(aabb) {
        if (aabb == player) {
            if (player.resources[this.name] !== undefined) {
                player.resources[this.name]++;
                for (var i=0; i<items.length; i++) {
                    if (items[i] == this) {
                        items.splice(i, 1);
                        break;
                    }
                }
                for (var i=0; i<physicsObjects.length; i++) {
                    if (physicsObjects[i] == this) {
                        physicsObjects.splice(i, 1);
                        break;
                    }
                }
                new Audio(audios.pop).play();
            }
        }
    }
    static address;
    static init() {
       Item.address = createRenderBuffer("billboardShader");
    }
    static update() {
        var d = getRBdata(Item.address, "billboardShader");
        for (var prop in d) {
            d[prop] = [];
        }
        for (var it of items) {
            it.refreshData();
        }
        flushRB(Item.address, "billboardShader");
    }
}

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

class Zombie extends PhysicsObject {
    constructor(x, y, z, dx, dy, dz, animation, speed, damage, health, add = true) {
        speed /= 10;
        super(x, y, z, dx, dy, dz, false);
        this.ignores.add("Item");
        this.animation = animation; this.speed = speed; this.damage = damage;
        this.angles = [0, 0];
        this.attacking = false;
        this.health = health;
        if (add) {zombies.push(this);}
    }
    static update(dt) {
        var deletionIndices = [];
        var index = 0; // most convoluted way
        for (var zomb of zombies) {
            zomb.angles = [Math.atan2(player.avgPos[2] - zomb.pos[2], player.avgPos[0] - zomb.pos[0]) * 180/Math.PI-90, zomb.attacking?10:0];
            var diff = glMatrix.vec3.create();
            glMatrix.vec3.subtract(diff, player.pos, zomb.pos);
            var normalized = glMatrix.vec3.create();
            glMatrix.vec3.normalize(normalized, diff);
            glMatrix.vec3.scale(normalized, normalized, zomb.speed * dt);
            glMatrix.vec3.add(zomb.vel, normalized, zomb.vel);
            if (zomb.health <= 0) {
                physicsObjects.removeElement(zomb);
                zombies.removeElement(zomb);
            }

            zomb.render();
            index++;
        }
    }
    render() {
        this.animation.render(this.pos, this.angles);
    }
    onCollision(obj) {
        if (obj == player) {
            player.takeDamage(this.damage);
        }
        if (player.health <= 0) {
            ded(playerName + " died of zombie ligma disease (ZLD).");
        }
    }
}

class Bullet extends PhysicsObject {
    constructor(x, y, z, speed, damage, front, model, add = true) {
        super(x, y, z, 0.5, 0.5, 0.5, false);
        this.speed = speed; this.damage = damage; this.front = [front[0], front[1], front[2]]; this.model = model;
        this.timer = 10000;
        if (add) {bullets.push(this);}
    }
    static address;
    static init() {
        Bullet.address = createRenderBuffer("transformShader");
    }
    static update(dt) {
        var datas = getRBdata(Bullet.address, "transformShader");
        datas.aVertexPosition = []; datas.aColor = []; datas.aVertexNormal = []; datas.aTranslation = []; datas.aYRot = [];
        var index = 0;
        for (var bul of bullets) {
            bul.timer -= dt;
            var adjFront = glMatrix.vec3.create();
            glMatrix.vec3.scale(adjFront, bul.front, bul.speed * dt);
            bul.vel = adjFront;
            if (glMatrix.vec3.dist(bul.pos, player.pos) > 50 || bul.timer < 0) {
                bullets.removeElement(bul);
                physicsObjects.removeElement(bul);
            }
            datas.aVertexPosition = datas.aVertexPosition.concat(bul.model.position);
            datas.aColor = datas.aColor.concat(bul.model.color);
            datas.aVertexNormal = datas.aVertexNormal.concat(bul.model.normal);
            datas.aTranslation = datas.aTranslation.concat(mList([bul.pos[0], bul.pos[1], bul.pos[2]], bul.model.position.length/3));
            datas.aYRot = datas.aYRot.concat(mList([0], bul.model.position.length/3));
            index++;
        }
        flushRB(Bullet.address, "transformShader");
    }
    onCollision(obj) {
        if (obj.constructor.name == "Zombie") {
            obj.health -= this.damage;
        }
    }
}

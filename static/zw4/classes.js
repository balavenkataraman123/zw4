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

var bullets = [], items = [], zombies = [];

class Gun {
    static addresses = {};
    static init() {
        for (var name in gunSpecs) {
            Gun.addresses[name] = createRenderBuffer("objShader");
            var model = models["gun_" + name];
            var datas = getRBdata(Gun.addresses[name], "objShader");
            // since datas is empty, we can use .concat() without any risk of quadratic time complexity
            datas.aVertexPosition = datas.aVertexPosition.concat(model.position);
            datas.aVertexNormal = datas.aVertexNormal.concat(model.normal);
            datas.aColor = datas.aColor.concat(model.color);
            flushRB(Gun.addresses[name], "objShader");
        }
    }
    constructor(name) {
        this.name = name;
        this.specs = JSON.parse(JSON.stringify(gunSpecs[name]));
        this.model = models["gun_" + name];
        this.firingDelay = 0;
        this.roundsRemaining = 0;
        this.reloadRemaining = this.specs.reloadTime;
        this.type = "gun";
        this.currentRecoil = 0;
    }
    update(dt, focused) {
        if (focused) {
            // if the player is selecting this gun, then we can reload
            var oldRR = this.reloadRemaining;
            this.reloadRemaining -= dt;
            if (oldRR > 0 && this.reloadRemaining <= 0) {
                // we finished reloading
                this.roundsRemaining += this.specs.roundsPerReload;
            }
        }
        this.firingDelay -= dt;
        if (this.roundsRemaining == 0 && this.reloadRemaining < 0) {
            this.reloadRemaining = this.specs.reloadTime; // we need to reload
            new Audio("./static/zw4/sfx/reload.mp3").play();
        }
        this.currentRecoil *= 0.8;
    }
    recoil() {
        this.currentRecoil = 0.5;
    }
    canShoot() { // returns true if the player can shoot right now and then shoots
        if (this.firingDelay <= 0 && this.reloadRemaining <= 0) {
            this.roundsRemaining--;
            this.firingDelay = this.specs.delay;
            return true;
        }
        return false;
    }
    render(sighting) {
        gl.useProgram(buffers_d.objShader.compiled);
        useRenderBuffer(Gun.addresses[this.name], "objShader");
        var oldMVM = new Float32Array(modelViewMatrix);
        if (sighting) {
            glMatrix.mat4.fromTranslation(modelViewMatrix, [0, 0, 0 + this.currentRecoil]);
        } else {
            glMatrix.mat4.fromTranslation(modelViewMatrix, [-0.35, -0.1, -0.75 + this.currentRecoil]);
        }
        gl.uniformMatrix4fv(buffers_d.objShader.uniform.uModelViewMatrix, false, modelViewMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, getRBdata(Gun.addresses[this.name], "objShader").aVertexPosition.length/3);
        modelViewMatrix = oldMVM;
        gl.uniformMatrix4fv(buffers_d.objShader.uniform.uModelViewMatrix, false, modelViewMatrix);
    }
}

class NothingGun { // basically an empty inv slot
    constructor(name) {
        this.name = "empty";
        this.type = "nothing";
    }
    render() {}
    canShoot() {return false;}
    update() {}
}

class Item extends PhysicsObject {
    constructor(x, y, z, thing, type, add = true) {
        super(x, y, z, 0.2, 0.2, 0.2, false, true, true);
        this.type = type;
        this.thing = thing;
        this.t = 0; // used for the rotation effect, in seconds
        if (add) items.push(this);
        // hb2 is used to give it a non-trigger collider, thus, it will not fall through the ground or similar
        this.hb2 = new PhysicsObject(x, y, z, 0.19, 0.19, 0.19, false, false, true);
    }
    render() {
        if (this.type == "gun") {
            gl.useProgram(buffers_d.objShader.compiled);
            useRenderBuffer(Gun.addresses[this.thing], "objShader");
            var oldMVM = new Float32Array(modelViewMatrix);
            glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, this.pos);
            glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, [0, Math.sin(this.t*3) * 0.1 + 0.2, 0]);
            glMatrix.mat4.rotateY(modelViewMatrix, modelViewMatrix, this.t);
            gl.uniformMatrix4fv(buffers_d.objShader.uniform.uModelViewMatrix, false, modelViewMatrix);
            gl.drawArrays(gl.TRIANGLES, 0, getRBdata(Gun.addresses[this.thing], "objShader").aVertexPosition.length/3);
            modelViewMatrix = oldMVM;
            gl.uniformMatrix4fv(buffers_d.objShader.uniform.uModelViewMatrix, false, modelViewMatrix);
        }
    }
    onCollision(obj, n) {
        if (this.type == "gun") {
            if (obj.constructor.name == "Player") {
                if (player.selected.name == "empty") {
                    player.inv[player.invIndex] = new Gun(this.thing);
                    this.removed = true;
                } else if (player.inv[0].name == "empty") {
                    player.inv[0] = new Gun(this.thing);
                    this.removed = true;
                } else if (player.inv[1].name == "empty") {
                    player.inv[1] = new Gun(this.thing);
                    this.removed = true;
                } else {
                    oCtx.fillStyle = "black";
                    oCtx.fillRect(oW * 0.4, oH * 0.03, oW * 0.2, oH * 0.07);
                    oCtx.textAlign = "center";
                    oCtx.fillStyle = "white";
                    oCtx.font = (oH * 0.06) + "px Impact";
                    oCtx.fillText("F - " + this.thing, oW * 0.5, oH * 0.08);
                    if (divisDownKeys["KeyF"]) {
                        player.inv[player.invIndex] = new Gun(this.thing);
                        this.removed = true;
                    }
                }
            }
        }
    }
    static update(dt) {
        items = items.filter((it)=>!it.removed);
        for (var ib of items) {
            ib.pos = ib.hb2.pos;
            ib.vel = [0, 0, 0];
            ib.t += dt/1000;
        }
    }
    static renderAll() {
        for (var ib of items) {
            ib.render();
        }
    }
}

class Bullet {
    static address;
    static maxDist = 50; // max distance from origin before bullets are deleted
    static init() {
        this.address = createRenderBuffer("transformShader");
    }
    constructor(color, pos, front, yaw, pitch, width, length, speed, damage, numBoxes, add = true) {
        this.color = color; this.width = width; this.maxLength = length; this.speed = speed;
        this.front = new Float32Array(front); this.yaw = yaw; this.pitch = pitch;
        this.actualLength = 0;
        this.hitboxes = [];
        this.pos = pos;
        this.damage = damage;
        let bul = this, dmg = damage; // create a function closure
        for (var i=0; i<numBoxes; i++) {
            this.hitboxes.push(new PhysicsObject(pos[0], pos[1], pos[2], width, width, width, false, true, true));
            this.hitboxes[i].isBullet = true;
            this.hitboxes[i].onCollision = function(o, n) {if (!o.isBullet && !bul.removed) {
                for (var hb of bul.hitboxes) {
                    hb.removed = true;
                }
                bul.removed = true;
                if (o.takeDamage) {
                    o.takeDamage(dmg);
                }
            }};
        }
        if (add) {
            bullets.push(this);
        }
    }
    static update(dt) {
        bullets = bullets.filter((b)=>!b.removed);
        var datas = getRBdata(Bullet.address, "transformShader");
        for (var prop in datas) {datas[prop] = [];}
        for (var bul of bullets) {
            for (var i=0; i<bul.hitboxes.length; i++) {
                var hb = bul.hitboxes[i];
                glMatrix.vec3.add(hb.vel, hb.vel, glMatrix.vec3.scale([0,0,0], PhysicsObject.GlobalGravity, -dt/1000)); // no bullet drop
                hb.pos = glMatrix.vec3.add([0, 0, 0], bul.pos, glMatrix.vec3.scale([0, 0, 0], bul.front, -bul.actualLength * i / bul.hitboxes.length));
            }
            var scaledFront = glMatrix.vec3.create();
            glMatrix.vec3.scale(scaledFront, bul.front, bul.speed * dt / 1000);
            glMatrix.vec3.add(bul.pos, bul.pos, scaledFront);
            bul.actualLength += bul.speed * dt / 1000;
            bul.actualLength = Math.min(bul.actualLength, bul.maxLength);
            if (glMatrix.vec3.distance(player.cameraPos, bul.pos) > Bullet.maxDist) {
                bul.removed = true;
                for (var hb of bul.hitboxes) {hb.removed = true;}
            }
            bul.concatDataTo(datas);
        }
        flushRB(Bullet.address, "transformShader");
    }
    static renderAll() {
        gl.useProgram(buffers_d.transformShader.compiled);
        useRenderBuffer(Bullet.address, "transformShader");
        gl.drawArrays(gl.TRIANGLES, 0, getRBdata(Bullet.address, "transformShader").aVertexPosition.length/3);
    }
    concatDataTo(obj) {
        // concats our position, normal and color data to the obj
        // (we are using transformShader)
        for (var i=0; i<cubePositions.length; i+=3) {
            obj.aVertexPosition.push(cubePositions[i] * this.width);
            obj.aVertexPosition.push(cubePositions[i+1] * this.width);
            obj.aVertexPosition.push(Math.min(cubePositions[i+2], 0) * this.actualLength);

            obj.aVertexNormal.push(cubeNormals[i]);
            obj.aVertexNormal.push(cubeNormals[i+1]);
            obj.aVertexNormal.push(cubeNormals[i+2]);

            obj.aColor.push(this.color[0]); obj.aColor.push(this.color[1]); obj.aColor.push(this.color[2]); obj.aColor.push(this.color[3]);

            obj.aYRot.push(glMatrix.glMatrix.toRadian(-this.yaw + 90)); obj.aXRot.push(glMatrix.glMatrix.toRadian(-this.pitch));
            obj.aTranslation.push(this.pos[0]); obj.aTranslation.push(this.pos[1]); obj.aTranslation.push(this.pos[2]);
        }
    }
    static fireBullet(pos, yaw, pitch, spread, color, width, length, speed, damage, numBoxes) {
        var adjYaw = yaw + (Math.random() * 2 - 1) * spread;
        var adjPitch = pitch + (Math.random() * 2 - 1) * spread;
        var rotatedFront = glMatrix.vec3.create();
        rotatedFront[0] = Math.cos(glMatrix.glMatrix.toRadian(adjYaw)) * Math.cos(glMatrix.glMatrix.toRadian(adjPitch));
        rotatedFront[1] = Math.sin(glMatrix.glMatrix.toRadian(adjPitch));
        rotatedFront[2] = Math.sin(glMatrix.glMatrix.toRadian(adjYaw)) * Math.cos(glMatrix.glMatrix.toRadian(adjPitch));
        return new Bullet(color, pos,
            rotatedFront, adjYaw,
            adjPitch, width,
            length, speed, damage, numBoxes, true);
    }
}

class Zombie extends PhysicsObject {
    // an interesting caveat about zombie rotation code is that in all the zombie models,
    // the zombie must face in the +z (actually +y because blender uses y as z) direction
    // this is because in the OpenGL coordinates, the z axis is the one that points towards
    // the player.
    constructor(x, y, z, type, pathfinder, aggroWidth, add = true) {
        super(x, y, z, zombieSpecs[type].dx, zombieSpecs[type].dy, zombieSpecs[type].dz, false, false, true);
        this.anim = animators["zomb_" + type];
        this.type = type;
        this.gun = new Gun(zombieSpecs[type].gun);
        this.pathfinder = pathfinder;
        this.specs = zombieSpecs[type];
        this.gun.specs.delay *= 3; // basically, we need to nerf the zombies
        this.yaw = 0; this.pitch = 0;
        if (add) {
            zombies.push(this);
        }
        this.frameNum = 0;
        this.health = zombieSpecs[type].health;
        this.aggroWidth = aggroWidth;
        this.aggroed = false;
        // aggro trigger hitbox
        this.aggroHitbox = new PhysicsObject(x, y, z, aggroWidth[0], aggroWidth[1], aggroWidth[2], true, true, true);
        this.aggroHitbox.useAllowList = true;
        this.aggroHitbox.collidesWith.add("Player");
        let zo = this; // generate a closure for the onCollision function
        this.aggroHitbox.onCollision = function(o, normal) {
            if (o == player && !zo.aggroed) {
                zo.aggroed = true;
                if (Math.random() < 0.5 || true) {
                    setTimeout(function() {
                        new Audio("./static/zw4/sfx/ambient_" + (Math.floor(Math.random() * 6)+1) + ".mp3").play();
                    }, Math.random() * 2000 + 500);
                }
            }
        }
    }
    static update(dt) {
        zombies = zombies.filter((z)=>!z.removed);

        for (var zomb of zombies) {
            zomb.frameNum += 0.03 * dt;
            zomb.vel[1] = 0; zomb.pos[1] = 2.5;

            var bulletPos = glMatrix.vec3.create(); // get the zombie's shooting position
            glMatrix.vec3.add(bulletPos, zomb.pos, zomb.specs.firePos);
            glMatrix.vec3.add(bulletPos, bulletPos, [0, -zomb.dy, 0]); // since firePos is relative to the zombie's feet but zomb.pos is the zombie's center

            // compute yaw and pitch based on the shooting position
            zomb.yaw = Math.atan2((player.pos[2] - zomb.pos[2]), (player.pos[0] - zomb.pos[0])) * 180 / Math.PI;
            var dist = Math.sqrt(Math.pow(player.pos[0]-zomb.pos[0], 2) + Math.pow(player.pos[2]-zomb.pos[2], 2));
            zomb.pitch = Math.atan2(player.pos[1] - zomb.pos[1],
                dist) * 180 / Math.PI;
            // aigh now we adjust it don't ask why
            // zomb.yaw -= Math.atan2(zomb.specs.firePos[2], dist) * 180 / Math.PI;
            // zomb.pitch -= 16 * Math.pow(0.93, dist);
            
                if (isNaN(zomb.yaw)) {
                // basically, if they are aligned on an axis, it may result in NaN
                zomb.yaw = 0;
            }
            if (zomb.aggroed) {
                // pathfind
                glMatrix.vec3.add(zomb.pos, zomb.pos, glMatrix.vec3.scale([0, 0, 0],
                    zomb.pathfinder.update(dt, zomb.pos), zombieSpecs[zomb.type].speed * dt/1000));
                
                // fire
                zomb.gun.update(dt, true);
                if (zomb.gun.canShoot()) { // zombies shoot randomly to prevent them all shooting at the same time
                    var sp = zomb.gun.specs;
                    new Audio("./static/zw4/sfx/fire.mp3").play();
                    // now we rotate bulletPos around the zombie's feet
                    // basically, since the zombie's model was rotated around its feet, we need to rotate bulletPos around the feet too
                    glMatrix.vec3.rotateZ(bulletPos, bulletPos, [zomb.pos[0], zomb.pos[1] - zomb.dy, zomb.pos[2]], glMatrix.glMatrix.toRadian(zomb.pitch));
                    glMatrix.vec3.rotateY(bulletPos, bulletPos, [zomb.pos[0], zomb.pos[1] - zomb.dy, zomb.pos[2]], glMatrix.glMatrix.toRadian(-zomb.yaw));

                    var bul = Bullet.fireBullet(bulletPos, zomb.yaw, zomb.pitch,
                        sp.spread, sp.bulletColor, sp.bulletWidth, sp.bulletLength, sp.bulletSpeed, sp.damage, 5);
                    for (var hb of bul.hitboxes) {
                        hb.ignores.add("Zombie"); // so the zombies don't kill themselves by firing
                    }
                }
            }
        }
    }
    takeDamage(amt) {
        this.health -= amt;
        if (this.health <= 0) {
            this.removed = true;
            player.health += 25;
            player.health = Math.min(player.health, 100);
        }
    }
    render() {
        this.anim.frameNum = Math.floor(this.frameNum) % 30 + 1;
        this.anim.bindAttributes();
        // the subtraction on the y axis is nessecary to make it so that the feet are at the bottom of the hitbox
        // instead of in the middle
        this.anim.render([this.pos[0], this.pos[1] - zombieSpecs[this.type].dy, this.pos[2]],
            [this.pitch, this.yaw]
        );
    }
    static renderAll() {
        for (var zomb of zombies) {
            zomb.render();
        }
    }
}

class Player extends PhysicsObject {
    constructor() {
        super(0, 3, 0, 0.2, 0.85, 0.2, false, false, true);
        this.cameraFront = glMatrix.vec3.fromValues(0, 4, 0);
        this.cameraUp = glMatrix.vec3.fromValues(0, 1, 0);
        this.cameraPos = glMatrix.vec3.fromValues(0, 4, 1);
        this.yaw = 0; this.pitch = 0;
        this.speed = 3.61;
        this.sprintSpeed = 6;
        this.jumpPower = 4; // 4 m s^-1 when they leave the ground
        this.inv = [new Gun("MP40"), new Gun("MAC M10"), new NothingGun(""), new NothingGun("")];
        this.invIndex = 0;
        this.selected = this.inv[0];
        this.health = 100;
        this.maxHealth = 100;
        this.pathfinder = new BasicDijkstra();
        this.pathfinder.genGrid(0.5, 1.5, 2, 4, [0, 0, 0]);
        this.maxGridCenterDeviation = 10;
    }
    genPathfindingMesh() {
        this.pathfinder.genGrid(0.5, 0.7, 3, 4, [this.pos[0], this.pos[1], this.pos[2]]);
    }
    update(dt) {
        // update selected
        this.selected = this.inv[this.invIndex];

        // calculalte front vector
        var front = glMatrix.vec3.create();
        front[0] = Math.cos(glMatrix.glMatrix.toRadian(this.yaw)) * Math.cos(glMatrix.glMatrix.toRadian(this.pitch));
        front[1] = Math.sin(glMatrix.glMatrix.toRadian(this.pitch));
        front[2] = Math.sin(glMatrix.glMatrix.toRadian(this.yaw)) * Math.cos(glMatrix.glMatrix.toRadian(this.pitch));
        glMatrix.vec3.normalize(this.cameraFront, front);

        // calculate model view matrix
        var target = glMatrix.vec3.create();
        glMatrix.vec3.add(this.cameraPos, this.pos, [0, 0.8, 0]);
        glMatrix.vec3.add(target, this.cameraPos, this.cameraFront);
        modelViewMatrix = glMatrix.mat4.lookAt(modelViewMatrix, this.cameraPos, target, [0, 1, 0]);

        // altitude damage
        if (this.pos[1] < -100 || this.pos[1] > 100) {
            this.health -= 30 * dt/1000;
        }

        // if the player strayed too far from the last grid center, generate a new pathfinding mesh
        if (glMatrix.vec3.dist(this.pathfinder.center, this.pos) > this.maxGridCenterDeviation) {
            (async function() {
                player.genPathfindingMesh();
            })();
        }
    }
    jump() {
        this.vel[1] += this.jumpPower;
    }
    takeDamage(dmg) {
        this.health -= dmg;
    }
    onCollision(obj, normal) {
        if (normal == "y" && obj.pos[1] < this.pos[1] && divisDownKeys["Space"]) {
            this.jump();
        }
    }
}

class Level {
    constructor(data) {
        this.data = data;
    }
    load() {
        // adds all the data to the physicsObjects array, the shader buffers, etc
        shaderAddData({
            aVertexPosition: this.data.position,
            aVertexNormal: this.data.normal,
            aTexCoord: this.data.texCoord
        }, "shaderProgram");
        flush("shaderProgram");
    
        for (var hb of this.data.hitboxes) {
            new PhysicsObject(hb[0][0], hb[0][1], hb[0][2], hb[1][0], hb[1][1], hb[1][2], true, false, true);
        }

        for (var zomb of this.data.zombies) {
            new Zombie(zomb.pos[0], zomb.pos[1], zomb.pos[2], zomb.type, new AwajibaPathfinder(), [zomb.dx, zomb.dy, zomb.dz]);
        }
    
        player.genPathfindingMesh();
    }
}

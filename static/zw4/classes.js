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
            this.reloadRemaining = this.specs.reloadTime;
        }
        this.currentRecoil *= 0.8;
    }
    recoil() {
        this.currentRecoil = 0.5;
    }
    canShoot() { // returns true if the player can shoot right now
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
    constructor(x, y, z, type, pathfinder, add = true) {
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
    }
    static update(dt) {
        zombies = zombies.filter((z)=>!z.removed);

        for (var zomb of zombies) {
            zomb.frameNum += 0.03 * dt;
            zomb.vel[1] = 0; zomb.pos[1] = 2.2;

            var bulletPos = glMatrix.vec3.create(); // get the zombie's shooting position
            glMatrix.vec3.add(bulletPos, zomb.pos, zomb.specs.firePos);
            glMatrix.vec3.add(bulletPos, bulletPos, [0, -zomb.dy, 0]); // since firePos is relative to the zombie's feet but zomb.pos is the zombie's center

            // compute yaw and pitch based on the shooting position
            zomb.yaw = Math.atan2((player.pos[2] - zomb.pos[2]), (player.pos[0] - zomb.pos[0])) * 180 / Math.PI;
            var dist = Math.sqrt(Math.pow(player.pos[0]-zomb.pos[0], 2) + Math.pow(player.pos[2]-zomb.pos[2], 2));
            zomb.pitch = Math.atan2(player.pos[1] - zomb.pos[1],
                dist) * 180 / Math.PI;
            // aigh now we adjust it don't ask why
            zomb.yaw -= Math.atan2(zomb.specs.firePos[2], dist) * 180 / Math.PI;
            zomb.pitch -= 16 * Math.pow(0.93, dist);
            
                if (isNaN(zomb.yaw)) {
                // basically, if they are aligned on an axis, it may result in NaN
                zomb.yaw = 0;
            }

            // pathfind
            glMatrix.vec3.add(zomb.pos, zomb.pos, glMatrix.vec3.scale([0, 0, 0],
                zomb.pathfinder.update(dt, zomb.pos), zombieSpecs[zomb.type].speed * dt/1000));
            
            // fire
            zomb.gun.update(dt, true);
            if (zomb.gun.canShoot() && Math.random() < 0.3) { // zombies shoot randomly to prevent them all shooting at the same time
                var sp = zomb.gun.specs;
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
    takeDamage(amt) {
        this.health -= amt;
        if (this.health <= 0) {
            this.removed = true;
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
        this.jumpPower = 4; // 4 m s^-1 when they leave the ground
        this.inv = [new Gun("MP40"), new Gun("MAC M10"), new NothingGun(""), new NothingGun("")];
        this.invIndex = 0;
        this.selected = this.inv[0];
        this.health = 100;
        this.maxHealth = 100;
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

class Ground {
    constructor() {
        this.objects = [];
    }
    destruct() {
        for (var o of this.objects) {
            o.removed = true;
        }
    }
}

class GridGround extends Ground {
    constructor(spacing = 10, walkwayWidth = 0.4, walkwayGap = 1.5,
        rows = Math.floor(TerrainRandom.rand() * 5) + 10, cols = Math.floor(TerrainRandom.rand() * 2) + 3,
        tcs_cube = [1024/texW, 1536/texW], tcw_cube = [511/texW, 511/texH],
        tcs_walkway = [1536/texW, 1536/texH], tcw_walkway = [511/texW, 511/texH],
        fogAmount = 0.3) {
        /**
         * @param spacing the space between the centers of the cubes
         * @param walkwayWidth the width of the walkways between the cubes
         * @param walkwayGap the gap between the cube and the walkway
         * @param rows the number of rows of cubes
         * @param cols the number of columns of cubes
         * @param tcs_cube [Number, Number] for the starting texture coordinate of the cubes
         * @param tcw_cube [Number, Number] for the widths of the texture coordinates of the cubes
         * @param tcs_walkway same as tcs_cube but for walkway
         * @param tcw_walkway same as tcw_cube but for walkway
         */
        super();
        this.spacing = spacing; this.walkwayWidth = walkwayWidth; this.walkwayGap = walkwayGap;
        this.rows = rows;
        this.cols = cols;
        this.tcs_cube = tcs_cube; this.tcw_cube = tcw_cube;
        this.tcs_walkway = tcs_walkway; this.tcw_walkway = tcw_walkway;
        this.fogAmount = fogAmount;
    }
    generate() {
        /**
         * +x --->
         * [
         * [start, cube, cube... cube] <<<<< row
         * [ cube, cube, cube...  end]
         * ] ^col
         * start >>>>>>>>>>>>> finish
         */

        this.cubes = [];
        this.walkways = [];

        // generate the cubes array
        for (var r=0; r<this.rows; r++) {
            this.cubes.push([]);
            for (var c=0; c<this.cols; c++) {
                this.cubes[r].push({
                    removed: false,
                    essential: false,
                    texture: [[0, 0], [0.1, 0.1]],
                    size: [1, 1, 1],
                    physicsobject: null
                });
                if (r != this.rows-1) {
                    this.walkways.push({
                        u: [r, c],
                        v: [r+1, c],
                        texture: [[0, 0], [0.1, 0.1]],
                        removed: false,
                        physicsobject: null
                    });
                }
                if (c != this.cols-1) {
                    this.walkways.push({
                        u: [r, c],
                        v: [r, c+1],
                        texture: [[0, 0], [0.1, 0.1]],
                        removed: false,
                        physicsobject: null
                    });
                }
            }
        }

        // do a DFS from beginning node to end node
        var c = 0;
        for (var r=0; r<this.rows; r++) {
            this.cubes[r][c].essential = true;
            if (TerrainRandom.rand() < 0.3 && c != this.rows-1) {
                c++;
            } else
            if (TerrainRandom.rand() < 0.3 && c != 0) {
                c--;
            }
            this.cubes[r][c].essential = true;
        }
        while (c != this.cols/2) {
            this.cubes[this.rows-1][c].essential = true;
            if (c > this.cols/2) {
                c--;
            } else {c++;}
        }

        // remove some cubes
        for (var r=0; r<this.rows; r++) {
            for (var c=0; c<this.cols; c++) {
                if (TerrainRandom.rand() < 0.3 && !this.cubes[r][c].essential) {
                    this.cubes[r][c].removed = true;
                }
            }
        }
        // remove walkways connected to those cubes too
        for (var wk of this.walkways) {
            if (this.cubes[wk.u[0]][wk.u[1]].removed || this.cubes[wk.v[0]][wk.v[1]].removed) {
                wk.removed = true;
            }
        }

        // add non removed cubes to the physicsobjects and buffer
        for (var r=0; r<this.rows; r++) {
            for (var c=0; c<this.cols; c++) {
                if (!this.cubes[r][c].removed) {
                    // attempt to expand it
                    if (TerrainRandom.rand() < 0.5) {
                        // only a 1/2 chance that it is actually expanded
                        if ((!this.cubes[r-1] || this.cubes[r-1][c].removed) && (!this.cubes[r+1] || this.cubes[r+1][c]?.removed)) {
                            this.cubes[r][c].size[0] += TerrainRandom.rand() * 2;
                        }
                        if ((!this.cubes[r][c-1] || this.cubes[r][c-1].removed) && (!this.cubes[r][c+1] || this.cubes[r][c+1]?.removed)) {
                            this.cubes[r][c].size[2] += TerrainRandom.rand() * 2;
                        }
                    }
                    // add to physicsobjects
                    this.cubes[r][c].physicsobject = new PhysicsObject(
                        r * this.spacing,
                        0,
                        c * this.spacing,
                        this.cubes[r][c].size[0],
                        this.cubes[r][c].size[1],
                        this.cubes[r][c].size[2],
                        true, false, true
                    );
                    // add to buffer
                    var pos = JSON.parse(JSON.stringify(cubePositions)); var txc = JSON.parse(JSON.stringify(cubeTexCoord));
                    var norm = JSON.parse(JSON.stringify(cubeNormals));
                    for (var i=0; i<pos.length; i+=3) {
                        pos[i] *= this.cubes[r][c].size[0];
                        pos[i+1] *= this.cubes[r][c].size[1];
                        pos[i+2] *= this.cubes[r][c].size[2];
                        pos[i] += r * this.spacing; pos[i+2] += c * this.spacing;
                    }
                    for (var i=0; i<txc.length; i+=2) {
                        txc[i] *= this.tcw_cube[0];
                        txc[i+1] *= this.tcw_cube[1];
                        txc[i] += this.tcs_cube[0];
                        txc[i+1] += this.tcs_cube[1];
                    }
                    shaderAddData({
                        aVertexPosition: pos,
                        aTexCoord: txc,
                        aVertexNormal: norm,
                    }, "shaderProgram");
                }
            }
            flush("shaderProgram");
        }
        // add non removed walkways to the physicsobjects
        for (var wk of this.walkways) {
            if (wk.removed) continue;
            var dx, dy, dz;
            dy = 0.7;
            if (wk.u[0] == wk.v[0]) {
                dz = Math.abs(wk.u[1] - wk.v[1]) - 2 * this.walkwayGap;
                dx = this.walkwayWidth;
            } else {
                dz = this.walkwayWidth;
                dx = Math.abs(wk.u[0] - wk.v[0]) - 2 * this.walkwayGap;
            }
            wk.physicsobject = new PhysicsObject(
                (wk.u[0] + wk.v[0])/2 * this.spacing,
                0,
                (wk.u[1] + wk.v[1])/2 * this.spacing,
                Math.abs(dx), dy, Math.abs(dz),
                true, false, true
            );

            // add to buffer
            var pos = JSON.parse(JSON.stringify(cubePositions)); var txc = JSON.parse(JSON.stringify(cubeTexCoord));
            var norm = JSON.parse(JSON.stringify(cubeNormals));
            for (var i=0; i<pos.length; i+=3) {
                pos[i] *= dx; pos[i+1] *= dy; pos[i+2] *= dz;
                pos[i] += wk.physicsobject.pos[0];
                pos[i+1] += wk.physicsobject.pos[1];
                pos[i+2] += wk.physicsobject.pos[2];
            }
            for (var i=0; i<txc.length; i+=2) {
                txc[i] *= this.tcw_walkway[0];
                txc[i+1] *= this.tcw_walkway[1];
                txc[i] += this.tcs_walkway[0];
                txc[i+1] += this.tcs_walkway[1];
            }
            shaderAddData({
                aVertexPosition: pos,
                aTexCoord: txc,
                aVertexNormal: norm,
            }, "shaderProgram");
            flush("shaderProgram");
        }
    }
}

var gr = new GridGround();
gr.generate();


/* benchmark
for (var j=0; j<100; j+=10) {
for (var i=10; i<200; i+=10) {
    new PhysicsObject(i, 0, j, 4, 1, 4, true, false, true);
    new PhysicsObject(i-4, 10, j-4, 0.5, 6, 0.5, false, false, true);
}
}*/
/*
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
*/
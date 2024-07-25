// IHP physics engine
// simple and effective
// all 3D physics engines for javascript are jokes
// OIMO.js: joke documentation that was sparse, and half of it was wrong (i.e some functions don't even exist)
//  (had to figure out how it worked by inspecting the demos and hacking them)
// Cannon.js:
// 1. Joke documentation that had at most one sentence to describe functions
//  a. "defined locally in the body frame" wtf does this even mean
//  b. "apply a force": for how long? one frame? forever? does the force get damped?
// 2. Objects move on their own with no force applied
//  a. the player keeps travelling in a circle by itself
//  b. applyImpulse is jittery and sometimes works and sometimes shoots the player off
//  c. 0.02 m s^-2 of gravity shoots the player 4 kilometers in 5 seconds (supersonic speed)
//  d. if damping is set to 0, even if there is no force on the player it will still shoot off at supersonic speed
//
// thus, I will make my own physics engine that is slower and doesn't support complicated features
// but at least it works

var physicsObjects = [];
var lastPOsize = 0;
var physicsCloseTo = new Map();
var physicsCloseTo_kin = new Map();
var SECTORSIZE = 3;

class PhysicsObject {
    constructor(x, y, z, dx, dy, dz, kin, trigger = false, add = true) {
        // very simple physics engine, assumes AABB with x, y, z are the MIDDLE
        this.pos = [x, y, z];
        this.vel = [0, 0, 0];
        this.ignores = new Set();
        this.collidesWith = new Set();
        this.useAllowList = false; // if false, then we collide with everything except this.ignores, otherwise, we don't collide with anything other than this.collidesWith
        this.trigger = trigger;
        this.dx = dx; this.dy = dy; this.dz = dz;
        this.kinematic = kin;
        this.removed = false;
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
        IHP.debugLine(p[0], p[1], c); IHP.debugLine(p[2], p[3], c); IHP.debugLine(p[4], p[5], c); IHP.debugLine(p[6], p[7], c);
        IHP.debugLine(p[1], p[3], c); IHP.debugLine(p[3], p[5], c); IHP.debugLine(p[5], p[7], c); IHP.debugLine(p[7], p[1], c);
        IHP.debugLine(p[1-1], p[3-1], c); IHP.debugLine(p[3-1], p[5-1], c); IHP.debugLine(p[5-1], p[7-1], c); IHP.debugLine(p[7-1], p[1-1], c);
    }
    onCollision(o, normal) {}
    static checkCollision(pos1, pos2, w1, w2) { // pos1 and pos2 are the CENTER of the objects
        // doesn't do anything, just checks
        var colliding = 0;
        for (let i=0; i<3; i++) {
            if (Math.abs(pos1[i] - pos2[i]) < (w1[i] + w2[i])) {colliding += 1;}
        }
        return colliding == 3;
    }
    static GlobalGravity = glMatrix.vec3.fromValues(0, -10, 0); // AP physics C land
    static friction = 0.97; // inverse cuz multiply by friction
    static checkCollideAABB(a1, a2, dt) {
        if (a1.kinematic && a2.kinematic) {
            if (PhysicsObject.checkCollision(a1.pos, a2.pos, [a1.dx, a1.dy, a1.dz], [a2.dx, a2.dy, a2.dz])) {
                a1.onCollision(a2, "?");
                a2.onCollision(a1, "?");
                // no normal of collision because two kinematics
                return true;
            }
            return false;
        }
        if (!a1 || !a2) {
            console.log(a1, a2);
        }
        
        if (!(((a1.useAllowList && a1.collidesWith.has(a2.constructor.name)) || (!a1.useAllowList && !a1.ignores.has(a2.constructor.name))) &&
        ((a2.useAllowList && a2.collidesWith.has(a1.constructor.name)) || (!a2.useAllowList && !a2.ignores.has(a1.constructor.name))))) {
            // only if both of them allow themselves to collide with the other one, then collision happens
            return;
        }
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
            var normal;
            var m = Math.max(xdist, ydist, zdist);
            if (a1.trigger || a2.trigger) {
                if (m == xdist) {
                    a1.onCollision(a2, "x"); a2.onCollision(a1, "x");
                } else if (m == ydist) {
                    a1.onCollision(a2, "y"); a2.onCollision(a1, "y");
                } else if (m == zdist) {
                    a1.onCollision(a2, "z"); a2.onCollision(a1, "z");
                }
                return true;
            }
            if (a2.kinematic) {
                if (m == xdist) {
                    a1.pos[0] += -Math.abs(a1.pos[0] - a2.pos[0]) / (a1.pos[0] - a2.pos[0]) * xdist;
                    a1.vel[0] = 0;
                    normal = "x";
                }
                else if (m == ydist) {
                    a1.pos[1] += -Math.abs(a1.pos[1] - a2.pos[1]) / (a1.pos[1] - a2.pos[1]) * ydist;
                    a1.vel[1] = 0;
                    normal = "y";
                }
               else if (m == zdist) {
                    a1.pos[2] += -Math.abs(a1.pos[2] - a2.pos[2]) / (a1.pos[2] - a2.pos[2]) * zdist;
                    a1.vel[2] = 0;
                    normal = "z";
                }
            } else {
                if (m == xdist) {
                    a1.pos[0] += -Math.abs(a1.pos[0] - a2.pos[0]) / (a1.pos[0] - a2.pos[0]) * xdist/2;
                    a2.pos[0] += Math.abs(a1.pos[0] - a2.pos[0]) / (a1.pos[0] - a2.pos[0]) * xdist/2;
                    a1.vel[0] = 0; a2.vel[0] = 0;
                    normal = "x";
                }
                else if (m == ydist) {
                    a1.pos[1] += -Math.abs(a1.pos[1] - a2.pos[1]) / (a1.pos[1] - a2.pos[1]) * ydist/2;
                    a2.pos[1] += Math.abs(a1.pos[1] - a2.pos[1]) / (a1.pos[1] - a2.pos[1]) * ydist/2;
                    a1.vel[1] = 0; a2.vel[1] = 0;
                    normal = "y";
                }
               else if (m == zdist) {
                    a1.pos[2] += -Math.abs(a1.pos[2] - a2.pos[2]) / (a1.pos[2] - a2.pos[2]) * zdist/2;
                    a2.pos[2] += Math.abs(a1.pos[2] - a2.pos[2]) / (a1.pos[2] - a2.pos[2]) * zdist/2;
                    a1.vel[2] = 0; a2.vel[2] = 0;
                    normal = "z";
                }
            }
            a1.onCollision(a2, normal); a2.onCollision(a1, normal);
            return true;
        }
        return false;
    }
}

class IHP {
    static alreadyWarned = false;
    static drawLines = false;
    static maxCoord = 500;

    static init() {
        setInterval(regenerateKinematics, 1000);
    }

    static regenerateKinematics() {
        physicsCloseTo_kin.clear();
        var i = -1;
        var maxCoord = IHP.maxCoord;
        for (var p of physicsObjects) {
            i++;
            if (!p.kinematic) continue;
            var xmin = p.pos[0] - p.dx, xmax = p.pos[0] + p.dx;
            var ymin = p.pos[1] - p.dy, ymax = p.pos[1] + p.dy;
            var zmin = p.pos[2] - p.dz, zmax = p.pos[2] + p.dz;
            var x1 = xmin - xmin % SECTORSIZE, x2 = xmax - xmax % SECTORSIZE + SECTORSIZE;
            var y1 = ymin - ymin % SECTORSIZE, y2 = ymax - ymax % SECTORSIZE + SECTORSIZE;
            var z1 = zmin - zmin % SECTORSIZE, z2 = zmax - zmax % SECTORSIZE + SECTORSIZE;
            for (var x=x1; x<=x2; x+=SECTORSIZE) {
                for (var y=y1; y<=y2; y+=SECTORSIZE) {
                    for (var z=z1; z<=z2; z+=SECTORSIZE) {
                        var hsh = x + maxCoord * y + maxCoord * maxCoord * z;
                        if (physicsCloseTo_kin.has(hsh)) {
                            physicsCloseTo_kin.get(hsh).push(i);
                        } else {
                            physicsCloseTo_kin.set(hsh, [i]);
                        }
                    }
                }
            }
        }
    }
    static drawAllBoxes() {
        for (var po of physicsObjects) {
            if (IHP.drawLines) {
                if (po.kinematic) {
                    po.drawBox([1, 0, 0, 1]);
                } else {
                    po.drawBox([0, 1, 0, 1]);
                }
            }
        }
    }
    static physicsUpdate(dt, maxInterval) {
        for (var t=0; t<dt; t+=maxInterval) {
            this.physicsUpdate(Math.min(dt, maxInterval));
        }
    }
    static physicsUpdate(dt) {
        physicsObjects = physicsObjects.filter((p)=>!p.removed);
        if (lastPOsize != physicsObjects.length) {
            IHP.regenerateKinematics();
            lastPOsize = physicsObjects.length;
        }

        var scaledGravity = glMatrix.vec3.create();
        glMatrix.vec3.scale(scaledGravity, PhysicsObject.GlobalGravity, dt/1000);
        for (var po of physicsObjects) {
            if (!po.kinematic) {
                glMatrix.vec3.add(po.vel, po.vel, scaledGravity);
				po.pos[0] += po.vel[0] * dt/1000; po.pos[1] += po.vel[1] * dt/1000; po.pos[2] += po.vel[2] * dt/1000;
			}
        }

        if (Math.random() < 0.005) {
            // small chance to clear the entire physicsCloseTo
            physicsCloseTo.clear();
        } else {
            // otherwise, just clear the arrays
            physicsCloseTo.forEach(function(value, key) {
                value.length = 0;
            });
        }
        var i = -1;
        var maxCoord = IHP.maxCoord;
        for (var p of physicsObjects) {
            i++;
            if (p.kinematic) continue;
            var xmin = p.pos[0] - p.dx, xmax = p.pos[0] + p.dx;
            var ymin = p.pos[1] - p.dy, ymax = p.pos[1] + p.dy;
            var zmin = p.pos[2] - p.dz, zmax = p.pos[2] + p.dz;
            var x1 = xmin - xmin % SECTORSIZE, x2 = xmax - xmax % SECTORSIZE + SECTORSIZE;
            var y1 = ymin - ymin % SECTORSIZE, y2 = ymax - ymax % SECTORSIZE + SECTORSIZE;
            var z1 = zmin - zmin % SECTORSIZE, z2 = zmax - zmax % SECTORSIZE + SECTORSIZE;
            for (var x=x1; x<=x2; x+=SECTORSIZE) {
                for (var y=y1; y<=y2; y+=SECTORSIZE) {
                    for (var z=z1; z<=z2; z+=SECTORSIZE) {
                        var hsh = x + maxCoord * y + maxCoord * maxCoord * z;
                        if (physicsCloseTo.has(hsh)) {
                            physicsCloseTo.get(hsh).push(i);
                        } else {
                            physicsCloseTo.set(hsh, [i]);
                        }
                    }
                }
            }
        }
        for (var p of physicsObjects) {
            if (p.kinematic) continue;
            var xmin = p.pos[0] - p.dx, xmax = p.pos[0] + p.dx;
            var ymin = p.pos[1] - p.dy, ymax = p.pos[1] + p.dy;
            var zmin = p.pos[2] - p.dz, zmax = p.pos[2] + p.dz;
            var x1 = xmin - xmin % SECTORSIZE, x2 = xmax - xmax % SECTORSIZE + SECTORSIZE;
            var y1 = ymin - ymin % SECTORSIZE, y2 = ymax - ymax % SECTORSIZE + SECTORSIZE;
            var z1 = zmin - zmin % SECTORSIZE, z2 = zmax - zmax % SECTORSIZE + SECTORSIZE;
            var alreadyCollided = new Set();
            for (var x=x1; x<=x2; x+=SECTORSIZE) {
                for (var y=y1; y<=y2; y+=SECTORSIZE) {
                    for (var z=z1; z<=z2; z+=SECTORSIZE) {
                        var hsh = x + maxCoord * y + maxCoord * maxCoord * z;
                        if (physicsCloseTo.has(hsh)) {
                            for (var p1 of physicsCloseTo.get(hsh)) {
                                if (physicsObjects[p1] != p) {
                                    PhysicsObject.checkCollideAABB(p, physicsObjects[p1]);
                                    alreadyCollided.add(p1);
                                }
                            }
                        }
                        if (physicsCloseTo_kin.has(hsh)) {
                            for (var p1 of physicsCloseTo_kin.get(hsh)) {
                                if (physicsObjects[p1] != p) {
                                    PhysicsObject.checkCollideAABB(p, physicsObjects[p1]);
                                    alreadyCollided.add(p1);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    static debugLine(p1, p2, color) {
        // should be overridden by the main script
        if (!IHP.alreadyWarned) {
            console.warn("debug draw hitboxes: no function bound");
            IHP.alreadyWarned = true;
        }
    }
}
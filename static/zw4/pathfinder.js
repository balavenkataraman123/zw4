class PathfinderInterface {
    static init() {
        generalWorker.addEventListener("message", function(e) {
            if (e.data[0] == "pathfinder_pathDelivered") {
                for (var zomb of zombies) {
                    if (zomb.id == e.data[1].target) {
                        zomb.pathfinder.path = e.data[1].result;
                        zomb.pathfinder.waiting = false;
                    }
                }
            }
        });
    }
    static genGrid(dx, zombWidth, y1, y2, center) {
        generalWorker.postMessage(["pathfinder_genGrid", [dx, zombWidth, y1, y2, center]]);
    }
    static sendPhysicsObjects() {
        // sends the physicsObjects over to the worker
        // but we kinda have to serialize them ourselves
        var toSend = [];
        for (var po of physicsObjects) {
            toSend.push({
                pos: po.pos, dx: po.dx, dy: po.dy, dz: po.dz,
                constructor: {name: po.constructor.name}, // maybe not the most elegant way to make it so that po.constructor.name is what we want it to be
                trigger: po.trigger
            });
        }
        generalWorker.postMessage(["pathfinder_sendPhysicsObjects", toSend]);
    }
    static findPath(pos1, pos2, id) {
        // ["pathfinder_requestPath", id of zombie, start position, end position]
        generalWorker.postMessage(["pathfinder_requestPath", id, pos1, pos2]);
    }
}

// basically the pathfinding functions
class AwajibaPathfinder {
    constructor() {
        // Awajibas use SMG to rush you up close
        // They pick a position that is about targetRadius away from you and pathfind to that position
        // Then repeat and so on
        // If they couldn't get there within attentionSpan seconds, they pick a new spot
        this.pos = [0, 0, 0];
        this.target = [0, 0, 0];
        this.epsilon = 0.2;
        this.targetRadius = 10;
        this.radiusDeviation = 1;
        this.attentionSpan = 7000;
        this.timeSpent = Infinity; // immediately generate a new position
        this.path = [];
        this.pathProgress = 0;
        this.tryAgainAfter = -1; // if the zombie was not able to find a path, then they will try again after this timer expires, -1 = n/a
    }
    getNewPos() {
        var target = glMatrix.vec3.create();
        var vec = glMatrix.vec2.create(); glMatrix.vec2.random(vec, this.targetRadius + (Math.random() * 2 - 1) * this.radiusDeviation);
        target[0] = player.pos[0] + vec[0];
        target[2] = player.pos[2] + vec[1];
        target[1] = this.pos[1];
        return target;
    }
    update(dt, pos, id) { // returns a 3D direction vector representing where it would like to go
        // do not try to understand this
        this.pos = pos;
        if (this.waiting) {return [0, 0, 0];}
        if (!this.path || this.path.length == 0 || this.timeSpent > this.attentionSpan) {
            this.waiting = true;
            this.target = this.getNewPos();
            PathfinderInterface.findPath([this.pos[0], this.pos[2]], [this.target[0], this.target[2]], id);
            this.timeSpent = 0;
            this.pathProgress = 0;
            return [0, 0, 0];
        }
        this.timeSpent += dt;
        var subTarget = [this.path[this.pathProgress][0], this.target[1]+0.01, this.path[this.pathProgress][1]];
        if (glMatrix.vec3.distance(subTarget, this.pos) < this.epsilon) {
            this.pathProgress++;
            if (this.pathProgress == this.path.length) {
                this.timeSpent = Infinity; // get new target
                return [0, 0, 0];
            }
        }
        // ok now we create a direction vector pointing from pos to subtarget
        var direction = glMatrix.vec3.create();
        glMatrix.vec3.subtract(direction, subTarget, this.pos);
        glMatrix.vec3.normalize(direction, direction);
        return direction;
    }
}
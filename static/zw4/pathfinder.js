class Queue { // rotary queue implementation
    constructor(len) {
        this.container = [];
        this.len = len;
        for (var i=0; i<len; i++) {
            this.container.push(null);
        }
        this.start = len-1; // index before the first allocated one
        this.end = 0; // index after the last allocated one
        this.numItems = 0;
    }
    push_back(a) {
        this.container[this.start] = a;
        this.start--;
        if (this.start < 0) {this.start += this.len;}
        this.numItems++;
    }
    pop_front() {
        this.end--;
        if (this.end < 0) {this.end += this.len;}
        this.numItems--;
        return this.container[this.end];
    }
    empty() {
        // check if it is empty
        return this.numItems == 0;
    }
    clear() {
        // clear all items
        this.start = this.len-1;
        this.end = 0;
        this.numItems = 0;
    }
}

class BasicDijkstra {
    // player has a BasicDijkstra object and zombies use the player's object to pathfind
    static alreadyWarned = false;
    static debugMode = false;
    constructor() {
        // 2d array, with the nested arrays representing the z-axis
        // so thus grid[x][z]
        this.grid = [];
        this.gridWidth = 100;
        // fill with a basic grid
        for (var i=0; i<this.gridWidth; i++) {
            this.grid.push([]);
            var line = this.grid[this.grid.length-1];
            for (var j=0; j<this.gridWidth; j++) {
                line.push(false);
            }
        }
        this.dx = 0; this.zombWidth = 0; this.y1 = 0; this.y2 = 0; this.center = [0, 0, 0];
        this.q = new Queue(20000); // the queue to be used for BFS
        this.lastPath = []; // so we can render it and see
    }
    genGrid(dx, zombWidth, y1, y2, center) {
        // generates the grid, around the center, such that it is set to 1 if a zombie of zombWidth can fit through
        // each grid represents a cell of size dx
        // y1 and y2 are the upper and lower bounds of the zombie
        this.dx = dx; this.zombWidth = zombWidth; this.y1 = y1; this.y2 = y2; this.center = center;
        this.grid = [];
        var y = (y1 + y2) / 2;
        var dy = Math.abs(y1 - y);
        for (var i=0; i<this.gridWidth; i++) {
            this.grid.push([]);
            var line = this.grid[this.grid.length-1];
            for (var j=0; j<this.gridWidth; j++) {
                var x = center[0] - dx * (i - Math.floor(this.gridWidth/2));
                var z = center[2] - dx * (j - Math.floor(this.gridWidth/2));
                var res = true;
                for (var p of physicsObjects) {
                    if (p.constructor.name == "Zombie" || p.constructor.name == "Player" || p.constructor.name == "Bullet" || p.trigger) continue;
                    if (PhysicsObject.checkCollision(p.pos, [x, y, z], [p.dx, p.dy, p.dz], [zombWidth, dy, zombWidth])) {
                        res = false;
                        break;
                    }
                }
                line.push(res);
            }
        }
    }
    static debugLine(p1, p2, color) {
        // should be overridden by the main script
        if (!BasicDijkstra.alreadyWarned) {
            console.warn("pathfinder debug draw hitboxes: no function bound");
            BasicDijkstra.alreadyWarned = true;
        }
    }
    renderGrid() {
        if (!BasicDijkstra.debugMode) return;
        var y = (this.y1 + this.y2) / 2;
        var dy = Math.abs(this.y1 - y);
        for (var i=0; i<this.gridWidth; i++) {
            for (var j=0; j<this.gridWidth; j++) {
                var x = this.center[0] - this.dx * (i - Math.floor(this.gridWidth/2));
                var z = this.center[2] - this.dx * (j - Math.floor(this.gridWidth/2));
                if (this.grid[i][j]) {
                    BasicDijkstra.debugLine([x-this.dx/2, y, z], [x+this.dx/2, y, z], [0, 1, 0, 1]);
                    // BasicDijkstra.debugLine([x, this.y2, z], [x, this.y1, z], [0, 1, 0, 1]);
                    BasicDijkstra.debugLine([x, y, z-this.dx/2], [x, y, z+this.dx/2], [0, 1, 0, 1]);
                }
                else {
                    BasicDijkstra.debugLine([x-this.dx/2, y, z], [x+this.dx/2, y, z], [1, 0, 0, 1]);
                    // BasicDijkstra.debugLine([x, this.y2, z], [x, this.y1, z], [1, 0, 0, 1]);
                    BasicDijkstra.debugLine([x, y, z-this.dx/2], [x, y, z+this.dx/2], [1, 0, 0, 1]);
                }
            }
        }
        // draw the lastPath
        for (var i=1; i<this.lastPath.length; i++) {
            BasicDijkstra.debugLine([this.lastPath[i][0], y-0.001, this.lastPath[i][1]], [this.lastPath[i-1][0], y-0.001, this.lastPath[i-1][1]], [0, 0.7, 1, 1]);
        }
    }
    findPath(pos1, pos2) {
        // returns an array consisting of positions to go to in order to get from pos1 to pos2
        // that array includes the end position but not the start position
        // returns false if no path found
        // sometimes it takes wierd turns and detours (idk what's wrong) but it works for the most part
        
        // find the start and end nodes
        var start = [-1, 0]; var end = [-1, 0];
        var closestS = Infinity, closestE = Infinity;
        // also create a visited array and a predecessor array
        var vis = [], pred = [];
        for (var i=0; i<this.gridWidth; i++) {
            vis.push([]);
            pred.push([]);
            for (var j=0; j<this.gridWidth; j++) {
                vis[vis.length-1].push(false);
                pred[pred.length-1].push(-1);
                if (!this.grid[i][j]) continue;
                var x = this.center[0] - this.dx * (i - Math.floor(this.gridWidth/2));
                var z = this.center[2] - this.dx * (j - Math.floor(this.gridWidth/2));
                var distS = Math.sqrt(Math.pow(pos1[0] - x, 2) + Math.pow(pos1[1] - z, 2));
                var distE = Math.sqrt(Math.pow(pos2[0] - x, 2) + Math.pow(pos2[1] - z, 2));
                if (distS < closestS) {
                    closestS = distS;
                    start = [i, j];
                }
                if (distE < closestE) {
                    closestE = distE;
                    end = [i, j];
                }
            }
        }

        // start BFS
        this.q.clear();
        this.q.push_back(start);
        vis[start[0]][start[1]] = true;
        while (!this.q.empty()) {
            var found = false;
            var u = this.q.pop_front();
            for (var xChange=-1; xChange<=1; xChange++) {
                for (var yChange=-1; yChange<=1; yChange++) {
                    if (!xChange && !yChange) {continue;}
                    var nx = u[0] + xChange; var ny = u[1] + yChange;
                    if (this.grid[nx] != undefined && this.grid[nx][ny] && !vis[nx][ny]) {
                        // first, check if we are turning a corner and going too close to it
                        if (xChange && yChange) { // we are taking a diagonal
                            if (!this.grid[u[0]][ny] || !this.grid[nx][u[1]]) {continue;}
                        }
                        vis[nx][ny] = true;
                        this.q.push_back([nx, ny]);
                        pred[nx][ny] = [u[0], u[1]];
                    }
                }
                if (found) {break;}
            }
            if (found) {break;}
        }
        if (!vis[end[0]][end[1]]) {
            return false;
        }
        var res = [];
        var currPos = [end[0], end[1]];
        while (1) {
            res.push(currPos);
            currPos = pred[currPos[0]][currPos[1]];
            if (currPos == -1) {
                break;
            }
        }
        // convert from array indices to coordinates
        for (var pos of res) {
            pos[0] = this.center[0] - this.dx * (pos[0] - Math.floor(this.gridWidth/2));
            pos[1] = this.center[2] - this.dx * (pos[1] - Math.floor(this.gridWidth/2));
        }
        res.reverse();
        this.lastPath = res;
        return res;
    }
}

// basically the pathfinding functions
class AwajibaPathfinder {
    constructor() {
        // Awajibas use SMG to rush you up close
        // They pick a position that is about targetRadius away from you and straight line for that position
        // Then repeat and so on
        // If they couldn't get there within attentionSpan seconds, they pick a new spot
        this.pos = [0, 0, 0];
        this.target = [0, 0, 0];
        this.epsilon = 3;
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
    update(dt, pos) { // returns a 3D direction vector representing where it would like to go
        // do not try to understand this
        this.pos = pos;
        this.timeSpent += dt;
        this.tryAgainAfter -= dt;
        if (this.tryAgainAfter > 0) {return [0, 0, 0];}
        if (this.timeSpent > this.attentionSpan || this.path == false || glMatrix.vec3.distance(this.target, this.pos) < this.epsilon) {
            this.target = this.getNewPos();
            this.path = player.pathfinder.findPath([this.pos[0], this.pos[2]], [this.target[0], this.target[2]]);
            this.pathProgress = 0;
            this.timeSpent = 0;
            if (this.path == false) {
                this.tryAgainAfter = 500;
                return [0, 0, 0];
            }
            return [0, 0, 0];
        }
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
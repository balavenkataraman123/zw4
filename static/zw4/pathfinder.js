// basically the pathfinding functions
class AwajibaPathfinder {
    constructor(x, y, z) {
        // Awajibas use SMG to rush you up close
        // They pick a position that is about targetRadius away from you and straight line for that position
        // Then repeat and so on
        // If they couldn't get there within attentionSpan seconds, they pick a new spot
        this.pos = [x, y, z];
        this.target = [x, 0, z];
        this.epsilon = 3;
        this.targetRadius = 10;
        this.radiusDeviation = 1;
        this.attentionSpan = 7;
        this.timeSpent = Infinity; // immediately generate a new position
    }
    update(dt, pos) { // returns a 3D direction vector representing where it would like to go
        this.pos = pos;
        this.timeSpent += dt/1000;
        this.target[1] = this.pos[1];
        if (glMatrix.vec3.distance(this.pos, this.target) < this.epsilon || this.timeSpent > this.attentionSpan) {
            // generate new target
            var vec = glMatrix.vec2.create(); glMatrix.vec2.random(vec, this.targetRadius + (Math.random() * 2 - 1) * this.radiusDeviation);
            this.target[0] = player.pos[0] + vec[0];
            this.target[2] = player.pos[2] + vec[1];
            this.timeSpent = 0;
        }
        var direction = glMatrix.vec3.create();
        glMatrix.vec3.subtract(direction, this.target, this.pos);
        glMatrix.vec3.normalize(direction, direction);
        direction[1] = 0;
        return direction;
    }
}
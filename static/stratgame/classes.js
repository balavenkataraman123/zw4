console.log("classes.js loaded");

class Player {
    constructor(x, y) {
        this.matter = Bodies.rectangle(x, y, 100, 100);
        Composite.add(engine.world, this.matter);
        this.x = x; this.y = y;
    }
    render() {
        ctx.fillStyle = patterns["player.png"];
        var v = this.matter.vertices;
        ctx.fillRect(Math.min(v[0].x, v[1].x, v[2].x, v[3].x),
            Math.min(v[0].y, v[1].y, v[2].y, v[3].y), 
            Math.max(v[0].x, v[1].x, v[2].x, v[3].x) - Math.min(v[0].x, v[1].x, v[2].x, v[3].x),
            Math.max(v[0].y, v[1].y, v[2].y, v[3].y) - Math.min(v[0].y, v[1].y, v[2].y, v[3].y));
        this.x = v[0].x; this.y = v[0].y;
    }
}

class Plat {
    constructor(x, y, w, h, type, pattern) {
        this.type = type;
        this.x = x; this.y = y; this.w = w; this.h = h; this.pattern = pattern;
        this.matter = Bodies.rectangle(x, y, w, h, {isStatic: true});
        Composite.add(engine.world, this.matter);
    }
    render() {
        ctx.fillStyle = patterns[this.pattern];
        ctx.fillRect(this.x, this.y, this.w, this.h);
        if (this.type == "spike" && Collision.collides(this.matter, player.matter)) {
            Body.setPosition(player.matter, Vector.create(100, 100));
        }
    }
}

class Level {
    constructor(name) {
        this.name = name;
        this.plats = [];
    }
    addPlat(plat) {
        this.plats.push(plat);
    }
    render() {
        for (var p of this.plats) {
            p.render();
            if (p.type == "win" && Collision.collides(p.matter, player.matter)) {
                alert("You have passed this level! Press OK to continue.");
                if (playerLevel != maxLevel) {
                    playerLevel++;
                }
            }
        }
    }
    importData(data) {
        for (var d of data) {
            if (d[4] == "win") {
                this.plats.push(new Plat(d[0], d[1], d[2], d[3], d[4], "finish.png"));
            }
            if (d[4] == "regular") {
                this.plats.push(new Plat(d[0], d[1], d[2], d[3], d[4], "brick.png"));
            }
            if (d[4] == "spike") {
                this.plats.push(new Plat(d[0], d[1], d[2], d[3], d[4], "dont touch.png"));
            }
        }
    }
}
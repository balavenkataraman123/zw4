class TerrainRandom {
    static state = 0;
    static setSeed(s) {
        TerrainRandom.state = s;
    }
    static rand() {
        TerrainRandom.state ^= TerrainRandom.state << 6;
        TerrainRandom.state ^= TerrainRandom.state >> 9;
        TerrainRandom.state ^= TerrainRandom.state >> 4;
        TerrainRandom.state ^= TerrainRandom.state << 2;
        return TerrainRandom.state / (2**32)+0.5;
    }
    static urand() {
        // returns random number between -1 and 1 (so i have to type less)
        return TerrainRandom.rand() * 2 - 1;
    }
}

class Block {
    constructor(x, z) {
        // x and y are the center of the block
        this.x = x; this.z = z;
        var y = z; // cuz me dumb when ctrl c ctrl v
        this.pos1 = [x-0.51, ns2((x-0.5), (y-0.5)), y-0.51];
        this.pos2 = [x+0.51, ns2((x+0.5), (y-0.5)), y-0.51];
        this.pos3 = [x-0.51, ns2((x-0.5), (y+0.5)), y+0.51];
        this.pos4 = [x+0.51, ns2((x+0.5), (y+0.5)), y+0.51];
		for (var i=1; i<=4; i++) {
			var pos = this["pos"+i.toString()];
			const ep = 2;
			const mulfac = 0.7;
			const offset = -1;
			this["n"+i.toString()] = //vec3_avg(
				vec3_cross([-ep-offset, ns2(pos[0]-ep-offset, pos[2]-offset), -offset],
				[-offset, ns2(pos[0]-offset, pos[2]+ep-offset), ep-offset]);
			var temp = this["n"+i.toString()];
			temp[0] *= mulfac; temp[1] *= mulfac; temp[2] *= mulfac;
		}
		for (let i=1; i<5; i++) { // start from 1 because this.pos[1,2,3,4] starts from 1
			var ref = normalRef[i];
			var vec1 = glMatrix.vec3.create();
			var vec2 = glMatrix.vec3.create();
			glMatrix.vec3.subtract(vec1, this[ref[0]], this["pos"+i]);
			glMatrix.vec3.subtract(vec2, this[ref[1]], this["pos"+i]);
			var n = glMatrix.vec3.create();
			glMatrix.vec3.cross(n, vec1, vec2);
            glMatrix.vec3.normalize(n, n);
			this["n"+i] = [n[0], n[1], n[2]];
		}
		var px = 255/TEXW; var py = 255/TEXH;
		var dx = 1535/TEXW; var dy = 1535/TEXH;
        var zero = 1/TEXW; var one = 1-1/TEXW;
        shaderAddData({
            "aVertexPosition": this.pos1.concat(this.pos2.concat(this.pos3.concat(this.pos2.concat(this.pos3.concat(this.pos4))))),
            "aVertexNormal": this.n1.concat(this.n2.concat(this.n3.concat(this.n2.concat(this.n3.concat(this.n4))))),
			// "aVertexNormal": mList([1], 36),
            "aTexCoord1": mList([zero, py, px, py, zero, zero, px, py, zero, zero, px, zero], 4),
			"aTexCoord2": mList([dx, one, one, one, dx, dy, one, one, dx, dy, one, dy], 4),
			"aTexCoord3": mList([dx, one, one, one, dx, dy, one, one, dx, dy, one, dy], 4),
			"aTexCoord4": mList([zero, py, px, py, zero, zero, px, py, zero, zero, px, zero], 4),
			"aMixFactor": mList([1, dirtSimplex(x+dirtOffset, y+dirtOffset), 0.25, 0.25], 6)
        }, "t4shader");
    }
}


class TallGrass {
    constructor(x, z, size, drift = 0.015, add = true) {
        this.positions = [];
        this.data = {
            "aCenterOffset": [], "aCorner": [], "aTexCoord": []
        };
        for (var i=0; i<size; i++) {
            var hyp = 1-Math.random()**2;
            var theta = Math.random()*Math.PI*2;
            var posx = Math.cos(theta)*size*drift*hyp+x;
            var posy = Math.sin(theta)*size*drift*hyp+z;
            var pos = [posx, ns2(posx, posy)+Math.random()*0.3-0.1, posy];
            if (Math.sqrt((posx-x)**2 + (posy-y)**2) < size * drift * 0.3 && Math.random() < 0.3) {
                continue;
            }
            this.positions.push(pos);
            this.data.aCenterOffset = this.data.aCenterOffset.concat(mList(pos, 6));
            var y = z; // cuz me dumb when ctrl c ctrl v
            var maxSize = 1;
            var tSize = Math.min(Math.max(0.1, 3*(maxSize - Math.sqrt((posx-x)**2 + (posy-y)**2)/size/drift*2)), 0.4);
            var pos1 = [-tSize, +tSize];
            var pos2 = [+tSize, -tSize];
            var pos3 = [-tSize, -tSize];
            var pos4 = [+tSize, +tSize];
            
            this.data.aCorner = this.data.aCorner.concat(
                pos1.concat(pos2.concat(pos3.concat(pos1.concat(pos2.concat(pos4)))))
            );
            var ustart, uend, vstart, vend;
            if (Math.random() < 0.2) {
                ustart = 512/TEXW, uend = 768/TEXW, vstart = 0, vend = 256/TEXW;
            } else if (Math.random() < 0.9) {
                ustart = 768/TEXW, uend = 1024/TEXW, vstart = 0, vend = 256/TEXW;
            } else {
                ustart = 1024/TEXW, uend = 1280/TEXW, vstart = 0, vend = 256/TEXW;
            }
            this.data.aTexCoord = this.data.aTexCoord.concat([
                ustart, vstart, uend, vend, ustart, vend, ustart, vstart, uend, vend, uend, vstart
            ]);
        }
        for (var i=0; i<TerrainRandom.rand()*3; i++) {
            var itemx = x + TerrainRandom.urand();
            var itemz = z + TerrainRandom.urand();
            var itemy = ns2(itemx, itemz)+0.5;
            var itemname = ["Distilled Water", "Wood", "rocc"][Math.floor(TerrainRandom.rand() * 3)];
            new Item([itemx, itemy, itemz],
                itemname, itemTexCoords[itemname], [0.125,0.125]);
        }
        if (add) {
            shaderAddData(this.data, "billboardShader");
        }
    }
}

class ElmTree extends PhysicsObject {
    constructor(x, y, z, add = true) {
        super(x, y+2, z, 0.5, 3, 0.5, true);
        this.x = x; this.y = y; this.z = z;
        this.lastharvested = Date.now();
        if (!add) {return;}

        shaderAddData({
            aVertexPosition: transformPositions(models.elmTree.position, x, y, z), aVertexNormal: models.elmTree.normal,
            aTexCoord: models.elmTree.texCoord
        }, "shaderProgram");
        flush("shaderProgram");
    }
    onCollision(o) {
        var idx = bullets.find(function(a) {return a == o;});
        if (idx !== undefined) {
            if (Date.now() > this.lastharvested + 1000 && Math.random() < 0.3) {
                new Item([this.x + Math.random()*5, this.y + Math.random() * 5, this.z + Math.random() * 10], "Wood",
                    itemTexCoords.Wood, [0.125, 0.125]);
                this.lastharvested = Date.now();
                var name;
                if (Math.random() < 0.5) {name = "tree";} else {name = "tree2";}
                var aux = new Audio(audios[name]);
                aux.volume = 0.5;
                aux.play();

                if (Math.random() < 0.1) { // no more wood for 60s (actually 61)
                    this.lastharvested = Date.now()+6000;
                    TerrainGen.cooldownParticles([this.x, this.y+1, this.z]);
                }
            }
            o.removed = true;
            TerrainGen.hitparticles([this.x, this.y+1, this.z]);
        }
    }
}

class Rock extends PhysicsObject {
    constructor(x, y, z, add = true, type = "iron1") {
        super(x, y+2, z, 1, 2, 2, true);
        this.x = x; this.y = y; this.z = z;
        this.type = type;
        this.lastharvested = Date.now();
        if (!add) {return;}

        shaderAddData({
            aVertexPosition: transformPositions(models[type].position, x, y, z), aVertexNormal: models[type].normal,
            aTexCoord: models[type].texCoord
        }, "shaderProgram");
        flush("shaderProgram");
    }
    onCollision(o) {
        var idx = bullets.find(function(a) {return a == o;});
        if (idx !== undefined) {
            if (Date.now() > this.lastharvested + 1000 && Math.random() < 0.3) {
                this.dropItems();
                this.lastharvested = Date.now();
                var name;
                if (Math.random() < 0.5) {name = "rock1";} else {name = "rock2";}
                var aux = new Audio(audios[name]);
                aux.volume = 0.5;
                aux.play();

                if (Math.random() < 0.1) { // no more rock for 60s (actually 61)
                    this.lastharvested = Date.now()+60000;
                    TerrainGen.cooldownParticles([this.x, this.y+1, this.z]);
                }
            }
            o.removed = true;
            TerrainGen.hitparticles([this.x, this.y+1, this.z]);
        }
    }
    dropItems() {
        var it;
        if (this.type.startsWith("rock")) {
            it = "rocc";
        } else if (this.type.startsWith("iron")) {
            it = "Iron Ore";
        } else if (this.type.startsWith("silicon")) {
            it = "Quartz";
            console.log("silicon");
        }
        new Item([this.x, this.y + 3, this.z], it,
            itemTexCoords[it], [0.125, 0.125]);
        if (Math.random() < 0.1) {
            new Item([this.x, this.y + 3, this.z], "Cobalt-60",
                itemTexCoords["Cobalt-60"], [0.125, 0.125]);
        }
    }
}

class TerrainGen { // basically a static class for my static brain
    static blocks = [];
    static grassPatches = [];
    static seed = 6969;
    static trees = [];
    static rocks = [];
    static buildings = [];
    static init() {
        new BlanketObject(function(x, z) {
            var count = 0; var sum = 0;
            const start=-0.9, end=0.9, step=0.3;
            for (var xoffset=start; xoffset<=end; xoffset+=step) {
                for (var yoffset=start; yoffset<=end; yoffset+=step) {
                    count++;
                    sum += ns2(x+xoffset, z+yoffset);
                }
            }
            return sum / count;
        }, -Infinity, Infinity, -Infinity, Infinity);
        TerrainRandom.setSeed(TerrainGen.seed);
    }
    static generate(dist) {
        var blk = [], gp = [];
        var startTime = Date.now();
        // generate the main blanket
        for (var x=-dist; x<dist; x++) {
            for (var y=-dist; y<dist; y++) {
                blk.push(new Block(x, y));
            }
        }
        console.log("main blanket in " + (Date.now() - startTime));
        startTime = Date.now();
        // generate the tall grass
        for (var i=0; i<10 + 10*TerrainRandom.rand()+4; i++) {
            gp.push(new TallGrass(dist * TerrainRandom.urand(), dist * TerrainRandom.urand(), TerrainRandom.rand()*100+50, 0.010+0.015*TerrainRandom.rand(), true));
        }
        console.log("tall grass in " + (Date.now() - startTime));
        TerrainGen.lateGenerate(dist);
    }
    static lateGenerate(dist) {
        // for things that need the objs to be done loading
        // logo
        shaderAddData({aVertexPosition: models.logo.position, aColor: models.logo.color, aVertexNormal: models.logo.normal}, "objShader");
        flush("objShader");

        this.buildings.push(new Building([-50,0,-50], 14, 100, 60));
        // generate the trees
        for (var i=0; i<TerrainRandom.rand() * 5; i++) {
            var x = TerrainRandom.urand() * dist; var z = TerrainRandom.urand() * dist;
            for (var j=0; j<TerrainRandom.rand() * 5; j++) {
                TerrainGen.trees.push(new ElmTree(x+TerrainRandom.urand() * 5, TerrainRandom.rand()-1, z + TerrainRandom.urand() * 5));
            }
            for (var j=0; j<TerrainRandom.urand() * 30; j++) {
                new Item([x + TerrainRandom.urand()*10, 10, z + TerrainRandom.urand()*10], "Wood", itemTexCoords.Wood, [0.125, 0.125]);
            }
        }
        // generate the rocks
        for (var i=0; i<TerrainRandom.rand() * 4+5; i++) {
            var x = TerrainRandom.urand() * dist; var z = TerrainRandom.urand() * dist;
            TerrainGen.rocks.push(new Rock(x, ns2(x, z), z, true,
                ["rock1", "rock2", "rock3", "iron1", "iron2", "silicon"][Math.floor(Math.random() * 6)]));
        }
    }
    static cooldownParticles(pos) {
        particles.push(new ParticleSystem(pos, D_ONE_POINT(), 3, 7, [1024/TEXW,1280/TEXH], 256/TEXW, 0.3, 10, 60000, 10000));
    }
    static hitparticles(pos) {
        particles.push(new ParticleSystem(pos, D_ONE_POINT(), 20, 0.02, [1024/TEXW,1280/TEXH], 256/TEXW, 0.3, 20, 400, 1));
    }
}

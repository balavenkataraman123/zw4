function transformPositions(arr, x, y, z) {
    var ret = [];
    for (var i=0; i<arr.length; i++) {
        if (i % 3 == 0) {
            ret.push(arr[i]+x);
        }
        if (i % 3 == 1) {
            ret.push(arr[i]+y);
        }
        if (i % 3 == 2) {
            ret.push(arr[i]+z);
        }
    }
    return ret;
}

function quickConcat(arr, cnc) {
    for (var x of cnc) {arr.push(x);}
}

class Cell { // Cell cannot be inherited from PhysicsObject because it can have multiple hitboxes
    constructor(pos, model, address, add = true) {
        this.hb_model = models["hb_" + model];
        this.hitboxes = [];
        this.address = address;
        for (var h of this.hb_model.hitboxes) {
            this.hitboxes.push(new PhysicsObject(h[0][0]+pos[0], h[0][1]+pos[1], h[0][2]+pos[2], h[1][0], h[1][1], h[1][2], true));
        }
        this.pos = pos;
        this.model = models[model];
        
        if (add) {
            var datas = getRBdata(address, "shaderProgram");
            quickConcat(datas.aVertexPosition, transformPositions(this.model.position, ...this.pos));
            quickConcat(datas.aVertexNormal, this.model.normal);
            quickConcat(datas.aTexCoord, this.model.texCoord);
        }
    }
    generateFooting() {
        var datas = getRBdata(this.address, "shaderProgram");
        quickConcat(datas.aVertexPosition, transformPositions(models.support.position, ...this.pos));
        quickConcat(datas.aVertexNormal, models.support.normal);
        quickConcat(datas.aTexCoord, models.support.texCoord);
    }
}

class Building {
    // yea its a building
    constructor(pos, numCells = 5, maxWidth = 20, maxHeight = 100) {
        this.pos = pos;
        this.numCells = numCells;
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.cells = new Array(numCells);
        this.address = createRenderBuffer("shaderProgram"); // each building has its own renderbuffer
        for (var i=0; i<numCells; i++) {
            var name = "cell" + (Math.floor(Math.random() * 3) + 1);
            name += "_" + (Math.floor(Math.random() * 2) + 1);
            var pos = [0,i / numCells * maxHeight,0];
            while (1) {
                pos[0] = Math.floor(Math.random() * 3) * maxWidth / 3;
                pos[2] = Math.floor(Math.random() * 3) * maxWidth / 3;
                if ((!this.cells[i-1] || this.cells[i-1].pos[0] != pos[0] || this.cells[i-1].pos[2] != pos[2]) &&
                    (!this.cells[i-2] || this.cells[i-2].pos[0] != pos[0] || this.cells[i-2].pos[2] != pos[2])) {
                    break;
                }
            }
            this.cells[i] = new Cell(pos, name, this.address);
        }
        this.cells.reverse(); // so that the highest cells are first
        for (var i=0; i<3; i++) {
            for (var j=0; j<3; j++) {
                for (var c of this.cells) {
                    if (c.pos[0] == i * maxWidth / 3 && c.pos[2] == j * maxWidth / 3) {
                        c.generateFooting();
                        break;
                    }
                }
            }
        }
        flushRB(this.address, "shaderProgram");
    }
    render() {
        useRenderBuffer(this.address, "shaderProgram");
        gl.drawArrays(gl.TRIANGLES, 0, getRBdata(this.address, "shaderProgram").aVertexPosition.length/3);
    }
}
var showInv = false;

class InvRenderer {
    constructor(ctx, stuff, cellW, w, h) {
        this.ctx = ctx;
        this.stuff = stuff;
        this.cursorItem = false;
        this.cellW = cellW; this.w = w; this.h = h;
        this.lastX = 0; this.lastY = 0;
    }
    pointCollide(px, py, x1, y1, w, h) {
        // x and y are top-left corner
        return (x1 < px && px < x1 + w) && (y1 < py && py < y1 + h);
    }
    render(x, y) {
        this.lastX = x; this.lastY = y;
        this.ctx.fillStyle = "#AA000099";
        this.ctx.fillRect(x, y, this.cellW * this.w, this.cellW * this.h);
        this.ctx.strokeStyle = "green";
        for (var i=0; i<this.w; i++) {
            this.ctx.moveTo(x + i * this.cellW, y);
            this.ctx.lineTo(x + i * this.cellW, y + this.cellW * this.h);
        }
        for (var i=0; i<this.h; i++) {
            this.ctx.moveTo(x, y + i * this.cellW);
            this.ctx.lineTo(x + this.cellW * this.w, y + i * this.cellW);
        }
        this.ctx.stroke();
        var num = 0;
        this.ctx.fillStyle = "#00FF00";
        for (var prop in this.stuff) {
            this.ctx.drawImage(oTex.grass, itemTexCoords[prop][0]*oTex.grass.height, itemTexCoords[prop][1]*oTex.grass.width,
                256, 256, x + (num % this.w) * this.cellW, y + (Math.floor(num / this.w)) * this.cellW, this.cellW, this.cellW);
            this.ctx.fillText(this.stuff[prop], x + (num % this.w) * this.cellW + this.cellW - 20, y + (Math.floor(num / this.w)) * this.cellW + this.cellW - 20);
            num++;
        }
        if (this.cursorItem) {
            this.ctx.fillText(this.cursorItem[0], mousepos[0], mousepos[1]);
        }
    }
    selectItem(x, y) {
        if (!showInv) {return;}
        if (this.cursorItem) {
            this.stuff[this.cursorItem[0]] = this.cursorItem[1];
            this.cursorItem = false;
        }
        var num = 0;
        console.log(x, y);
        this.ctx.fillStyle = "#000000";
        for (var prop in this.stuff) {
            if (this.pointCollide(x, y, this.lastX + (num % this.w) * this.cellW, this.lastY + (Math.floor(num / this.w)) * this.cellW, this.cellW, this.cellW)) {
                this.cursorItem = [prop, this.stuff[prop]];
                if (prop != "Wood" && prop != "Distilled Water" && prop != "rocc") delete this.stuff[prop];
                else this.stuff[prop] = 0;
            }
            num++;
        }
    }
}
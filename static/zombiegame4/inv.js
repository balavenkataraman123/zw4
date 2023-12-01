var showInv = false;

class InvRenderer {
    constructor(ctx, stuff, cellW, cellH, w, h) {
        this.ctx = ctx;
        this.stuff = stuff;
        this.cursorItem = false;
        this.cellW = cellW; this.cellH = cellH; this.w = w; this.h = h;
    }
    pointCollide(px, py, x1, y1, w, h) {
        // x and y are top-left corner
        return (px < x1 < px+w) && (py < y1 < py+h);
    }
    render(x, y) {
        this.ctx.fillStyle = "#00000099";
        this.ctx.fillRect(x, y, this.cellW * this.w, this.cellH * this.h);
        this.ctx.strokeStyle = "black";
        for (var i=0; i<this.w; i++) {
            // this.ctx.moveTo()
        }
    }
    selectItem(x, y) {
        if (!showInv) {return;}
        //
    }
}
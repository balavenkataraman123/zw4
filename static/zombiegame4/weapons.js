// file which contains all the weapons and their actions
console.log("weapons.js");
class WeaponBase {
    constructor(name, model, specs, texCoordStart, texCoordWidth) {
        this.model = models[model];
        this.specs = specs;
        this.name = name;
        this.texCoordStart = texCoordStart;
        this.texCoordWidth = texCoordWidth;
    }
    shoot() {}
    reload() {}
    update(dt) {}
}

class RandoAxe extends WeaponBase {
    constructor() {
        super("rando axe", "glgun", {damage: 10, delay: 300}, [256/TEXW, 0], [128/TEXW, 128/TEXH]);
        this.firingDelay = 0;
    }
    shoot() {
        if (this.firingDelay < 0) {
            var dist = 3;
            var bul = new Bullet(player.pos[0]+player.cameraFront[0]*dist, player.pos[1]+player.cameraFront[1]*dist, player.pos[2]+player.cameraFront[2]*dist,
                0, this.specs.damage, player.cameraFront, models.nothing, true, 50);
            bul.trigger = true;
            this.firingDelay = this.specs.delay;
        }
    }
    update(dt) {this.firingDelay -= dt;}
}

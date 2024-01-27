class BaseTower extends PhysicsObject {
    constructor(name, model, specs, texCoordStart, texCoordWidth, dx, dy, dz) {
        super()
        this.model = model;
        this.texCoordStart = texCoordStart;
        this.texCoordWidth = texCoordWidth;
        this.placed = false;
        this.specs = specs;
        this.health = specs.health;
        this.name = name;
    }
    update(dt) {}
    place() {}
}

class HomeBase extends BaseTower {
    constructor() {
        //
    }
}
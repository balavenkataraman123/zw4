var gunSpecs = {
    "MP40": {
        delay: 100,
        capacity: 30,
        reloadTime: 2000,
        bulletSpeed: 75,
        bulletWidth: 0.04,
        bulletColor: [1, 1, 0.7, 1],
        damage: 10,
        bulletLength: 2,
        barrelLength: 1,
        roundsPerReload: 30,
        spread: 3,
        zombieBurstRounds: [3, 7], // range for how many rounds zombies fire in a burst
        cartridge: "cartridge_9x19",
        ejectionDistance: 0.5 // distance from the player of the ejection port
    },
    "MAC M10": {
        delay: 50,
        capacity: 32,
        reloadTime: 1800,
        bulletSpeed: 50,
        bulletWidth: 0.04,
        bulletColor: [1, 1, 0.7, 1],
        damage: 10,
        bulletLength: 0.8,
        barrelLength: 0.7,
        roundsPerReload: 32,
        spread: 15,
        zombieBurstRounds: [6, 9],
        cartridge: "cartridge_9x19",
        ejectionDistance: 0.5
    },
}

var zombieSpecs = {
    "Awajiba": {
        speed: 8,
        dx: 0.4, dy: 0.5, dz: 0.4,
        health: 30,
        gun: "MP40",
        firePos: [0, 0.984, -0.1], // [y, z, x] in the blender file for some reason
        deathParticles: [
            {texCoordStart: [256/TEXW, 1536/TEXH], texCoordWidth: 128/TEXW},
            {texCoordStart: [384/TEXW, 1536/TEXH], texCoordWidth: 128/TEXW},
            {texCoordStart: [256/TEXW, 1664/TEXH], texCoordWidth: 128/TEXW},
            {texCoordStart: [384/TEXW, 1664/TEXH], texCoordWidth: 128/TEXW},
        ],
        aggroSoundCount: 4
    }
};

var levelSpecs = [undefined, // fill in 0th element
    {
        particles: [
            {texCoordStart: [784/TEXW, 1536/TEXH], texCoordWidth: 16/TEXW, velocity: -0.25, lifetime: 30, size: 0.06, intensity: 25},
            {texCoordStart: [800/TEXW, 1536/TEXH], texCoordWidth: 16/TEXW, velocity: -0.25, lifetime: 30, size: 0.06, intensity: 25},
            {texCoordStart: [816/TEXW, 1536/TEXH], texCoordWidth: 16/TEXW, velocity: -0.25, lifetime: 30, size: 0.06, intensity: 25},
            {texCoordStart: [832/TEXW, 1536/TEXH], texCoordWidth: 16/TEXW, velocity: -0.25, lifetime: 30, size: 0.06, intensity: 25}
        ],
        lighting: {
            lightDirection: [0, 1, 0],
            color: [0.5, 0.3, 0.3],
            ambient: [0.5, 0.5, 0.6]
        },
        simulationDistance: 30,
        renderDistance: 40,
        fogAmount: 1.0,
        ambientSound: "./static/zw4/sfx/ambience1.mp3"
    }
];
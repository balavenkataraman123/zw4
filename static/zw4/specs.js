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
    },
}

var zombieSpecs = {
    "Awajiba": {
        speed: 8,
        dx: 0.4, dy: 0.5, dz: 0.4,
        health: 30,
        gun: "MP40",
        firePos: [0, 0.984, -0.1], // [y, z, x] in the blender file for some reason
        spawnDelay: 1 // on average, how many seconds to spawn one zombie
    }
}
class TerrainRandom {
    static state = 6969;
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

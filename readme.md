# New plan
It was found that theh old plan was quite complicated, and after learning a bit more about game dev, here's the new plan for a more fun game:
- core concept is the same as zombiewars 3: you just keep shooting
- parkour to make it more challenging
 - zombies can fly to make pathfinding easier
- orange zone that continually pushes the player forward so they can't just camp
 - since the loading/unloading of the map would also be quite complicated, we're just gonna have a level system and once you complete a level, a new level loads
  - zombies spawn at predetermined places and once you enter into their vicinity, they aggro on you and don't stop until they die (or you die)
- levels are all manually created

# Guns
these are the classes:
- Snipers/DMRs
  - Fast bullet speed, low firerate, high damage
  - Pros: good for long range and maneuverable
  - Cons: Useless in CQC, bad at handling swarms (low DPS)
- Assault Rifles
  - OK bullet speed and accuracy, automatic, generally good for everything
  - Pros: it's good to have an AR in reserve since you don't know what's coming next past the 3-wave lookahead
  - Cons: not really good for anything in particular and so it requires skill to use
- Submachine guns/machine pistols
  - Fast fire rate and insane DPS, but high spread and low range
  - Pros: insane DPS and fast reload
  - Cons: useless at long range
- Machine guns (LMGs)
  - Massive magazine size, good accuracy and bullet speed, low DPS, severely hamper movement
  - Pros: good DPS at long range
  - Cons: you basically can't move
- Shotguns
  - Probably going to be the least developed section of weapons, basically similar to the SMGs
  - Shotguns will have the Super 90, which like in surviv, is basically a slightly shorter range DMR substitute


 # All the types of guns
 SMG:
- MP40: basically surviv.io MP5 (pro weapon)
- MAC-10: basically surviv.io MAC-10 (noob weapon)
- Vector: basically surviv.io Vector, uses the extremely rare .45 ACP
AR:
- AK-47: iconic weapon, decent (but not fast) fire rate, decent (but not good) accuracy, thus the DPS is a bit less than MP40
  - noobish weapon
- CQ-A: almost 0 spread, slow fire rate, high damage (pro weapon)
  - low DPS but because of the high damage and low spread, it's still really good
Long range guns:
- Mosin-Nagant: iconic weapon, extreme slow fire rate, very fast bullet speed, very low spread, high damage, pro weapon
- Type 81 SR: semi auto DMR similar to the Mk12 SPR in surviv, spam noob weapon
- Model 54: same fire rate as mosin, shoots the rare .220 Swift, and has insane damage
LMGs:
- QCW-05: 50 round LMG that fires very fast and has bad accuracy as well as not the best DPS, noob weapon
- DP-27: slow fire, high damage, accurate, idk bro its literally CQ-A but with 47 rounds and less damage to balance it
- M1918A2 BAR: only 20 round mag but you can actually carry it without moving like a snail and insane damage and everything
  - OP weapon in the rare .30-06 ammo
Shotguns:
- M870: iconc pump shotgun, literally same as surviv
- M1014: semi-automatic tight spread shotgun with low damage
  - idk which one is the pro weapon and which one is the noob weapon atp
- AA-12: fires the FRAG-12, OP weapon

# Ammos
## Regular ammos (common)
- 7.62mm: for all the soviet guns
- 5.45mm: for all the norinco guns
- 9mm: for all the pistol and machine pistols
- 12 gauge: for shotguns
## OP ammo (only spawns with the OP gun)
- .45 ACP: for a single SMG that is OP
- .220 Swift: insanely fast bullet with insane damage, shot by only 1 gun
- .30-06 Springfield: for the M1918A2 BAR (OP LMG)
- FRAG-12: for the AA-12 (OP shotgun)

# Levels
Level select screen will be like smash hit's level select screen but condensed

i.e all the buttons will be on one screen

basically the levels are like checkpoints in smash hit

the levels follow a progression from underground to the clouds and lastly a space level that's gonna be super confusing because it has no gravity and is spinning (totally not copied from smash hit)

- Level 1: cave
  - grey theme with roof and walls surrounding all sides (but no bottom to allow for parkour)
  - there are many chambers, and rickety bridges connecting them (like mineshafts in minecraft)
  - zombies spawn in some chambers and you have to clear them out
  - signs to make it very clear which chamber leads to the exit
- Level 2: ravine
  - themed like a minecraft ravine, with narrow sides and again the rickety bridges
  - light pouring in from the top
  - also outcroppings from the sides to stand on
  - actually there are several ravines connected by dark winding caves (again with signs to make it apparent where to go)
- Level 3: military base
- Level 4: ascension
- Level 5: ruined sky city
- Level 6: space station (no gravity, spinning, confusing af)
- Level 7: credits

## How zombies and hitboxes will be placed
zombies will be placed as cubes with "zombiemat_x" in blender and x is the zombie type
hitboxes will be placed with "hbmat" and the ending teleporter (to get to the next level) will be "tpmat"
and then we will have a custom loader function that recognizes these materials in the "geometries" of parseOBJ's output
so no more "loadObjAndHitbox" from division or whatever

# Specifics of zombie behavior
As mentioned, when you enter into a zombie's aggro radius, it aggroes on you and doesn't stop
- however, when the zombie exits from the radius of pathfinding of the player, it will stop (because it's too expensive to pathfind from far away)

Zombies will fly and look kind of like the skibidi toilets (flying = easier to pathfind)

Like the player, the zombies will move around by adding and subtracting position (i.e instant movement) which makes pathfinding a lot easier

## Pathfinding algorithm
to make pathfinding easier, zombies will not collide with other zombies, preventing the situation where two zombies want to go to one place and they push each other so no one reaches it

basically most zombies will be turrets which don't move, making everything easier

but the ones which do move will pick a spot within a radius of the player

then they will use Dijkstra's algorithm to pathfind towards that spot

once they reached that spot (with a certain tolerance), they do it all over again

Pathfinding:
- Create a 40x40 m grid around the player, with 3 subdivisions per meter (so 14 400 vertices in total)
    - see which ones are passable by zombies (we will need to know the zombie's size)
    - remove the ones that aren't
    - put edges between the remaining points
- When a zombie find a new spot to pathfind to, they can just use that grid to run Dijkstra's to that spot
- When the player moves more than 5 m from their original position, a new grid is generated

# Things to change
so here's a list of things to change before zombiewars can go out of beta
### Graphical/technical
- ~~Circular fog instead of fog based on z-position~~
- ~~Put all of the time-consuming regeneration stuff (like regenerating the pathfinding mesh and zombie pathfinding) into a web worker so it won't block up the main thread~~
- ~~Physics raycaster so zombies only fire when there is line of sight~~
- ~~Add muzzle flash and related~~
~~- Add particle effects (revamp the particle system as well)~~
~~- Hit marker thingies and the little numbers that appear when you do damage~~
### Gameplay-related
- Item dropping system
    - Ammo count
    - Dropping different weapons/weapon swap
- Heals
- Nades
~~- Change zombie behavior so that they fire in bursts only when they have line of sight~~
### Assets
- Balance level 1
    - Fix the casing hitboxes so zombies don't go outside the map
    - Change zombie position and aggro radius so it's harder to cheese them
- Many new levels
    - Hopefully won't take as long as the first level
- Many new guns
### Other
- Menu screen with levels
    - Also with the other things a menu screen needs like links to yt, github, etc
- Credits menu
- Pause
- Trailer

# Web workers
ok so web workers are kind of dumb and information flow between main script and web workers is limited

so here's the plan for what the workers are going to handle and how to sync with main script

- workers will only handle the pathfinding, all other "expensive" updates like regenerating the kinematic physics sectors, regenerating the particle buffers,
since they don't cause any noticable blips in gameplay, "if it aint broke dont fix it" so we'll just leave those on the main thread
- main pathfinding class `PathfinderCore` will be in a worker, with stuff to receive and send messages to the main script
- there will be a pathfinding wrapper `PathfinderInterface` class in the main script to act as an interface to the worker
- `static PathfinderInterface.update()` will be called every frame with the physicsObjects, which will be transmitted to the worker by the interface
    - then the core will decide when to regenerate its pathfinding mesh
- when a zombie's pathfinder needs a path, it sends a message to the pathfinder worker, then when the path is done generating the worker sends it back,
and we will give each zombie an ID so we know which zombie it was meant for
- we just won't worry about debug drawing the pathfinding mesh for now

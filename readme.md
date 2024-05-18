# New plan
It was found that theh old plan was quite complicated, and after learning a bit more about game dev, here's the new plan for a more fun game:
- core concept is the same as zombiewars 3: you just keep shooting
- parkour to make it more challenging
 - zombies can fly to make pathfinding easier
- orange zone that continually pushes the player forward so they can't just camp
 - since the loading/unloading of the map would also be quite complicated, we're just gonna have a level system and once you complete a level, a new level loads
  - zombies spawn at the endpoint of the level and "defend" the endpoint, while at the same time the orange zone squeezes you forward
- many types of waves (i.e levels), with a 3-wave lookahead and if you don't plan accordingly, then you will get absolutely annihalated
 - yangy wave (high health, low speed zombies with machine guns, but not that many zombies) -> you have to use snipers or DMRs, but if you have SMGs they just annihalate your tiny damage and low range
 - ma wave (high movement speed zombies with ARs and they don't get close) --> you have to use snipers (high bullet speed to counter them)
 - swapnil wave (swarm of zombies with SMGs, relatively quick, they rush you) --> you have to have SMG or shotgun because they will CQC you
 - babo wave (tiny zombies with ARs, slow but they are tiny and move away from you, also there are a lot of zombies) --> snipers are useless because you won't hit a single shot, have to use LMG to spray them

# Guns
these are the classes:
- Snipers/DMRs
 - Fast bullet speed, low firerate, high damage
 - Pros: good for long range and maneuverable
 - Cons: Bad at hitting very fast targets, bad at handling swarms
 - Good at handling yangy waves and ma waves
 - Gets whooped by swapnil wave and babo wave
- Assault Rifles
 - OK bullet speed and accuracy, automatic, generally good for everything
 - Pros: it's good to have an AR in reserve since you don't know what's coming next past the 3-wave lookahead
 - Cons: not really good for anything in particular and so it requires skill to use
- Submachine guns/machine pistols
 - Fast fire rate and insane DPS, but high spread and low range
 - Pros: insane DPS and fast reload
 - Cons: useless at long range
 - Only weapon that can handle swapnil waves
 - Gets whooped by all the other types though
- Machine guns (LMGs)
 - Massive magazine size, good accuracy and bullet speed, low DPS, severely hamper movement
 - Pros: good DPS at long range
 - Cons: you basically can't move
 - Good for babo wave
- Shotguns
 - Probably going to be the least developed section of weapons, basically similar to the SMGs
 - Shotguns will have the Super 90, which like in surviv, is basically a slightly shorter range DMR substitute
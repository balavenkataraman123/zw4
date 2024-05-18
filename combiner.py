# mLGD
# Major League Game Development

import json

path = input("enter folder path: ")
name = input("enter filename: ")
num = input("enter number of frames: ")

res = {}

for i in range(1, int(num)+1):
    base = name + "_" + "0" * (6-len(str(i))) + str(i)
    f = open(path + base + ".obj")
    res[base + ".obj"] = f.read()
    f = open(path + base + ".mtl")
    res[base + ".mtl"] = f.read()
    f.close()

output = open(path + name + ".anim", "w")
output.write(json.dumps(res))
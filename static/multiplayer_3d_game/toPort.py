import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
import copy
from perlin_noise import PerlinNoise
import sys
import math
from blockInfo import BLOCKS

WORLD_SEED = 4

class CarrierClass:
    pass
carrier=CarrierClass()

# initialising pygame
pygame.init()
screen = pygame.display.set_mode((800,600), DOUBLEBUF | OPENGL)

# -------------- don't touch --------------
glMatrixMode(GL_PROJECTION)
gluPerspective(50, (800/600), 0.1, 100.0)
glMatrixMode(GL_MODELVIEW)
gluLookAt(0,0,0, 0,0,-1, 0,1,0)
carrier.viewMatrix = glGetFloatv(GL_MODELVIEW_MATRIX)
glLoadIdentity()
#------------------------------------------

glTranslatef(0,0,-10)

# looking towards positive z
coords_v=[
# . .
# o .
    [-0.5,-0.5,0],
# . .
# . o
    [0.5,-0.5,0],
# . o
# . .
    [0.5,0.5,0],
# o .
# . .
    [-0.5,0.5,0]
    ]
# looking towards negative y
# diagrams are the same as coords_v
coords_h=[
    [-0.5,0,-0.5],
    [0.5,0,-0.5],
    [0.5,0,0.5],
    [-0.5,0,0.5]
    ]
# looking towards negative x
# diagrams are the same as coords_v
coords_2=[
    [0,-0.5,-0.5],
    [0,-0.5,0.5],
    [0,0.5,0.5],
    [0,0.5,-0.5]
    ]

#I don't understand most of this loadTexture() function
#you saw NOTHING

def loadTexture():
    textureSurface = pygame.image.load('texatlas.png')
    textureData = pygame.image.tostring(textureSurface, "RGBA", 1)
    width = textureSurface.get_width()
    height = textureSurface.get_height()

    glEnable(GL_TEXTURE_2D)
    texid = glGenTextures(1)

    glBindTexture(GL_TEXTURE_2D, texid)
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, width, height,
                 0, GL_RGBA, GL_UNSIGNED_BYTE, textureData)

    glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT)
    glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT)
    glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST)
    glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST)

    return texid

#this is not good programming practice, please don't be like me if you see this.
def mesh(angle='h', x=None, y=None, z=None, color=(0,1,0), what="GRASS", face="top"):
    """a function for generating GL_QUADS.
        angle='h':
        looks like this:
            ----
        angle='v':
        looks like this:
            |¯¯¯¯|
            |____|
        angle='z':
        looks like this:
            |
            |
    """
    # modifying the coords so its right
    glPushMatrix()
    glTranslatef(x, y, z)
    if angle=='h':
        coords=copy.deepcopy(coords_h)
        # for i in range(0,4):
        #     coords[i][2]+=z
        #     coords[i][1]+=y
        #     coords[i][0]+=x
        glColor3f(color[0]-0.1,color[1]-0.1, color[2]-0.1)
    elif angle=='v':
        coords=copy.deepcopy(coords_v)
        # for i in range(0,4):
        #     coords[i][2]+=z
        #     coords[i][1]+=y
        #     coords[i][0]+=x
        glColor3f(color[0],color[1], color[2])
    elif angle=='z':
        coords=copy.deepcopy(coords_2)
        # for i in range(0,4):
        #     coords[i][2]+=z
        #     coords[i][1]+=y
        #     coords[i][0]+=x
        glColor3f(color[0],color[1], color[2])
    # textures
    if BLOCKS[what]["special"]:
        if what == "GRASS":
            if face == "top":
                carrier.tex_coords = BLOCKS["GRASS"]["texture-coords-top"]
            elif face == "left" or face == "right" or face == "front" or face == "back":
                carrier.tex_coords = BLOCKS["GRASS"]["texture-coords-sides"]
            elif face == "bottom":
                carrier.tex_coords = BLOCKS["GRASS"]["texture-coords-bottom"]
    elif what == "DIRT":
        carrier.tex_coords = BLOCKS["DIRT"]["texture-coords"]
    # beginning generation
    tex_coord_counter=0
    glBegin(GL_QUADS)
    for coord in coords:
        glTexCoord2f(carrier.tex_coords[tex_coord_counter][0], carrier.tex_coords[tex_coord_counter][1])
        tex_coord_counter+=1
        glVertex3f(coord[0],coord[1],coord[2])
    glEnd()
    glPopMatrix()

# boom boom bam bam chicka chicka noise
carrier.noise = PerlinNoise(octaves=3.5, seed=WORLD_SEED)

class Block:
    def __init__(self, what):
        """this class is used in the `blocks` dictionary to register a block"""
        self.what = what

def block(x, y, z,what,chunk):
    chunk.blocks[(x,y,z)] = Block(what)

class Chunk:
    def __init__(self, coords):
        self.blocks = {}
        for x in range(0, 10):
            for z in range(0, 10):
                perlinedY = int(carrier.noise([x * 0.04 + coords[0] * 0.4, z * 0.04 + coords[1] * 0.4]) * 5)

                block(x + coords[0] * 10, perlinedY, z + coords[1] * 10, "GRASS", self)

                for y in range(perlinedY-1, -5, -1):
                    block(x + coords[0] * 10, y, z + coords[1] * 10, "DIRT", self)

# manual for now, later become procedural
carrier.chunks = [Chunk([0, 0]), Chunk([0, 1]), Chunk([1, 1]), Chunk([1, 0])]


def genMeshPoints(blk):
    """generates a seiries of coordinates to be drawn using mesh(). in the future this will probably be optimized a lot"""
    toBeGenerated=[]
    blkKeys=blk.keys()
    blkValues=list(blk.values())
    ctr=0
    for block in blkKeys:

        blkType=blkValues[ctr].what
        # testing the one to the left
        testingBlock=(block[0]+1, block[1], block[2])
        if testingBlock not in blkKeys:
            toBeGenerated.append(['z',block[0]+0.5, block[1], block[2], blkType, "left"])
        # testing the one to the right
        testingBlock=(block[0]-1, block[1], block[2])
        if testingBlock not in blkKeys:
            toBeGenerated.append(['z',block[0]-0.5, block[1], block[2], blkType, "right"])
        # testing the one to the front
        testingBlock=(block[0], block[1], block[2]+1)
        if testingBlock not in blkKeys:
            toBeGenerated.append(['v',block[0], block[1], block[2]+0.5, blkType, "front"])
        # testing the one to the back
        testingBlock=(block[0], block[1], block[2]-1)
        if testingBlock not in blkKeys:
            toBeGenerated.append(['v',block[0], block[1], block[2]-0.5, blkType, "back"])
        # testing the one upwards
        testingBlock=(block[0], block[1]+1, block[2])
        if testingBlock not in blkKeys:
            toBeGenerated.append(['h',block[0], block[1]+0.5, block[2], blkType, "top"])
        # testing the one downwards
        testingBlock=(block[0], block[1]-1, block[2])
        if testingBlock not in blkKeys:
            toBeGenerated.append(['h',block[0], block[1]-0.5, block[2], blkType, "bottom"])
        ctr+=1
    return toBeGenerated
def main():
    # texture
    loadTexture()

    # blocks
    carrier.blockPoints=[genMeshPoints(carrier.chunks[i].blocks) for i in range(0, len(carrier.chunks))]

    # vars
    running=True
    paused=False
    displayCenter=(400,300)

    # setting mouse pos
    pygame.mouse.set_pos(displayCenter)

    # angles and mouse movement
    left_right_angle=0
    up_down_angle=0
    glTranslatef(0,10,0)
    cam_pos=[0,3,0]
    mouse_move=[0,0]
    player_angle_x=0
    player_angle_y=0
    to_translate=[0.1,0]
    carrier.angle = 1

    # make a sphere
    originpoint=gluNewQuadric()

    # no idea, don't touch
    glMatrixMode(GL_MODELVIEW)

    # prevent weird stuff
    glEnable(GL_DEPTH_TEST)


    # -------------- game loop --------------
    while running:

        for event in pygame.event.get():

            # -------------- mandatory pygame stuff --------------
            if event.type == pygame.QUIT:
                running=False
                return 0

            # -------------- mouse tracking --------------
            if event.type == pygame.MOUSEMOTION:
                mouse_move=[event.pos[0]-displayCenter[0], event.pos[1]-displayCenter[1]]

            # if pausing
            if event.type == pygame.KEYDOWN and event.key == pygame.K_p:
                paused = not paused

        if not paused:
            pygame.mouse.set_pos(displayCenter)
            keys=pygame.key.get_pressed()


            # -------------- don't touch --------------
            glLoadIdentity()
            # -----------------------------------------

            left_right_angle+=mouse_move[0]
            up_down_angle+=mouse_move[1]
            player_angle_x-=mouse_move[0]*0.01
            player_angle_y-=mouse_move[1]*0.01

            # player quadrats
            if player_angle_x < 90 and player_angle_x >= 0:
                carrier.playerQuadrat=1
            elif player_angle_x > 90 and player_angle_x >= 180:
                carrier.playerQuadrat=2
            elif player_angle_x > 180 and player_angle_x >= 270:
                carrier.playerQuadrat=3
            elif player_angle_x > 270 and player_angle_x > 360:
                carrier.playerQuadrat=4
            else: carrier.playerQuadrat=1

            # -------------- don't touch --------------
            glRotatef(up_down_angle*0.1, 0.1, 0.0, 0.0)
            glPushMatrix()
            x = glGetDoublev(GL_MODELVIEW_MATRIX)
            glLoadIdentity()
            # -----------------------------------------

            # trigonometry
            if carrier.playerQuadrat == 1:
                relative_player_angle=player_angle_x
                to_translate[0] = -(math.sin(math.radians(relative_player_angle)) * 0.1)
                to_translate[1] = -(math.cos(math.radians(relative_player_angle)) * 0.1)
            elif carrier.playerQuadrat == 2:
                relative_player_angle=player_angle_x-90
                to_translate[0] = -(math.sin(math.radians(relative_player_angle)) * 0.1)
                to_translate[1] = math.cos(math.radians(relative_player_angle)) * 0.1
            elif carrier.playerQuadrat == 3:
                relative_player_angle=player_angle_x-180
                to_translate[0] = math.sin(math.radians(relative_player_angle)) * 0.1
                to_translate[1] = -(math.cos(math.radians(relative_player_angle)) * 0.1)
            elif carrier.playerQuadrat == 4:
                relative_player_angle=player_angle_x-270
                to_translate[0] = math.cos(math.radians(relative_player_angle)) * 0.1
                to_translate[1] = math.sin(math.radians(relative_player_angle)) * 0.1

            cam_pos[0] += to_translate[0]
            cam_pos[1] = 0
            cam_pos[2] += to_translate[1]
            # print(f"cam_pos = {cam_pos}, player_angle_x = {player_angle_x}, player_angle_y = {player_angle_y}")


            if keys[pygame.K_w]:
                glTranslatef(0,0,0.1)
            if keys[pygame.K_s]:
                glTranslatef(0,0,-0.1)
            if keys[pygame.K_a]:
                glTranslatef(0.1,0,0)
            if keys[pygame.K_d]:
                glTranslatef(-0.1,0,0)
            if keys[pygame.K_SPACE]:
                glTranslatef(0,-0.1,0)
            if keys[pygame.K_LSHIFT]:
                glTranslatef(0,0.1,0)

            # -------------- don't touch --------------
            glRotatef(mouse_move[0]*0.1, 0.0, 1.0, 0.0)
            glMultMatrixf(carrier.viewMatrix)
            carrier.viewMatrix = glGetFloatv(GL_MODELVIEW_MATRIX)
            glPopMatrix()
            glMultMatrixf(carrier.viewMatrix)
            
            # -----------------------------------------
            #cam_pos = [x[3][0], x[3][1], x[3][2]]
            # if carrier.angle == 50:
            #     carrier.angle = 0
            #     for a in x:
            #         for b in a:
            #             print(b, end = ", ")
            #         print("\n")
            #     print("===========================")
            # else: carrier.angle += 1

            glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

            carrier.angle += 2
            glPushMatrix()
            glTranslatef(3, 2, 1)
            glRotatef(carrier.angle, 0, 1, 0)
            mesh('h', 0, 0, 0)
            glPopMatrix()

            # (0,0,0) point
            glColor3f(1.0,0.0,0.0)
            gluSphere(originpoint, 0.1,10,10)

            # generating the blocks
            for blockPoint in carrier.blockPoints:
                for point in blockPoint:
                    mesh(point[0],point[1],point[2],point[3], (1,1,1),point[4], point[5])
            
            pygame.display.flip()
            pygame.time.wait(10)
            
returnid=main()
pygame.quit()

if returnid == -1:
    raise SystemExit("error")
if returnid == 0:
    print("program exited normally")
    raise SystemExit
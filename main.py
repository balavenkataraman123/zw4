import eventlet

from flask import Flask, render_template, request
from flask_socketio import SocketIO
from threading import Thread
import random
from tkinter import *
# comment this out if on production (we don't need the control console)
from tkinter import *
import asyncio
from requests import get

app = Flask(__name__)
socketio = SocketIO(app)

@app.route("/ping")
def index():
    return "hello"

@app.route("/b4/<arg>")
def zw(arg):
    return render_template("worldgentest.html", rnd = random.randint(0, 1000))

# NOTE: the main zombiewars is hosted on a static server, and not this main.py stuff

@app.route("/ll/<arg>")
def ll(arg):
    return render_template("stratgame.html", rand_num = random.randint(0, 1000))

def main():
    if __name__ == '__main__':
        socketio.run(app)

REPLIT = False
if REPLIT:
    Thread(target=main).start()

# comment this out for replit

@app.route("/kill")
def kill():
    socketio.stop()

@app.before_request
def log():
    if (request.base_url == "http://localhost:5000/ping"):
        return
    logText.config(state=NORMAL)
    logText.insert(END, "request made: url=" + str(request.base_url) + ", ip=" + str(request.remote_addr) + "\n")
    logText.config(state=DISABLED)

def startServer():
    logText.config(state=NORMAL)
    logText.insert(END, "----------start server----------\n")
    logText.config(state=DISABLED)
    Thread(target=main).start()

def killServer():
    logText.config(state=NORMAL)
    logText.insert(END, "----------kill server----------\n")
    logText.config(state=DISABLED)
    get("http://localhost:5000/kill", timeout=0.5)

root = Tk()
root.title("server control console")

buttons = {
    "startBtn": Button(root, text="Start hosting", command=startServer),
    "stopBtn": Button(root, text="Kill server", command=killServer)
}

logText = Text(root)
logText.pack()
logText.config(state=DISABLED)

serverStatus = StringVar(root)
statusLabel = Label(root, textvariable=serverStatus)
statusLabel.pack()

def checkerfunc():
    while True:
        try:
            response = get("http://localhost:5000/ping")
        except:
            serverStatus.set("Server Status: closed")
        else:
            if not response.ok:
                serverStatus.set("Server Status: closed")
            else:
                serverStatus.set("Server Status: hosting")
Thread(target=checkerfunc).start()

for x in buttons:
    buttons[x].pack()

root.mainloop()
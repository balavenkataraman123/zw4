import eventlet

from flask import Flask, render_template
from flask_socketio import SocketIO
from threading import Thread

app = Flask(__name__)
socketio = SocketIO(app)

@app.route("/b4")
def zw():
    return render_template("zombiewars4.html")

@app.route("/ll/<arg>")
def ll(arg):
    return render_template("stratgame.html")

def main():
    if __name__ == '__main__':
        socketio.run(app)

Thread(target=main).run()
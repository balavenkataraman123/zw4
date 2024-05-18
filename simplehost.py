from flask import Flask, render_template

app = Flask(__name__)

@app.route("/<e>")
def index(**kwargs):
    return render_template("zw4.html")

app.run()
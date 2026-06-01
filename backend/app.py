from flask import Flask
from dotenv import load_dotenv
import os
import logging

from database import db
from routes import api

load_dotenv()

app = Flask(__name__)

# Prefer explicit DATABASE_URL/SQLALCHEMY_DATABASE_URI environment variable
# If not provided, try building a Postgres URI from individual env vars.
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

uri = os.getenv("SQLALCHEMY_DATABASE_URI") or os.getenv("DATABASE_URL")

if not uri:
    # Build only if required components are present; avoid 'None' values.
    if DB_HOST and DB_NAME and DB_USER and DB_PASSWORD:
        host_port = DB_HOST
        if DB_PORT and DB_PORT.lower() != "none":
            host_port = f"{DB_HOST}:{DB_PORT}"
        uri = f"postgresql://{DB_USER}:{DB_PASSWORD}@{host_port}/{DB_NAME}"
    else:
        # Fallback to local SQLite for development
        uri = "sqlite:///tasks.db"

app.config["SQLALCHEMY_DATABASE_URI"] = uri
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

logging.basicConfig(level=logging.INFO)
if uri.startswith("sqlite"):
    logging.info("Using SQLite database: %s", uri)
else:
    logging.info("Using database URI from environment or built Postgres URI")

db.init_app(app)

app.register_blueprint(api)

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
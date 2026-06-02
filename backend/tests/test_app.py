import importlib
import sys

from flask import Flask


def test_app_module_creates_flask_app():
    import app

    assert isinstance(app.app, Flask)
    assert app.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is False
    assert "api" in app.app.blueprints


def test_app_uses_explicit_database_uri_env(monkeypatch):
    monkeypatch.setenv("SQLALCHEMY_DATABASE_URI", "sqlite:///:memory:")

    sys.modules.pop("app", None)
    reloaded = importlib.import_module("app")

    assert reloaded.app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite:///:memory:"
    assert "api" in reloaded.app.blueprints

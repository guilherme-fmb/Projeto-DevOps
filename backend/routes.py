from flask import Blueprint
from flask import jsonify
from flask import request
from flask import current_app

from database import db
from models import Task

VALID_STATUSES = {
    "pending",
    "in_progress",
    "done"
}

STATUS_LABELS = {
    "pending": "Aguardando",
    "in_progress": "Em andamento",
    "done": "Concluída"
}


def is_valid_status(status):
    return status in VALID_STATUSES


api = Blueprint(
    "api",
    __name__
)

@api.route("/")
def home():

    return jsonify({
        "message": "Task Manager API"
    })


@api.route("/tasks", methods=["POST"])
def create_task():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Body obrigatório"
        }), 400

    if "title" not in data:
        return jsonify({
            "error": "Campo title obrigatório"
        }), 400

    status = data.get("status", "pending")
    if not is_valid_status(status):
        return jsonify({
            "error": "Status inválido. Valores válidos: pending, in_progress, done"
        }), 400

    task = Task(
        title=data["title"],
        description=data.get(
            "description",
            ""
        ),
        status=status
    )

    db.session.add(task)
    db.session.commit()

    return jsonify(
        task.to_dict()
    ), 201


@api.route("/tasks", methods=["GET"])
def get_tasks():

    tasks = Task.query.all()

    return jsonify(
        [
            task.to_dict()
            for task in tasks
        ]
    )

@api.route("/tasks/<int:id>", methods=["GET"])
def get_task(id):

    #task = Task.query.get(id)
    task = db.session.get(Task, id)

    if not task:

        return jsonify({
            "error": "Task não encontrada"
        }), 404

    return jsonify(
        task.to_dict()
    )

@api.route("/tasks/<int:id>", methods=["PUT"])
def update_task(id):

    task = db.session.get(Task, id)

    if not task:

        return jsonify({
            "error": "Task não encontrada"
        }), 404

    data = request.get_json()

    task.title = data.get(
        "title",
        task.title
    )

    task.description = data.get(
        "description",
        task.description
    )

    if "status" in data:
        status = data["status"]
        if not is_valid_status(status):
            return jsonify({
                "error": "Status inválido. Valores válidos: pending, in_progress, done"
            }), 400
        task.status = status

    db.session.commit()

    return jsonify(
        task.to_dict()
    )

@api.route("/tasks/<int:id>", methods=["DELETE"])
def delete_task(id):

    task = db.session.get(Task, id)

    if not task:

        return jsonify({
            "error": "Task não encontrada"
        }), 404

    db.session.delete(task)
    db.session.commit()

    return jsonify({
        "message": "Task removida com sucesso"
    })


@api.route("/tasks/<int:id>/status", methods=["PATCH"])
def update_task_status(id):

    task = db.session.get(Task, id)

    if not task:

        return jsonify({
            "error": "Task não encontrada"
        }), 404

    data = request.get_json()
    if not data or "status" not in data:
        return jsonify({
            "error": "Campo status obrigatório"
        }), 400

    status = data["status"]
    if not is_valid_status(status):
        return jsonify({
            "error": "Status inválido. Valores válidos: pending, in_progress, done"
        }), 400

    task.status = status
    db.session.commit()

    return jsonify(task.to_dict())


@api.route("/statuses", methods=["GET"])
def get_statuses():
    return jsonify([
        {"value": key, "label": label}
        for key, label in STATUS_LABELS.items()
    ])


@api.route("/ui")
def ui():
    """Serve a interface web estática em /ui (arquivo static/index.html)."""
    return current_app.send_static_file("index.html")
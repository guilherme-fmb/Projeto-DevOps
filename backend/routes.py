from flask import Blueprint
from flask import jsonify
from flask import request

from database import db
from models import Task


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

    task = Task(
        title=data["title"],
        description=data.get(
            "description",
            ""
        ),
        status=data.get(
            "status",
            "pending"
        )
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

    task = Task.query.get(id)

    if not task:

        return jsonify({
            "error": "Task não encontrada"
        }), 404

    return jsonify(
        task.to_dict()
    )

@api.route("/tasks/<int:id>", methods=["PUT"])
def update_task(id):

    task = Task.query.get(id)

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

    task.status = data.get(
        "status",
        task.status
    )

    db.session.commit()

    return jsonify(
        task.to_dict()
    )

@api.route("/tasks/<int:id>", methods=["DELETE"])
def delete_task(id):

    task = Task.query.get(id)

    if not task:

        return jsonify({
            "error": "Task não encontrada"
        }), 404

    db.session.delete(task)
    db.session.commit()

    return jsonify({
        "message": "Task removida com sucesso"
    })
from database import db
from models import Task


def test_task_to_dict_contains_expected_fields():
    task = Task(
        title="Comprar leite",
        description="Ir ao mercado",
        status="pending"
    )

    task_dict = task.to_dict()

    assert task_dict["id"] is None
    assert task_dict["title"] == "Comprar leite"
    assert task_dict["description"] == "Ir ao mercado"
    assert task_dict["status"] == "pending"


def test_task_default_status_is_pending(client):
    with client.application.app_context():
        task = Task(title="Nova tarefa")
        db.session.add(task)
        db.session.commit()

        assert task.status == "pending"

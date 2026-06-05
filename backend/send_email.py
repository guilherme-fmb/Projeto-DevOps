import os
import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg["Subject"] = "Pipeline Jenkins"
msg["From"] = os.getenv("EMAIL_USER")
msg["To"] = os.getenv("EMAIL_DESTINO")

msg.set_content("Pipeline executado com sucesso!")

with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
    smtp.login(
        os.getenv("EMAIL_USER"),
        os.getenv("EMAIL_PASSWORD")
    )
    smtp.send_message(msg)

print("Email enviado com sucesso!")
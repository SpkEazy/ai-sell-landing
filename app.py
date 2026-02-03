import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ---------- Routes ----------
@app.get("/")
def home():
    return render_template("index.html")

@app.post("/api/lead")
def lead():
    data = request.get_json(force=True)

    # Honeypot (bots fill this)
    if data.get("company"):
        return jsonify({"ok": True})  # pretend success

    required = ["name", "phone", "email", "address"]
    for k in required:
        if not str(data.get(k, "")).strip():
            return jsonify({"ok": False, "error": f"Missing {k}"}), 400

    try:
        send_lead_email(data)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


# ---------- Email ----------
def send_lead_email(data: dict):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.office365.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")         # e.g. jelena@auctioninc.co.za
    smtp_pass = os.getenv("SMTP_PASS")         # app password / smtp password
    to_email   = os.getenv("LEADS_TO_EMAIL")   # where leads go

    if not smtp_user or not smtp_pass or not to_email:
        raise RuntimeError("Missing SMTP env vars (SMTP_USER/SMTP_PASS/LEADS_TO_EMAIL)")

    subject = f"New AuctionInc Lead: {data.get('name')} ({data.get('phone')})"

    body = f"""
New Lead Received

Name: {data.get('name')}
Phone: {data.get('phone')}
Email: {data.get('email')}
Address: {data.get('address')}

Message:
{data.get('message', '')}

Page URL: {data.get('page_url', '')}
User Agent: {data.get('user_agent', '')}
"""

    msg = MIMEMultipart()
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_pass)
    server.sendmail(smtp_user, to_email, msg.as_string())
    server.quit()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)

# app.py
import os
import smtplib
from email.message import EmailMessage
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Expected Render env vars:
# SMTP_SERVER=smtp.office365.com
# SMTP_PORT=587
# SMTP_USER=jelena@auctioninc.co.za
# SMTP_PASS=<Office365 App Password>
# LEADS_TO_EMAIL=jelena@auctioninc.co.za


@app.get("/")
def home():
    return render_template("index.html")


def _env(name: str, default: str | None = None) -> str | None:
    v = os.getenv(name, default)
    if v is None:
        return None
    v = v.strip()
    return v if v else None


def send_lead_email(
    *,
    name: str,
    phone: str,
    email: str,
    address: str,
    message: str,
    attribution: dict | None = None,
) -> None:
    smtp_server = _env("SMTP_SERVER")
    smtp_port = _env("SMTP_PORT")
    smtp_user = _env("SMTP_USER")
    smtp_pass = _env("SMTP_PASS")
    to_email = _env("LEADS_TO_EMAIL")

    missing = [k for k, v in {
        "SMTP_SERVER": smtp_server,
        "SMTP_PORT": smtp_port,
        "SMTP_USER": smtp_user,
        "SMTP_PASS": smtp_pass,
        "LEADS_TO_EMAIL": to_email,
    }.items() if not v]

    if missing:
        raise RuntimeError(f"Missing env vars: {', '.join(missing)}")

    try:
        port_int = int(smtp_port)  # type: ignore[arg-type]
    except Exception:
        raise RuntimeError("SMTP_PORT must be an integer (e.g. 587)")

    msg = EmailMessage()
    msg["Subject"] = f"New AuctionInc Lead: {name}"
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg["Reply-To"] = email

    # ---- Lead source (utm_source only) ----
    attribution = attribution or {}
    utm_source = (attribution.get("utm_source") or "").strip()

    lead_source_line = (
        f"Lead Source: {utm_source.capitalize()}"
        if utm_source
        else "Lead Source: Direct / Unknown"
    )

    body = f"""New lead received from AuctionInc landing page

Name: {name}
Phone: {phone}
Email: {email}
Property Address: {address}

Message:
{message if message else "(none)"}

{lead_source_line}
"""
    msg.set_content(body)

    # Office365 SMTP: STARTTLS on 587
    with smtplib.SMTP(smtp_server, port_int, timeout=20) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


@app.post("/api/lead")
def api_lead():
    data = request.get_json(silent=True) or request.form.to_dict()

    # Honeypot check
    if (data.get("website") or "").strip():
        return jsonify({"error": "Spam detected"}), 400

    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    address = (data.get("address") or "").strip()
    message = (data.get("message") or "").strip()

    attribution = data.get("attribution")
    if not isinstance(attribution, dict):
        attribution = None

    # Basic validation
    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not phone or len(phone) < 7:
        return jsonify({"error": "Valid phone is required"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "Valid email is required"}), 400
    if not address:
        return jsonify({"error": "Address is required"}), 400

    try:
        send_lead_email(
            name=name,
            phone=phone,
            email=email,
            address=address,
            message=message,
            attribution=attribution,
        )
    except Exception as e:
        app.logger.exception("Failed to send lead email")
        return jsonify({"error": f"Email failed: {str(e)}"}), 500

    return jsonify({"ok": True}), 200


if __name__ == "__main__":
    # Local dev
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)

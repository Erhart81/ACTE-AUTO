from flask import Flask, request, send_file
from fpdf import FPDF
from PIL import Image
import pytesseract
import tempfile
import re
import smtplib
from email.message import EmailMessage
import os

app = Flask(__name__)

EMAIL_SENDER = os.getenv('EMAIL_SENDER', 'demo@example.com')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'passworddemo')

def extract_text(file):
    image = Image.open(file.stream)
    return pytesseract.image_to_string(image, lang='ron')

def extract_fields(text):
    fields = {}
    cnp = re.search(r'\b[1-9]\d{12}\b', text)
    if cnp: fields['CNP'] = cnp.group()
    seria_ci = re.search(r'\b[A-Z]{2}\s?\d{6}\b', text)
    if seria_ci: fields['Seria CI'] = seria_ci.group()
    vin = re.search(r'\b[A-HJ-NPR-Z0-9]{17}\b', text)
    if vin: fields['VIN'] = vin.group()
    lines = text.splitlines()
    for line in lines:
        if line.strip().isupper() and 5 < len(line.strip()) < 50:
            fields.setdefault('Nume', line.strip())
            break
    return fields

def trimite_email(destinatar, pdf_path):
    msg = EmailMessage()
    msg['Subject'] = 'Contract auto generat'
    msg['From'] = EMAIL_SENDER
    msg['To'] = destinatar
    msg.set_content('Găsești atașat contractul auto generat.')

    with open(pdf_path, 'rb') as f:
        msg.add_attachment(f.read(), maintype='application', subtype='pdf', filename='contract-auto.pdf')

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(EMAIL_SENDER, EMAIL_PASSWORD)
        smtp.send_message(msg)

@app.route("/api/generate-pdf", methods=["POST"])
def generate_pdf():
    files = request.files
    required = ["sellerCI", "buyerCI", "talon", "civ"]
    if not all(name in files for name in required):
        return "Lipsesc documente", 400

    extracted = {}
    for name in required:
        raw_text = extract_text(files[name])
        extracted[name] = extract_fields(raw_text)

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt="CONTRACT AUTO - CU EMAIL", ln=True, align='C')
    pdf.ln(10)

    for doc_name, fields in extracted.items():
        pdf.set_font("Arial", style='B', size=12)
        pdf.cell(0, 10, f"{doc_name.upper()}:", ln=True)
        pdf.set_font("Arial", size=11)
        if fields:
            for key, value in fields.items():
                pdf.cell(0, 10, f"  {key}: {value}", ln=True)
        else:
            pdf.cell(0, 10, "  Nu s-au putut extrage date.", ln=True)
        pdf.ln(4)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    pdf.output(tmp.name)

    email_to = request.form.get('email')
    if email_to:
        try:
            trimite_email(email_to, tmp.name)
        except Exception as e:
            print("Eroare trimitere email:", e)

    return send_file(tmp.name, as_attachment=True, download_name="contract-auto.pdf")

if __name__ == "__main__":
    app.run(debug=True)

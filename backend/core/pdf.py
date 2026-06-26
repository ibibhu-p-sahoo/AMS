"""Talent brochure PDF generation (PRD §3 Talent Brochure Generator)."""
from io import BytesIO

from django.http import HttpResponse
from django.template.loader import render_to_string
from xhtml2pdf import pisa


def render_student_brochure(student):
    skills = student.skills if isinstance(student.skills, list) else []
    html = render_to_string(
        "brochure.html",
        {"s": student, "skills": skills},
    )
    buffer = BytesIO()
    result = pisa.CreatePDF(html, dest=buffer)
    if result.err:
        return HttpResponse("Failed to render brochure", status=500)
    resp = HttpResponse(buffer.getvalue(), content_type="application/pdf")
    resp["Content-Disposition"] = (
        f'inline; filename="talent-brochure-{student.id}.pdf"'
    )
    return resp

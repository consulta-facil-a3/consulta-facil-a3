import fitz
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "relatorio" / "draft.pdf"
OUT = ROOT / "relatorio" / "consulta-facil-a3.pdf"

doc = fitz.open(SRC)
total = doc.page_count
gray = (0.396, 0.478, 0.455)
line = (0.843, 0.890, 0.875)

for index in range(1, total):
    page = doc[index]
    width = page.rect.width
    height = page.rect.height
    left = 71
    right = width - 71
    y_line = height - 52
    y_text = height - 38
    page.draw_line((left, y_line), (right, y_line), color=line, width=0.5)
    page.insert_text((left, y_text), "Consulta Fácil | A3 2026",
                     fontname="helv", fontsize=7.5, color=gray)
    label = f"{index + 1} / {total}"
    text_width = fitz.get_text_length(label, fontname="helv", fontsize=7.5)
    page.insert_text((right - text_width, y_text), label,
                     fontname="helv", fontsize=7.5, color=gray)

doc.set_metadata({
    "title": "Consulta Fácil | A3 Estudo de caso",
    "author": "Grupo A3",
    "subject": "Plano de engenharia para o agendamento de consultas na rede pública",
    "keywords": "engenharia de software, A3, agendamento, SUS, protótipo",
    "creator": "Consulta Fácil",
    "producer": "Microsoft Edge e PyMuPDF",
})
doc.save(OUT, garbage=4, deflate=True)
doc.close()
print(OUT, total)

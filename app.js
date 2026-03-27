from __future__ import annotations

from dataclasses import asdict
from typing import Any

import fitz

from app.config.fenix_field_map import PAGE_1, PAGE_7, HEALTH_MATRIX, EDITABLE_WIDGETS

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
]


def _get_fontfile() -> str | None:
    import os
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


FONTFILE = _get_fontfile()


def _visual_rtl(text: str) -> str:
    text = str(text or "").strip()
    if not text:
        return ""
    if any('\u0590' <= ch <= '\u05ff' for ch in text):
        return text[::-1]
    return text


class FenixPdfFiller:
    def __init__(self, template_bytes: bytes):
        self.doc = fitz.open(stream=template_bytes, filetype="pdf")
        self.fontfile = FONTFILE

    def _textbox(self, page_index: int, rect_tuple: tuple[float, float, float, float], value: str, fontsize: float = 8.7):
        if not value:
            return
        page = self.doc[page_index]
        rect = fitz.Rect(*rect_tuple)
        page.insert_textbox(
            rect,
            _visual_rtl(value),
            fontname="F0",
            fontfile=self.fontfile,
            fontsize=fontsize,
            align=fitz.TEXT_ALIGN_RIGHT,
            color=(0, 0, 0),
        )

    def _check(self, page_index: int, x: float, y: float, mark: str = "X"):
        page = self.doc[page_index]
        rect = fitz.Rect(x - 5, y - 5, x + 5, y + 5)
        page.insert_textbox(
            rect,
            mark,
            fontname="F0",
            fontfile=self.fontfile,
            fontsize=9,
            align=fitz.TEXT_ALIGN_CENTER,
            color=(0, 0, 0),
        )

    def _fill_person(self, prefix: str, person: dict[str, Any]):
        page = 0
        first_name = person.get("first_name", "")
        last_name = person.get("last_name", "")
        self._textbox(page, PAGE_1[f"{prefix}_first_name"], first_name)
        self._textbox(page, PAGE_1[f"{prefix}_last_name"], last_name)
        self._textbox(page, PAGE_1[f"{prefix}_id"], person.get("id_number", ""))
        self._textbox(page, PAGE_1[f"{prefix}_birth_date"], person.get("birth_date", ""))
        self._textbox(page, PAGE_1[f"{prefix}_health_fund"], person.get("health_fund", ""))
        self._textbox(page, PAGE_1[f"{prefix}_occupation"], person.get("occupation", ""), fontsize=7.8)
        self._textbox(page, PAGE_1[f"{prefix}_mobile"], person.get("mobile", ""))
        self._textbox(page, PAGE_1[f"{prefix}_email"], person.get("email", ""), fontsize=6.6)
        addr = person.get("address", {})
        self._textbox(page, PAGE_1[f"{prefix}_street"], addr.get("street", ""), fontsize=7.5)
        self._textbox(page, PAGE_1[f"{prefix}_house"], addr.get("house_number", ""))
        self._textbox(page, PAGE_1[f"{prefix}_city"], addr.get("city", ""))
        self._textbox(page, PAGE_1[f"{prefix}_zip"], addr.get("zip_code", ""))

        gender = person.get("gender", "")
        if "זכר" in gender:
            self._check(page, *PAGE_1[f"{prefix}_gender_m"][:2])
        elif gender:
            self._check(page, *PAGE_1[f"{prefix}_gender_f"][:2])

        marital = person.get("marital_status", "")
        if marital.startswith("ר"):
            self._check(page, *PAGE_1[f"{prefix}_marital_r"][:2])
        elif marital.startswith("נ"):
            self._check(page, *PAGE_1[f"{prefix}_marital_n"][:2])
        elif marital.startswith("ג"):
            self._check(page, *PAGE_1[f"{prefix}_marital_g"][:2])
        elif marital.startswith("א") or marital.startswith("י"):
            self._check(page, *PAGE_1[f"{prefix}_marital_a"][:2])

        supplementary = person.get("supplementary_insurance", "")
        if supplementary and supplementary not in {"לא", "אין"}:
            self._check(page, *PAGE_1[f"{prefix}_supplementary_yes"][:2])
        else:
            self._check(page, *PAGE_1[f"{prefix}_supplementary_no"][:2])

        pref = person.get("delivery_preference", "email")
        if pref == "mail":
            self._check(page, *PAGE_1[f"{prefix}_pref_mail"][:2])
        else:
            self._check(page, *PAGE_1[f"{prefix}_pref_email"][:2])

    def _fill_health(self, candidate_key: str, health: dict[str, str]):
        is_candidate1 = candidate_key == "primary"
        for q, answer in health.items():
            if q not in HEALTH_MATRIX:
                continue
            page_idx, x_yes_c1, x_no_c1, x_yes_c2, x_no_c2, y = HEALTH_MATRIX[q]
            if is_candidate1:
                x = x_yes_c1 if answer == "כן" else x_no_c1
            else:
                x = x_yes_c2 if answer == "כן" else x_no_c2
            self._check(page_idx, x, y)

    def _fill_page7_personal(self, parsed: dict[str, Any]):
        p1 = parsed.get("primary_insured", {})
        p2 = parsed.get("secondary_insured", {})
        if p1.get("full_name"):
            self._textbox(6, PAGE_7["c1_name"], p1["full_name"], fontsize=8)
        if p2.get("full_name"):
            self._textbox(6, PAGE_7["c2_name"], p2["full_name"], fontsize=8)
        self._textbox(6, PAGE_7["c1_height"], p1.get("height_cm", ""))
        self._textbox(6, PAGE_7["c2_height"], p2.get("height_cm", ""))
        self._textbox(6, PAGE_7["c1_weight"], p1.get("weight_kg", ""))
        self._textbox(6, PAGE_7["c2_weight"], p2.get("weight_kg", ""))

    def _add_editable_widgets(self):
        for item in EDITABLE_WIDGETS:
            page = self.doc[item["page"]]
            widget = fitz.Widget()
            widget.field_name = item["name"]
            widget.field_label = item["name"]
            widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
            widget.rect = fitz.Rect(*item["rect"])
            widget.text_font = "Helv"
            widget.text_fontsize = 8
            widget.field_value = item.get("value", "")
            page.add_widget(widget)

    def fill(self, parsed_data: dict[str, Any]) -> bytes:
        self._textbox(0, PAGE_1["agent_name"], parsed_data.get("agent_name", ""))
        self._textbox(0, PAGE_1["agent_number"], parsed_data.get("agent_number", ""))
        self._textbox(0, PAGE_1["proposal_number"], parsed_data.get("proposal_number", ""))

        self._fill_person("c1", parsed_data.get("primary_insured", {}))
        self._fill_person("c2", parsed_data.get("secondary_insured", {}))
        self._fill_page7_personal(parsed_data)
        self._fill_health("primary", parsed_data.get("health_primary", {}))
        self._fill_health("secondary", parsed_data.get("health_secondary", {}))
        self._add_editable_widgets()
        return self.doc.tobytes(garbage=3, deflate=True)

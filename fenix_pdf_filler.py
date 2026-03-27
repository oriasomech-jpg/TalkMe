"""Approximate field coordinates for the original Fenix proposal PDF.
Coordinates are in PyMuPDF page coordinate space: (x0, y0, x1, y1).
"""

PAGE_1 = {
    # agent area
    "agent_name": (382, 74, 505, 90),
    "agent_number": (278, 74, 365, 90),
    "proposal_number": (82, 74, 165, 90),

    # candidate 1 column
    "c1_last_name": (485, 177, 555, 190),
    "c1_first_name": (424, 177, 482, 190),
    "c1_id": (348, 177, 416, 190),
    "c1_birth_date": (351, 239, 416, 252),
    "c1_health_fund": (351, 255, 416, 268),
    "c1_supplementary_yes": (377, 271, 389, 283),
    "c1_supplementary_no": (348, 271, 360, 283),
    "c1_occupation": (351, 286, 416, 300),
    "c1_mobile": (351, 347, 416, 360),
    "c1_email": (351, 363, 416, 379),
    "c1_pref_email": (374, 400, 385, 412),
    "c1_pref_mail": (349, 400, 360, 412),
    "c1_street": (351, 441, 416, 454),
    "c1_house": (351, 458, 416, 471),
    "c1_city": (351, 474, 416, 487),
    "c1_zip": (351, 490, 416, 503),
    "c1_gender_m": (379, 208, 390, 220),
    "c1_gender_f": (349, 208, 360, 220),
    "c1_marital_r": (378, 224, 389, 236),
    "c1_marital_n": (367, 224, 378, 236),
    "c1_marital_g": (355, 224, 366, 236),
    "c1_marital_a": (345, 224, 356, 236),

    # candidate 2 column
    "c2_last_name": (302, 177, 372, 190),
    "c2_first_name": (241, 177, 299, 190),
    "c2_id": (166, 177, 234, 190),
    "c2_birth_date": (168, 239, 233, 252),
    "c2_health_fund": (168, 255, 233, 268),
    "c2_supplementary_yes": (193, 271, 205, 283),
    "c2_supplementary_no": (165, 271, 177, 283),
    "c2_occupation": (168, 286, 233, 300),
    "c2_mobile": (168, 347, 233, 360),
    "c2_email": (168, 363, 233, 379),
    "c2_pref_email": (191, 400, 202, 412),
    "c2_pref_mail": (166, 400, 177, 412),
    "c2_street": (168, 441, 233, 454),
    "c2_house": (168, 458, 233, 471),
    "c2_city": (168, 474, 233, 487),
    "c2_zip": (168, 490, 233, 503),
    "c2_gender_m": (196, 208, 207, 220),
    "c2_gender_f": (166, 208, 177, 220),
    "c2_marital_r": (195, 224, 206, 236),
    "c2_marital_n": (184, 224, 195, 236),
    "c2_marital_g": (172, 224, 183, 236),
    "c2_marital_a": (162, 224, 173, 236),
}

PAGE_7 = {
    "c1_name": (472, 164, 538, 177),
    "c2_name": (380, 164, 445, 177),
    "c1_height": (231, 174, 266, 187),
    "c2_height": (186, 174, 222, 187),
    "c1_weight": (230, 189, 267, 202),
    "c2_weight": (186, 189, 223, 202),
}

# Approximate checkbox matrix positions for page 7 and 8.
# Each entry is (page_index_zero_based, x_yes_candidate1, x_no_candidate1, x_yes_candidate2, x_no_candidate2, y)
HEALTH_MATRIX = {
    # page 7 original numbering 2.1 ... 4.4 mapped from operational questions 1..16
    "q1":  (6, 325, 307, 278, 260, 271),
    "q2":  (6, 325, 307, 278, 260, 322),
    "q3":  (6, 325, 307, 278, 260, 365),
    "q4":  (6, 325, 307, 278, 260, 404),
    "q5":  (6, 325, 307, 278, 260, 433),
    "q6":  (6, 325, 307, 278, 260, 463),
    "q7":  (6, 325, 307, 278, 260, 492),
    "q8":  (6, 325, 307, 278, 260, 521),
    "q9":  (7, 325, 307, 278, 260, 94),
    "q10": (7, 325, 307, 278, 260, 124),
    "q11": (7, 325, 307, 278, 260, 154),
    "q12": (7, 325, 307, 278, 260, 185),
    "q13": (7, 325, 307, 278, 260, 215),
    "q14": (7, 325, 307, 278, 260, 245),
    "q15": (7, 325, 307, 278, 260, 275),
    "q16": (7, 325, 307, 278, 260, 305),
}

EDITABLE_WIDGETS = [
    {"page": 1, "name": "beneficiaries_note", "rect": (65, 238, 150, 250), "value": ""},
    {"page": 8, "name": "positive_findings_1", "rect": (20, 108, 575, 135), "value": ""},
    {"page": 8, "name": "positive_findings_2", "rect": (20, 136, 575, 163), "value": ""},
    {"page": 8, "name": "signature_agent", "rect": (32, 764, 178, 786), "value": ""},
]

export const editableFieldStyle = {
  borderWidth: 0.5,
  fontSize: 10,
  textColorRgb: [0.1, 0.1, 0.1],
  borderColorRgb: [0.75, 0.75, 0.75]
};

export const pageMap = [
  {
    page: 0,
    draws: [
      { key: 'policy.requestedStartDate', type: 'text', x: 418, y: 771, size: 9 },
      { key: 'agent.name', type: 'text', x: 520, y: 748, size: 9 },
      { key: 'agent.number', type: 'text', x: 431, y: 748, size: 9 },
      { key: 'agent.supervisorName', type: 'editableText', fieldName: 'agent.supervisorName', x: 326, y: 740, width: 90, height: 16 },
      { key: 'agent.teamNumber', type: 'editableText', fieldName: 'agent.teamNumber', x: 247, y: 740, width: 70, height: 16 },
      { key: 'agent.salesManager', type: 'editableText', fieldName: 'agent.salesManager', x: 140, y: 740, width: 95, height: 16 },
      { key: 'agent.proposalNumber', type: 'editableText', fieldName: 'agent.proposalNumber', x: 60, y: 740, width: 70, height: 16 },

      { key: 'candidates.0.lastName', type: 'text', x: 533, y: 648, size: 8 },
      { key: 'candidates.0.firstName', type: 'text', x: 533, y: 633, size: 8 },
      { key: 'candidates.0.idNumber', type: 'text', x: 533, y: 619, size: 8 },
      { key: 'candidates.0.gender', type: 'radio', trueValue: 'זכר', x: 534, y: 603, offX: 508, offY: 603 },
      { key: 'candidates.0.maritalStatus', type: 'marital', xMap: { 'רווק': 534, 'נשוי': 520, 'גרוש': 507, 'ידוע בציבור': 494 }, y: 588 },
      { key: 'candidates.0.birthDate', type: 'text', x: 533, y: 572, size: 8 },
      { key: 'candidates.0.healthFund', type: 'text', x: 533, y: 557, size: 8 },
      { key: 'candidates.0.hasSupplementaryInsurance', type: 'yesNo', yesX: 533, noX: 510, y: 541 },
      { key: 'candidates.0.occupation', type: 'text', x: 533, y: 526, size: 8 },
      { key: 'candidates.0.mobile', type: 'text', x: 533, y: 495, size: 8 },
      { key: 'candidates.0.email', type: 'text', x: 533, y: 480, size: 7 },
      { key: 'candidates.0.deliveryPreference', type: 'delivery', emailX: 530, mailX: 502, y: 462 },
      { key: 'candidates.0.address.street', type: 'text', x: 533, y: 430, size: 8 },
      { key: 'candidates.0.address.houseNumber', type: 'text', x: 533, y: 416, size: 8 },
      { key: 'candidates.0.address.city', type: 'text', x: 533, y: 401, size: 8 },
      { key: 'candidates.0.address.zipCode', type: 'editableText', fieldName: 'candidates.0.address.zipCode', x: 498, y: 393, width: 40, height: 15 },

      { key: 'candidates.1.lastName', type: 'text', x: 446, y: 648, size: 8 },
      { key: 'candidates.1.firstName', type: 'text', x: 446, y: 633, size: 8 },
      { key: 'candidates.1.idNumber', type: 'text', x: 446, y: 619, size: 8 },
      { key: 'candidates.1.gender', type: 'radio', trueValue: 'זכר', x: 447, y: 603, offX: 421, offY: 603 },
      { key: 'candidates.1.maritalStatus', type: 'marital', xMap: { 'רווק': 447, 'נשוי': 434, 'גרוש': 421, 'ידוע בציבור': 408 }, y: 588 },
      { key: 'candidates.1.birthDate', type: 'text', x: 446, y: 572, size: 8 },
      { key: 'candidates.1.healthFund', type: 'text', x: 446, y: 557, size: 8 },
      { key: 'candidates.1.hasSupplementaryInsurance', type: 'yesNo', yesX: 446, noX: 423, y: 541 },
      { key: 'candidates.1.occupation', type: 'text', x: 446, y: 526, size: 8 },
      { key: 'candidates.1.mobile', type: 'text', x: 446, y: 495, size: 8 },
      { key: 'candidates.1.email', type: 'text', x: 446, y: 480, size: 7 },
      { key: 'candidates.1.deliveryPreference', type: 'delivery', emailX: 443, mailX: 416, y: 462 },
      { key: 'candidates.1.address.street', type: 'text', x: 446, y: 430, size: 8 },
      { key: 'candidates.1.address.houseNumber', type: 'text', x: 446, y: 416, size: 8 },
      { key: 'candidates.1.address.city', type: 'text', x: 446, y: 401, size: 8 },
      { key: 'candidates.1.address.zipCode', type: 'editableText', fieldName: 'candidates.1.address.zipCode', x: 411, y: 393, width: 40, height: 15 },

      { key: 'signatures.page1Candidate1Date', type: 'editableText', fieldName: 'signatures.page1Candidate1Date', x: 512, y: 116, width: 50, height: 14 },
      { key: 'signatures.page1Candidate1', type: 'editableText', fieldName: 'signatures.page1Candidate1', x: 474, y: 116, width: 28, height: 14 },
      { key: 'signatures.page1Candidate2', type: 'editableText', fieldName: 'signatures.page1Candidate2', x: 388, y: 116, width: 28, height: 14 }
    ]
  },
  {
    page: 1,
    draws: [
      { key: 'candidates.0.fullName', type: 'text', x: 504, y: 730, size: 8 },
      { key: 'candidates.0.idNumber', type: 'text', x: 390, y: 730, size: 8 },
      { key: 'signatures.harHabituachConsentDate', type: 'editableText', fieldName: 'signatures.harHabituachConsentDate', x: 120, y: 720, width: 60, height: 14 },
      { key: 'existingCoverage.summary', type: 'editableText', fieldName: 'existingCoverage.summary', x: 172, y: 518, width: 350, height: 18 }
    ]
  },
  {
    page: 2,
    draws: [
      { key: 'beneficiaries.0.fullName', type: 'editableText', fieldName: 'beneficiaries.0.fullName', x: 474, y: 622, width: 78, height: 16 },
      { key: 'beneficiaries.0.idNumber', type: 'editableText', fieldName: 'beneficiaries.0.idNumber', x: 387, y: 622, width: 72, height: 16 },
      { key: 'beneficiaries.0.relationship', type: 'editableText', fieldName: 'beneficiaries.0.relationship', x: 139, y: 622, width: 60, height: 16 },
      { key: 'beneficiaries.0.sharePercent', type: 'editableText', fieldName: 'beneficiaries.0.sharePercent', x: 74, y: 622, width: 45, height: 16 }
    ]
  },
  {
    page: 6,
    draws: [
      { key: 'candidates.0.fullName', type: 'text', x: 455, y: 727, size: 8 },
      { key: 'candidates.0.heightCm', type: 'text', x: 455, y: 710, size: 8 },
      { key: 'candidates.0.weightKg', type: 'text', x: 455, y: 694, size: 8 },
      { key: 'candidates.1.fullName', type: 'text', x: 374, y: 727, size: 8 },
      { key: 'candidates.1.heightCm', type: 'text', x: 374, y: 710, size: 8 },
      { key: 'candidates.1.weightKg', type: 'text', x: 374, y: 694, size: 8 },

      { key: 'healthDeclarations.0.q1', type: 'yesNo', yesX: 455, noX: 442, y: 661 },
      { key: 'healthDeclarations.1.q1', type: 'yesNo', yesX: 374, noX: 361, y: 661 },
      { key: 'healthDeclarations.0.q2', type: 'yesNo', yesX: 455, noX: 442, y: 633 },
      { key: 'healthDeclarations.1.q2', type: 'yesNo', yesX: 374, noX: 361, y: 633 },
      { key: 'healthDeclarations.0.q3', type: 'yesNo', yesX: 455, noX: 442, y: 605 },
      { key: 'healthDeclarations.1.q3', type: 'yesNo', yesX: 374, noX: 361, y: 605 },
      { key: 'healthDeclarations.0.q4', type: 'yesNo', yesX: 455, noX: 442, y: 577 },
      { key: 'healthDeclarations.1.q4', type: 'yesNo', yesX: 374, noX: 361, y: 577 }
    ]
  }
];

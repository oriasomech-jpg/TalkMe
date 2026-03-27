function splitName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || ''
  };
}

function normalizeCandidate(person = {}) {
  const name = splitName(person.fullName || person.name);
  return {
    fullName: person.fullName || person.name || '',
    firstName: person.firstName || name.firstName,
    lastName: person.lastName || name.lastName,
    idNumber: person.idNumber || person.id || '',
    gender: person.gender || '',
    maritalStatus: person.maritalStatus || '',
    birthDate: person.birthDate || '',
    healthFund: person.healthFund || '',
    hasSupplementaryInsurance: person.hasSupplementaryInsurance ?? person.shaban ?? '',
    occupation: person.occupation || '',
    mobile: person.mobile || person.phone || '',
    email: person.email || '',
    deliveryPreference: person.deliveryPreference || 'email',
    address: {
      street: person.address?.street || '',
      houseNumber: person.address?.houseNumber || '',
      city: person.address?.city || '',
      zipCode: person.address?.zipCode || ''
    },
    heightCm: person.heightCm || person.height || '',
    weightKg: person.weightKg || person.weight || ''
  };
}

function normalizeHealthDeclaration(raw = {}) {
  const normalized = {};
  for (let i = 1; i <= 20; i += 1) {
    normalized[`q${i}`] = raw[`q${i}`] ?? raw[i] ?? '';
  }
  return normalized;
}

export function normalizeReportData(reportData = {}) {
  const candidates = [
    normalizeCandidate(reportData.primaryInsured || reportData.candidates?.[0] || {}),
    normalizeCandidate(reportData.secondaryInsured || reportData.candidates?.[1] || {})
  ];

  return {
    policy: {
      requestedStartDate: reportData.requestedStartDate || reportData.policy?.requestedStartDate || ''
    },
    agent: {
      name: reportData.agent?.name || reportData.agentName || '',
      number: reportData.agent?.number || reportData.agentNumber || '',
      supervisorName: reportData.agent?.supervisorName || '',
      teamNumber: reportData.agent?.teamNumber || '',
      salesManager: reportData.agent?.salesManager || '',
      proposalNumber: reportData.agent?.proposalNumber || ''
    },
    candidates,
    existingCoverage: {
      summary: reportData.existingCoverage?.summary || ''
    },
    beneficiaries: reportData.beneficiaries || [],
    healthDeclarations: [
      normalizeHealthDeclaration(reportData.healthDeclarations?.primary || reportData.healthDeclarations?.[0] || {}),
      normalizeHealthDeclaration(reportData.healthDeclarations?.secondary || reportData.healthDeclarations?.[1] || {})
    ],
    signatures: reportData.signatures || {}
  };
}

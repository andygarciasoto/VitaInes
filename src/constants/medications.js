// Common blood pressure medications database
export const BP_MEDICATIONS = [
  // ACE Inhibitors
  { id: 'lisinopril', name: 'Lisinopril', category: 'ACE Inhibitor', commonDoses: ['2.5mg', '5mg', '10mg', '20mg', '40mg'] },
  { id: 'enalapril', name: 'Enalapril', category: 'ACE Inhibitor', commonDoses: ['2.5mg', '5mg', '10mg', '20mg'] },
  { id: 'ramipril', name: 'Ramipril', category: 'ACE Inhibitor', commonDoses: ['1.25mg', '2.5mg', '5mg', '10mg'] },
  { id: 'captopril', name: 'Captopril', category: 'ACE Inhibitor', commonDoses: ['12.5mg', '25mg', '50mg', '100mg'] },
  { id: 'benazepril', name: 'Benazepril', category: 'ACE Inhibitor', commonDoses: ['5mg', '10mg', '20mg', '40mg'] },

  // ARBs
  { id: 'losartan', name: 'Losartan', category: 'ARB', commonDoses: ['25mg', '50mg', '100mg'] },
  { id: 'valsartan', name: 'Valsartan', category: 'ARB', commonDoses: ['40mg', '80mg', '160mg', '320mg'] },
  { id: 'olmesartan', name: 'Olmesartan', category: 'ARB', commonDoses: ['5mg', '20mg', '40mg'] },
  { id: 'irbesartan', name: 'Irbesartan', category: 'ARB', commonDoses: ['75mg', '150mg', '300mg'] },
  { id: 'telmisartan', name: 'Telmisartan', category: 'ARB', commonDoses: ['20mg', '40mg', '80mg'] },

  // Calcium Channel Blockers
  { id: 'amlodipine', name: 'Amlodipine', category: 'Calcium Channel Blocker', commonDoses: ['2.5mg', '5mg', '10mg'] },
  { id: 'nifedipine', name: 'Nifedipine', category: 'Calcium Channel Blocker', commonDoses: ['10mg', '20mg', '30mg', '60mg', '90mg'] },
  { id: 'diltiazem', name: 'Diltiazem', category: 'Calcium Channel Blocker', commonDoses: ['30mg', '60mg', '90mg', '120mg', '180mg', '240mg'] },
  { id: 'verapamil', name: 'Verapamil', category: 'Calcium Channel Blocker', commonDoses: ['40mg', '80mg', '120mg', '180mg', '240mg'] },
  { id: 'felodipine', name: 'Felodipine', category: 'Calcium Channel Blocker', commonDoses: ['2.5mg', '5mg', '10mg'] },

  // Beta Blockers
  { id: 'metoprolol', name: 'Metoprolol', category: 'Beta Blocker', commonDoses: ['25mg', '50mg', '100mg', '200mg'] },
  { id: 'atenolol', name: 'Atenolol', category: 'Beta Blocker', commonDoses: ['25mg', '50mg', '100mg'] },
  { id: 'carvedilol', name: 'Carvedilol', category: 'Beta Blocker', commonDoses: ['3.125mg', '6.25mg', '12.5mg', '25mg'] },
  { id: 'bisoprolol', name: 'Bisoprolol', category: 'Beta Blocker', commonDoses: ['2.5mg', '5mg', '10mg'] },
  { id: 'propranolol', name: 'Propranolol', category: 'Beta Blocker', commonDoses: ['10mg', '20mg', '40mg', '60mg', '80mg'] },

  // Diuretics
  { id: 'hydrochlorothiazide', name: 'Hydrochlorothiazide (HCTZ)', category: 'Diuretic', commonDoses: ['12.5mg', '25mg', '50mg'] },
  { id: 'chlorthalidone', name: 'Chlorthalidone', category: 'Diuretic', commonDoses: ['12.5mg', '25mg', '50mg'] },
  { id: 'furosemide', name: 'Furosemide', category: 'Diuretic', commonDoses: ['20mg', '40mg', '80mg'] },
  { id: 'spironolactone', name: 'Spironolactone', category: 'Diuretic', commonDoses: ['12.5mg', '25mg', '50mg', '100mg'] },
  { id: 'indapamide', name: 'Indapamide', category: 'Diuretic', commonDoses: ['1.25mg', '2.5mg'] },

  // Alpha Blockers
  { id: 'doxazosin', name: 'Doxazosin', category: 'Alpha Blocker', commonDoses: ['1mg', '2mg', '4mg', '8mg'] },
  { id: 'prazosin', name: 'Prazosin', category: 'Alpha Blocker', commonDoses: ['1mg', '2mg', '5mg'] },
  { id: 'terazosin', name: 'Terazosin', category: 'Alpha Blocker', commonDoses: ['1mg', '2mg', '5mg', '10mg'] },

  // Combination medications
  { id: 'lisinopril_hctz', name: 'Lisinopril/HCTZ', category: 'Combination', commonDoses: ['10/12.5mg', '20/12.5mg', '20/25mg'] },
  { id: 'losartan_hctz', name: 'Losartan/HCTZ', category: 'Combination', commonDoses: ['50/12.5mg', '100/12.5mg', '100/25mg'] },
  { id: 'amlodipine_benazepril', name: 'Amlodipine/Benazepril', category: 'Combination', commonDoses: ['2.5/10mg', '5/10mg', '5/20mg', '10/20mg', '10/40mg'] },
];

export const FREQUENCY_OPTIONS = [
  { id: 'once', labelKey: 'medications.once_daily', value: 1 },
  { id: 'twice', labelKey: 'medications.twice_daily', value: 2 },
  { id: 'three', labelKey: 'medications.three_times_daily', value: 3 },
  { id: 'four', labelKey: 'medications.four_times_daily', value: 4 },
  { id: 'asNeeded', labelKey: 'medications.as_needed', value: 0 },
];

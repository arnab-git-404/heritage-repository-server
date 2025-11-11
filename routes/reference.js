import express from 'express';

const router = express.Router();

// Minimal curated villages reference by Indian state to support typeahead
// Extendable later or moved to a DB collection
const villagesByState = {
  'Odisha': [
    'Bhitarkanika',
    'Chilika',
    'Raghurajpur',
    'Lanjigarh'
  ],
  'West Bengal': [
    'Chilapata',
    'Raghunathpur'
  ],
  'Chhattisgarh': [
    'Bastar',
    'Kanker'
  ],
  'Jharkhand': [
    'Netarhat'
  ],
  'Arunachal Pradesh': [
    'Ziro',
    'Daporijo'
  ],
  'Assam': [
    'Majuli'
  ],
  'Tripura': [
    'Korang'
  ],
  'Maharashtra': [
    'Jawhar',
    'Hirvewadi',
    'Dahanu',
    'Mendha Lekha'
  ],
  'Rajasthan': [
    'Piplantri',
    'Kumbhalgarh'
  ],
  'Andhra Pradesh': [
    'Araku Valley'
  ],
};

const preloadedVillages = [
  'Khonoma', 'Longwa', 'Touphema', 'Mokokchung', 'Pfutsero', 'Reiek', 'Nongriat', 'Nongkynrih', 'Ziro', 'Hong', 'Bhitarkanika', 'Bastar', 'Patangarh', 'Tejgadh', 'Mandla', 'Dzongu', 'Mon', 'Cherrapunji', 'Tawang', 'Chilapata'
];

const preloadedTribes = [
  'Angami', 'Ao', 'Sema (Sümi)', 'Lotha', 'Chakhesang', 'Konyak', 'Rengma', 'Phom', 'Chang', 'Sangtam', 'Khiamniungan', 'Yimchunger', 'Zeliang', 'Pochury', 'Mizo', 'Khasi', 'Garo', 'Apatani', 'Nyishi', 'Lepcha', 'Bhil', 'Santhal', 'Bodo', 'Mishing'
];

// GET /api/reference/villages?country=India&state=Odisha
router.get('/villages', (req, res) => {
  try {
    const state = req.query.state;
    const country = req.query.country;
    // Only India supported in this initial curated list
    if (!country || String(country) !== 'India') return res.json([]);
    if (!state) return res.json([]);
    const list = villagesByState[state] || [];
    res.json(list);
  } catch (e) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

router.get('/preloaded-tribes', (_req, res) => {
  try {
    res.json(preloadedTribes);
  } catch (e) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

router.get('/preloaded-villages', (_req, res) => {
  try {
    res.json(preloadedVillages);
  } catch (e) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

export default router;

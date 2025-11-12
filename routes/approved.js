




import express from 'express';
import ApprovedContent from '../models/ApprovedContent.js';
import { dbConnect } from '../utils/db.js';

const router = express.Router();

// GET /api/approved - Get all approved content with filters
router.get('/', async (req, res) => {
  try {
    const {
      country,
      state,
      tribe,
      village,
      culturalDomain,
      accessTier,
      q,
      sort = 'latest',
      page = 1,
      limit = 50
    } = req.query;

    console.log('📋 Fetching approved content with filters:', {
      country, state, tribe, village, culturalDomain, accessTier, q, sort
    });

    // Build query
    const query = {};

    if (country) query.country = country;
    if (state) query.stateRegion = state;
    if (tribe) query.tribe = new RegExp(tribe, 'i');
    if (village) query.village = new RegExp(village, 'i');
    if (culturalDomain) query.culturalDomain = culturalDomain;
    if (accessTier) query.accessTier = accessTier;

    // Text search
    if (q) {
      query.$or = [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { keywords: new RegExp(q, 'i') },
        { tribe: new RegExp(q, 'i') }
      ];
    }

    console.log('🔍 Query:', JSON.stringify(query));

    // Sorting
    let sortOption = {};
    switch (sort) {
      case 'latest':
        sortOption = { approvedAt: -1 };
        break;
      case 'oldest':
        sortOption = { approvedAt: 1 };
        break;
      case 'views':
        sortOption = { views: -1 };
        break;
      default:
        sortOption = { approvedAt: -1 };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    await dbConnect();

    const [content, total] = await Promise.all([
      ApprovedContent.find(query)
        .populate('userId', 'name email')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ApprovedContent.countDocuments(query)
    ]);

    console.log('✅ Found approved content:', content.length, 'Total:', total);

    res.json(content);
  } catch (error) {
    console.error('❌ Fetch approved content error:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to fetch approved content' }] });
  }
});

// GET /api/approved/:id - Get single approved content
router.get('/:id', async (req, res) => {
  try {

    await dbConnect();

    const content = await ApprovedContent.findById(req.params.id)
      .populate('userId', 'name email');

    if (!content) {
      return res.status(404).json({ errors: [{ msg: 'Content not found' }] });
    }

    res.json(content);
  } catch (error) {
    console.error('Fetch content error:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to fetch content' }] });
  }
});

// POST /api/approved/:id/view - Track view
router.post('/:id/view', async (req, res) => {
  try {
    await dbConnect();

    const content = await ApprovedContent.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ errors: [{ msg: 'Content not found' }] });
    }

    res.json({ views: content.views });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to track view' }] });
  }
});

// POST /api/approved/:id/download - Track download
router.post('/:id/download', async (req, res) => {
  try {

    await dbConnect();

    const content = await ApprovedContent.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ errors: [{ msg: 'Content not found' }] });
    }

    res.json({ downloads: content.downloads });
  } catch (error) {
    console.error('Track download error:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to track download' }] });
  }
});

export default router;
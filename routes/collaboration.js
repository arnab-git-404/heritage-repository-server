import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import Collaboration from '../models/Collaboration.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

const router = express.Router();

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ errors: [{ msg: 'Missing token' }] });
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ errors: [{ msg: 'Server misconfiguration: JWT secret not set' }] });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || !payload.user || !payload.user.id) {
      return res.status(401).json({ errors: [{ msg: 'Invalid token' }] });
    }
    req.userId = payload.user.id;
    next();
  } catch (e) {
    return res.status(401).json({ errors: [{ msg: 'Invalid token' }] });
  }
}

// Find users who have at least one approved submission in the given category
// GET /api/collab/contributors?category=folkdance
router.get('/contributors', async (req, res) => {
  try {
    const category = String(req.query.category || '').toLowerCase().trim();
    if (!category) return res.status(400).json({ errors: [{ msg: 'category is required' }] });

    const pipeline = [
      { $match: { status: 'approved', category: { $exists: true, $ne: null } } },
      { $addFields: { lc: { $toLower: '$category' } } },
      { $match: { lc: category } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $limit: 100 },
    ];
    const grouped = await Submission.aggregate(pipeline);
    const userIds = grouped.map(g => g._id);

    const users = await User.find({ _id: { $in: userIds } }).select('name');
    const usersMap = new Map(users.map(u => [String(u._id), u]));

    const results = userIds
      .map(id => {
        const u = usersMap.get(String(id));
        if (!u) return null;
        return { id: String(id), name: u.name, category };
      })
      .filter(Boolean);

    res.json(results);
  } catch (e) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

// Send a collaboration request
// POST /api/collab/requests { recipientId, category }
router.post(
  '/requests',
  requireAuth,
  [
    body('recipientId').isString().trim().notEmpty(),
    body('category').isString().trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { recipientId, category } = req.body;
    if (String(recipientId) === String(req.userId)) {
      return res.status(400).json({ errors: [{ msg: 'Cannot collaborate with yourself' }] });
    }

    try {
      // Upsert to avoid duplicates per user pair
      const doc = await Collaboration.findOneAndUpdate(
        { requesterId: req.userId, recipientId },
        { $setOnInsert: { requesterId: req.userId, recipientId, category, status: 'pending' }, $set: { category } },
        { new: true, upsert: true }
      );
      return res.status(201).json(doc);
    } catch (e) {
      return res.status(500).json({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// List my collaboration requests (incoming and outgoing)
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const myId = req.userId;
    const items = await Collaboration.find({ $or: [{ requesterId: myId }, { recipientId: myId }] })
      .sort({ createdAt: -1 })
      .lean();

    // Attach minimal user info
    const ids = Array.from(new Set(items.flatMap(i => [String(i.requesterId), String(i.recipientId)])));
    const users = await User.find({ _id: { $in: ids } }).select('name');
    const umap = new Map(users.map(u => [String(u._id), u.name]));
    const withUsers = items.map(i => ({
      ...i,
      id: String(i._id),
      requesterName: umap.get(String(i.requesterId)) || 'Unknown',
      recipientName: umap.get(String(i.recipientId)) || 'Unknown',
    }));

    res.json(withUsers);
  } catch (e) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

// Accept or reject a request (only recipient can change)
// PATCH /api/collab/requests/:id { action: 'accept'|'reject' }
router.patch(
  '/requests/:id',
  requireAuth,
  [body('action').isIn(['accept', 'reject'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const id = req.params.id;
      const item = await Collaboration.findById(id);
      if (!item) return res.status(404).json({ errors: [{ msg: 'Not found' }] });
      if (String(item.recipientId) !== String(req.userId)) {
        return res.status(403).json({ errors: [{ msg: 'Only the recipient can respond' }] });
      }
      item.status = req.body.action === 'accept' ? 'accepted' : 'rejected';
      await item.save();
      res.json(item);
    } catch (e) {
      res.status(500).json({ errors: [{ msg: 'Server error' }] });
    }
  }
);

// Check if two users can chat (accepted collaboration exists either direction)
router.get('/can-chat/:otherUserId', requireAuth, async (req, res) => {
  try {
    const other = req.params.otherUserId;
    const my = req.userId;
    const exists = await Collaboration.exists({
      status: 'accepted',
      $or: [
        { requesterId: my, recipientId: other },
        { requesterId: other, recipientId: my },
      ],
    });
    res.json({ allowed: Boolean(exists) });
  } catch (e) {
    res.status(500).json({ errors: [{ msg: 'Server error' }] });
  }
});

export default router;

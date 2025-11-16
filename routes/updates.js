import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import ContentUpdate from '../models/ContentUpdate.js';
import Submission from '../models/Submission.js';
import ApprovedContent from '../models/ApprovedContent.js';
import { dbConnect } from '../utils/db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 200 * 1024 * 1024,
    files: 5
  }
});

// Auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ errors: [{ msg: 'Authentication required' }] });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.user?.id;
    next();
  } catch (error) {
    return res.status(401).json({ errors: [{ msg: 'Invalid token' }] });
  }
}

// Helper function to upload to Cloudinary
async function uploadToCloudinary(buffer, folder = 'updates', originalFilename = '') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        public_id: `${Date.now()}_${originalFilename}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

// Helper to track changes
function getChangedFields(oldData, newData) {
  const changes = [];
  const fieldsToCheck = [
    'title', 'description', 'tribe', 'village', 'culturalDomain',
    'language', 'culturalSignificance', 'accessTier', 'backgroundInfo'
  ];

  fieldsToCheck.forEach(field => {
    if (newData[field] && oldData[field] !== newData[field]) {
      changes.push({
        fieldName: field,
        oldValue: oldData[field],
        newValue: newData[field]
      });
    }
  });

  return changes;
}

// ===== POST /api/updates - Request content update =====
router.post('/', requireAuth, upload.fields([
  { name: 'contentFile', maxCount: 1 },
  { name: 'consentFile', maxCount: 1 },
  { name: 'translationFile', maxCount: 1 },
  { name: 'verificationDoc', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 Content update request from user:', req.userId);

    const { submissionId, changesSummary } = req.body;

    if (!submissionId || !changesSummary) {
      return res.status(400).json({ 
        errors: [{ msg: 'Submission ID and changes summary required' }] 
      });
    }

    await dbConnect();

    // Find original approved submission
    const originalSubmission = await Submission.findOne({
      _id: submissionId,
      userId: req.userId,
      status: 'approved'
    });

    if (!originalSubmission) {
      return res.status(404).json({ 
        errors: [{ msg: 'Approved submission not found or you do not have permission' }] 
      });
    }

    // Find approved content
    const approvedContent = await ApprovedContent.findOne({
      submissionId: originalSubmission._id
    });

    if (!approvedContent) {
      return res.status(404).json({ 
        errors: [{ msg: 'Approved content not found' }] 
      });
    }

    // Prepare previous data (backup)
    const previousData = {
      country: approvedContent.country,
      stateRegion: approvedContent.stateRegion,
      tribe: approvedContent.tribe,
      village: approvedContent.village,
      culturalDomain: approvedContent.culturalDomain,
      title: approvedContent.title,
      description: approvedContent.description,
      keywords: approvedContent.keywords,
      language: approvedContent.language,
      dateOfRecording: approvedContent.dateOfRecording,
      culturalSignificance: approvedContent.culturalSignificance,
      contentFileType: approvedContent.contentFileType,
      contentUrl: approvedContent.contentUrl,
      contentCloudinaryId: approvedContent.contentCloudinaryId,
      consent: approvedContent.consent,
      accessTier: approvedContent.accessTier,
      contentWarnings: approvedContent.contentWarnings,
      warningOtherText: approvedContent.warningOtherText,
      translationFileUrl: approvedContent.translationFileUrl,
      translationCloudinaryId: approvedContent.translationCloudinaryId,
      backgroundInfo: approvedContent.backgroundInfo,
      verificationDocUrl: approvedContent.verificationDocUrl,
      verificationCloudinaryId: approvedContent.verificationCloudinaryId
    };

    // Prepare proposed changes
    const {
      country, stateRegion, tribe, village, culturalDomain, title,
      description, keywords, language, dateOfRecording, culturalSignificance,
      contentFileType,
      consentFileType, consentType, consentNames, consentDate,
      permissionType, consentDuration, digitalSignature,
      accessTier, contentWarnings, warningOtherText,
      backgroundInfo
    } = req.body;

    const proposedChanges = {
      country: country || approvedContent.country,
      stateRegion: stateRegion || approvedContent.stateRegion,
      tribe: tribe || approvedContent.tribe,
      village: village || approvedContent.village,
      culturalDomain: culturalDomain || approvedContent.culturalDomain,
      title: title || approvedContent.title,
      description: description || approvedContent.description,
      keywords: keywords ? (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : keywords) : approvedContent.keywords,
      language: language || approvedContent.language,
      dateOfRecording: dateOfRecording || approvedContent.dateOfRecording,
      culturalSignificance: culturalSignificance || approvedContent.culturalSignificance,
      contentFileType: contentFileType || approvedContent.contentFileType,
      contentUrl: approvedContent.contentUrl,
      contentCloudinaryId: approvedContent.contentCloudinaryId,
      accessTier: accessTier || approvedContent.accessTier,
      contentWarnings: contentWarnings ? (typeof contentWarnings === 'string' ? JSON.parse(contentWarnings) : contentWarnings) : approvedContent.contentWarnings,
      warningOtherText: warningOtherText || approvedContent.warningOtherText,
      backgroundInfo: backgroundInfo || approvedContent.backgroundInfo,
      consent: { ...approvedContent.consent },
      translationFileUrl: approvedContent.translationFileUrl,
      translationCloudinaryId: approvedContent.translationCloudinaryId,
      verificationDocUrl: approvedContent.verificationDocUrl,
      verificationCloudinaryId: approvedContent.verificationCloudinaryId
    };

    // Upload new files if provided
    if (req.files?.contentFile?.[0]) {
      const file = req.files.contentFile[0];
      const contentResult = await uploadToCloudinary(
        file.buffer,
        `updates/${req.userId}/content`,
        file.originalname
      );
      proposedChanges.contentUrl = contentResult.secure_url;
      proposedChanges.contentCloudinaryId = contentResult.public_id;
    }

    if (req.files?.consentFile?.[0]) {
      const file = req.files.consentFile[0];
      const consentResult = await uploadToCloudinary(
        file.buffer,
        `updates/${req.userId}/consent`,
        file.originalname
      );
      proposedChanges.consent.fileUrl = consentResult.secure_url;
    }

    if (req.files?.translationFile?.[0]) {
      const file = req.files.translationFile[0];
      const translationResult = await uploadToCloudinary(
        file.buffer,
        `updates/${req.userId}/translation`,
        file.originalname
      );
      proposedChanges.translationFileUrl = translationResult.secure_url;
      proposedChanges.translationCloudinaryId = translationResult.public_id;
    }

    if (req.files?.verificationDoc?.[0]) {
      const file = req.files.verificationDoc[0];
      const verificationResult = await uploadToCloudinary(
        file.buffer,
        `updates/${req.userId}/verification`,
        file.originalname
      );
      proposedChanges.verificationDocUrl = verificationResult.secure_url;
      proposedChanges.verificationCloudinaryId = verificationResult.public_id;
    }

    // Update consent fields
    if (consentFileType) proposedChanges.consent.fileType = consentFileType;
    if (consentType) proposedChanges.consent.consentType = consentType;
    if (consentNames) proposedChanges.consent.consentNames = consentNames;
    if (consentDate) proposedChanges.consent.consentDate = consentDate;
    if (permissionType) proposedChanges.consent.permissionType = typeof permissionType === 'string' ? JSON.parse(permissionType) : permissionType;
    if (consentDuration) proposedChanges.consent.duration = consentDuration;
    if (digitalSignature) proposedChanges.consent.digitalSignature = digitalSignature;

    // Track changed fields
    const changedFields = getChangedFields(previousData, proposedChanges);

    // Create update request
    const contentUpdate = new ContentUpdate({
      originalSubmissionId: originalSubmission._id,
      approvedContentId: approvedContent._id,
      userId: req.userId,
      changesSummary,
      changedFields,
      proposedChanges,
      previousData,
      status: 'pending'
    });

    await contentUpdate.save();

    console.log('✅ Content update request created:', contentUpdate._id);

    res.json({
      message: 'Update request submitted successfully and is pending admin approval',
      updateRequest: {
        id: contentUpdate._id,
        status: contentUpdate.status,
        changesSummary: contentUpdate.changesSummary,
        changedFields: contentUpdate.changedFields
      }
    });

  } catch (error) {
    console.error('❌ Content update request error:', error);
    res.status(500).json({ 
      errors: [{ 
        msg: 'Failed to submit update request', 
        detail: error.message 
      }] 
    });
  }
});

// ===== GET /api/updates/my - Get user's update requests =====
router.get('/my', requireAuth, async (req, res) => {
  try {
    await dbConnect();

    const updates = await ContentUpdate.find({ userId: req.userId })
      .populate('originalSubmissionId', 'title')
      .sort({ requestedAt: -1 });

    res.json(updates);
  } catch (error) {
    console.error('❌ Fetch updates error:', error);
    res.status(500).json({ 
      errors: [{ msg: 'Failed to fetch update requests' }] 
    });
  }
});

// ===== GET /api/updates/:id - Get single update request =====
router.get('/:id', requireAuth, async (req, res) => {
  try {
    await dbConnect();

    const update = await ContentUpdate.findOne({
      _id: req.params.id,
      userId: req.userId
    })
      .populate('originalSubmissionId')
      .populate('approvedContentId');

    if (!update) {
      return res.status(404).json({ 
        errors: [{ msg: 'Update request not found' }] 
      });
    }

    res.json(update);
  } catch (error) {
    console.error('❌ Fetch update error:', error);
    res.status(500).json({ 
      errors: [{ msg: 'Failed to fetch update request' }] 
    });
  }
});

export default router;
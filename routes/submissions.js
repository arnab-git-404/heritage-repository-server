



// TEST V2
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import Submission from '../models/Submission.js';
import streamifier from 'streamifier';
import dotenv from 'dotenv';
import { dbConnect } from '../utils/db.js';

const router = express.Router();

dotenv.config();

// Configure Cloudinary with explicit config check
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
};

// Validate Cloudinary config before setting
if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  console.error('❌ Cloudinary configuration missing:', {
    cloud_name: cloudinaryConfig.cloud_name ? '✓' : '✗',
    api_key: cloudinaryConfig.api_key ? '✓' : '✗',
    api_secret: cloudinaryConfig.api_secret ? '✓' : '✗'
  });
  throw new Error('Cloudinary credentials not configured properly');
}

cloudinary.config(cloudinaryConfig);

console.log('✅ Cloudinary configured:', {
  cloud_name: cloudinaryConfig.cloud_name,
  api_key: cloudinaryConfig.api_key ? cloudinaryConfig.api_key.substring(0, 5) + '***' : 'missing'
});

// Multer config for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 200 * 1024 * 1024, // 200MB
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
    if (!payload?.user?.id) {
      return res.status(401).json({ errors: [{ msg: 'Invalid token' }] });
    }
    req.userId = payload.user.id;
    next();
  } catch (error) {
    return res.status(401).json({ errors: [{ msg: 'Invalid or expired token' }] });
  }
}

// ✅ FIXED: Helper function with correct parameters
async function uploadToCloudinary(buffer, folder = 'submissions', originalFilename = '') {
  return new Promise((resolve, reject) => {
    // Detect file type
    const isPdf = originalFilename.toLowerCase().endsWith('.pdf');
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        type: 'upload',
        access_mode: 'public',
        unique_filename: true,
        transformation: [{ fetch_format: "auto" }] 
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Uploaded to Cloudinary:', result.secure_url);
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url
          });
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// ✅ FIXED: Complete POST route with all fields
router.post('/', requireAuth, upload.fields([
  { name: 'contentFile', maxCount: 1 },
  { name: 'consentFile', maxCount: 1 },
  { name: 'translationFile', maxCount: 1 },
  { name: 'verificationDoc', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📝 New submission request from user:', req.userId);
    console.log('Files received:', Object.keys(req.files || {}));
    console.log('Body received:', Object.keys(req.body));

    // ✅ FIXED: Complete destructuring with all fields
    const {
      country, stateRegion, tribe, village, culturalDomain, title,
      description, keywords, language, dateOfRecording, culturalSignificance,
      contentFileType,
      consentFileType, consentType, consentNames, consentDate, 
      permissionType, consentDuration, digitalSignature,
      accessTier, contentWarnings, warningOtherText,
      backgroundInfo,
      ethicsAgreed
    } = req.body;

    // Validate required fields
    if (!country || !stateRegion || !tribe || !culturalDomain || !title) {
      return res.status(400).json({ errors: [{ msg: 'Missing required category fields' }] });
    }

    if (!description || !keywords) {
      return res.status(400).json({ errors: [{ msg: 'Missing required description fields' }] });
    }

    if (!accessTier || !ethicsAgreed || ethicsAgreed !== 'true') {
      return res.status(400).json({ errors: [{ msg: 'Ethics agreement is required' }] });
    }

    // Upload content file
    console.log('⬆️  Uploading content file...');
    let contentUrl = '';
    let contentCloudinaryId = '';
    
    if (req.files?.contentFile?.[0]) {
      try {
        const file = req.files.contentFile[0];
        console.log('Content file:', file.originalname, file.mimetype, file.size);
        
        const contentResult = await uploadToCloudinary(
          file.buffer,
          `submissions/${req.userId}/content`,
          file.originalname
        );
        
        contentUrl = contentResult.secure_url;
        contentCloudinaryId = contentResult.public_id;
        console.log('✅ Content uploaded:', contentUrl);
      } catch (error) {
        console.error('❌ Content upload failed:', error);
        return res.status(500).json({ 
          errors: [{ msg: 'Failed to upload content file: ' + error.message }] 
        });
      }
    } else {
      return res.status(400).json({ errors: [{ msg: 'Content file is required' }] });
    }

    // Upload consent file
    console.log('⬆️  Uploading consent file...');
    let consentFileUrl = '';
    
    if (req.files?.consentFile?.[0]) {
      try {
        const file = req.files.consentFile[0];
        console.log('Consent file:', file.originalname, file.mimetype, file.size);
        
        const consentResult = await uploadToCloudinary(
          file.buffer,
          `submissions/${req.userId}/consent`,
          file.originalname
        );
        
        consentFileUrl = consentResult.secure_url;
        console.log('✅ Consent uploaded:', consentFileUrl);
      } catch (error) {
        console.error('❌ Consent upload failed:', error);
        return res.status(500).json({ 
          errors: [{ msg: 'Failed to upload consent file: ' + error.message }] 
        });
      }
    } else {
      return res.status(400).json({ errors: [{ msg: 'Consent file is required' }] });
    }

    // Optional files
    let translationFileUrl = '';
    let translationCloudinaryId = '';
    if (req.files?.translationFile?.[0]) {
      console.log('⬆️  Uploading translation file...');
      try {
        const file = req.files.translationFile[0];
        const translationResult = await uploadToCloudinary(
          file.buffer,
          `submissions/${req.userId}/translation`,
          file.originalname
        );
        translationFileUrl = translationResult.secure_url;
        translationCloudinaryId = translationResult.public_id;
        console.log('✅ Translation uploaded:', translationFileUrl);
      } catch (error) {
        console.error('⚠️  Translation upload failed:', error);
        // Non-critical, continue
      }
    }

    let verificationDocUrl = '';
    let verificationCloudinaryId = '';
    if (req.files?.verificationDoc?.[0]) {
      console.log('⬆️  Uploading verification document...');
      try {
        const file = req.files.verificationDoc[0];
        const verificationResult = await uploadToCloudinary(
          file.buffer,
          `submissions/${req.userId}/verification`,
          file.originalname
        );
        verificationDocUrl = verificationResult.secure_url;
        verificationCloudinaryId = verificationResult.public_id;
        console.log('✅ Verification uploaded:', verificationDocUrl);
      } catch (error) {
        console.error('⚠️  Verification upload failed:', error);
        // Non-critical, continue
      }
    }

    // Create submission
    console.log('💾 Saving submission to database...');
    const submission = new Submission({
      userId: req.userId,
      country,
      stateRegion,
      tribe,
      village,
      culturalDomain,
      title,
      description,
      keywords: typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : keywords,
      language: language || 'Unknown',
      dateOfRecording: dateOfRecording || null,
      culturalSignificance,
      contentFileType,
      contentUrl,
      contentCloudinaryId,
      consent: {
        fileType: consentFileType,
        fileUrl: consentFileUrl,
        consentType,
        consentNames,
        consentDate,
        permissionType: typeof permissionType === 'string' ? JSON.parse(permissionType) : permissionType,
        duration: consentDuration,
        digitalSignature
      },
      accessTier,
      contentWarnings: typeof contentWarnings === 'string' ? JSON.parse(contentWarnings) : contentWarnings || [],
      warningOtherText,
      translationFileUrl,
      translationCloudinaryId,
      backgroundInfo,
      verificationDocUrl,
      verificationCloudinaryId,
      ethicsAgreed: true,
      status: 'pending'
    });

    await dbConnect();

    await submission.save();
    console.log('✅ Submission saved:', submission._id);

    res.status(201).json({
      message: 'Submission created successfully',
      submission: {
        id: submission._id,
        title: submission.title,
        status: submission.status
      }
    });

  } catch (error) {
    console.error('❌ Submission error:', error);
    res.status(500).json({ 
      errors: [{ 
        msg: 'Failed to create submission', 
        detail: error.message 
      }] 
    });
  }
});

// GET /api/submissions/my - Get user's own submissions
router.get('/my', requireAuth, async (req, res) => {
  try {

    await dbConnect();

    const submissions = await Submission.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.json(submissions);
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to fetch submissions' }] });
  }
});

// GET /api/submissions/:id - Get single submission
router.get('/:id', requireAuth, async (req, res) => {
  try {

    await dbConnect();

    const submission = await Submission.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!submission) {
      return res.status(404).json({ errors: [{ msg: 'Submission not found' }] });
    }

    res.json(submission);
  } catch (error) {
    console.error('Fetch submission error:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to fetch submission' }] });
  }
});

export default router;
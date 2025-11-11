// import express from 'express';
// import { body, validationResult } from 'express-validator';
// import mongoose from 'mongoose';
// import jwt from 'jsonwebtoken';
// import Submission from '../models/Submission.js';
// import Taxonomy from '../models/Taxonomy.js';

// const router = express.Router();
// const DEFAULT_LIMIT = 20;
// const MAX_LIMIT = 100;

// // List the authenticated user's own submissions (all statuses)
// router.get('/mine', requireAuth, async (req, res) => {
//   try {
//     const { page = 1, limit = DEFAULT_LIMIT } = req.query;
//     const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(parseInt(limit), MAX_LIMIT);
    
//     const [items, total] = await Promise.all([
//       Submission.find({ userId: req.userId })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(Math.min(parseInt(limit), MAX_LIMIT))
//         .lean(),
//       Submission.countDocuments({ userId: req.userId })
//     ]);

//     res.json({
//       data: items,
//       pagination: {
//         total,
//         page: parseInt(page),
//         totalPages: Math.ceil(total / Math.min(parseInt(limit), MAX_LIMIT)),
//         limit: Math.min(parseInt(limit), MAX_LIMIT)
//       }
//     });
//   } catch (e) {
//     console.error('Error fetching user submissions:', e);
//     res.status(500).json({ errors: [{ msg: 'Server error' }] });
//   }
// });

// // Enhanced authentication middleware with rate limiting and better error handling
// import rateLimit from 'express-rate-limit';

// // Rate limiting for auth endpoints
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests, please try again later.'
// });

// // Enhanced authentication middleware
// function requireAuth(req, res, next) {
//   // Skip rate limiting for OPTIONS requests (CORS preflight)
//   if (req.method === 'OPTIONS') return next();
  
//   // Apply rate limiting to auth endpoints
//   authLimiter(req, res, async () => {
//     const auth = req.headers.authorization || '';
//     const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    
//     if (!token) {
//       return res.status(401).json({ 
//         errors: [{ 
//           msg: 'Authentication required',
//           code: 'AUTH_REQUIRED'
//         }] 
//       });
//     }

//     if (!process.env.JWT_SECRET) {
//       console.error('JWT_SECRET not configured');
//       return res.status(500).json({ 
//         errors: [{ 
//           msg: 'Server configuration error',
//           code: 'SERVER_ERROR'
//         }] 
//       });
//     }

//     try {
//       const payload = jwt.verify(token, process.env.JWT_SECRET);
      
//       if (!payload?.user?.id) {
//         return res.status(401).json({ 
//           errors: [{ 
//             msg: 'Invalid authentication token',
//             code: 'INVALID_TOKEN'
//           }] 
//         });
//       }
      
//       // Add user info to request
//       req.userId = payload.user.id;
//       req.userRole = payload.user.role || 'user';
      
//       // Log successful authentication for monitoring
//       console.log(`User ${req.userId} authenticated with role ${req.userRole}`);
      
//       next();
//     } catch (e) {
//       console.error('Authentication error:', e);
      
//       let errorMsg = 'Authentication failed';
//       let statusCode = 401;
//       let errorCode = 'AUTH_FAILED';
      
//       if (e.name === 'TokenExpiredError') {
//         errorMsg = 'Session expired. Please log in again.';
//         errorCode = 'TOKEN_EXPIRED';
//       } else if (e.name === 'JsonWebTokenError') {
//         errorMsg = 'Invalid token';
//         errorCode = 'INVALID_TOKEN';
//       } else {
//         statusCode = 500;
//         errorCode = 'SERVER_ERROR';
//       }
      
//       return res.status(statusCode).json({ 
//         errors: [{ 
//           msg: errorMsg,
//           code: errorCode,
//           ...(process.env.NODE_ENV === 'development' && { debug: e.message })
//         }] 
//       });
//     }
//   });
// }

// router.post(
//   '/',
//   requireAuth,
//   [
//     body('title').isString().trim().notEmpty(),
//     body('description').isString().trim().notEmpty(),
//     body('category').isString().trim().notEmpty(),
//     body('type').optional().isIn(['text', 'audio', 'video', 'image']),
//     body('contentUrl').optional().isString().trim(),
//     body('text').optional().isString().trim(),
//     body('tribe').optional().isString().trim(),
//     body('country').optional().isString().trim(),
//     body('state').optional().isString().trim(),
//     body('village').optional().isString().trim(),
//     body('consent.given').isBoolean(),
//     body('consent.name').isString().trim().notEmpty(),
//     body('consent.relation').optional().isString().trim(),
//     body('consent.fileUrl').optional().isString().trim(),
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

//     try {
//       const { title, description, category, type, contentUrl, text, tribe, country, state, village, consent } = req.body;
//       const payload = { title, description, category, status: 'pending' };
//       if (req.userId) payload.userId = req.userId;
//       if (type) payload.type = type;
//       if (contentUrl) payload.contentUrl = contentUrl;
//       if (text) payload.text = text;
//       if (tribe) payload.tribe = String(tribe).toLowerCase();
//       if (country) payload.country = country;
//       if (state) payload.state = state;
//       if (village) payload.village = village;
//       if (consent) payload.consent = consent;
//       const doc = await Submission.create(payload);
//       // Upsert taxonomy so new tribes/villages appear for everyone immediately
//       if (country && state) {
//         const update = { $setOnInsert: { country, state }, $addToSet: {} };
//         if (tribe) update.$addToSet.tribes = String(tribe).toLowerCase();
//         if (village) update.$addToSet.villages = String(village);
//         await Taxonomy.findOneAndUpdate(
//           { country, state },
//           update,
//           { upsert: true, new: true }
//         ).catch(() => {});
//       }
//       res.status(201).json(doc);
//     } catch (e) {
//       res.status(500).json({ errors: [{ msg: 'Server error' }] });
//     }
//   }
// );

// // Get submissions with pagination and filtering
// router.get('/', async (req, res) => {
//   try {
//     const { 
//       status = 'approved', 
//       category, 
//       tribe, 
//       country, 
//       state, 
//       village, 
//       search,
//       page = 1,
//       limit = DEFAULT_LIMIT,
//       sort = '-createdAt'
//     } = req.query;

//     // Build filter
//     const filter = {};
    
//     // Status filtering (default to approved for non-admin)
//     if (status !== 'all') {
//       filter.status = status;
//     }

//     // Regular filters
//     if (category) filter.category = category;
//     if (tribe) filter.tribe = String(tribe).toLowerCase();
//     if (country) filter.country = country;
//     if (state) filter.state = state;
//     if (village) filter.village = village;

//     // Text search
//     if (search) {
//       filter.$or = [
//         { title: { $regex: search, $options: 'i' } },
//         { description: { $regex: search, $options: 'i' } },
//         { text: { $regex: search, $options: 'i' } }
//       ];
//     }

//     // Validate and sanitize pagination
//     const pageNum = Math.max(1, parseInt(page));
//     const limitNum = Math.min(parseInt(limit), MAX_LIMIT);
//     const skip = (pageNum - 1) * limitNum;

//     // Execute queries in parallel
//     const [items, total] = await Promise.all([
//       Submission.find(filter)
//         .sort(sort)
//         .skip(skip)
//         .limit(limitNum)
//         .lean(),
//       Submission.countDocuments(filter)
//     ]);

//     // Add cache control headers
//     res.set('Cache-Control', 'public, max-age=60');
    
//     res.json({
//       data: items,
//       pagination: {
//         total,
//         page: pageNum,
//         totalPages: Math.ceil(total / limitNum),
//         limit: limitNum
//       }
//     });
//   } catch (e) {
//     console.error('Error fetching submissions:', e);
//     res.status(500).json({ 
//       errors: [{ 
//         msg: 'Server error',
//         ...(process.env.NODE_ENV === 'development' && { debug: e.message })
//       }] 
//     });
//   }
// });

// // Cache for tribe data (in-memory, consider Redis for production)
// const tribeCache = new Map();
// const TRIBES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// // Get distinct tribes with caching
// router.get('/tribes', async (req, res) => {
//   try {
//     const { country, state } = req.query;
//     const cacheKey = `tribes:${country || 'all'}:${state || 'all'}`;
//     const cached = tribeCache.get(cacheKey);
    
//     // Return cached data if available and not expired
//     if (cached && (Date.now() - cached.timestamp < TRIBES_CACHE_TTL)) {
//       return res.json(cached.data);
//     }

//     const filter = { status: 'approved' };
//     if (country) filter.country = country;
//     if (state) filter.state = state;

//     const [tribes, taxonomy] = await Promise.all([
//       Submission.distinct('tribe', filter),
//       (country && state) 
//         ? Taxonomy.findOne({ country, state }).lean() 
//         : Promise.resolve(null)
//     ]);

//     // Process and merge data
//     const merged = [
//       ...tribes.filter(Boolean).map(t => String(t).toLowerCase()),
//       ...(taxonomy?.tribes?.filter(Boolean).map(t => String(t).toLowerCase()) || [])
//     ];
    
//     const deduped = [...new Set(merged)].sort();
    
//     // Update cache
//     tribeCache.set(cacheKey, {
//       data: deduped,
//       timestamp: Date.now()
//     });

//     res.set('Cache-Control', 'public, max-age=300'); // 5 minutes browser cache
//     res.json(deduped);
//   } catch (e) {
//     console.error('Error fetching tribes:', e);
//     res.status(500).json({ 
//       errors: [{ 
//         msg: 'Failed to fetch tribes',
//         ...(process.env.NODE_ENV === 'development' && { debug: e.message })
//       }] 
//     });
//   }
// });

// // Cache for village data
// const villageCache = new Map();
// const VILLAGES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// // Get distinct villages with caching
// router.get('/villages', async (req, res) => {
//   try {
//     const { tribe, country, state } = req.query;
//     const cacheKey = `villages:${tribe || 'all'}:${country || 'all'}:${state || 'all'}`;
//     const cached = villageCache.get(cacheKey);
    
//     // Return cached data if available and not expired
//     if (cached && (Date.now() - cached.timestamp < VILLAGES_CACHE_TTL)) {
//       return res.json(cached.data);
//     }

//     const filter = { status: 'approved' };
//     if (tribe) filter.tribe = String(tribe).toLowerCase();
//     if (country) filter.country = country;
//     if (state) filter.state = state;

//     const [villages, taxonomy] = await Promise.all([
//       Submission.distinct('village', filter),
//       (country && state) 
//         ? Taxonomy.findOne({ country, state }).lean() 
//         : Promise.resolve(null)
//     ]);

//     // Process and merge data
//     const merged = [
//       ...villages.filter(Boolean).map(v => String(v)),
//       ...(taxonomy?.villages?.filter(Boolean).map(v => String(v)) || [])
//     ];
    
//     const deduped = [...new Set(merged)].sort();
    
//     // Update cache
//     villageCache.set(cacheKey, {
//       data: deduped,
//       timestamp: Date.now()
//     });

//     res.set('Cache-Control', 'public, max-age=300'); // 5 minutes browser cache
//     res.json(deduped);
//   } catch (e) {
//     console.error('Error fetching villages:', e);
//     res.status(500).json({ 
//       errors: [{ 
//         msg: 'Failed to fetch villages',
//         ...(process.env.NODE_ENV === 'development' && { debug: e.message })
//       }] 
//     });
//   }
// });

// // Allow the authenticated user to update their own submission by id
// router.patch(
//   '/:id',
//   requireAuth,
//   [
//     body('title').optional().isString().trim().notEmpty(),
//     body('description').optional().isString().trim().notEmpty(),
//     body('contentUrl').optional().isString().trim(),
//     body('text').optional().isString().trim(),
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
//     try {
//       const { id } = req.params;
//       const patch = {};
//       const { title, description, contentUrl, text } = req.body || {};
//       if (title !== undefined) patch.title = title;
//       if (description !== undefined) patch.description = description;
//       if (contentUrl !== undefined) patch.contentUrl = contentUrl;
//       if (text !== undefined) patch.text = text;
//       const doc = await Submission.findOneAndUpdate({ _id: id, userId: req.userId }, patch, { new: true });
//       if (!doc) return res.status(404).json({ errors: [{ msg: 'Not found' }] });
//       res.json(doc);
//     } catch (e) {
//       res.status(500).json({ errors: [{ msg: 'Server error' }] });
//     }
//   }
// );

// // Allow the authenticated user to delete their own submission by id
// router.delete('/:id', requireAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const doc = await Submission.findOneAndDelete({ _id: id, userId: req.userId });
//     if (!doc) return res.status(404).json({ errors: [{ msg: 'Not found' }] });
//     res.json({ message: 'Deleted' });
//   } catch (e) {
//     res.status(500).json({ errors: [{ msg: 'Server error' }] });
//   }
// });

// export default router;














// TEST -------- DEBUG 
// import express from 'express';
// import multer from 'multer';
// import { v2 as cloudinary } from 'cloudinary';
// import jwt from 'jsonwebtoken';
// import Submission from '../models/Submission.js';
// import streamifier from 'streamifier';

// const router = express.Router();


// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
//   secure: true
// });


// // Multer config for memory storage
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { 
//     fileSize: 200 * 1024 * 1024, // 200MB
//     files: 5 // Max 5 files (content, consent, translation, verification, etc.)
//   }
// });

// // Auth middleware
// function requireAuth(req, res, next) {
//   const auth = req.headers.authorization || '';
//   const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  
//   if (!token) {
//     return res.status(401).json({ errors: [{ msg: 'Authentication required' }] });
//   }

//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     if (!payload?.user?.id) {
//       return res.status(401).json({ errors: [{ msg: 'Invalid token' }] });
//     }
//     req.userId = payload.user.id;
//     next();
//   } catch (error) {
//     return res.status(401).json({ errors: [{ msg: 'Invalid or expired token' }] });
//   }
// }

// // Helper function to upload to Cloudinary
// async function uploadToCloudinary(buffer, folder = 'submissions') {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder: folder,
//         resource_type: 'auto',
//         transformation: [{ quality: 'auto' }]
//       },
//       (error, result) => {
//         if (error) reject(error);
//         else resolve(result);
//       }
//     );
//     streamifier.createReadStream(buffer).pipe(uploadStream);
//   });
// }

// // POST /api/submissions - Create new submission
// router.post('/', requireAuth, upload.fields([
//   { name: 'contentFile', maxCount: 1 },
//   { name: 'consentFile', maxCount: 1 },
//   { name: 'translationFile', maxCount: 1 },
//   { name: 'verificationDoc', maxCount: 1 }
// ]), async (req, res) => {
//   try {


    
//   console.log('Cloudinary config:', {
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY ? 'set' : 'not set',
//     api_secret: process.env.CLOUDINARY_API_SECRET ? 'set' : 'not set'
//   });

//     const {
//       // Step 2
//       country, stateRegion, tribe, village, culturalDomain, title,
//       // Step 3
//       description, keywords, language, dateOfRecording, culturalSignificance,
//       // Step 4
//       contentFileType,
//       // Step 5
//       consentFileType, consentType, consentNames, consentDate, 
//       permissionType, consentDuration, digitalSignature,
//       // Step 6
//       accessTier, contentWarnings, warningOtherText,
//       // Step 7
//       backgroundInfo,
//       // Step 8
//       ethicsAgreed
//     } = req.body;

//     // Validate required fields
//     if (!country || !stateRegion || !tribe || !culturalDomain || !title) {
//       return res.status(400).json({ errors: [{ msg: 'Missing required category fields' }] });
//     }

//     if (!description || !keywords || !language) {
//       return res.status(400).json({ errors: [{ msg: 'Missing required description fields' }] });
//     }

//     if (!accessTier || !ethicsAgreed || ethicsAgreed !== 'true') {
//       return res.status(400).json({ errors: [{ msg: 'Ethics agreement is required' }] });
//     }

//     // Upload files to Cloudinary
//     let contentUrl = '';
//     let contentCloudinaryId = '';
//     if (req.files?.contentFile?.[0]) {
//       const contentResult = await uploadToCloudinary(
//         req.files.contentFile[0].buffer,
//         `submissions/${req.userId}/content`
//       );
//       contentUrl = contentResult.secure_url;
//       contentCloudinaryId = contentResult.public_id;
//     } else {
//       return res.status(400).json({ errors: [{ msg: 'Content file is required' }] });
//     }

//     let consentFileUrl = '';
//     if (req.files?.consentFile?.[0]) {
//       const consentResult = await uploadToCloudinary(
//         req.files.consentFile[0].buffer,
//         `submissions/${req.userId}/consent`
//       );
//       consentFileUrl = consentResult.secure_url;
//     } else {
//       return res.status(400).json({ errors: [{ msg: 'Consent file is required' }] });
//     }

//     // Optional files
//     let translationFileUrl = '';
//     let translationCloudinaryId = '';
//     if (req.files?.translationFile?.[0]) {
//       const translationResult = await uploadToCloudinary(
//         req.files.translationFile[0].buffer,
//         `submissions/${req.userId}/translation`
//       );
//       translationFileUrl = translationResult.secure_url;
//       translationCloudinaryId = translationResult.public_id;
//     }

//     let verificationDocUrl = '';
//     let verificationCloudinaryId = '';
//     if (req.files?.verificationDoc?.[0]) {
//       const verificationResult = await uploadToCloudinary(
//         req.files.verificationDoc[0].buffer,
//         `submissions/${req.userId}/verification`
//       );
//       verificationDocUrl = verificationResult.secure_url;
//       verificationCloudinaryId = verificationResult.public_id;
//     }

//     // Create submission
//     const submission = new Submission({
//       userId: req.userId,
//       country,
//       stateRegion,
//       tribe,
//       village,
//       culturalDomain,
//       title,
//       description,
//       keywords: typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : keywords,
//       language,
//       dateOfRecording: dateOfRecording || null,
//       culturalSignificance,
//       contentFileType,
//       contentUrl,
//       contentCloudinaryId,
//       consent: {
//         fileType: consentFileType,
//         fileUrl: consentFileUrl,
//         consentType,
//         consentNames,
//         consentDate,
//         permissionType: typeof permissionType === 'string' ? JSON.parse(permissionType) : permissionType,
//         duration: consentDuration,
//         digitalSignature
//       },
//       accessTier,
//       contentWarnings: typeof contentWarnings === 'string' ? JSON.parse(contentWarnings) : contentWarnings || [],
//       warningOtherText,
//       translationFileUrl,
//       translationCloudinaryId,
//       backgroundInfo,
//       verificationDocUrl,
//       verificationCloudinaryId,
//       ethicsAgreed: true,
//       status: 'pending'
//     });

//     await submission.save();

//     res.status(201).json({
//       message: 'Submission created successfully',
//       submission: {
//         id: submission._id,
//         title: submission.title,
//         status: submission.status
//       }
//     });

//   } catch (error) {
//     console.error('Submission error:', error);
//     res.status(500).json({ 
//       errors: [{ msg: 'Failed to create submission', detail: error.message }] 
//     });
//   }
// });

// // GET /api/submissions/my - Get user's own submissions
// router.get('/my', requireAuth, async (req, res) => {
//   try {
//     const submissions = await Submission.find({ userId: req.userId })
//       .sort({ createdAt: -1 })
//       .select('-__v');
    
//     res.json(submissions);
//   } catch (error) {
//     console.error('Fetch submissions error:', error);
//     res.status(500).json({ errors: [{ msg: 'Failed to fetch submissions' }] });
//   }
// });

// // GET /api/submissions/:id - Get single submission
// router.get('/:id', requireAuth, async (req, res) => {
//   try {
//     const submission = await Submission.findOne({
//       _id: req.params.id,
//       userId: req.userId
//     });

//     if (!submission) {
//       return res.status(404).json({ errors: [{ msg: 'Submission not found' }] });
//     }

//     res.json(submission);
//   } catch (error) {
//     console.error('Fetch submission error:', error);
//     res.status(500).json({ errors: [{ msg: 'Failed to fetch submission' }] });
//   }
// });

// export default router;








// trIED TO FIX THE ISSUE // TEST -------- DEBUG

// import express from 'express';
// import multer from 'multer';
// import { v2 as cloudinary } from 'cloudinary';
// import jwt from 'jsonwebtoken';
// import Submission from '../models/Submission.js';
// import ApprovedContent from '../models/ApprovedContent.js';
// import streamifier from 'streamifier';
// import { dot } from 'node:test/reporters';
// import dotenv from "dotenv";


// const router = express.Router();

// dotenv.config();

// // Configure Cloudinary with explicit config check
// const cloudinaryConfig = {
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
//   secure: true
// };

// // Validate Cloudinary config before setting
// if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
//   console.error('❌ Cloudinary configuration missing:', {
//     cloud_name: cloudinaryConfig.cloud_name ? '✓' : '✗',
//     api_key: cloudinaryConfig.api_key ? '✓' : '✗',
//     api_secret: cloudinaryConfig.api_secret ? '✓' : '✗'
//   });
//   throw new Error('Cloudinary credentials not configured properly');
// }

// cloudinary.config(cloudinaryConfig);

// console.log('✅ Cloudinary configured:', {
//   cloud_name: cloudinaryConfig.cloud_name,
//   api_key: cloudinaryConfig.api_key.substring(0, 5) + '***'
// });

// // Multer config for memory storage
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { 
//     fileSize: 200 * 1024 * 1024, // 200MB
//     files: 5 // Max 5 files
//   }
// });

// // Auth middleware
// function requireAuth(req, res, next) {
//   const auth = req.headers.authorization || '';
//   const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  
//   if (!token) {
//     return res.status(401).json({ errors: [{ msg: 'Authentication required' }] });
//   }

//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     if (!payload?.user?.id) {
//       return res.status(401).json({ errors: [{ msg: 'Invalid token' }] });
//     }
//     req.userId = payload.user.id;
//     next();
//   } catch (error) {
//     return res.status(401).json({ errors: [{ msg: 'Invalid or expired token' }] });
//   }
// }

// // Helper function to upload to Cloudinary with proper error handling
// async function uploadToCloudinary(buffer, folder = 'submissions') {
//   return new Promise((resolve, reject) => {
//     // Re-verify config before upload
//     if (!cloudinary.config().api_key) {
//       console.error('Cloudinary config lost, re-initializing...');
//       cloudinary.config(cloudinaryConfig);
//     }

//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder: folder,
//         resource_type: 'raw',
//         type: 'upload',
//         access_mode: 'public',
//         unique_filename: true,
//         // transformation: [{ quality: 'auto' }],
//         // Explicitly pass config
//         api_key: cloudinaryConfig.api_key,
//         api_secret: cloudinaryConfig.api_secret,
//         cloud_name: cloudinaryConfig.cloud_name
//       },
//       (error, result) => {
//         if (error) {
//           console.error('Cloudinary upload error:', error);
//           reject(error);
//         } 
//           // console.log('✅ Uploaded to Cloudinary:', result.secure_url);
//           // resolve(result);
        
//         // ✅ Generate a clean public URL without signature
//           // const publicUrl = cloudinary.url(result.public_id, {
//           //   secure: true,
//           //   resource_type: result.resource_type,
//           //   type: 'upload',
//           //   format: result.format
//           // });
          
//           // console.log('✅ Uploaded to Cloudinary:', publicUrl);
          
//           // Return result with cleaned URL
//           // resolve({
//           //   ...result,
//           //   secure_url: publicUrl, // Override with clean URL
//           //   public_url: publicUrl
//           // });

//           resolve({
//           public_id: result.public_id,
//           secure_url: result.secure_url,   // correct pdf url
//         });
        
        
//       }
//     );

//     streamifier.createReadStream(buffer).pipe(uploadStream);
//   });
// }


// // POST /api/submissions - Create new submission
// // router.post('/', requireAuth, upload.fields([
// //   { name: 'contentFile', maxCount: 1 },
// //   { name: 'consentFile', maxCount: 1 },
// //   { name: 'translationFile', maxCount: 1 },
// //   { name: 'verificationDoc', maxCount: 1 }
// // ]), async (req, res) => {
// //   try {
// //     console.log('📝 New submission request from user:', req.userId);
// //     console.log('Files received:', Object.keys(req.files || {}));

// //     const {
// //       // Step 2
// //       country, stateRegion, tribe, village, culturalDomain, title,
// //       // Step 3
// //       description, keywords, language, dateOfRecording, culturalSignificance,
// //       // Step 4
// //       contentFileType,
// //       // Step 5
// //       consentFileType, consentType, consentNames, consentDate, 
// //       permissionType, consentDuration, digitalSignature,
// //       // Step 6
// //       accessTier, contentWarnings, warningOtherText,
// //       // Step 7
// //       backgroundInfo,
// //       // Step 8
// //       ethicsAgreed
// //     } = req.body;

// //     // Validate required fields
// //     if (!country || !stateRegion || !tribe || !culturalDomain || !title) {
// //       return res.status(400).json({ errors: [{ msg: 'Missing required category fields' }] });
// //     }

// //     if (!description || !keywords || !language) {
// //       return res.status(400).json({ errors: [{ msg: 'Missing required description fields' }] });
// //     }

// //     if (!accessTier || !ethicsAgreed || ethicsAgreed !== 'true') {
// //       return res.status(400).json({ errors: [{ msg: 'Ethics agreement is required' }] });
// //     }

// //     // Upload content file to Cloudinary
// //     console.log('⬆️  Uploading content file...');
// //     let contentUrl = '';
// //     let contentCloudinaryId = '';
    
// //     if (req.files?.contentFile?.[0]) {
// //       try {
// //         const contentResult = await uploadToCloudinary(
// //           req.files.contentFile[0].buffer,
// //           `submissions/${req.userId}/content`
// //         );
// //         contentUrl = contentResult.secure_url;
// //         contentCloudinaryId = contentResult.public_id;
// //         console.log('✅ Content uploaded:', contentUrl);
// //       } catch (error) {
// //         console.error('❌ Content upload failed:', error);
// //         throw new Error('Failed to upload content file: ' + error.message);
// //       }
// //     } else {
// //       return res.status(400).json({ errors: [{ msg: 'Content file is required' }] });
// //     }

// //     // Upload consent file
// //     console.log('⬆️  Uploading consent file...');
// //     let consentFileUrl = '';
    
// //     if (req.files?.consentFile?.[0]) {
// //       try {
// //         const consentResult = await uploadToCloudinary(
// //           req.files.consentFile[0].buffer,
// //           `submissions/${req.userId}/consent`
// //         );
// //         consentFileUrl = consentResult.secure_url;
// //         console.log('✅ Consent uploaded:', consentFileUrl);
// //       } catch (error) {
// //         console.error('❌ Consent upload failed:', error);
// //         throw new Error('Failed to upload consent file: ' + error.message);
// //       }
// //     } else {
// //       return res.status(400).json({ errors: [{ msg: 'Consent file is required' }] });
// //     }

// //     // Optional files
// //     let translationFileUrl = '';
// //     let translationCloudinaryId = '';
// //     if (req.files?.translationFile?.[0]) {
// //       console.log('⬆️  Uploading translation file...');
// //       try {
// //         const translationResult = await uploadToCloudinary(
// //           req.files.translationFile[0].buffer,
// //           `submissions/${req.userId}/translation`
// //         );
// //         translationFileUrl = translationResult.secure_url;
// //         translationCloudinaryId = translationResult.public_id;
// //         console.log('✅ Translation uploaded:', translationFileUrl);
// //       } catch (error) {
// //         console.error('⚠️  Translation upload failed:', error);
// //         // Non-critical, continue
// //       }
// //     }

// //     let verificationDocUrl = '';
// //     let verificationCloudinaryId = '';
// //     if (req.files?.verificationDoc?.[0]) {
// //       console.log('⬆️  Uploading verification document...');
// //       try {
// //         const verificationResult = await uploadToCloudinary(
// //           req.files.verificationDoc[0].buffer,
// //           `submissions/${req.userId}/verification`
// //         );
// //         verificationDocUrl = verificationResult.secure_url;
// //         verificationCloudinaryId = verificationResult.public_id;
// //         console.log('✅ Verification uploaded:', verificationDocUrl);
// //       } catch (error) {
// //         console.error('⚠️  Verification upload failed:', error);
// //         // Non-critical, continue
// //       }
// //     }

// //     // Create submission
// //     console.log('💾 Saving submission to database...');
// //     const submission = new Submission({
// //       userId: req.userId,
// //       country,
// //       stateRegion,
// //       tribe,
// //       village,
// //       culturalDomain,
// //       title,
// //       description,
// //       keywords: typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : keywords,
// //       language,
// //       dateOfRecording: dateOfRecording || null,
// //       culturalSignificance,
// //       contentFileType,
// //       contentUrl,
// //       contentCloudinaryId,
// //       consent: {
// //         fileType: consentFileType,
// //         fileUrl: consentFileUrl,
// //         consentType,
// //         consentNames,
// //         consentDate,
// //         permissionType: typeof permissionType === 'string' ? JSON.parse(permissionType) : permissionType,
// //         duration: consentDuration,
// //         digitalSignature
// //       },
// //       accessTier,
// //       contentWarnings: typeof contentWarnings === 'string' ? JSON.parse(contentWarnings) : contentWarnings || [],
// //       warningOtherText,
// //       translationFileUrl,
// //       translationCloudinaryId,
// //       backgroundInfo,
// //       verificationDocUrl,
// //       verificationCloudinaryId,
// //       ethicsAgreed: true,
// //       status: 'pending'
// //     });

// //     await submission.save();
// //     console.log('✅ Submission saved:', submission._id);

// //     res.status(201).json({
// //       message: 'Submission created successfully',
// //       submission: {
// //         id: submission._id,
// //         title: submission.title,
// //         status: submission.status
// //       }
// //     });

// //   } catch (error) {
// //     console.error('❌ Submission error:', error);
// //     res.status(500).json({ 
// //       errors: [{ 
// //         msg: 'Failed to create submission', 
// //         detail: error.message 
// //       }] 
// //     });
// //   }
// // });

// router.post('/', requireAuth, upload.fields([
//   { name: 'contentFile', maxCount: 1 },
//   { name: 'consentFile', maxCount: 1 },
//   { name: 'translationFile', maxCount: 1 },
//   { name: 'verificationDoc', maxCount: 1 }
// ]), async (req, res) => {
//   try {
//     console.log('📝 New submission request from user:', req.userId);

//     // ...existing validation code...

//     // ✅ UPDATED: Upload content file with filename
//     let contentUrl = '';
//     let contentCloudinaryId = '';
    
//     if (req.files?.contentFile?.[0]) {
//       try {
//         const file = req.files.contentFile[0];
//         const contentResult = await uploadToCloudinary(
//           file.buffer,
//           `submissions/${req.userId}/content`,
//           file.originalname // ✅ Pass original filename for type detection
//         );
//         contentUrl = contentResult.secure_url;
//         contentCloudinaryId = contentResult.public_id;
//         console.log('✅ Content uploaded:', contentUrl);
//       } catch (error) {
//         console.error('❌ Content upload failed:', error);
//         throw new Error('Failed to upload content file: ' + error.message);
//       }
//     } else {
//       return res.status(400).json({ errors: [{ msg: 'Content file is required' }] });
//     }

//     // ✅ UPDATED: Upload consent file with filename
//     let consentFileUrl = '';
    
//     if (req.files?.consentFile?.[0]) {
//       try {
//         const file = req.files.consentFile[0];
//         const consentResult = await uploadToCloudinary(
//           file.buffer,
//           `submissions/${req.userId}/consent`,
//           file.originalname // ✅ Pass original filename
//         );
//         consentFileUrl = consentResult.secure_url;
//         console.log('✅ Consent uploaded:', consentFileUrl);
//       } catch (error) {
//         console.error('❌ Consent upload failed:', error);
//         throw new Error('Failed to upload consent file: ' + error.message);
//       }
//     } else {
//       return res.status(400).json({ errors: [{ msg: 'Consent file is required' }] });
//     }

//     // ✅ UPDATED: Optional files with filenames
//     let translationFileUrl = '';
//     let translationCloudinaryId = '';
//     if (req.files?.translationFile?.[0]) {
//       console.log('⬆️  Uploading translation file...');
//       try {
//         const file = req.files.translationFile[0];
//         const translationResult = await uploadToCloudinary(
//           file.buffer,
//           `submissions/${req.userId}/translation`,
//           file.originalname
//         );
//         translationFileUrl = translationResult.secure_url;
//         translationCloudinaryId = translationResult.public_id;
//         console.log('✅ Translation uploaded:', translationFileUrl);
//       } catch (error) {
//         console.error('⚠️  Translation upload failed:', error);
//       }
//     }

//     let verificationDocUrl = '';
//     let verificationCloudinaryId = '';
//     if (req.files?.verificationDoc?.[0]) {
//       console.log('⬆️  Uploading verification document...');
//       try {
//         const file = req.files.verificationDoc[0];
//         const verificationResult = await uploadToCloudinary(
//           file.buffer,
//           `submissions/${req.userId}/verification`,
//           file.originalname
//         );
//         verificationDocUrl = verificationResult.secure_url;
//         verificationCloudinaryId = verificationResult.public_id;
//         console.log('✅ Verification uploaded:', verificationDocUrl);
//       } catch (error) {
//         console.error('⚠️  Verification upload failed:', error);
//       }
//     }

//     // ...rest of existing code...
//   } catch (error) {
//     console.error('❌ Submission error:', error);
//     res.status(500).json({ 
//       errors: [{ 
//         msg: 'Failed to create submission', 
//         detail: error.message 
//       }] 
//     });
//   }
// });


// // GET /api/submissions/my - Get user's own submissions
// router.get('/my', requireAuth, async (req, res) => {
//   try {
//     const submissions = await Submission.find({ userId: req.userId })
//       .sort({ createdAt: -1 })
//       .select('-__v');
    
//     res.json(submissions);
//   } catch (error) {
//     console.error('Fetch submissions error:', error);
//     res.status(500).json({ errors: [{ msg: 'Failed to fetch submissions' }] });
//   }
// });

// // GET /api/submissions/:id - Get single submission
// router.get('/:id', requireAuth, async (req, res) => {
//   try {
//     const submission = await Submission.findOne({
//       _id: req.params.id,
//       userId: req.userId
//     });

//     if (!submission) {
//       return res.status(404).json({ errors: [{ msg: 'Submission not found' }] });
//     }

//     res.json(submission);
//   } catch (error) {
//     console.error('Fetch submission error:', error);
//     res.status(500).json({ errors: [{ msg: 'Failed to fetch submission' }] });
//   }
// });

// export default router;







// TEST V2
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import Submission from '../models/Submission.js';
import streamifier from 'streamifier';
import dotenv from 'dotenv';

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
        resource_type: isPdf ? 'raw' : 'auto', // Use 'raw' for PDFs
        type: 'upload',
        access_mode: 'public',
        unique_filename: true,
        format: isPdf ? 'pdf' : undefined
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

    if (!description || !keywords || !language) {
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
      language,
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
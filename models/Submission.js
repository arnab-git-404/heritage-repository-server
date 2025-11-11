// import mongoose from 'mongoose';

// const SubmissionSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     description: { type: String, required: true },
//     // optional fields to associate with a user in future
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     tribe: { type: String, index: true },
//     country: { type: String, index: true },
//     state: { type: String, index: true },
//     village: { type: String, index: true },
//     type: {
//       type: String,
//       enum: ['text', 'audio', 'video', 'image'],
//       default: 'text',
//       index: true,
//     },
//     category: { type: String, index: true }, // e.g., 'folktales', 'folksongs', etc.
//     contentUrl: { type: String }, // for audio/video URLs
//     text: { type: String }, // full text content if type === 'text'
//     consent: {
//       given: { type: Boolean, required: true },
//       name: { type: String, required: true, trim: true },
//       relation: { type: String, trim: true },
//       fileUrl: { type: String }, // uploaded consent document or proof
//       collectedAt: { type: Date, default: Date.now },
//     },
//     status: {
//       type: String,
//       enum: ['pending', 'approved', 'rejected'],
//       default: 'pending',
//       index: true,
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.model('Submission', SubmissionSchema);





import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema({
  fileType: {
    type: String,
    enum: ['pdf', 'audio', 'video'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  consentType: {
    type: String,
    enum: ['Individual Consent', 'Collective / Community Consent', 'Custodian Consent'],
    required: true
  },
  consentNames: {
    type: String,
    required: true
  },
  consentDate: {
    type: Date,
    required: true
  },
  permissionType: [{
    type: String,
    enum: ['Educational', 'Research', 'Cultural Display', 'All the above']
  }],
  duration: {
    type: String,
    enum: ['permanent', 'temporary'],
    required: true
  },
  digitalSignature: String
});

const submissionSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Step 2: Category Selection
  country: {
    type: String,
    required: true
  },
  stateRegion: {
    type: String,
    required: true
  },
  tribe: {
    type: String,
    required: true
  },
  village: String,
  culturalDomain: {
    type: String,
    required: true,
    enum: ['Folk Song', 'Folk Dance', 'Folk Tale', 'Ritual', 'Material Culture', 'Sacred Site', 'Oral Narrative', 'Other']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },

  // Step 3: Content Description
  description: {
    type: String,
    required: true,
    maxlength: 1500
  },
  keywords: {
    type: [String],
    required: true
  },
  language: {
    type: String,
    required: true
  },
  dateOfRecording: Date,
  culturalSignificance: String,

  // Step 4: Content File
  contentFileType: {
    type: String,
    required: true,
    enum: ['audio', 'video', 'image', 'text', '3d']
  },
  contentUrl: {
    type: String,
    required: true
  },
  contentCloudinaryId: String, // For deletion later

  // Step 5: Consent Upload
  consent: {
    type: consentSchema,
    required: true
  },

  // Step 6: Access Classification
  accessTier: {
    type: String,
    required: true,
    enum: ['Public', 'Restricted', 'Confidential/Sacred']
  },
  contentWarnings: [{
    type: String,
    enum: ['Sacred object', 'Deceased person', 'Ritual context', 'Other']
  }],
  warningOtherText: String,

  // Step 7: Additional Verification (Optional)
  translationFileUrl: String,
  translationCloudinaryId: String,
  backgroundInfo: String,
  verificationDocUrl: String,
  verificationCloudinaryId: String,

  // Step 8: Ethics Acknowledgement
  ethicsAgreed: {
    type: Boolean,
    required: true,
    default: false
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  rejectionReason: String,

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
// submissionSchema.index({ userId: 1, status: 1 });
// submissionSchema.index({ status: 1, createdAt: -1 });
// submissionSchema.index({ country: 1, tribe: 1 });

export default mongoose.model('Submission', submissionSchema);
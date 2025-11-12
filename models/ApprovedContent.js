

import mongoose from 'mongoose';

const approvedContentSchema = new mongoose.Schema({
  // Reference to original submission
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  
  // User who uploaded
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // All fields from submission (copied on approval)
  country: { type: String, required: true },
  stateRegion: { type: String, required: true },
  tribe: { type: String, required: true },
  village: String,
  culturalDomain: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  keywords: [String],
  language: { type: String, required: true },
  dateOfRecording: Date,
  culturalSignificance: String,
  
  contentFileType: { type: String, required: true },
  contentUrl: { type: String, required: true },
  contentCloudinaryId: String,
  
  consent: {
    fileType: String,
    fileUrl: String,
    consentType: String,
    consentNames: String,
    consentDate: Date,
    permissionType: [String],
    duration: String,
    digitalSignature: String
  },
  
  accessTier: { type: String, required: true },
  contentWarnings: [String],
  warningOtherText: String,
  
  translationFileUrl: String,
  backgroundInfo: String,
  verificationDocUrl: String,

  // Approval metadata
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedAt: {
    type: Date,
    default: Date.now
  },

  // Stats
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for search and filtering
// approvedContentSchema.index({ country: 1, tribe: 1 });
// approvedContentSchema.index({ culturalDomain: 1 });
// approvedContentSchema.index({ keywords: 1 });
// approvedContentSchema.index({ accessTier: 1 });

export default mongoose.model('ApprovedContent', approvedContentSchema);
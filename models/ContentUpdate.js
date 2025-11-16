import mongoose from 'mongoose';

const contentUpdateSchema = new mongoose.Schema({
  // Reference to original approved submission
  originalSubmissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },

  // Reference to approved content
  approvedContentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovedContent',
    required: true
  },

  // User who requested the update
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // What changed - User provided summary
  changesSummary: {
    type: String,
    required: true
  },

  // Detailed changes tracking
  changedFields: [{
    fieldName: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],

  // NEW proposed data (what user wants to change to)
  proposedChanges: {
    country: String,
    stateRegion: String,
    tribe: String,
    village: String,
    culturalDomain: String,
    title: String,
    description: String,
    keywords: [String],
    language: String,
    dateOfRecording: Date,
    culturalSignificance: String,
    contentFileType: String,
    contentUrl: String,
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
    accessTier: String,
    contentWarnings: [String],
    warningOtherText: String,
    translationFileUrl: String,
    translationCloudinaryId: String,
    backgroundInfo: String,
    verificationDocUrl: String,
    verificationCloudinaryId: String
  },

  // OLD data (backup for rollback)
  previousData: {
    country: String,
    stateRegion: String,
    tribe: String,
    village: String,
    culturalDomain: String,
    title: String,
    description: String,
    keywords: [String],
    language: String,
    dateOfRecording: Date,
    culturalSignificance: String,
    contentFileType: String,
    contentUrl: String,
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
    accessTier: String,
    contentWarnings: [String],
    warningOtherText: String,
    translationFileUrl: String,
    translationCloudinaryId: String,
    backgroundInfo: String,
    verificationDocUrl: String,
    verificationCloudinaryId: String
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // Review details
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: String,

  // Metadata
  requestedAt: {
    type: Date,
    default: Date.now
  },
  updateCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes
contentUpdateSchema.index({ status: 1, requestedAt: -1 });
contentUpdateSchema.index({ userId: 1 });
contentUpdateSchema.index({ originalSubmissionId: 1 });

export default mongoose.model('ContentUpdate', contentUpdateSchema);
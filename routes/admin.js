
import express from "express";
import Submission from "../models/Submission.js";
import ApprovedContent from "../models/ApprovedContent.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { dbConnect } from "../utils/db.js";
import { sendApprovalEmail, sendRejectionEmail } from "../utils/mailer.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(500).json({
      errors: [{ msg: "Server misconfiguration: admin credentials not set" }],
    });
  }
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res
      .status(401)
      .json({ errors: [{ msg: "Invalid admin credentials" }] });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      errors: [{ msg: "Server misconfiguration: JWT secret not set" }],
    });
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });

  res.json({ token });
});

// TODO: Implement proper admin middleware
// For now, simplified version
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json({ errors: [{ msg: "Authentication required" }] });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.user?.id) {
      return res.status(401).json({ errors: [{ msg: "Invalid token" }] });
    }

    // TODO: Check if user is admin from database
    // For now, allow all authenticated users
    req.userId = payload.user.id;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ errors: [{ msg: "Invalid or expired token" }] });
  }
}

// GET /api/admin/submissions?status=pending - Get submissions by status
router.get("/submissions", requireAdmin, async (req, res) => {
  try {
    const { status = "pending" } = req.query;

    const submissions = await Submission.find({ status })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json(submissions);
  } catch (error) {
    console.error("Fetch submissions error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to fetch submissions" }] });
  }
});

// PATCH /api/admin/submissions/:id/status - Approve or reject submission
router.patch("/submissions/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ errors: [{ msg: "Invalid status" }] });
    }

    const submission = await Submission.findById(req.params.id).populate(
      "userId",
      "name email"
    );

    if (!submission) {
      return res
        .status(404)
        .json({ errors: [{ msg: "Submission not found" }] });
    }

    if (submission.status !== "pending") {
      return res
        .status(400)
        .json({ errors: [{ msg: "Submission already processed" }] });
    }

    // Extract user details
    const userName = submission.userId?.name || "User";
    const userEmail = submission.userId?.email;
    const submissionTitle = submission.title || "Untitled Submission";

    if (status === "rejected") {
      // Update submission status
      submission.status = status;
      submission.rejectionReason = reason;
      submission.reviewedBy = req.userId;
      submission.reviewedAt = new Date();

      await submission.save();

      // Send rejection email
      if (userEmail) {
        try {
          await sendRejectionEmail(
            userEmail,
            userName,
            submissionTitle,
            reason
          );
          console.log(`Rejection email sent to ${userEmail}`);
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError);
          // Don't fail the request if email fails
        }
      }

      return res.json({
        message: `Submission ${status} successfully`,
        emailSent: !!userEmail,
      });
    }

    // If approved, copy to ApprovedContent collection
    if (status === "approved") {
      const approvedContent = new ApprovedContent({
        submissionId: submission._id,
        userId: submission.userId,
        country: submission.country,
        stateRegion: submission.stateRegion,
        tribe: submission.tribe,
        village: submission.village,
        culturalDomain: submission.culturalDomain,
        title: submission.title,
        description: submission.description,
        keywords: submission.keywords,
        language: submission.language,
        dateOfRecording: submission.dateOfRecording,
        culturalSignificance: submission.culturalSignificance,
        contentFileType: submission.contentFileType,
        contentUrl: submission.contentUrl,
        contentCloudinaryId: submission.contentCloudinaryId,
        consent: submission.consent,
        accessTier: submission.accessTier,
        contentWarnings: submission.contentWarnings,
        warningOtherText: submission.warningOtherText,
        translationFileUrl: submission.translationFileUrl,
        backgroundInfo: submission.backgroundInfo,
        verificationDocUrl: submission.verificationDocUrl,
        approvedBy: req.userId,
        approvedAt: new Date(),
      });

      await approvedContent.save();

      // Update submission status
      submission.status = status;
      submission.reviewedBy = req.userId;
      submission.reviewedAt = new Date();

      await submission.save();

      // Send approval email
      if (userEmail) {
        try {
          await sendApprovalEmail(
            userEmail,
            userName,
            submissionTitle,
            submission._id
          );
          console.log(`Approval email sent to ${userEmail}`);
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
          // Don't fail the request if email fails
        }
      }

      // Update submission status
      res.json({
        message: `Submission ${status} successfully`,
        submission,
        emailSent: !!userEmail,
      });
    }
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to update status" }] });
  }
});

// DELETE /api/admin/submissions/:id - Delete submission (admin only)
router.delete(
  "/submissions/:submissionStatus/:submissionId",
  requireAdmin,
  async (req, res) => {
    try {
      const { submissionStatus, submissionId } = req.params;

      // if (submissionStatus === 'approved') {
      // await dbConnect();

      //   await ApprovedContent.findByIdAndDelete(submissionId);
      // }

      // if (submissionStatus === 'rejected' && !submissionId) {

      //   await dbConnect();
      //   await Submission.findByIdAndDelete(submissionId);
      //   return res.json({ message: 'Rejected submission deleted successfully' });

      // }

      // const submission = await Submission.findById(req.params.id);

      const submission = await Submission.findById(submissionId).populate(
        "userId",
        "name email"
      );

      if (!submission) {
        return res
          .status(404)
          .json({ errors: [{ msg: "Submission not found" }] });
      }

      // Extract user details for email
      const userName = submission.userId?.name || "User";
      const userEmail = submission.userId?.email;
      const submissionTitle = submission.title || "Untitled Submission";

      // // Delete files from Cloudinary
      // if (submission.contentCloudinaryId) {
      //   await cloudinary.uploader
      //     .destroy(submission.contentCloudinaryId)
      //     .catch((err) => console.error("Cloudinary delete error:", err));
      // }

      // if (submission.translationCloudinaryId) {
      //   await cloudinary.uploader
      //     .destroy(submission.translationCloudinaryId)
      //     .catch((err) => console.error("Cloudinary delete error:", err));
      // }

      // if (submission.verificationCloudinaryId) {
      //   await cloudinary.uploader
      //     .destroy(submission.verificationCloudinaryId)
      //     .catch((err) => console.error("Cloudinary delete error:", err));
      // }

      // Delete files from Cloudinary

      const cloudinaryDeletions = [];

      if (submission.contentCloudinaryId) {
        cloudinaryDeletions.push(
          cloudinary.uploader
            .destroy(submission.contentCloudinaryId)
            .catch((err) => console.error("Cloudinary delete error:", err))
        );
      }

      if (submission.translationCloudinaryId) {
        cloudinaryDeletions.push(
          cloudinary.uploader
            .destroy(submission.translationCloudinaryId)
            .catch((err) => console.error("Cloudinary delete error:", err))
        );
      }

      if (submission.verificationCloudinaryId) {
        cloudinaryDeletions.push(
          cloudinary.uploader
            .destroy(submission.verificationCloudinaryId)
            .catch((err) => console.error("Cloudinary delete error:", err))
        );
      }

      // Wait for all Cloudinary deletions
      await Promise.all(cloudinaryDeletions);

      if (submissionStatus === "approved") {
        
        await ApprovedContent.findOneAndDelete({
          submissionId: submission._id,
        }).then(async () => {
          await Submission.findByIdAndDelete(submission._id);
        });

        return res.json({
          message: "Approved submission deleted successfully",
        });
      }

      if (submissionStatus === "rejected") {
        await Submission.findByIdAndDelete(submission._id);

        // Send email notification about deletion with rejection reason
        if (userEmail) {
          try {
            const reason =
              submission.rejectionReason ||
              "Your submission did not meet our guidelines.";
            await sendRejectionEmail(
              userEmail,
              userName,
              submissionTitle,
              `${reason}\n\nNote: This submission has been permanently removed from our system.`
            );
            console.log(`Deletion notification email sent to ${userEmail}`);
          } catch (emailError) {
            console.error("Failed to send deletion email:", emailError);
          }
        }

        return res.json({
          message: "Rejected submission deleted successfully",
          emailSent: !!userEmail,
        });
      }
    } catch (error) {
      console.error("Delete submission error:", error);
      res
        .status(500)
        .json({ errors: [{ msg: "Failed to delete submission" }] });
    }
  }
);

// GET /api/admin/users - Get all users
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -__v")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to fetch users" }] });
  }
});

export default router;

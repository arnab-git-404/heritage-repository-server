
// import express from "express";
// import Submission from "../models/Submission.js";
// import ApprovedContent from "../models/ApprovedContent.js";
// import User from "../models/User.js";
// import jwt from "jsonwebtoken";
// import { v2 as cloudinary } from "cloudinary";
// import { dbConnect } from "../utils/db.js";
// import { sendApprovalEmail, sendRejectionEmail } from "../utils/mailer.js";

// const router = express.Router();

// router.post("/login", async (req, res) => {
//   const { email, password } = req.body || {};

//   const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
//   const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

//   if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
//     return res.status(500).json({
//       errors: [{ msg: "Server misconfiguration: admin credentials not set" }],
//     });
//   }
//   if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
//     return res
//       .status(401)
//       .json({ errors: [{ msg: "Invalid admin credentials" }] });
//   }
//   if (!process.env.JWT_SECRET) {
//     return res.status(500).json({
//       errors: [{ msg: "Server misconfiguration: JWT secret not set" }],
//     });
//   }

//   const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });

//   res.json({ token });
// });

// // TODO: Implement proper admin middleware
// // For now, simplified version
// function requireAdmin(req, res, next) {
//   const auth = req.headers.authorization || "";
//   const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

//   if (!token) {
//     return res
//       .status(401)
//       .json({ errors: [{ msg: "Authentication required" }] });
//   }

//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     if (!payload?.user?.id) {
//       return res.status(401).json({ errors: [{ msg: "Invalid token" }] });
//     }

//     // TODO: Check if user is admin from database
//     // For now, allow all authenticated users
//     req.userId = payload.user.id;
//     next();
//   } catch (error) {
//     return res
//       .status(401)
//       .json({ errors: [{ msg: "Invalid or expired token" }] });
//   }
// }

// // GET /api/admin/submissions?status=pending - Get submissions by status
// router.get("/submissions", requireAdmin, async (req, res) => {
//   try {
//     const { status = "pending" } = req.query;

//     const submissions = await Submission.find({ status })
//       .populate("userId", "name email")
//       .sort({ createdAt: -1 })
//       .select("-__v");

//     res.json(submissions);
//   } catch (error) {
//     console.error("Fetch submissions error:", error);
//     res.status(500).json({ errors: [{ msg: "Failed to fetch submissions" }] });
//   }
// });

// // PATCH /api/admin/submissions/:id/status - Approve or reject submission
// router.patch("/submissions/:id/status", requireAdmin, async (req, res) => {
//   try {
//     const { status, reason } = req.body;

//     if (!["approved", "rejected"].includes(status)) {
//       return res.status(400).json({ errors: [{ msg: "Invalid status" }] });
//     }

//     const submission = await Submission.findById(req.params.id).populate(
//       "userId",
//       "name email"
//     );

//     if (!submission) {
//       return res
//         .status(404)
//         .json({ errors: [{ msg: "Submission not found" }] });
//     }

//     if (submission.status !== "pending") {
//       return res
//         .status(400)
//         .json({ errors: [{ msg: "Submission already processed" }] });
//     }

//     // Extract user details
//     const userName = submission.userId?.name || "User";
//     const userEmail = submission.userId?.email;
//     const submissionTitle = submission.title || "Untitled Submission";

//     if (status === "rejected") {
//       // Update submission status
//       submission.status = status;
//       submission.rejectionReason = reason;
//       submission.reviewedBy = req.userId;
//       submission.reviewedAt = new Date();

//       await submission.save();

//       // Send rejection email
//       if (userEmail) {
//         try {
//           await sendRejectionEmail(
//             userEmail,
//             userName,
//             submissionTitle,
//             reason
//           );
//           console.log(`Rejection email sent to ${userEmail}`);
//         } catch (emailError) {
//           console.error("Failed to send rejection email:", emailError);
//           // Don't fail the request if email fails
//         }
//       }

//       return res.json({
//         message: `Submission ${status} successfully`,
//         emailSent: !!userEmail,
//       });
//     }

//     // If approved, copy to ApprovedContent collection
//     if (status === "approved") {
//       const approvedContent = new ApprovedContent({
//         submissionId: submission._id,
//         userId: submission.userId,
//         country: submission.country,
//         stateRegion: submission.stateRegion,
//         tribe: submission.tribe,
//         village: submission.village,
//         culturalDomain: submission.culturalDomain,
//         title: submission.title,
//         description: submission.description,
//         keywords: submission.keywords,
//         language: submission.language,
//         dateOfRecording: submission.dateOfRecording,
//         culturalSignificance: submission.culturalSignificance,
//         contentFileType: submission.contentFileType,
//         contentUrl: submission.contentUrl,
//         contentCloudinaryId: submission.contentCloudinaryId,
//         consent: submission.consent,
//         accessTier: submission.accessTier,
//         contentWarnings: submission.contentWarnings,
//         warningOtherText: submission.warningOtherText,
//         translationFileUrl: submission.translationFileUrl,
//         backgroundInfo: submission.backgroundInfo,
//         verificationDocUrl: submission.verificationDocUrl,
//         approvedBy: req.userId,
//         approvedAt: new Date(),
//       });

//       await approvedContent.save();

//       // Update submission status
//       submission.status = status;
//       submission.reviewedBy = req.userId;
//       submission.reviewedAt = new Date();

//       await submission.save();

//       // Send approval email
//       if (userEmail) {
//         try {
//           await sendApprovalEmail(
//             userEmail,
//             userName,
//             submissionTitle,
//             submission._id
//           );
//           console.log(`Approval email sent to ${userEmail}`);
//         } catch (emailError) {
//           console.error("Failed to send approval email:", emailError);
//           // Don't fail the request if email fails
//         }
//       }

//       // Update submission status
//       res.json({
//         message: `Submission ${status} successfully`,
//         submission,
//         emailSent: !!userEmail,
//       });
//     }
//   } catch (error) {
//     console.error("Update status error:", error);
//     res.status(500).json({ errors: [{ msg: "Failed to update status" }] });
//   }
// });

// // DELETE /api/admin/submissions/:id - Delete submission (admin only)
// router.delete(
//   "/submissions/:submissionStatus/:submissionId",
//   requireAdmin,
//   async (req, res) => {
//     try {
//       const { submissionStatus, submissionId } = req.params;

//       // if (submissionStatus === 'approved') {
//       // await dbConnect();

//       //   await ApprovedContent.findByIdAndDelete(submissionId);
//       // }

//       // if (submissionStatus === 'rejected' && !submissionId) {

//       //   await dbConnect();
//       //   await Submission.findByIdAndDelete(submissionId);
//       //   return res.json({ message: 'Rejected submission deleted successfully' });

//       // }

//       // const submission = await Submission.findById(req.params.id);

//       const submission = await Submission.findById(submissionId).populate(
//         "userId",
//         "name email"
//       );

//       if (!submission) {
//         return res
//           .status(404)
//           .json({ errors: [{ msg: "Submission not found" }] });
//       }

//       // Extract user details for email
//       const userName = submission.userId?.name || "User";
//       const userEmail = submission.userId?.email;
//       const submissionTitle = submission.title || "Untitled Submission";

//       // // Delete files from Cloudinary
//       // if (submission.contentCloudinaryId) {
//       //   await cloudinary.uploader
//       //     .destroy(submission.contentCloudinaryId)
//       //     .catch((err) => console.error("Cloudinary delete error:", err));
//       // }

//       // if (submission.translationCloudinaryId) {
//       //   await cloudinary.uploader
//       //     .destroy(submission.translationCloudinaryId)
//       //     .catch((err) => console.error("Cloudinary delete error:", err));
//       // }

//       // if (submission.verificationCloudinaryId) {
//       //   await cloudinary.uploader
//       //     .destroy(submission.verificationCloudinaryId)
//       //     .catch((err) => console.error("Cloudinary delete error:", err));
//       // }

//       // Delete files from Cloudinary

//       const cloudinaryDeletions = [];

//       if (submission.contentCloudinaryId) {
//         cloudinaryDeletions.push(
//           cloudinary.uploader
//             .destroy(submission.contentCloudinaryId)
//             .catch((err) => console.error("Cloudinary delete error:", err))
//         );
//       }

//       if (submission.translationCloudinaryId) {
//         cloudinaryDeletions.push(
//           cloudinary.uploader
//             .destroy(submission.translationCloudinaryId)
//             .catch((err) => console.error("Cloudinary delete error:", err))
//         );
//       }

//       if (submission.verificationCloudinaryId) {
//         cloudinaryDeletions.push(
//           cloudinary.uploader
//             .destroy(submission.verificationCloudinaryId)
//             .catch((err) => console.error("Cloudinary delete error:", err))
//         );
//       }

//       // Wait for all Cloudinary deletions
//       await Promise.all(cloudinaryDeletions);

//       if (submissionStatus === "approved") {
        
//         await ApprovedContent.findOneAndDelete({
//           submissionId: submission._id,
//         }).then(async () => {
//           await Submission.findByIdAndDelete(submission._id);
//         });

//         return res.json({
//           message: "Approved submission deleted successfully",
//         });
//       }

//       if (submissionStatus === "rejected") {
//         await Submission.findByIdAndDelete(submission._id);

//         // Send email notification about deletion with rejection reason
//         if (userEmail) {
//           try {
//             const reason =
//               submission.rejectionReason ||
//               "Your submission did not meet our guidelines.";
//             await sendRejectionEmail(
//               userEmail,
//               userName,
//               submissionTitle,
//               `${reason}\n\nNote: This submission has been permanently removed from our system.`
//             );
//             console.log(`Deletion notification email sent to ${userEmail}`);
//           } catch (emailError) {
//             console.error("Failed to send deletion email:", emailError);
//           }
//         }

//         return res.json({
//           message: "Rejected submission deleted successfully",
//           emailSent: !!userEmail,
//         });
//       }
//     } catch (error) {
//       console.error("Delete submission error:", error);
//       res
//         .status(500)
//         .json({ errors: [{ msg: "Failed to delete submission" }] });
//     }
//   }
// );

// // GET /api/admin/users - Get all users
// router.get("/users", requireAdmin, async (req, res) => {
//   try {
//     const users = await User.find()
//       .select("-password -__v")
//       .sort({ createdAt: -1 });

//     res.json(users);
//   } catch (error) {
//     console.error("Fetch users error:", error);
//     res.status(500).json({ errors: [{ msg: "Failed to fetch users" }] });
//   }
// });

// export default router;




import express from "express";
import Submission from "../models/Submission.js";
import ApprovedContent from "../models/ApprovedContent.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { sendMail } from "../utils/mailer.js";
import AmendmentRequest from '../models/AmendmentRequest.js';

const router = express.Router();

// ===== Authentication =====
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

  const payload = { 
    user: { id: "admin", role: "admin" },
    role: "admin" 
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });

  res.json({ token });
});

// ===== Middleware =====
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
    
    // if (payload.role !== "admin") {
    //   return res.status(403).json({ errors: [{ msg: "Admin access required" }] });
    // }

    req.adminId = payload.user?.id || "admin";
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ errors: [{ msg: "Invalid or expired token" }] });
  }
}

// ===== Dashboard Stats =====
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      amendmentRequests,
      totalViews,
      totalDownloads,
      recentUsers,
      recentSubmissions,
    ] = await Promise.all([
      User.countDocuments(),
      AmendmentRequest.countDocuments(),
      Submission.countDocuments({ status: "pending" }),
      Submission.countDocuments({ status: "approved" }),
      Submission.countDocuments({ status: "rejected" }),
      ApprovedContent.aggregate([
        { $group: { _id: null, total: { $sum: "$views" } } },
      ]),
      ApprovedContent.aggregate([
        { $group: { _id: null, total: { $sum: "$downloads" } } },
      ]),
      User.find().sort({ createdAt: -1 }).limit(5).select("-password"),
      Submission.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("userId", "name email"),
    ]);

    res.json({
      stats: {
        totalUsers,
        pendingSubmissions,
        approvedSubmissions,
        amendmentRequests,
        rejectedSubmissions,
        totalViews: totalViews[0]?.total || 0,
        totalDownloads: totalDownloads[0]?.total || 0,
      },
      recentUsers,
      recentSubmissions,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to fetch stats" }] });
  }
});

// ===== Submissions Management =====
router.get("/submissions", requireAdmin, async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20, search = "" } = req.query;

    const query = { status };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tribe: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      Submission.find(query)
        .populate("userId", "name email avatar role country tribe")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
      Submission.countDocuments(query),
    ]);

    res.json({
      submissions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Fetch submissions error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to fetch submissions" }] });
  }
});

// ===== Get Single Submission Details =====
router.get("/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("userId", "name email avatar role country state tribe village bio")
      .populate("reviewedBy", "name email");

    if (!submission) {
      return res.status(404).json({ errors: [{ msg: "Submission not found" }] });
    }

    // Get approved content if exists
    let approvedContent = null;
    if (submission.status === "approved") {
      approvedContent = await ApprovedContent.findOne({
        submissionId: submission._id,
      }).populate("approvedBy", "name email");
    }

    res.json({ submission, approvedContent });
  } catch (error) {
    console.error("Fetch submission error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to fetch submission" }] });
  }
});

// ===== Approve/Reject Submission =====
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
      return res.status(404).json({ errors: [{ msg: "Submission not found" }] });
    }

    if (submission.status !== "pending") {
      return res
        .status(400)
        .json({ errors: [{ msg: "Submission already processed" }] });
    }

    submission.status = status;
    submission.reviewedBy = req.adminId;
    submission.reviewedAt = new Date();

    if (status === "rejected") {
      submission.rejectionReason = reason;
      await submission.save();

      const userEmail = submission.userId?.email;
      const userName = submission.userId?.name || "User";

      if (userEmail) {
        await sendMail({
          to: userEmail,
          subject: "Heritage Repository - Submission Rejected",
          html: `
            <h2>Submission Rejected</h2>
            <p>Dear ${userName},</p>
            <p>Unfortunately, your submission "<strong>${submission.title}</strong>" has been rejected.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
            <p>If you have any questions, please contact our support team.</p>
            <br>
            <p>Best regards,<br>Heritage Repository Team</p>
          `,
          text: `Dear ${userName},\n\nYour submission "${submission.title}" has been rejected.\n${reason ? `\nReason: ${reason}` : ""}\n\nBest regards,\nHeritage Repository Team`,
        });
      }

      return res.json({ message: "Submission rejected successfully", submission });
    }

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
        approvedBy: req.adminId,
        approvedAt: new Date(),
      });

      await approvedContent.save();
      await submission.save();

      const userEmail = submission.userId?.email;
      const userName = submission.userId?.name || "User";

      if (userEmail) {
        await sendMail({
          to: userEmail,
          subject: "Heritage Repository - Submission Approved",
          html: `
            <h2>Submission Approved! 🎉</h2>
            <p>Dear ${userName},</p>
            <p>Congratulations! Your submission "<strong>${submission.title}</strong>" has been approved and is now live on the Heritage Repository.</p>
            <p>Thank you for contributing to preserving cultural heritage.</p>
            <br>
            <p>Best regards,<br>Heritage Repository Team</p>
          `,
          text: `Dear ${userName},\n\nCongratulations! Your submission "${submission.title}" has been approved and is now live.\n\nThank you for your contribution!\n\nBest regards,\nHeritage Repository Team`,
        });
      }

      return res.json({ message: "Submission approved successfully", submission });
    }
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to update status" }] });
  }
});

// ===== Delete Submission =====
router.delete("/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate(
      "userId",
      "name email"
    );

    if (!submission) {
      return res.status(404).json({ errors: [{ msg: "Submission not found" }] });
    }

    // Delete files from Cloudinary
    const deletePromises = [];
    if (submission.contentCloudinaryId) {
      deletePromises.push(
        cloudinary.uploader.destroy(submission.contentCloudinaryId)
      );
    }
    if (submission.translationCloudinaryId) {
      deletePromises.push(
        cloudinary.uploader.destroy(submission.translationCloudinaryId)
      );
    }
    if (submission.verificationCloudinaryId) {
      deletePromises.push(
        cloudinary.uploader.destroy(submission.verificationCloudinaryId)
      );
    }

    await Promise.allSettled(deletePromises);

    // Send deletion email
    const userEmail = submission.userId?.email;
    const userName = submission.userId?.name || "User";

    if (userEmail) {
      await sendMail({
        to: userEmail,
        subject: "Heritage Repository - Submission Deleted",
        html: `
          <h2>Submission Deleted</h2>
          <p>Dear ${userName},</p>
          <p>Your submission "<strong>${submission.title}</strong>" has been deleted from the Heritage Repository.</p>
          ${
            submission.rejectionReason
              ? `<p><strong>Previous rejection reason:</strong> ${submission.rejectionReason}</p>`
              : ""
          }
          <p>If you have any questions, please contact our support team.</p>
          <br>
          <p>Best regards,<br>Heritage Repository Team</p>
        `,
        text: `Dear ${userName},\n\nYour submission "${submission.title}" has been deleted.\n${submission.rejectionReason ? `\nPrevious rejection reason: ${submission.rejectionReason}` : ""}\n\nBest regards,\nHeritage Repository Team`,
      });
    }

    // Delete from approved content if exists
    if (submission.status === "approved") {
      await ApprovedContent.findOneAndDelete({ submissionId: submission._id });
    }

    await Submission.findByIdAndDelete(submission._id);

    res.json({ message: "Submission deleted successfully" });
  } catch (error) {
    console.error("Delete submission error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to delete submission" }] });
  }
});

// ===== Users Management =====
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", role = "" } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { tribe: { $regex: search, $options: "i" } },
      ];
    }
    if (role) {
      query.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to fetch users" }] });
  }
});

// ===== Get Single User Details =====
router.get("/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ errors: [{ msg: "User not found" }] });
    }

    // Get user's submissions
    const [submissions, approvedCount, pendingCount, rejectedCount] =
      await Promise.all([
        Submission.find({ userId: user._id })
          .sort({ createdAt: -1 })
          .limit(10)
          .select("title status culturalDomain createdAt"),
        Submission.countDocuments({ userId: user._id, status: "approved" }),
        Submission.countDocuments({ userId: user._id, status: "pending" }),
        Submission.countDocuments({ userId: user._id, status: "rejected" }),
      ]);

    res.json({
      user,
      stats: {
        totalSubmissions: submissions.length,
        approved: approvedCount,
        pending: pendingCount,
        rejected: rejectedCount,
      },
      recentSubmissions: submissions,
    });
  } catch (error) {
    console.error("Fetch user error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to fetch user" }] });
  }
});

// ===== Update User Role =====
router.patch("/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["Custodian", "Researcher", "Contributor", "Viewer"].includes(role)) {
      return res.status(400).json({ errors: [{ msg: "Invalid role" }] });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: "-password" }
    );

    if (!user) {
      return res.status(404).json({ errors: [{ msg: "User not found" }] });
    }

    res.json({ message: "User role updated successfully", user });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to update user role" }] });
  }
});

// ===== Delete User =====
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ errors: [{ msg: "User not found" }] });
    }

    // Delete all user's submissions
    const submissions = await Submission.find({ userId: user._id });

    for (const submission of submissions) {
      if (submission.contentCloudinaryId) {
        await cloudinary.uploader
          .destroy(submission.contentCloudinaryId)
          .catch(() => {});
      }
      if (submission.status === "approved") {
        await ApprovedContent.findOneAndDelete({
          submissionId: submission._id,
        });
      }
    }

    await Submission.deleteMany({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: "User and associated data deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ errors: [{ msg: "Failed to delete user" }] });
  }
});




// ===== GET /api/admin/amendments - Get all amendment requests =====
router.get("/amendments", requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = { status };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [amendments, total] = await Promise.all([
      AmendmentRequest.find(query)
        .populate('userId', 'name email avatar country tribe')
        .populate('submissionId', 'title status')
        .populate('approvedContentId', 'title currentVersion')
        .populate('reviewedBy', 'name email')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AmendmentRequest.countDocuments(query)
    ]);

    res.json({
      amendments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Fetch amendments error:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to fetch amendments' }] });
  }
});

// ===== GET /api/admin/amendments/:id - Get amendment details with comparison =====
router.get("/amendments/:id", requireAdmin, async (req, res) => {
  try {
    const amendment = await AmendmentRequest.findById(req.params.id)
      .populate('userId', 'name email avatar role country tribe village')
      .populate('submissionId')
      .populate('approvedContentId')
      .populate('reviewedBy', 'name email');

    if (!amendment) {
      return res.status(404).json({ errors: [{ msg: 'Amendment not found' }] });
    }

    // Prepare side-by-side comparison
    const comparison = {
      current: {
        version: `v${amendment.previousVersionNumber}`,
        label: 'Current Approved Version',
        data: amendment.currentApprovedSnapshot
      },
      proposed: {
        version: `v${amendment.versionNumber}`,
        label: 'Proposed Changes',
        data: amendment.proposedChanges
      },
      changes: amendment.changedFields.map(change => ({
        field: change.fieldName,
        type: change.changeType,
        before: change.oldValue,
        after: change.newValue
      })),
      summary: amendment.changesSummary
    };

    res.json({ 
      amendment, 
      comparison 
    });
  } catch (error) {
    console.error('Fetch amendment error:', error);
    res.status(500).json({ errors: [{ msg: 'Failed to fetch amendment' }] });
  }
});

// ===== PATCH /api/admin/amendments/:id/review - Approve or reject amendment =====
router.patch("/amendments/:id/review", requireAdmin, async (req, res) => {
  try {
    const { approved, reviewNotes } = req.body;

    const amendment = await AmendmentRequest.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('submissionId')
      .populate('approvedContentId');

    if (!amendment) {
      return res.status(404).json({ errors: [{ msg: 'Amendment not found' }] });
    }

    if (amendment.status !== 'pending') {
      return res.status(400).json({ 
        errors: [{ msg: 'Amendment already processed' }] 
      });
    }

    const userEmail = amendment.userId?.email;
    const userName = amendment.userId?.name || 'User';
    const submission = amendment.submissionId;

    if (approved) {
      // ✅ APPROVE AMENDMENT
      console.log(`✅ Approving amendment - v${amendment.previousVersionNumber} → v${amendment.versionNumber}`);

      // Case 1: Amending APPROVED content
      if (amendment.approvedContentId) {
        const approvedContent = await ApprovedContent.findById(amendment.approvedContentId);

        if (!approvedContent) {
          return res.status(404).json({ 
            errors: [{ msg: 'Approved content not found' }] 
          });
        }

        // Delete old files if replaced
        const filesToDelete = [];
        if (amendment.proposedChanges.contentCloudinaryId !== amendment.currentApprovedSnapshot.contentCloudinaryId) {
          filesToDelete.push(amendment.currentApprovedSnapshot.contentCloudinaryId);
        }
        if (amendment.proposedChanges.translationCloudinaryId !== amendment.currentApprovedSnapshot.translationCloudinaryId) {
          filesToDelete.push(amendment.currentApprovedSnapshot.translationCloudinaryId);
        }
        if (amendment.proposedChanges.verificationCloudinaryId !== amendment.currentApprovedSnapshot.verificationCloudinaryId) {
          filesToDelete.push(amendment.currentApprovedSnapshot.verificationCloudinaryId);
        }

        // Delete old files from Cloudinary
        for (const fileId of filesToDelete) {
          if (fileId) {
            await cloudinary.uploader.destroy(fileId).catch(err => {
              console.log('⚠️  Failed to delete old file:', fileId);
            });
          }
        }

        // Apply all proposed changes to approved content
        Object.assign(approvedContent, amendment.proposedChanges);
        
        // Update version tracking
        approvedContent.currentVersion = amendment.versionNumber;
        approvedContent.totalAmendments = (approvedContent.totalAmendments || 0) + 1;
        approvedContent.lastAmendmentDate = new Date();
        approvedContent.updatedAt = new Date();

        await approvedContent.save();

        console.log(`✅ Approved content updated to v${amendment.versionNumber}`);
      }
      // Case 2: Approving PENDING submission (first approval)
      else {
        // Create new approved content
        const approvedContent = new ApprovedContent({
          submissionId: submission._id,
          userId: amendment.userId._id,
          ...amendment.proposedChanges,
          currentVersion: 1,
          totalAmendments: 0,
          approvedBy: req.adminId,
          approvedAt: new Date()
        });

        await approvedContent.save();

        // Update submission
        submission.status = 'approved';
        submission.approvedAt = new Date();
        submission.reviewedBy = req.adminId;
        submission.reviewedAt = new Date();

        await submission.save();

        console.log('✅ First approval - Approved content created');
      }

      // Update amendment status
      amendment.status = 'approved';
      amendment.reviewedBy = req.adminId;
      amendment.reviewedAt = new Date();
      amendment.approvedAt = new Date();
      amendment.reviewNotes = reviewNotes;

      await amendment.save();

      // Send approval email
      if (userEmail) {
        await sendMail({
          to: userEmail,
          subject: `Amendment Approved - v${amendment.versionNumber}`,
          html: `
            <h2>Amendment Approved! 🎉</h2>
            <p>Dear ${userName},</p>
            <p>Your amendment request has been approved and is now live as <strong>Version ${amendment.versionNumber}</strong>.</p>
            <p><strong>Changes:</strong> ${amendment.changesSummary}</p>
            ${reviewNotes ? `<p><strong>Admin notes:</strong> ${reviewNotes}</p>` : ''}
            <p>Your content is now updated with the new changes.</p>
            <br>
            <p>Best regards,<br>Heritage Repository Team</p>
          `,
          text: `Amendment approved - v${amendment.versionNumber}\n\nChanges: ${amendment.changesSummary}`
        });
      }

      return res.json({ 
        message: `Amendment approved - Now v${amendment.versionNumber}`,
        amendment,
        newVersion: amendment.versionNumber
      });

    } else {
      // ❌ REJECT AMENDMENT
      console.log(`❌ Rejecting amendment - Staying at v${amendment.previousVersionNumber}`);

      // Delete newly uploaded files from Cloudinary
      const filesToDelete = [];
      if (amendment.proposedChanges.contentCloudinaryId !== amendment.currentApprovedSnapshot.contentCloudinaryId) {
        filesToDelete.push(amendment.proposedChanges.contentCloudinaryId);
      }
      if (amendment.proposedChanges.translationCloudinaryId !== amendment.currentApprovedSnapshot.translationCloudinaryId) {
        filesToDelete.push(amendment.proposedChanges.translationCloudinaryId);
      }
      if (amendment.proposedChanges.verificationCloudinaryId !== amendment.currentApprovedSnapshot.verificationCloudinaryId) {
        filesToDelete.push(amendment.proposedChanges.verificationCloudinaryId);
      }

      for (const fileId of filesToDelete) {
        if (fileId) {
          await cloudinary.uploader.destroy(fileId).catch(() => {});
        }
      }

      // Update amendment status
      amendment.status = 'rejected';
      amendment.reviewedBy = req.adminId;
      amendment.reviewedAt = new Date();
      amendment.rejectedAt = new Date();
      amendment.reviewNotes = reviewNotes;
      amendment.rejectionReason = reviewNotes;

      await amendment.save();

      // Send rejection email
      if (userEmail) {
        await sendMail({
          to: userEmail,
          subject: 'Amendment Rejected',
          html: `
            <h2>Amendment Rejected</h2>
            <p>Dear ${userName},</p>
            <p>Unfortunately, your amendment request for <strong>Version ${amendment.versionNumber}</strong> was not approved.</p>
            <p><strong>Your proposed changes:</strong> ${amendment.changesSummary}</p>
            ${reviewNotes ? `<p><strong>Reason:</strong> ${reviewNotes}</p>` : ''}
            <p>Your content remains at <strong>Version ${amendment.previousVersionNumber}</strong>.</p>
            <p>You can submit a new amendment request with the necessary corrections.</p>
            <br>
            <p>Best regards,<br>Heritage Repository Team</p>
          `,
          text: `Amendment rejected - Staying at v${amendment.previousVersionNumber}\n\nReason: ${reviewNotes}`
        });
      }

      return res.json({ 
        message: 'Amendment rejected - Original version preserved',
        amendment,
        currentVersion: amendment.previousVersionNumber
      });
    }

  } catch (error) {
    console.error('❌ Review amendment error:', error);
    res.status(500).json({ 
      errors: [{ 
        msg: 'Failed to review amendment', 
        detail: error.message 
      }] 
    });
  }
});


export default router;
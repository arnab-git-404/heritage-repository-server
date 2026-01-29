import catchAsync from "../utils/catchAsync.js";
import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from "../services/user.service.js";

export const getProfileController = catchAsync(async (req, res) => {
  const user = await getUserProfile(req.user.id);

  res.status(200).json({
    status: "success",
    data: { user }
  });
});

export const updateProfileController = catchAsync(async (req, res) => {
  const updatedUser = await updateUserProfile(req.user.id, req.body);

  res.status(200).json({
    status: "success",
    message: "Profile updated successfully",
    data: { user: updatedUser }
  });
});

export const deleteProfileController = catchAsync(async (req, res) => {
  await deleteUserProfile(req.user.id);

  res.status(200).json({
    status: "success",
    message: "Account deleted successfully",
  });
});

export const uploadAvatarController = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }

  if (!req.file.mimetype.startsWith("image/")) {
    throw new AppError("File must be an image", 400);
  }

  const { avatarUrl, user } = await uploadAvatar(req.user.id, req.file.buffer);

  res.status(200).json({
    status: "success",
    message: "Avatar uploaded successfully",
    data: { avatarUrl, user },
  });
});
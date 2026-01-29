import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { v2 as cloudinary } from "cloudinary";


export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select(
    "-password -refreshToken -resetPasswordToken -resetPasswordExpires"
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const updateUserProfile = async (userId, updateData) => {
  const { name, role, country, state, tribe, village, bio } = updateData;

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (role !== undefined) updateFields.role = role;
  if (country !== undefined) updateFields.country = country;
  if (state !== undefined) updateFields.state = state;
  if (tribe !== undefined) updateFields.tribe = tribe;
  if (village !== undefined) updateFields.village = village;
  if (bio !== undefined) updateFields.bio = bio;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    {
      new: true,
      runValidators: true,
      select: "-password -refreshToken -resetPasswordToken -resetPasswordExpires",
    }
  );

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  return updatedUser;
};

export const deleteUserProfile = async (userId) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const uploadAvatar = async (userId, fileBuffer) => {
  // Upload to Cloudinary
  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `avatars/${userId}`,
        resource_type: "image",
        type: "upload",
        access_mode: "public",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });

  // Update user with new avatar URL
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { avatar: result.secure_url },
    {
      new: true,
      select: "-password -refreshToken -resetPasswordToken -resetPasswordExpires",
    }
  );

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  return { avatarUrl: result.secure_url, user: updatedUser };
};
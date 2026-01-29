import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import bcrypt from "bcryptjs";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

export const register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("User Already Exists", 409);
  }

  newUser = new User({ name, email, password });

  const accessToken = signAccessToken({ id: newUser._id, role: newUser.role });
  const refreshToken = signRefreshToken({ id: newUser._id });

  newUser.refreshToken = await bcrypt.hash(refreshToken, 12);
  await newUser.save();
  return { accessToken, refreshToken };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new AppError("User Not Found", 404);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError("Invalid Credentials", 401);
  }

  const accessToken = signAccessToken({ id: user._id, role: user.role });

  const refreshToken = signRefreshToken({ id: user._id });

  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  await user.save();

  return { accessToken, refreshToken };
};

export const refreshToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new AppError("No refresh token", 401);
  }

  // Verify the refresh token using jwt
  const payload = verifyRefreshToken(refreshToken);

  // Find the user through the id in the payload
  const user = await User.findById(payload.id).select("+refreshToken");

  if (!user) {
    throw new AppError("User Not Found", 403);
  }

  // Compare hashed token in DB with the provided token
  const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isValid) {
    throw new AppError("Invalid refresh token", 403);
  }

  // Issue new tokens
  const newAccessToken = signAccessToken({ id: user._id, role: user.role });
  const newRefreshToken = signRefreshToken({ id: user._id });

  // hash refresh token & save to DB
  user.refreshToken = await bcrypt.hash(newRefreshToken, 12);
  await user.save();

  return { newAccessToken, newRefreshToken };
};

export const logout = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new AppError("No refresh token", 401);
  }

  if (refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    
    await User.findByIdAndUpdate(decoded.id, {
      refreshToken: null,
    });
  }
};

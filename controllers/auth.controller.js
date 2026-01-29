import catchAsync from "../utils/catchAsync.js";
import {
  login,
  register,
  refreshToken,
  logout,
} from "../services/auth.service.js";
import {
  accessCookieOptions,
  refreshCookieOptions,
  clearCookieOptions,
} from "../utils/cookie.js";

export const registerController = catchAsync(async (req, res) => {
  const { accessToken, refreshToken } = await register(req.body);

  res
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .status(201)
    .json({
      status: "success",
      message: "User registered successfully",
    });
});

export const loginController = catchAsync(async (req, res) => {
  const { accessToken, refreshToken } = await login(req.body);

  res
    .cookie("accessToken", accessToken, accessCookieOptions)
    .cookie("refreshToken", refreshToken, refreshCookieOptions)
    .status(200)
    .json({
      status: "success",
      message: "User logged in successfully",
    });
});

export const refreshTokenController = catchAsync(async (req, res) => {
  const { newAccessToken, newRefreshToken } = await refreshToken(req.cookies.refreshToken);

  res.cookie("accessToken", newAccessToken, accessCookieOptions)
     .cookie("refreshToken", newRefreshToken, refreshCookieOptions)
     .status(200)
     .json({
       status: "success",
       message: "Token refreshed successfully",
     });
});

export const logoutController = catchAsync(async (req, res) => {
  await logout(req.cookies.refreshToken);

  res
    .clearCookie("accessToken", accessCookieOptions)
    .clearCookie("refreshToken", refreshCookieOptions)
    .status(200)
    .json({
      status: "success",
      message: "Logged out successfully",
    });
});

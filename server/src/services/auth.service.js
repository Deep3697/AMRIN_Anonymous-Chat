import jwt from "jsonwebtoken";

export function issueSession(res, user) {
  const accessToken = jwt.sign(
    { sub: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { sub: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "30d" }
  );

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}
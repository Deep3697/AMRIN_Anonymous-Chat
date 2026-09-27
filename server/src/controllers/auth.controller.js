import { User } from "../models/user.model.js";
import { Group } from "../models/group.model.js";
import { Membership } from "../models/membership.model.js";
import { generateOtp, verifyOtp } from "../services/otp.service.js";
import { issueSession } from "../services/auth.service.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export async function register(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    await generateOtp(email.toLowerCase(), "register");
    return res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function verifyOtpHandler(req, res) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const result = await verifyOtp(email.toLowerCase(), code, "register");

    if (!result.valid) {
      return res.status(400).json({ error: result.reason });
    }

    const signupToken = jwt.sign(
      { email: email.toLowerCase(), purpose: "signup" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "10m" }
    );

    return res.status(200).json({ signupToken });
  } catch (err) {
    console.error("verifyOtpHandler error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function completeProfile(req, res) {
  try {
    const { signupToken, anonymousName, gender, password } = req.body;

    if (!signupToken || !anonymousName || !gender || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    let payload;
    try {
      payload = jwt.verify(signupToken, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ error: "Signup session expired, please verify OTP again" });
    }

    if (payload.purpose !== "signup") {
      return res.status(401).json({ error: "Invalid signup token" });
    }

    const existingName = await User.findOne({ anonymousName });
    if (existingName) {
      return res.status(409).json({ error: "That anonymous name is taken" });
    }

    const user = await User.create({
      email: payload.email,
      passwordHash: password, // the pre-save hook you wrote hashes this automatically
      anonymousName,
      gender,
    });

    // Auto-join the universal casual group
    let universalGroup = await Group.findOne({ level: "universal" });
    if (!universalGroup) {
      universalGroup = await Group.create({
        name: "University-Casual",
        type: "casual",
        level: "universal",
        isDefault: true,
      });
    }
    await Membership.create({ userId: user._id, groupId: universalGroup._id }).catch(() => {});

    issueSession(res, user);

    return res.status(201).json({
      user: {
        id: user._id,
        anonymousName: user.anonymousName,
        role: user.role,
        status: user.status,
        bannedUntil: user.bannedUntil,
      },
    });
  } catch (err) {
    console.error("completeProfile error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function login(req, res) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Identifier and password are required" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { anonymousName: identifier }],
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    issueSession(res, user);

    return res.status(200).json({
      user: { id: user._id, anonymousName: user.anonymousName, role: user.role, status: user.status, bannedUntil: user.bannedUntil },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function session(req, res) {
  const accessToken = req.cookies.accessToken;

  if (accessToken) {
    try {
      const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(payload.sub);
      if (user) {
        return res.status(200).json({
          user: { id: user._id, anonymousName: user.anonymousName, role: user.role, status: user.status, bannedUntil: user.bannedUntil },
        });
      }
    } catch {
      // access token invalid/expired, fall through to try the refresh token
    }
  }

  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    issueSession(res, user); // issues a fresh access token cookie
    return res.status(200).json({
      user: { id: user._id, anonymousName: user.anonymousName, role: user.role, status: user.status, bannedUntil: user.bannedUntil },
    });
  } catch {
    return res.status(401).json({ error: "Not authenticated" });
  }
}

export function logout(req, res) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.status(200).json({ message: "Logged out" });
}
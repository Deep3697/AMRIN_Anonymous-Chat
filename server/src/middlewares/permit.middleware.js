import { can } from "../services/permissions.service.js";

export function permit(permission) {
  return (req, res, next) => {
    if (!can(req.user.role, permission)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    next();
  };
}
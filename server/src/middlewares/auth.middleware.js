   import jwt from "jsonwebtoken";

   export function requireAuth(req, res, next) {
     const token = req.cookies.accessToken;
     if (!token) {
       return res.status(401).json({ error: "Not authenticated" });
     }

     try {
       const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
       req.user = payload; // { sub: userId, role: userRole }
       next();
     } catch (err) {
       return res.status(401).json({ error: "Invalid or expired token" });
     }
   }

   export function requireAdmin(req, res, next) {
     if (!["god_admin", "main_admin"].includes(req.user?.role)) {
       return res.status(403).json({ error: "Admin access required" });
     }
     next();
   }
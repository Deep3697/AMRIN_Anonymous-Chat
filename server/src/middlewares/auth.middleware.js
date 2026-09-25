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
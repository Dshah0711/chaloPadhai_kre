import jwt from 'jsonwebtoken';

/**
 * Middleware to protect routes and verify JWT tokens.
 */
export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ai_course_builder_secret_key_2026');
    req.user = decoded; // Contains user id, e.g. req.user.id
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

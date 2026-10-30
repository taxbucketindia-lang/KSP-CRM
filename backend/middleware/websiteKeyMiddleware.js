import crypto from 'crypto';
import { protect } from './authMiddleware.js';

// Hamari website (taxbucket.in) ka server ek secret key (header "x-website-key") ke saath aata hai.
// Key .env ke WEBSITE_API_KEY se milti ho to request chalti hai; warna normal CRM login (protect) zaroori hai.
// Key sirf dono servers ki .env me rehti hai, browser tak kabhi nahi jati.
const keyMatches = (given) => {
  const expected = process.env.WEBSITE_API_KEY;
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const websiteOrUser = (req, res, next) => {
  if (keyMatches(req.headers['x-website-key'])) {
    req.website = 'taxbucket.in';
    return next();
  }
  return protect(req, res, next);
};

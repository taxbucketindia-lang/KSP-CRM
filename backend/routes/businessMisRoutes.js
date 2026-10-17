import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { isCeo } from '../utils/roles.js';
import { getMis, saveMis } from '../controllers/businessMisController.js';

const router = express.Router();

// 🔴 Business MIS (company ka P&L, cash flow, budget) sirf CEO ke liye
const ceoOnly = (req, res, next) => {
  if (!isCeo(req.user)) return res.status(403).json({ message: 'Business MIS is available to the CEO only' });
  next();
};

router.use(protect, ceoOnly);
router.get('/', getMis);
router.put('/:month', saveMis);

export default router;

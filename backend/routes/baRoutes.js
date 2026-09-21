// import express from 'express';
// import { createBA, getBAs } from '../controllers/baController.js';
// import { protect, authorize } from '../middleware/authMiddleware.js';

// const router = express.Router();

// router.route('/')
//   .post(protect, authorize('Admin', 'Manager'), createBA)
//   .get(protect, getBAs);

// export default router;







import express from 'express';
import { createBA, getBAs, updateBA, deleteBA } from '../controllers/baController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, authorize('Admin', 'Manager'), createBA)
  .get(protect, getBAs);

router.route('/:id')
  .put(protect, authorize('Admin', 'Manager'), updateBA)
  .delete(protect, authorize('Admin', 'Manager'), deleteBA);

export default router;
import express from 'express';
import { getVendors, createVendor, updateVendor, deleteVendor, addVendorRemark, deleteVendorRemark } from '../controllers/vendorController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../utils/permissions.js';

// Vendor tab ka right (Finance): CEO / Admin ke paas hota hai, employee ko Admin de sakta hai
const canUseVendors = requirePermission('VENDORS');
// 🔴 Data delete sirf wahi kar sakta hai jiske paas "Delete Records" ka right hai
const canDelete = requirePermission('DELETE_RECORDS');

const router = express.Router();

router.route('/')
  .get(protect, canUseVendors, getVendors)
  .post(protect, canUseVendors, createVendor);

router.post('/:id/remarks', protect, canUseVendors, addVendorRemark);
router.delete('/:id/remarks/:remarkId', protect, canUseVendors, canDelete, deleteVendorRemark);

router.route('/:id')
  .put(protect, canUseVendors, updateVendor)
  .delete(protect, canUseVendors, canDelete, deleteVendor);

export default router;

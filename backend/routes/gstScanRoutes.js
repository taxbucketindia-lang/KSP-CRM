import express from 'express';
import { runGstHealthScan } from '../controllers/gstScanController.js';
import { websiteOrUser } from '../middleware/websiteKeyMiddleware.js';

const router = express.Router();

// Sirf CRM me logged-in user ya secret key wali hamari website (taxbucket.in) hi scan chala sakti hai.
// Pehle yeh route sabke liye khula tha: koi bhi fake lead bana sakta tha aur paid GST API ka kharcha badha sakta tha.
router.route('/').post(websiteOrUser, runGstHealthScan);

export default router;

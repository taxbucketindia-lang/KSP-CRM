import Invoice from '../models/Invoice.js';
import nodemailer from 'nodemailer';

// @desc    Create / Save New Invoice
// @route   POST /api/invoices
// @access  Private
export const createInvoice = async (req, res) => {
  try {
    const newInvoice = new Invoice({
      ...req.body,
      createdBy: req.user._id
    });
    const savedInvoice = await newInvoice.save();
    res.status(201).json({ success: true, data: savedInvoice, message: "Invoice saved successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Invoices (History)
// @route   GET /api/invoices
// @access  Private
// @desc    Get All Invoices (History)
export const getInvoices = async (req, res) => {
  try {
    // 🔴 NAYA: populate('sendLogs.sentBy', 'name') add kiya hai employee ka naam lene ke liye
    const invoices = await Invoice.find()
      .populate('sendLogs.sentBy', 'name') 
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Single Invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update / Edit Invoice
// @route   PUT /api/invoices/:id
// @access  Private
export const updateInvoice = async (req, res) => {
  try {
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedInvoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.status(200).json({ success: true, data: updatedInvoice, message: "Invoice updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Invoice
// @route   DELETE /api/invoices/:id
// @access  Private
export const deleteInvoice = async (req, res) => {
  try {
    const deletedInvoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!deletedInvoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add to controllers/invoiceController.js
export const sendInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { method, contact, customerName, amount, isProforma, pdfBase64, invoiceNo } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // 🔴 1. If Email -> Send PDF via Nodemailer
    if (method === 'email' && pdfBase64) {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // or your email provider
        auth: {
          user: process.env.EMAIL_USER, 
          pass: process.env.EMAIL_PASS // Gmail App Password
        }
      });

      // Convert Base64 back to PDF Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      const invoiceType = isProforma ? 'Proforma Invoice' : 'Tax Invoice';

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: contact,
        subject: `${invoiceType} ${invoiceNo} from ${req.user.name || 'SkyEdge Taxbucket'}`,
        text: `Hello ${customerName},\n\nPlease find attached your ${invoiceType} (${invoiceNo}) for Rs. ${amount.toLocaleString('en-IN')}.\n\nThank you,\nSkyEdge Taxbucket India Pvt. Ltd.`,
        attachments: [
          {
            filename: `${invoiceNo.replace(/\//g, '-')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
    }

    // 🔴 2. Log the send action in Database
    const sendLog = {
      method,
      contact,
      sentBy: req.user._id,
      sentAt: new Date()
    };

    if (!invoice.sendLogs) invoice.sendLogs = [];
    invoice.sendLogs.push(sendLog);
    await invoice.save();

    res.status(200).json({ 
      success: true, 
      message: `Invoice logged and sent via ${method} successfully.` 
    });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
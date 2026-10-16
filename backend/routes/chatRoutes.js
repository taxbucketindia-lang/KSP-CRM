import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getChatUsers, getConversations, openDirectChat, createGroup, updateGroup, leaveGroup,
  getMessages, sendMessage, markRead, deleteMessage, reactToMessage, getMessageInfo, clearChat, chatUploadToken,
  getFileConfig, uploadLocalFile, getFileStatus
} from '../controllers/chatController.js';
import { MAX_FILE_BYTES } from '../utils/chatFiles.js';

// 🔴 TEAM CHAT: har login kiya hua employee (client nahi) chat kar sakta hai
const router = express.Router();
// Bina login: file storage chalu hai ya nahi (sirf haan/naa)
router.get('/files/status', getFileStatus);
router.use(protect);
// Client login (agar koi ho) ko chat nahi milta
router.use((req, res, next) => (req.user?.role === 'Client' ? res.status(403).json({ message: 'Chat is for the team only' }) : next()));

router.get('/users', getChatUsers);
router.post('/upload', chatUploadToken);
router.get('/files/config', getFileConfig);
// Local file: poori file body me (50 MB tak; zyada = 413)
router.post('/conversations/:id/file', express.raw({ type: () => true, limit: MAX_FILE_BYTES }), uploadLocalFile);
router.get('/conversations', getConversations);
router.post('/conversations/direct', openDirectChat);
router.post('/conversations/group', createGroup);
router.put('/conversations/:id', updateGroup);
router.post('/conversations/:id/leave', leaveGroup);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.post('/conversations/:id/read', markRead);
router.post('/conversations/:id/clear', clearChat);
router.post('/messages/:id/react', reactToMessage);
router.get('/messages/:id/info', getMessageInfo);
router.delete('/messages/:id', deleteMessage);

export default router;

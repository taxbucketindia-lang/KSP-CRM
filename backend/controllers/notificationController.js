import Notification from '../models/Notification.js';

// 1. Logged-in user ki latest notifications (history samet)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
                                            .sort({ createdAt: -1 })
                                            .limit(40);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Ek notification ko read mark karna (sirf apni)
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Saari notifications ek saath read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Padhi hui notifications hata dena (list saaf karna)
export const clearRead = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user._id, isRead: true });
    res.status(200).json({ message: "Read notifications cleared", deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

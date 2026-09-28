import Notification from '../models/Notification.js';

// 1. Get Unread Notifications for Logged-in User
// 1. Get Latest 10 Notifications (History included)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
                                            .sort({ createdAt: -1 })
                                            .limit(10); // Sirf top 10 history
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// 2. Mark Notification as Read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    notification.isRead = true;
    await notification.save();
    
    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
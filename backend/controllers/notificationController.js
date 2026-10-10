import Notification from '../models/Notification.js';

// Har user ke paas sirf sabse naye itne notification rehte hain; usse purane database se apne aap hat jaate hain
const KEEP_LATEST = 20;

// 1. Logged-in user ki latest 20 notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
                                            .sort({ createdAt: -1, _id: -1 })
                                            .limit(KEEP_LATEST);

    // 🔴 AUTO CLEAN: list bhar chuki ho toh 20 se purane (padhe ya bina padhe) database se delete.
    // Sirf 20th se purane hi hatte hain, isliye abhi-abhi aaya naya notification kabhi nahi hatta.
    if (notifications.length === KEEP_LATEST) {
      const oldest = notifications[notifications.length - 1];
      Notification.deleteMany({
        recipient: req.user._id,
        createdAt: { $lte: oldest.createdAt },
        _id: { $nin: notifications.map(n => n._id) }
      }).catch(error => console.error('Notification auto-clean failed:', error.message));
    }

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

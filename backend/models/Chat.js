import mongoose from 'mongoose';

// 🔴 TEAM CHAT (WhatsApp jaisa): CRM ke andar employees aapas me baat karte hain.
// Conversation = ek chat (do log ke beech "direct", ya kai logon ka "group"). Message = us chat ka ek sandesh.

const conversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['direct', 'group'], required: true },
  name: { type: String, default: '', trim: true },              // sirf group ka naam
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // group me naam / log badal sakte hain
  // Do logon ki ek hi direct chat bane: dono IDs chhote se bade kram me jodi hui
  directKey: { type: String },
  // Har member ne aakhri baar kab tak padha (unread ginti aur ✓✓ ke liye)
  reads: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date } }],
  // "Delete chat": is samay se pehle ke message us user ko nahi dikhte (doosron ke liye chat waisi hi rehti hai)
  // at = isse pehle ke message us user ko nahi dikhte; hidden = chat list se bhi chhupi ("New chat" se dobara kholo toh false)
  clears: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date }, hidden: { type: Boolean, default: true } }],
  lastMessage: {
    text: { type: String, default: '' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, default: '' },
    at: { type: Date },
    reaction: { type: String, default: '' } // aakhri kaam reaction tha toh emoji (text = jis message par react kiya)
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

conversationSchema.index({ members: 1, updatedAt: -1 });
conversationSchema.index({ directKey: 1 }, { unique: true, partialFilterExpression: { directKey: { $type: 'string' } } });

const chatMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, default: '' },
  text: { type: String, default: '', maxlength: 4000 }, // file ke saath khali ho sakta hai (caption optional)
  // File (photo / video / PDF): 24 ghante baad storage aur database dono se hat jaati hai
  attachment: {
    url: { type: String },
    pathname: { type: String },
    name: { type: String },
    size: { type: Number },
    contentType: { type: String },
    kind: { type: String, enum: ['image', 'video', 'pdf', 'file'] }
  },
  expiresAt: { type: Date },
  kind: { type: String, enum: ['text', 'system'], default: 'text' }, // system = "X ne group banaya" jaise
  clientId: { type: String },                                         // double send rokne ke liye
  // Emoji reaction: har vyakti ka ek (dobara wahi dabaye toh hat jata hai)
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, name: { type: String, default: '' }, emoji: { type: String } }],
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

chatMessageSchema.index({ conversation: 1, createdAt: -1 });
chatMessageSchema.index({ expiresAt: 1 }, { partialFilterExpression: { expiresAt: { $type: 'date' } } }); // file ki safai
chatMessageSchema.index({ conversation: 1, updatedAt: 1 }); // naye / badle hue (reaction, delete) message
chatMessageSchema.index({ conversation: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });

// Kaun kab chat me dikha tha ("Online" / "last seen" ke liye)
const chatPresenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  seenAt: { type: Date, default: Date.now },
  // Abhi kaunsi chat khol ke dekh raha hai (usi chat ka phone push nahi jata, WhatsApp jaisa)
  viewing: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
  viewingAt: { type: Date, default: null }
});

export const Conversation = mongoose.model('Conversation', conversationSchema);
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export const ChatPresence = mongoose.model('ChatPresence', chatPresenceSchema);

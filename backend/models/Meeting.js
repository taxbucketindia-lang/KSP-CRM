import mongoose from 'mongoose';

// CEO Dashboard ke calendar ki meeting / kaam (har user ka apna)
const meetingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Meeting', 'Call', 'Task', 'Other'], default: 'Meeting' },
  startAt: { type: Date, required: true }, // Meeting ka date + time (pakka instant)
  location: { type: String, default: '' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['Scheduled', 'Done', 'Cancelled'], default: 'Scheduled' },

  // 🔴 REMINDERS: kaunsa reminder ja chuka hai (subah 9:30, 30 min pehle, 10 min pehle)
  reminders: {
    morningSent: { type: Boolean, default: false },
    thirtyMinSent: { type: Boolean, default: false },
    tenMinSent: { type: Boolean, default: false }
  }
}, { timestamps: true });

meetingSchema.index({ userId: 1, startAt: 1 });
meetingSchema.index({ status: 1, startAt: 1 });

export default mongoose.model('Meeting', meetingSchema);

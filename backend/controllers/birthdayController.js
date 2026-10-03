import ClientMaster from '../models/ClientMaster.js';
import BirthdayLog from '../models/BirthdayLog.js';
import BirthdayTemplate from '../models/BirthdayTemplate.js';

// 1. Get Birthday Dashboard Stats & Client List
export const getBirthdayDashboard = async (req, res) => {
    try {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();
        const currentYear = today.getFullYear();

        const allClients = await ClientMaster.find({ status: 'Active' }).populate('assignedRM', 'name');
        const currentYearLogs = await BirthdayLog.find({ birthdayYear: currentYear });

        let stats = { today: 0, upcoming7Days: 0, thisMonth: 0, wishSent: 0, pending: 0, failed: 0, dobMissing: 0 };
        let clientsList = [];

        // 7 Days boundary
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);

        allClients.forEach(client => {
            if (!client.dob) {
                stats.dobMissing++;
                return;
            }

            const dob = new Date(client.dob);
            const dobMonth = dob.getMonth();
            const dobDate = dob.getDate();

            let birthdayStatus = 'Upcoming';
            const isToday = (dobMonth === currentMonth && dobDate === currentDate);
            
            if (dobMonth === currentMonth) stats.thisMonth++;

            // Create pseudo date for current year to check next 7 days
            const birthdayThisYear = new Date(currentYear, dobMonth, dobDate);
            if (birthdayThisYear >= today && birthdayThisYear <= next7Days) {
                stats.upcoming7Days++;
            }

            if (isToday) {
                stats.today++;
                birthdayStatus = 'Today';
            } else if (birthdayThisYear < today) {
                birthdayStatus = 'Passed';
            }

            // Client ko list mein push karo
            clientsList.push({
                _id: client._id,
                clientId: client.clientId,
                name: client.name,
                contactPerson: client.contactPerson,
                dob: client.dob,
                mobile: client.mobile,
                email: client.email,
                clientType: client.clientType,
                assignedRM: client.assignedRM?.name || 'Unassigned',
                birthdayStatus,
                consent: client.birthdayWishConsent
            });
        });

        // Logs Stats Calculation
        stats.wishSent = currentYearLogs.filter(l => l.status === 'Sent' || l.status === 'Delivered').length;
        stats.failed = currentYearLogs.filter(l => l.status === 'Failed').length;
        stats.pending = stats.today - (stats.wishSent + stats.failed);

        res.status(200).json({ stats, clientsList, logs: currentYearLogs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Manual Send Wish API
export const sendManualWish = async (req, res) => {
    try {
        const { clientId, channel, message } = req.body;
        const currentYear = new Date().getFullYear();

        // Yahan aapka WhatsApp/Email integration code aayega 
        // Example: await sendWhatsappMessage(client.mobile, message);
        
        const newLog = await BirthdayLog.create({
            client: clientId,
            birthdayYear: currentYear,
            channel: channel,
            triggeredBy: req.user._id,
            status: 'Sent',
            sentAt: new Date()
        });

        res.status(200).json({ message: 'Wish sent successfully manually!', log: newLog });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
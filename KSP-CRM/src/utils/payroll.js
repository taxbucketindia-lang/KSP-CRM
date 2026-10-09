// 🔴 PAYROLL RULES (Attendance page aur Salary page dono isi file se calculate karte hain)
//  1. Salary pure calendar month (28/29/30/31 din) par banti hai. Sunday aur company holiday paid hain.
//  2. Joining wale month se har month 1 paid leave milti hai. Leave ya Absent lagte hi woh use ho jaati hai;
//     use na ho toh agle month carry forward hoti hai (month finalize ho ya na ho).
//  3. Shift time se 1 minute bhi late = late mark. Month ke pehle 3 late maaf, 4th late se har late par half day.
//  4. Sandwich rule: off day (Sunday / holiday) ke dono taraf absent / leave ho toh beech ka off bhi cut hota hai,
//     aur un dono taraf ke dino par paid leave nahi lagti (Sat + Sun + Mon = poore 3 din cut).
import { HOLIDAY_DATES } from './holidays';

export const FREE_LATES = 3;
export const MONTHLY_PAID_LEAVE = 1;

const ABSENT_LIKE = ['Absent', 'Leave', 'Not Marked'];
const OFF_LIKE = ['Weekly Off', 'Holiday'];

const toMinutes = (timeStr) => {
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  const lower = timeStr.toLowerCase();
  if (lower.includes('pm') && h < 12) h += 12;
  if (lower.includes('am') && h === 12) h = 0;
  return (h * 60) + m;
};

export const isLateEntry = (inTime, shiftStartTime) => {
  if (!inTime || !shiftStartTime) return false;
  return toMinutes(inTime) > toMinutes(shiftStartTime);
};

// 'YYYY-MM-DD' (DB ki ISO date string ya Date object dono chalenge)
export const dateKey = (d) => {
  if (!d) return '';
  return typeof d === 'string' ? d.substring(0, 10) : new Date(d).toISOString().substring(0, 10);
};

export const localTodayKey = () => {
  const offset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - offset).toISOString().substring(0, 10);
};

const addDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().substring(0, 10);
};

const isSunday = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
};

// Ek employee ke ek month ki attendance ka poora hisaab.
// records = us employee ki attendance rows (dusre months ki bhi de sakte ho, sandwich rule month ke kinare par unhe dekhta hai)
export const computeMonthAttendance = ({
  monthStr, records = [], shiftStartTime = '09:30',
  joiningDate, lastWorkingDate, todayKey = localTodayKey(), holidays = HOLIDAY_DATES
}) => {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const joinKey = dateKey(joiningDate);
  const exitKey = dateKey(lastWorkingDate);

  const recByDate = {};
  records.forEach(r => { if (r?.date && r.status) recByDate[dateKey(r.date)] = r; });

  // Kisi bhi date ka final status (jo mark nahi hai uska bhi)
  const resolve = (key) => {
    const rec = recByDate[key];
    if (rec) return rec.status;
    if (joinKey && key < joinKey) return 'Not Employed';
    if (exitKey && key > exitKey) return 'Not Employed';
    if (holidays.includes(key)) return 'Holiday';
    if (isSunday(key)) return 'Weekly Off';
    if (key >= todayKey) return 'Upcoming'; // aane wale din abhi cut nahi honge
    return 'Not Marked';
  };

  const monthKeys = [];
  for (let d = 1; d <= daysInMonth; d++) monthKeys.push(`${monthStr}-${String(d).padStart(2, '0')}`);

  const result = {
    daysInMonth,
    present: 0, wfh: 0, halfDay: 0, autoHalfDay: 0, absent: 0, leave: 0,
    holiday: 0, weeklyOff: 0, notMarked: 0, notEmployed: 0, upcoming: 0,
    lateDays: [], totalLates: 0, sandwichLopDays: 0, sandwichDates: [], sandwichEdgeDays: 0
  };

  monthKeys.forEach(key => {
    const status = resolve(key);
    const rec = recByDate[key];

    if (status === 'Present') result.present++;
    else if (status === 'WFH') result.wfh++;
    else if (status === 'Half Day') {
      // Late ki wajah se laga Auto-Half Day late rule me ginte hain, yahan dobara nahi
      if (rec?.remarks?.includes('Auto-Half Day')) result.autoHalfDay++;
      else result.halfDay++;
    }
    else if (status === 'Absent') result.absent++;
    else if (status === 'Leave') result.leave++;
    else if (status === 'Holiday') result.holiday++;
    else if (status === 'Weekly Off') result.weeklyOff++;
    else if (status === 'Not Employed') result.notEmployed++;
    else if (status === 'Upcoming') result.upcoming++;
    else result.notMarked++;

    if (rec && ['Present', 'WFH', 'Half Day'].includes(status) && isLateEntry(rec.inTime, shiftStartTime)) {
      result.lateDays.push({ date: key, realHalfDay: status === 'Half Day' && !rec.remarks?.includes('Auto-Half Day') });
    }
  });
  result.totalLates = result.lateDays.length;

  // 🔴 SANDWICH RULE: lagataar off days ka block, jiske dono taraf absent / leave ho
  const sandwichEdges = new Set();
  let i = 0;
  while (i < monthKeys.length) {
    if (!OFF_LIKE.includes(resolve(monthKeys[i]))) { i++; continue; }

    let j = i;
    while (j + 1 < monthKeys.length && OFF_LIKE.includes(resolve(monthKeys[j + 1]))) j++;

    // Block month ke bahar tak faila ho sakta hai (jaise 1 tareekh ka Sunday)
    let before = addDays(monthKeys[i], -1);
    for (let guard = 0; guard < 10 && OFF_LIKE.includes(resolve(before)); guard++) before = addDays(before, -1);
    let after = addDays(monthKeys[j], 1);
    for (let guard = 0; guard < 10 && OFF_LIKE.includes(resolve(after)); guard++) after = addDays(after, 1);

    if (ABSENT_LIKE.includes(resolve(before)) && ABSENT_LIKE.includes(resolve(after))) {
      for (let k = i; k <= j; k++) result.sandwichDates.push(monthKeys[k]);
      // Sandwich banane wale Absent / Leave din (is month ke) paid leave se cover nahi honge
      [before, after].forEach(key => {
        if (key.startsWith(monthStr) && ['Absent', 'Leave'].includes(resolve(key))) sandwichEdges.add(key);
      });
    }
    i = j + 1;
  }
  result.sandwichLopDays = result.sandwichDates.length;
  result.sandwichEdgeDays = sandwichEdges.size;

  return result;
};

// Attendance ke hisaab se paid days, LOP aur leave balance
// openingLeaves = pichla carry forward + is month ki 1 paid leave
export const computePay = ({ att, gross = 0, openingLeaves = MONTHLY_PAID_LEAVE, latesForgiven = 0 }) => {
  // Leave aur Absent dono par paid leave lagti hai (sandwich wale dino ko chhod kar)
  const leaveLikeDays = att.leave + att.absent;
  const eligibleDays = Math.max(0, leaveLikeDays - att.sandwichEdgeDays);
  const paidLeavesGranted = Math.min(openingLeaves, eligibleDays);
  const unpaidLeaves = leaveLikeDays - paidLeavesGranted;
  const closingLeaves = openingLeaves - paidLeavesGranted;

  const allowedLates = FREE_LATES + (Number(latesForgiven) || 0);
  const penalized = att.lateDays.slice(allowedLates);
  // Jis din pehle se Half Day laga hai us din late ka alag half day nahi katega
  const latePenaltyDays = penalized.filter(l => !l.realHalfDay).length * 0.5;

  const rawLop = att.notMarked + att.notEmployed + unpaidLeaves
    + (att.halfDay * 0.5) + latePenaltyDays + att.sandwichLopDays;
  const lopDays = Math.min(att.daysInMonth, rawLop);
  const paidDays = att.daysInMonth - lopDays;
  const lopDeduction = Math.round((gross / att.daysInMonth) * lopDays) || 0;

  return {
    paidLeavesGranted, unpaidLeaves, closingLeaves,
    penalizedLates: penalized.length, latePenaltyDays,
    lopDays, paidDays, lopDeduction
  };
};

const monthOf = (d) => dateKey(d).substring(0, 7);

const nextMonth = (monthStr) => {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().substring(0, 7);
};

// 🔴 LEAVE LEDGER: kisi month ke shuru me employee ke paas kitni paid leave hain (carry forward + is month ki 1)
// Hisaab joining / add hone wale month se har month attendance dekh kar chalta hai, isliye month finalize na bhi
// hua ho toh leave judti rahti hai. Beech me agar koi pakka "anchor" mile toh wahin se aage ginte hain:
//   - naye format me save hua salary month (jisme closingLeaves likha hai), ya
//   - Employee Master ka paidLeaveBalance jab uske saath `leaveBalanceAsOf` month bhi ho.
// Purane system ke salary records (bina closingLeaves) aur unka chhoda hua balance bharose ke nahi hain, unhe ignore karte hain.
//   emp      = Employee record (paidLeaveBalance, leaveBalanceAsOf, joiningDate, createdAt, shiftStartTime...)
//   records  = us employee ki saari attendance
//   salaries = us employee ke saare saved salary records
export const computeOpeningLeaves = ({ emp, records = [], salaries = [], monthStr, todayKey = localTodayKey() }) => {
  const base = Number(emp?.paidLeaveBalance || 0);
  const isOffboarded = ['Resigned', 'Terminated', 'Absconded'].includes(emp?.status);

  const monthAttendance = (m) => computeMonthAttendance({
    monthStr: m, records, todayKey,
    shiftStartTime: emp?.shiftStartTime || '09:30',
    joiningDate: emp?.joiningDate,
    lastWorkingDate: isOffboarded ? emp?.lastWorkingDate : null
  });

  const trusted = salaries
    .filter(s => s.monthYear && typeof s.attendanceSummary?.closingLeaves === 'number')
    .sort((a, b) => b.monthYear.localeCompare(a.monthYear)); // naya month pehle
  const hasLegacyRecords = salaries.some(s => typeof s.attendanceSummary?.closingLeaves !== 'number');

  let balance = null;
  let from = null;

  // 1. Yeh month khud naye format me save hai aur uske baad balance haath se nahi badla gaya
  const own = trusted.find(s => s.monthYear === monthStr);
  if (own && typeof own.attendanceSummary.openingLeaves === 'number' && !(emp?.leaveBalanceAsOf && emp.leaveBalanceAsOf < monthStr)) {
    return own.attendanceSummary.openingLeaves;
  }

  // 2. Anchor: Employee Master ka balance (asOf ke saath) ya isse pehle ka naya-format salary month, jo bhi baad ka ho
  const previous = trusted.find(s => s.monthYear < monthStr);
  const asOf = emp?.leaveBalanceAsOf && emp.leaveBalanceAsOf < monthStr ? emp.leaveBalanceAsOf : null;
  if (asOf && (!previous || asOf >= previous.monthYear)) {
    balance = base;
    from = nextMonth(asOf);
  } else if (previous) {
    balance = previous.attendanceSummary.closingLeaves;
    from = nextMonth(previous.monthYear);
  } else {
    // 3. Koi anchor nahi: jis month employee join / add hua wahin se shuru
    // (purane finalize ne paidLeaveBalance badal diya tha, isliye tab use opening balance nahi maante)
    balance = hasLegacyRecords || emp?.leaveBalanceAsOf ? 0 : base;
    const startMonth = [monthOf(emp?.joiningDate), monthOf(emp?.createdAt)].filter(Boolean).sort().pop();
    from = startMonth && startMonth < monthStr ? startMonth : monthStr;
  }

  for (let m = from, guard = 0; m < monthStr && guard < 240; m = nextMonth(m), guard++) {
    balance = computePay({ att: monthAttendance(m), openingLeaves: balance + MONTHLY_PAID_LEAVE }).closingLeaves;
  }
  return balance + MONTHLY_PAID_LEAVE;
};

// Kisi month ka leave status: total, use hui, aur bachi hui
export const computeLeaveStatus = ({ emp, records = [], salaries = [], monthStr, todayKey = localTodayKey() }) => {
  const isOffboarded = ['Resigned', 'Terminated', 'Absconded'].includes(emp?.status);
  const openingLeaves = computeOpeningLeaves({ emp, records, salaries, monthStr, todayKey });
  const att = computeMonthAttendance({
    monthStr, records, todayKey,
    shiftStartTime: emp?.shiftStartTime || '09:30',
    joiningDate: emp?.joiningDate,
    lastWorkingDate: isOffboarded ? emp?.lastWorkingDate : null
  });
  const pay = computePay({ att, openingLeaves });
  return { openingLeaves, used: pay.paidLeavesGranted, remaining: pay.closingLeaves };
};

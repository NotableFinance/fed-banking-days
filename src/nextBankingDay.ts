/*
Federal Reserve Bank Holidays:

https://www.federalreserve.gov/aboutthefed/k8.htm

> For holidays falling on Saturday, Federal Reserve Banks and Branches will be
> open the preceding Friday; however, the Board of Governors will be closed.
> For holidays falling on Sunday, all Federal Reserve offices will be closed the
> following Monday.

Packages like @date/holiday unfortunately assume holidays on Saturday will be
observed on the preceding Friday, as is standard procedure for Federal employees
(https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/), so we
need a different implementation.

nextBankingDay is anchored to US Eastern (America/New_York) timezone, and the
result will always be start of business in that timezone (9am).

*/

import memoize = require('lodash/memoize');

const ONE_HOUR_MS = 1000 * 60 * 60;
const ONE_DAY_MS = ONE_HOUR_MS * 24;

/* Holiday definition */

type Def = number | [number, number];
type Holidays = { [key: string]: [number, Def] }

// Can be either exact month–date pair ([month,date]) or some Nth day of week
// of month ([month,[0-indexed-day-of-week, n]]). Months 1-indexed to match reality.
const HOLIDAYS: Holidays = {
  "New Year's Day": [1,1],
  "Birthday of Martin Luther King Jr.": [1,[1,3]], // 3rd Monday in January
  "Washington's Birthday/Presidents' Day": [2,[1,3]], // 3rd Monday in February
  "Memorial Day": [5,[1,-1]], // Last Monday in May
  "Juneteenth National Independence Day": [6,19],
  "Independence Day": [7,4],
  "Labor Day": [9,[1,1]], // First Monday in September
  "Columbus Day/Indigenous People's Day": [10,[1,2]], // 2nd Monday in October
  "Veteran's Day": [11,11],
  "Thanksgiving Day": [11,[4,4]], // 4th Thursday in November
  "Christmas Day": [12,25],
};

const HOLIDAYS_BY_MONTH: { [k: number]: Array<{ def: Def, name: string }> } = {};
Object.entries(HOLIDAYS).forEach(([name, def]) => {
  const m = def[0];
  const d = def[1];
  if (!HOLIDAYS_BY_MONTH[m]) {
    HOLIDAYS_BY_MONTH[m] = [];
  }
  HOLIDAYS_BY_MONTH[m].push({ def: d, name });
});


// Note that this does not work for dates prior to 2007 since the rules
// were different.
const DST_START: [number, [number, number]] = [3,[0,2]]; // 2nd Sunday in March
const DST_END: [number, [number, number]] = [11,[0,1]]; // 1st Sunday in November

const BUSINESS_HOURS = [9,17]; // In "business-local tz" (Eastern)

// These get the DST start and end for US Eastern TZ
export function getDSTStart (year: number) {
  const d = getNthDayOfMonth(year, DST_START[0] - 1, DST_START[1][0], DST_START[1][1]);
  return new Date(`${ d.toISOString().split('T')[0] }T02:00:00-0400`);
}
export function getDSTEnd (year: number) {
  const d = getNthDayOfMonth(year, DST_END[0] - 1, DST_END[1][0], DST_END[1][1]);
  return new Date(`${ d.toISOString().split('T')[0] }T02:00:00-0500`);
}

function datesAreTheSame (a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate()
  );
}

function getNthDayOfMonth (year: number, month: number, dayOfWeek: number, nth: number) {
  // Operates at 1200 hours UTC to avoid DST issues for the US
  let nthAsDate = new Date(year, month, 1, 12, 0, 0, 0);
  if (nth > 0) { // Relative to start of month
    // Walk forward until we reach the correct day of the week
    while (nthAsDate.getUTCDay() !== dayOfWeek) {
      nthAsDate = new Date(nthAsDate.getTime() + ONE_DAY_MS);
    }
    if (nth > 1) {
      // Walk forward a number of weeks to get the nth
      nthAsDate = new Date(nthAsDate.getTime() + ONE_DAY_MS * 7 * (nth - 1));
    }
  } else { // Relative to end of month
    // Change start to end of month (go forward 1 month then back 1 day)
    nthAsDate.setMonth(month + 1); // Will roll over the year if `month` is 11 (December)
    nthAsDate.setDate(0); // Will roll month back
    // Walk backward until we reach the correct day of the week
    while (nthAsDate.getUTCDay() !== dayOfWeek) {
      nthAsDate = new Date(nthAsDate.getTime() - ONE_DAY_MS);
    }
    // Walk backward a number of weeks to get the nth
    if (nth < -1) {
      nthAsDate = new Date(nthAsDate.getTime() - ONE_DAY_MS * 7 * (Math.abs(nth) - 1));
    }
  }
  return nthAsDate;
}

export function checkIfFedBankHoliday (date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay();

  if (HOLIDAYS_BY_MONTH[month + 1]) {
    for (let holidayDef of HOLIDAYS_BY_MONTH[month + 1]) {

      if (Array.isArray(holidayDef.def)) {
        const holidayDefDayOfWeek = holidayDef.def[0];
        const holidayDefNth = holidayDef.def[1];
        // Dynamic holiday, the nth day of week in the month (note the ones the
        // Fed observes are always on weekdays)
        if (dayOfWeek === holidayDefDayOfWeek) { // Quick check to see if it's worth computing the actual date
          const holiday = getNthDayOfMonth(year, month, holidayDefDayOfWeek, holidayDefNth);
          if (datesAreTheSame(holiday, date)) {
            return holidayDef.name;
          }
        }

      } else if (holidayDef.def === dayOfMonth) {
        // Static holiday during week exact match
        // (assumes the weekday constraint in nextBankingDay)
        return holidayDef.name;

      } else {
        // Static holiday lands on Sunday, observed Monday
        let holiday = new Date(year, month, holidayDef.def);
        if (holiday.getDay() === 0) {
          holiday = new Date(holiday.getTime() + ONE_DAY_MS);
        }
        if (datesAreTheSame(holiday, date)) {
          return holidayDef.name;
        }
      }
    }
  }
  return false;
}

function checkIfWeekday (date: Date) {
  const dayOfWeek = date.getDay();
  return dayOfWeek > 0 && dayOfWeek < 6;
}

export function checkIfBankingDay (date: Date) {
  let holiday;
  const isWeekday = checkIfWeekday(date);
  if (isWeekday) {
    holiday = checkIfFedBankHoliday(date);
  }
  return [
    isWeekday && !holiday,
    holiday,
  ];
}

export function isBankingDay (date: Date) {
  return checkIfBankingDay(date)[0];
}

function isDSTActive (date: Date) {
  const localYear = date.getFullYear();
  const dstStartThisYear = getDSTStartMemoized(localYear);
  const dstEndThisYear = getDSTEndMemoized(localYear);
  if (date.getTime() >= dstStartThisYear.getTime()) {
    if (date.getTime() < dstEndThisYear.getTime()) { // DST end does not include DST
      // In DST
      return true;
    } else {
      // After DST
      return false;
    }
  } else {
     // Before DST
    return false;
  }
}

function _pad (n: number) {
  if (n < 10) {
    return `0${ n }`;
  }
  return n.toString();
}

// Don't expect to be checking the DST for more than a couple years in a given
// memory session so this should not be a memory leak.
const getDSTStartMemoized = memoize(getDSTStart);
const getDSTEndMemoized = memoize(getDSTEnd);

// Count is the minimum number of business days to advance
export default function nextBankingDay (date: Date, count=1) {

  const localYear = date.getFullYear(); // Okay if near a year boundary because DST changes are months away
  const localMonth = date.getMonth();
  const localDate = date.getDate();

  // Anchor business hours to EST or EDT
  let businessTZOffset = -5;
  if (isDSTActive(date)) {
    businessTZOffset = -4;
  }

  // Calculate the end of the business hours for that day
  const businessEnd = new Date(`${ localYear }-${ _pad(localMonth + 1) }-${ _pad(localDate) }T${ BUSINESS_HOURS[1] }:00:00-0${ Math.abs(businessTZOffset) }:00`);
  let startingMS = date.getTime();
  let businessEndMS = businessEnd.getTime();

  // If start is after end of business hours that day, move it to the start of
  // business the next day (+ 16 hours), otherwise move it to start of business
  // today. (Ignores weekday vs weekend because that will be accounted for
  // later.) Aligning the reference date to start of business hours avoids
  // needing to account for its TZ offset later when comparing.
  if (startingMS > businessEndMS) {
    startingMS = businessEndMS + ONE_HOUR_MS * 16;
  } else {
    startingMS = businessEndMS - ONE_HOUR_MS * 8;
  }

  let next: Date,
   upcomingHoliday;
  let numCalendarDaysToAdvance = 1;
  let numBankDaysFound = 0;
  while (numBankDaysFound < count) {
    // Walk forward one day at a time until an eligible day is found.
    next = new Date(startingMS + numCalendarDaysToAdvance * ONE_DAY_MS);
    const [isBankDay, matchedHoliday] = checkIfBankingDay(next);
    if (isBankDay) {
      numBankDaysFound += 1;
    } else if (matchedHoliday) {
      // Capture the last crossed holiday for feedback to the user.
      upcomingHoliday = matchedHoliday;
    }
    numCalendarDaysToAdvance += 1;
  }

  // Adjust the resulting date by one hour if it crossed a DST boundary,
  // either forward or backward depending on which boundary it crossed, so that
  // it is 9am ET.
  const nextInDST = isDSTActive(next!);
  if (businessTZOffset === -5 && nextInDST) {
    next = new Date(next!.getTime() - ONE_HOUR_MS);
  } else if (businessTZOffset === -4 && !nextInDST) {
    next = new Date(next!.getTime() + ONE_HOUR_MS);
  }

  return [next!, upcomingHoliday] as [Date, string | true | undefined];
}

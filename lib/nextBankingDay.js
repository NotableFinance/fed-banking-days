"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBankingDay = exports.checkIfBankingDay = exports.checkIfFedBankHoliday = exports.getDSTEnd = exports.getDSTStart = void 0;
const memoize = require("lodash/memoize");
const ONE_HOUR_MS = 1000 * 60 * 60;
const ONE_DAY_MS = ONE_HOUR_MS * 24;
const HOLIDAYS = {
    "New Year's Day": [1, 1],
    "Birthday of Martin Luther King Jr.": [1, [1, 3]],
    "Washington's Birthday/Presidents' Day": [2, [1, 3]],
    "Memorial Day": [5, [1, -1]],
    "Juneteenth National Independence Day": [6, 19],
    "Independence Day": [7, 4],
    "Labor Day": [9, [1, 1]],
    "Columbus Day/Indigenous People's Day": [10, [1, 2]],
    "Veteran's Day": [11, 11],
    "Thanksgiving Day": [11, [4, 4]],
    "Christmas Day": [12, 25],
};
const HOLIDAYS_BY_MONTH = {};
Object.entries(HOLIDAYS).forEach(([name, def]) => {
    const m = def[0];
    const d = def[1];
    if (!HOLIDAYS_BY_MONTH[m]) {
        HOLIDAYS_BY_MONTH[m] = [];
    }
    HOLIDAYS_BY_MONTH[m].push({ def: d, name });
});
const DST_START = [3, [0, 2]];
const DST_END = [11, [0, 1]];
const BUSINESS_HOURS = [9, 17];
function getDSTStart(year) {
    const d = getNthDayOfMonth(year, DST_START[0] - 1, DST_START[1][0], DST_START[1][1]);
    return new Date(`${d.toISOString().split('T')[0]}T02:00:00-0400`);
}
exports.getDSTStart = getDSTStart;
function getDSTEnd(year) {
    const d = getNthDayOfMonth(year, DST_END[0] - 1, DST_END[1][0], DST_END[1][1]);
    return new Date(`${d.toISOString().split('T')[0]}T02:00:00-0500`);
}
exports.getDSTEnd = getDSTEnd;
function datesAreTheSame(a, b) {
    return (a.getUTCFullYear() === b.getUTCFullYear()
        && a.getUTCMonth() === b.getUTCMonth()
        && a.getUTCDate() === b.getUTCDate());
}
function getNthDayOfMonth(year, month, dayOfWeek, nth) {
    let nthAsDate = new Date(year, month, 1, 12, 0, 0, 0);
    if (nth > 0) {
        while (nthAsDate.getUTCDay() !== dayOfWeek) {
            nthAsDate = new Date(nthAsDate.getTime() + ONE_DAY_MS);
        }
        if (nth > 1) {
            nthAsDate = new Date(nthAsDate.getTime() + ONE_DAY_MS * 7 * (nth - 1));
        }
    }
    else {
        nthAsDate.setMonth(month + 1);
        nthAsDate.setDate(0);
        while (nthAsDate.getUTCDay() !== dayOfWeek) {
            nthAsDate = new Date(nthAsDate.getTime() - ONE_DAY_MS);
        }
        if (nth < -1) {
            nthAsDate = new Date(nthAsDate.getTime() - ONE_DAY_MS * 7 * (Math.abs(nth) - 1));
        }
    }
    return nthAsDate;
}
function checkIfFedBankHoliday(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();
    if (HOLIDAYS_BY_MONTH[month + 1]) {
        for (let holidayDef of HOLIDAYS_BY_MONTH[month + 1]) {
            if (Array.isArray(holidayDef.def)) {
                const holidayDefDayOfWeek = holidayDef.def[0];
                const holidayDefNth = holidayDef.def[1];
                if (dayOfWeek === holidayDefDayOfWeek) {
                    const holiday = getNthDayOfMonth(year, month, holidayDefDayOfWeek, holidayDefNth);
                    if (datesAreTheSame(holiday, date)) {
                        return holidayDef.name;
                    }
                }
            }
            else if (holidayDef.def === dayOfMonth) {
                return holidayDef.name;
            }
            else {
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
exports.checkIfFedBankHoliday = checkIfFedBankHoliday;
function checkIfWeekday(date) {
    const dayOfWeek = date.getDay();
    return dayOfWeek > 0 && dayOfWeek < 6;
}
function checkIfBankingDay(date) {
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
exports.checkIfBankingDay = checkIfBankingDay;
function isBankingDay(date) {
    return checkIfBankingDay(date)[0];
}
exports.isBankingDay = isBankingDay;
function isDSTActive(date) {
    const localYear = date.getFullYear();
    const dstStartThisYear = getDSTStartMemoized(localYear);
    const dstEndThisYear = getDSTEndMemoized(localYear);
    if (date.getTime() >= dstStartThisYear.getTime()) {
        if (date.getTime() < dstEndThisYear.getTime()) {
            return true;
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
}
function _pad(n) {
    if (n < 10) {
        return `0${n}`;
    }
    return n.toString();
}
const getDSTStartMemoized = memoize(getDSTStart);
const getDSTEndMemoized = memoize(getDSTEnd);
function nextBankingDay(date, count = 1, options = {}) {
    const { useBusinessHours = true } = options;
    const localYear = date.getFullYear();
    const localMonth = date.getMonth();
    const localDate = date.getDate();
    let businessTZOffset = -5;
    if (isDSTActive(date)) {
        businessTZOffset = -4;
    }
    const businessEnd = new Date(`${localYear}-${_pad(localMonth + 1)}-${_pad(localDate)}T${BUSINESS_HOURS[1]}:00:00-0${Math.abs(businessTZOffset)}:00`);
    let startingMS = date.getTime();
    let businessEndMS = businessEnd.getTime();
    if (useBusinessHours && startingMS > businessEndMS) {
        startingMS = businessEndMS + ONE_HOUR_MS * 16;
    }
    else {
        startingMS = businessEndMS - ONE_HOUR_MS * 8;
    }
    let next, upcomingHoliday;
    let numCalendarDaysToAdvance = 1;
    let numBankDaysFound = 0;
    while (numBankDaysFound < count) {
        next = new Date(startingMS + numCalendarDaysToAdvance * ONE_DAY_MS);
        const [isBankDay, matchedHoliday] = checkIfBankingDay(next);
        if (isBankDay) {
            numBankDaysFound += 1;
        }
        else if (matchedHoliday) {
            upcomingHoliday = matchedHoliday;
        }
        numCalendarDaysToAdvance += 1;
    }
    const nextInDST = isDSTActive(next);
    if (businessTZOffset === -5 && nextInDST) {
        next = new Date(next.getTime() - ONE_HOUR_MS);
    }
    else if (businessTZOffset === -4 && !nextInDST) {
        next = new Date(next.getTime() + ONE_HOUR_MS);
    }
    return [next, upcomingHoliday];
}
exports.default = nextBankingDay;

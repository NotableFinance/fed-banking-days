"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDSTStart = getDSTStart;
exports.getDSTEnd = getDSTEnd;
exports.checkIfFedBankHoliday = checkIfFedBankHoliday;
exports.checkIfBankingDay = checkIfBankingDay;
exports.isBankingDay = isBankingDay;
exports.default = nextBankingDay;
const ONE_HOUR_MS = 1000 * 60 * 60;
const ONE_DAY_MS = ONE_HOUR_MS * 24;
const HOLIDAYS = {
    "New Year’s Day": [1, 1],
    "Birthday of Martin Luther King, Jr.": [1, [1, 3]],
    "Washington’s Birthday": [2, [1, 3]],
    "Memorial Day": [5, [1, -1]],
    "Juneteenth National Independence Day": [6, 19],
    "Independence Day": [7, 4],
    "Labor Day": [9, [1, 1]],
    "Indigenous People’s Day": [10, [1, 2]],
    "Veterans Day": [11, 11],
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
function getDSTEnd(year) {
    const d = getNthDayOfMonth(year, DST_END[0] - 1, DST_END[1][0], DST_END[1][1]);
    return new Date(`${d.toISOString().split('T')[0]}T02:00:00-0500`);
}
function getNthDayOfMonth(year, month, dayOfWeek, nth) {
    let nth_as_date = new Date(year, month, 1, 12, 0, 0, 0);
    if (nth > 0) {
        while (nth_as_date.getUTCDay() !== dayOfWeek) {
            nth_as_date = new Date(nth_as_date.getTime() + ONE_DAY_MS);
        }
        if (nth > 1) {
            nth_as_date = new Date(nth_as_date.getTime() + ONE_DAY_MS * 7 * (nth - 1));
        }
    }
    else {
        nth_as_date.setMonth(month + 1);
        nth_as_date.setDate(0);
        while (nth_as_date.getUTCDay() !== dayOfWeek) {
            nth_as_date = new Date(nth_as_date.getTime() - ONE_DAY_MS);
        }
        if (nth < -1) {
            nth_as_date = new Date(nth_as_date.getTime() - ONE_DAY_MS * 7 * (Math.abs(nth) - 1));
        }
    }
    return nth_as_date;
}
function checkIfFedBankHoliday(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day_of_month = date.getDate();
    const day_of_week = date.getDay();
    if (HOLIDAYS_BY_MONTH[month + 1]) {
        for (const holiday_def of HOLIDAYS_BY_MONTH[month + 1]) {
            if (Array.isArray(holiday_def.def)) {
                const holiday_def_day_of_week = holiday_def.def[0];
                const holiday_def_nth = holiday_def.def[1];
                if (day_of_week === holiday_def_day_of_week) {
                    const holiday = getNthDayOfMonth(year, month, holiday_def_day_of_week, holiday_def_nth);
                    if (datesAreTheSame(holiday, date)) {
                        return holiday_def.name;
                    }
                }
            }
            else if (holiday_def.def === day_of_month) {
                return holiday_def.name;
            }
            else {
                let holiday = new Date(year, month, holiday_def.def);
                if (holiday.getDay() === 0) {
                    holiday = new Date(holiday.getTime() + ONE_DAY_MS);
                }
                if (datesAreTheSame(holiday, date)) {
                    return holiday_def.name;
                }
            }
        }
    }
    return null;
}
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
    if (isWeekday && !holiday) {
        return [true, null];
    }
    return [false, holiday];
}
function isBankingDay(date) {
    return checkIfBankingDay(date)[0];
}
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
const getDSTStartMemoized = _simpleMemoize(getDSTStart);
const getDSTEndMemoized = _simpleMemoize(getDSTEnd);
function nextBankingDay(from_date, count = 1, options = {}) {
    let use_business_hours = true;
    if (options.use_business_hours !== undefined) {
        use_business_hours = options.use_business_hours;
    }
    else if (options.useBusinessHours !== undefined) {
        use_business_hours = options.useBusinessHours;
    }
    const local_year = from_date.getFullYear();
    const local_month = from_date.getMonth();
    const local_date = from_date.getDate();
    let business_tz_offset = -5;
    if (isDSTActive(from_date)) {
        business_tz_offset = -4;
    }
    const business_end = new Date(`${local_year}-${_pad1(local_month + 1)}-${_pad1(local_date)}T${BUSINESS_HOURS[1]}:00:00-0${Math.abs(business_tz_offset)}:00`);
    let starting_ms = from_date.getTime();
    let business_end_ms = business_end.getTime();
    if (use_business_hours && starting_ms > business_end_ms) {
        starting_ms = business_end_ms + ONE_HOUR_MS * 16;
    }
    else {
        starting_ms = business_end_ms - ONE_HOUR_MS * 8;
    }
    let next;
    let upcoming_holiday;
    let num_calendar_days_to_advance = 1;
    let num_bank_days_found = 0;
    while (num_bank_days_found < count) {
        next = new Date(starting_ms + num_calendar_days_to_advance * ONE_DAY_MS);
        const [isBankDay, matchedHoliday] = checkIfBankingDay(next);
        if (isBankDay) {
            num_bank_days_found += 1;
        }
        else if (matchedHoliday) {
            upcoming_holiday = matchedHoliday;
        }
        num_calendar_days_to_advance += 1;
    }
    const next_in_DST = isDSTActive(next);
    if (business_tz_offset === -5 && next_in_DST) {
        next = new Date(next.getTime() - ONE_HOUR_MS);
    }
    else if (business_tz_offset === -4 && !next_in_DST) {
        next = new Date(next.getTime() + ONE_HOUR_MS);
    }
    return [next, upcoming_holiday];
}
function datesAreTheSame(a, b) {
    return (a.getUTCFullYear() === b.getUTCFullYear()
        && a.getUTCMonth() === b.getUTCMonth()
        && a.getUTCDate() === b.getUTCDate());
}
function _pad1(n) {
    if (n < 10) {
        return `0${n}`;
    }
    return n.toString();
}
function _simpleMemoize(fn) {
    const cache = new Map();
    return function (arg) {
        if (cache.has(arg)) {
            return cache.get(arg);
        }
        const result = fn(arg);
        cache.set(arg, result);
        return result;
    };
}

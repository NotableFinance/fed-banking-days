
import nextBankingDay, { checkIfFedBankHoliday, getDSTStart, getDSTEnd, isBankingDay } from '../lib/nextBankingDay';

const RECENT_DSTS: Array<[ number, [number,number], [number, number] ]> = [
  [2014, [3, 9], [11, 2]],
  [2015, [3, 8], [11, 1]],
  [2016, [3, 13], [11, 6]],
  [2017, [3, 12], [11, 5]],
  [2018, [3, 11], [11, 4]],
  [2019, [3, 10], [11, 3]],
  [2020, [3, 8], [11, 1]],
  [2021, [3, 14], [11, 7]],
  [2022, [3, 13], [11, 6]],
  [2023, [3, 12], [11, 5]],
  [2024, [3, 10], [11, 3]],
  [2025, [3, 9], [11, 2]],
  [2026, [3, 8], [11, 1]],
];

describe('getDSTStart', function () {
  it('should calculate the correct dates for recent DSTs', function () {
    for (let def of RECENT_DSTS) {
      const [year, start] = def;
      const d = getDSTStart(year);
      expect(d.getUTCFullYear()).toEqual(year);
      expect(d.getUTCMonth()).toEqual(start[0] - 1);
      expect(d.getUTCDate()).toEqual(start[1]);
      expect(d.getUTCHours()).toEqual(6); // 2am Eastern
    }
  });
});

describe('getDSTEnd', function () {
  it('should calculate the correct dates for recent DSTs', function () {
    for (let def of RECENT_DSTS) {
      const [year, , end] = def;
      const d = getDSTEnd(year);
      expect(d.getUTCFullYear()).toEqual(year);
      expect(d.getUTCMonth()).toEqual(end[0] - 1);
      expect(d.getUTCDate()).toEqual(end[1]);
      expect(d.getUTCHours()).toEqual(7); // 2am Eastern
    }
  });
});


const RECENT_FED_HOLIDAYS = [
  '2019-01-01',
  '2019-01-21',
  '2019-02-18',
  '2019-05-27',
  '2019-07-04',
  '2019-09-02',
  '2019-10-14',
  '2019-11-11',
  '2019-11-28',
  '2019-12-25',
  '2020-01-01',
  '2020-01-20',
  '2020-02-17',
  '2020-05-25',
  '2020-07-04', // Different from holiday for Federal employees (7/3)
  '2020-09-07',
  '2020-10-12',
  '2020-11-11',
  '2020-11-26',
  '2020-12-25',
  '2021-01-01',
  '2021-01-18',
  '2021-02-15',
  '2021-05-31',
  '2021-07-05', // 7/4 is Sunday
  '2021-09-06',
  '2021-10-11',
  '2021-11-11',
  '2021-11-25',
  '2021-12-25',
  '2022-01-01',
  '2022-01-17',
  '2022-02-21',
  '2022-05-30',
  '2022-06-20', // 6/19 is Sunday
  '2022-07-04',
];


describe('checkIfFedBankHoliday', function () {
  it('should match recent holidays', function () {
    for (let def of RECENT_FED_HOLIDAYS) {
      const d = new Date(`${ def }T12:00:00Z`);
      const result = checkIfFedBankHoliday(d);
      if (!result) { // Log it out to know which one failed
        process.stdout.write(JSON.stringify({ def, d, result }) + '\n');
      }
      expect(result).toBeTruthy();
    }
  });
});




describe('nextBankingDay', function () {

  it('should give monday for a sunday', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-23T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-02-24T14:00:00.000Z'); // Note the time changes to 9am EST
    expect(holiday).toBeUndefined();
  });

  it('should give tuesday for a monday', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-24T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-02-25T14:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should give wednesday for a tuesday', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-25T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-02-26T14:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should give thursday for a wednesday', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-26T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-02-27T14:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should give friday for a thursday', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-27T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-02-28T14:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should give monday for a friday', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-28T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-03-02T14:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should give monday for a saturday', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-29T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-03-02T14:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should give monday 9am EDT for the friday before DST start', function () {
    const [date1, holiday1] = nextBankingDay(new Date('2020-03-07T09:00:00-0500'));
    expect(date1.toISOString()).toEqual('2020-03-09T13:00:00.000Z');
    expect(holiday1).toBeUndefined();
  });

  it('should give monday 9am EST for the friday before DST end', function () {
    const [date1, holiday1] = nextBankingDay(new Date('2020-10-30T09:00:00-0400'));
    expect(date1.toISOString()).toEqual('2020-11-02T14:00:00.000Z');
    expect(holiday1).toBeUndefined();
  });

  it('should give wednesday for a monday after 5pm eastern (non-DST)', function () {
    const [date1, holiday1] = nextBankingDay(new Date('2020-02-24T22:10:00.000Z'));
    expect(date1.toISOString()).toEqual('2020-02-26T14:00:00.000Z');
    expect(holiday1).toBeUndefined();
    // Checking West Coast US time just for Nathan :P
    const [date2, holiday2] = nextBankingDay(new Date('2020-02-24T15:10:00-0700'));
    expect(date2.toISOString()).toEqual('2020-02-26T14:00:00.000Z');
    expect(holiday2).toBeUndefined();
  });

  it('should give wednesday for a monday after 5pm eastern (DST)', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-06-01T21:10:00.000Z'));
    expect(date.toISOString()).toEqual('2020-06-03T13:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should give thursday for a monday when count is 3', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-24T12:00:00.000Z'), 3);
    expect(date.toISOString()).toEqual('2020-02-27T14:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should give tuesday for a thursday when count is 3', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-20T12:00:00.000Z'), 3);
    expect(date.toISOString()).toEqual('2020-02-25T14:00:00.000Z');
    expect(holiday).toBeUndefined();
  });

  it('should skip dynamic holidays relative to the start of the month', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-02-14T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-02-18T14:00:00.000Z');
    expect(holiday).toEqual("Washington's Birthday/Presidents' Day");
  });

  it('should skip dynamic holidays relative to the end of the month', function () {
    const [date, holiday] = nextBankingDay(new Date('2020-05-22T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-05-26T13:00:00.000Z'); // Note the time change to 9am EDT
    expect(holiday).toEqual('Memorial Day');
  });

  it('should skip static holidays during week', function () {
    const [date, holiday] = nextBankingDay(new Date('2019-12-31T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2020-01-02T14:00:00.000Z');
    expect(holiday).toEqual("New Year's Day");
  });

  it('should ignore static holidays on saturday', function () {
    // Check the previous year to confirm this holiday is actually configured
    const [date1, holiday1] = nextBankingDay(new Date('2019-07-03T12:00:00.000Z'));
    expect(date1.toISOString()).toEqual('2019-07-05T13:00:00.000Z');
    expect(holiday1).toEqual('Independence Day');
    // On a Saturday in 2020 because it's a leap year
    const [date2, holiday2] = nextBankingDay(new Date('2020-07-03T12:00:00.000Z'));
    expect(date2.toISOString()).toEqual('2020-07-06T13:00:00.000Z');
    expect(holiday2).toBeUndefined(); // Crosses Independence Day but should not count
    // Confirm the Friday is not an observed holiday
    const [date3, holiday3] = nextBankingDay(new Date('2020-07-02T12:00:00.000Z'));
    expect(date3.toISOString()).toEqual('2020-07-03T13:00:00.000Z');
    expect(holiday3).toBeUndefined();
  });

  it('should skip static holidays on sunday observed monday', function () {
    const [date, holiday] = nextBankingDay(new Date('2021-07-03T12:00:00.000Z'));
    expect(date.toISOString()).toEqual('2021-07-06T13:00:00.000Z');
    expect(holiday).toEqual('Independence Day');
  });

});

describe('isBankingDay', function () {
  it('should return true for non-holiday weekdays', function () {
    expect(isBankingDay(new Date('2021-07-06T12:00:00.000Z'))).toBeTruthy();
  });
  it('should return false for non-holiday weekends', function () {
    expect(isBankingDay(new Date('2021-07-10T12:00:00.000Z'))).toBeFalsy();
  });
  it('should return false for holidays', function () {
    expect(isBankingDay(new Date('2021-07-05T12:00:00.000Z'))).toBeFalsy(); // Sunday-holiday observed Monday
  });
});

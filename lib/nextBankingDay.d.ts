export declare function getDSTStart(year: number): Date;
export declare function getDSTEnd(year: number): Date;
export declare function checkIfFedBankHoliday(date: Date): string | false;
export declare function checkIfBankingDay(date: Date): (string | boolean)[];
export declare function isBankingDay(date: Date): string | boolean;
export default function nextBankingDay(date: Date, count?: number): [Date, string | true];

export declare function getDSTStart(year: number): Date;
export declare function getDSTEnd(year: number): Date;
export declare function checkIfFedBankHoliday(date: Date): string | null;
export declare function checkIfBankingDay(date: Date): readonly [true, null] | readonly [false, string | null];
export declare function isBankingDay(date: Date): boolean;
export default function nextBankingDay(from_date: Date, count?: number, options?: {
    useBusinessHours?: boolean;
    use_business_hours?: boolean;
}): readonly [Date, string];

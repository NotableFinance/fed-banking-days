
# @notablefi/fed-banking-days

A programmatic implementation of the [Federal Reserve holiday schedule](https://www.federalreserve.gov/aboutthefed/k8.htm).

## Installation

Add to your `package.json` (not in npm yet):

  ```
  "@notablefi/fed-banking-days": "https://github.com/NotableFinance/fed-banking-days.git#v1.1.0"
  ```

## Usage

```typescript
import { nextBankingDay } from '@notablefi/fed-banking-days';
```

### `nextBankingDay`

The primary function, `nextBankingDay`, returns the Date that is the start of business (9am ET) on the next valid Fed banking day, as well as the latest holiday in between the given date and the next banking day.

For example:


…a Wednesday so the next banking day is tomorrow, Thursday.
```javascript
> nextBankingDay(new Date('2022-06-15T06:00:00Z'))
[ 2022-06-16T13:00:00.000Z, undefined ]
```

…a Friday before a Sunday-holiday observed on Monday, so the next banking day is Tuesday.
```javascript
> nextBankingDay(new Date('2022-06-17T06:00:00Z'))
[ 2022-06-21T13:00:00.000Z, 'Juneteenth National Independence Day' ]
```


Optionally, provide a minimum number of days to advance:

```javascript
> nextBankingDay(new Date('2022-06-17T06:00:00Z'), 3)
[ 2022-06-23T13:00:00.000Z, 'Juneteenth National Independence Day' ]
> nextBankingDay(new Date('2022-06-17T06:00:00Z'), 10)
[ 2022-07-05T13:00:00.000Z, 'Independence Day' ]
```

#### `useBusinessHours`

By default, `nextBankingDay` will consider times after end-of-business (5pm ET) to be part of the next banking day, for more conservative estimates about ACH deposit availability. To disable this behavior and consider any time of a day to be part of that same banking day, pass `useBusinessHours: false`:

```javascript
> nextBankingDay(new Date('2022-06-15T19:00:00-04:00')) // default behavior
[ 2022-06-17T13:00:00.000Z, undefined ]
> nextBankingDay(new Date('2022-06-15T19:00:00-04:00'), 1, { useBusinessHours: false })
[ 2022-06-16T13:00:00.000Z, undefined ]
```

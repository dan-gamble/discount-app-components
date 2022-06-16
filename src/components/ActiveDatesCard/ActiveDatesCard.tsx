import React, {useState} from 'react';
import {Card, Checkbox, FormLayout} from '@shopify/polaris';
import {isSameDay} from '@shopify/dates';
import {useI18n} from '@shopify/react-i18n';

import {DatePicker} from '../DatePicker';
import {TimePicker} from '../TimePicker';

import {
  getDateInUTC,
  getDateTimeInShopTimeZone,
  getNewDateAtEndOfDay,
} from '~/utilities/dates';
import {DEFAULT_WEEK_START_DAY, Weekday} from '~/constants';
import type {DateTime, Field} from '~/types';

export interface ActiveDatesCardProps {
  /**
   * Field to be used for the start date picker, with a DateTime value represented as an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) timestamp in UTC
   */
  startDate: Field<DateTime>;

  /**
   * Field to be used for the end date picker, with a DateTime value represented as an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) timestamp in UTC
   */
  endDate: Field<DateTime | null>;

  /**
   * The shop's time zone abbreviation.
   */
  timezoneAbbreviation: string;

  /**
   * (optional) The day that should be used as the start of the week.
   *
   * @default Weekday.Sunday
   */
  weekStartsOn?: Weekday;

  /**
   * (optional) Disables all inputs
   *
   * @default false
   */
  disabled?: boolean;
}

export function ActiveDatesCard({
  startDate,
  endDate,
  timezoneAbbreviation,
  weekStartsOn = DEFAULT_WEEK_START_DAY,
  disabled,
}: ActiveDatesCardProps) {
  const [i18n] = useI18n();
  const nowInUTC = new Date();

  const ianaTimezone = i18n.defaultTimezone!;

  const [showEndDate, setShowEndDate] = useState(
    initShowEndDate(startDate, endDate),
  );

  // When start date or time changes, updates the end date to be later than start date (if applicable)
  const handleStartDateTimeChange = (nextStart: DateTime) => {
    startDate.onChange(nextStart);

    if (endDate.value) {
      const nextEndDate = getValidEndDateTime(
        nextStart,
        endDate.value,
        ianaTimezone,
      );

      if (nextEndDate !== endDate.value) {
        endDate.onChange(nextEndDate);
      }
    }
  };

  // When end date or time changes, verify that the new end date is later than the start time
  const handleEndDateTimeChange = (requestedEndDate: DateTime) => {
    const nextEndDate = getValidEndDateTime(
      startDate.value,
      requestedEndDate,
      ianaTimezone,
    );

    endDate.onChange(nextEndDate);
  };

  const handleShowEndDateChange = () => {
    if (showEndDate) {
      endDate.onChange(null);
    } else {
      const startDateInShopTZ = getDateTimeInShopTimeZone(
        startDate.value,
        ianaTimezone,
      );

      const endDateAtEndOfDay = getDateInUTC(
        getNewDateAtEndOfDay(startDateInShopTZ),
        ianaTimezone,
      );

      endDate.onChange(endDateAtEndOfDay.toISOString());
    }

    setShowEndDate((prev) => !prev);
  };

  const endDateIsStartDate =
    endDate.value !== null &&
    isSameDay(new Date(endDate.value), new Date(startDate.value));

  const disableEndDatesBefore = getEndDatePickerDisableDatesBefore(
    nowInUTC,
    new Date(startDate.value),
  );

  return (
    <Card
      title={i18n.translate('DiscountAppComponents.ActiveDatesCard.title')}
      sectioned
    >
      <FormLayout>
        <FormLayout.Group>
          <DatePicker
            date={{
              ...startDate,
              onChange: handleStartDateTimeChange,
            }}
            weekStartsOn={weekStartsOn}
            disabled={disabled}
            label={i18n.translate(
              'DiscountAppComponents.ActiveDatesCard.startDate',
            )}
            disableDatesBefore={nowInUTC.toISOString()}
          />
          <TimePicker
            time={{
              ...startDate,
              onChange: handleStartDateTimeChange,
            }}
            disabled={disabled}
            label={i18n.translate(
              'DiscountAppComponents.ActiveDatesCard.startTime',
              {
                timezoneAbbreviation,
              },
            )}
            disableTimesBefore={nowInUTC.toISOString()}
          />
        </FormLayout.Group>

        <FormLayout.Group>
          <Checkbox
            label={i18n.translate(
              'DiscountAppComponents.ActiveDatesCard.setEndDate',
            )}
            checked={showEndDate}
            disabled={disabled}
            onChange={handleShowEndDateChange}
          />
        </FormLayout.Group>

        {showEndDate && endDate.value !== null && (
          <FormLayout.Group>
            <DatePicker
              date={{
                ...(endDate as Field<string>),
                onChange: handleEndDateTimeChange,
                error: endDateIsStartDate ? undefined : endDate.error,
              }}
              weekStartsOn={weekStartsOn}
              disabled={disabled}
              label={i18n.translate(
                'DiscountAppComponents.ActiveDatesCard.endDate',
              )}
              disableDatesBefore={disableEndDatesBefore.toISOString()}
            />
            <TimePicker
              time={{
                ...(endDate as Field<string>),
                onChange: handleEndDateTimeChange,
                error: endDateIsStartDate ? endDate.error : undefined,
              }}
              disabled={disabled}
              label={i18n.translate(
                'DiscountAppComponents.ActiveDatesCard.endTime',
                {
                  timezoneAbbreviation,
                },
              )}
              disableTimesBefore={disableEndDatesBefore.toISOString()}
            />
          </FormLayout.Group>
        )}
      </FormLayout>
    </Card>
  );
}

/**
 * The end date picker is disabled before the current time or the startDate, whichever is later
 */
function getEndDatePickerDisableDatesBefore(now: Date, startDate: Date) {
  return now > startDate ? now : startDate;
}

/**
 * showEndDate is initialized to:
 *  - false if endDate is null
 *  - true if endDate is not null and has an error value
 *  - Boolean(startDate equals endDate)
 */
function initShowEndDate(
  startDate: Field<DateTime>,
  endDate: Field<DateTime | null>,
) {
  if (!endDate.value) {
    return false;
  } else if (endDate.value !== null && endDate.error) {
    return true;
  }

  return startDate.value !== endDate.value;
}

/**
 * Given a start and end date in UTC, returns a new valid end date in UTC if start date is after end date
 */
function getValidEndDateTime(
  startDateTime: DateTime,
  endDateTime: DateTime,
  ianaTimezone: string,
): DateTime {
  const startDate = getDateTimeInShopTimeZone(startDateTime, ianaTimezone);
  const endDate = getDateTimeInShopTimeZone(endDateTime, ianaTimezone);

  return startDate >= endDate
    ? getDateInUTC(getNewDateAtEndOfDay(startDate), ianaTimezone).toISOString()
    : endDateTime;
}

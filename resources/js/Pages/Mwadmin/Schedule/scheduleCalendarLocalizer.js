import { dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, startOfWeek as dfStartOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

/**
 * Monday-first week (matches Laravel `Carbon::MONDAY` in ScheduleApiController).
 * MIT: react-big-calendar — https://github.com/jquense/react-big-calendar
 */
export const scheduleCalendarLocalizer = dateFnsLocalizer({
    format,
    startOfWeek: (date, options) => dfStartOfWeek(date, { ...options, weekStartsOn: 1 }),
    getDay,
    locales: { 'en-US': enUS },
});

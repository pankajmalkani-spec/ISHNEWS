import { addMinutes } from 'date-fns';

/**
 * Map weekly schedule API payload to react-big-calendar events (timed slots).
 */
export function buildScheduleCalendarEvents(payload) {
    if (!payload?.categories || !payload?.week_days) return [];

    const events = [];
    for (const cat of payload.categories) {
        cat.cells.forEach((cell, idx) => {
            const dayStr = payload.week_days[idx]?.date;
            if (!dayStr) return;
            cell.forEach((item, j) => {
                const base = new Date(`${dayStr}T09:00:00`);
                const start = addMinutes(base, j * 34);
                const end = addMinutes(start, 30);
                events.push({
                    id: `sched-${item.id}-${dayStr}-${j}`,
                    title: `${cat.title}: ${item.title}`,
                    start,
                    end,
                    resource: {
                        contentId: item.id,
                        color: item.color,
                        categoryTitle: cat.title,
                    },
                });
            });
        });
    }
    return events;
}

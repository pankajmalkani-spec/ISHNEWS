import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { format, startOfWeek } from 'date-fns';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import MwadminLayout from '../../../Components/Mwadmin/Layout';
import { useClassicDialog } from '../../../Components/Mwadmin/ClassicDialog';
import { canEdit } from '../../../lib/mwadminPermissions';
import { buildScheduleCalendarEvents } from './scheduleCalendarEvents';
import { scheduleCalendarLocalizer } from './scheduleCalendarLocalizer';

function shiftWeekStart(isoDate, deltaDays) {
    const d = new Date(`${isoDate}T12:00:00`);
    d.setDate(d.getDate() + deltaDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function shiftDateYears(isoDate, deltaYears) {
    if (!isoDate) return '';
    const d = new Date(`${isoDate}T12:00:00`);
    d.setFullYear(d.getFullYear() + deltaYears);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function ScheduleIndex({ authUser = {} }) {
    const dialog = useClassicDialog();
    const reduceMotion = useReducedMotion();
    const canUpdateStatus = canEdit(authUser, 'schedule');
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [payload, setPayload] = useState(null);
    const [modal, setModal] = useState(null);
    const [modalStatus, setModalStatus] = useState('1');
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    /** RBC week vs agenda — must be controlled with onView or toolbar cannot switch views */
    const [calView, setCalView] = useState(Views.WEEK);

    const loadWeek = useCallback(
        async (start) => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/mwadmin/schedule/week', {
                    params: start ? { week_start: start } : {},
                });
                setPayload(data);
                setWeekStart(data.week_start);
                setDateFilter(data.week_start || '');
            } catch (err) {
                dialog.toast(err?.response?.data?.message || 'Unable to load weekly schedule.', 'error');
            } finally {
                setLoading(false);
            }
        },
        [dialog]
    );

    useEffect(() => {
        loadWeek();
    }, [loadWeek]);

    const calendarEvents = useMemo(() => buildScheduleCalendarEvents(payload), [payload]);

    const calendarDate = useMemo(() => {
        if (!payload?.week_start) return new Date();
        return new Date(`${payload.week_start}T12:00:00`);
    }, [payload?.week_start]);

    const openContent = async (id) => {
        try {
            const { data } = await axios.get(`/api/mwadmin/schedule/content/${id}`);
            const row = data.data;
            setModal(row);
            setModalStatus(
                row.final_releasestatus === '1' || row.final_releasestatus === 1 ? '1' : '0'
            );
        } catch {
            dialog.toast('Unable to load content details.', 'error');
        }
    };

    const saveModal = async () => {
        if (!modal) return;
        setSaving(true);
        try {
            await axios.post('/api/mwadmin/schedule/update-status', {
                content_id: modal.id,
                status: parseInt(modalStatus, 10),
            });
            dialog.toast('Contenttrans updated successfully.', 'success');
            setModal(null);
            await loadWeek(weekStart);
        } catch (err) {
            dialog.toast(err?.response?.data?.message || 'Unable to update status.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const jumpYearAndLoad = (deltaYears) => {
        const next = shiftDateYears(dateFilter || weekStart, deltaYears);
        if (!next) return;
        setDateFilter(next);
        loadWeek(next);
    };

    const handleCalendarNavigate = useCallback(
        (nextDate) => {
            const monday = startOfWeek(nextDate, { weekStartsOn: 1 });
            const ymd = format(monday, 'yyyy-MM-dd');
            if (ymd === weekStart) return;
            loadWeek(ymd);
        },
        [loadWeek, weekStart]
    );

    const eventPropGetter = useCallback((event) => {
        const bg = event.resource?.color || '#31b8a5';
        return {
            style: {
                backgroundColor: bg,
                borderColor: 'rgba(15, 23, 42, 0.18)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '11px',
                lineHeight: 1.25,
            },
        };
    }, []);

    const visibleCategories =
        payload?.categories?.filter((cat) => cat.cells.some((cell) => cell.length > 0)) || [];
    const categoriesToRender =
        visibleCategories.length > 0 ? visibleCategories : payload?.categories || [];

    const motionEnter = reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 };
    const motionAnim = reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
    const motionExit = reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 };
    const motionTrans = { duration: reduceMotion ? 0 : 0.22 };

    return (
        <>
            <Head title="Weekly Schedule" />
            <MwadminLayout authUser={authUser} activeMenu="schedule">
                <div className="mwadmin-category-classic">
                    <div className="mwadmin-pagebar">
                        <span>Content</span> <span className="sep">›</span> <span>Weekly Schedule</span>{' '}
                        <span className="sep">›</span> <strong>Listing</strong>
                    </div>
                    <h1 className="mwadmin-title">Weekly Schedule</h1>

                    <section className="mwadmin-panel mwadmin-schedule-panel">
                        <div className="mwadmin-panel-head mwadmin-schedule-panel-head">
                            <span className="mwadmin-schedule-head-icon" aria-hidden>
                                &#128197;
                            </span>
                            Weekly Schedule
                        </div>

                        {loading && <div className="mwadmin-schedule-loading">Loading…</div>}

                        {!loading && payload && (
                            <>
                                <div className="mwadmin-filter-bar mwadmin-schedule-filter-bar">
                                    <label htmlFor="mwadmin-schedule-date" className="mwadmin-schedule-filter-label">
                                        Week start
                                    </label>
                                    <input
                                        id="mwadmin-schedule-date"
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setDateFilter(next);
                                            if (next) loadWeek(next);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="mwadmin-filter-clear"
                                        onClick={() => jumpYearAndLoad(-1)}
                                    >
                                        Prev Year
                                    </button>
                                    <button
                                        type="button"
                                        className="mwadmin-filter-clear"
                                        onClick={() => jumpYearAndLoad(1)}
                                    >
                                        Next Year
                                    </button>
                                    <button
                                        type="button"
                                        className="mwadmin-filter-clear"
                                        onClick={() => loadWeek()}
                                    >
                                        Current Week
                                    </button>
                                    <div className="mwadmin-schedule-view-toggle" role="group" aria-label="View mode">
                                        <motion.button
                                            type="button"
                                            className={
                                                viewMode === 'grid'
                                                    ? 'mwadmin-schedule-view-btn is-active'
                                                    : 'mwadmin-schedule-view-btn'
                                            }
                                            onClick={() => setViewMode('grid')}
                                            whileTap={reduceMotion ? {} : { scale: 0.98 }}
                                        >
                                            Grid
                                        </motion.button>
                                        <motion.button
                                            type="button"
                                            className={
                                                viewMode === 'calendar'
                                                    ? 'mwadmin-schedule-view-btn is-active'
                                                    : 'mwadmin-schedule-view-btn'
                                            }
                                            onClick={() => setViewMode('calendar')}
                                            whileTap={reduceMotion ? {} : { scale: 0.98 }}
                                        >
                                            Calendar
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="mwadmin-toolbar mwadmin-schedule-toolbar">
                                    <div className="mwadmin-schedule-toolbar-mid">
                                        From&nbsp;&nbsp;{payload.label_from}&nbsp;&nbsp; To &nbsp;&nbsp;
                                        {payload.label_to}
                                    </div>
                                    <div className="mwadmin-schedule-toolbar-nav">
                                        <button
                                            type="button"
                                            className="mwadmin-schedule-nav-btn"
                                            onClick={() => weekStart && loadWeek(shiftWeekStart(weekStart, -7))}
                                            title="Previous week"
                                            aria-label="Previous week"
                                        >
                                            &#9664;
                                        </button>
                                        <button
                                            type="button"
                                            className="mwadmin-schedule-nav-btn"
                                            onClick={() => weekStart && loadWeek(shiftWeekStart(weekStart, 7))}
                                            title="Next week"
                                            aria-label="Next week"
                                        >
                                            &#9654;
                                        </button>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {viewMode === 'grid' ? (
                                        <motion.div
                                            key="schedule-grid"
                                            className="mwadmin-schedule-table-wrap mwadmin-schedule-scroll-wrap"
                                            initial={motionEnter}
                                            animate={motionAnim}
                                            exit={motionExit}
                                            transition={motionTrans}
                                        >
                                            <table className="mwadmin-schedule-table">
                                                <thead>
                                                    <tr>
                                                        <th className="mwadmin-schedule-th-cat">Category</th>
                                                        {payload.week_days.map((d) => (
                                                            <th key={d.date} className="mwadmin-schedule-th-day">
                                                                {d.weekday}/{d.day}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {categoriesToRender.map((cat) => (
                                                        <tr key={cat.id}>
                                                            <td className="mwadmin-schedule-td-cat">{cat.title}</td>
                                                            {cat.cells.map((cell, idx) => (
                                                                <td
                                                                    key={`${cat.id}-${payload.week_days[idx].date}`}
                                                                    className="mwadmin-schedule-td-cell"
                                                                >
                                                                    {cell.map((item) => (
                                                                        <button
                                                                            key={item.id}
                                                                            type="button"
                                                                            className="mwadmin-schedule-chip"
                                                                            style={{ backgroundColor: item.color }}
                                                                            title={item.title}
                                                                            onClick={() => openContent(item.id)}
                                                                        >
                                                                            {item.title}
                                                                        </button>
                                                                    ))}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="schedule-calendar"
                                            className="mwadmin-schedule-rbc-wrap"
                                            initial={motionEnter}
                                            animate={motionAnim}
                                            exit={motionExit}
                                            transition={motionTrans}
                                        >
                                            <motion.div
                                                className="mwadmin-schedule-rbc"
                                                initial={reduceMotion ? false : { opacity: 0.92 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: reduceMotion ? 0 : 0.28 }}
                                            >
                                                {calendarEvents.length === 0 ? (
                                                    <div className="mwadmin-schedule-rbc-empty">
                                                        No scheduled releases for this week (only items with Final
                                                        release = Active appear here).
                                                    </div>
                                                ) : null}
                                                <Calendar
                                                    key={payload.week_start}
                                                    localizer={scheduleCalendarLocalizer}
                                                    events={calendarEvents}
                                                    startAccessor="start"
                                                    endAccessor="end"
                                                    style={{ height: 560 }}
                                                    view={calView}
                                                    views={[Views.WEEK, Views.AGENDA]}
                                                    onView={setCalView}
                                                    date={calendarDate}
                                                    onNavigate={handleCalendarNavigate}
                                                    scrollToTime={new Date(1970, 0, 1, 8, 0, 0)}
                                                    onSelectEvent={(ev) => {
                                                        const id = ev.resource?.contentId;
                                                        if (id) openContent(id);
                                                    }}
                                                    eventPropGetter={eventPropGetter}
                                                    popup
                                                    tooltipAccessor={(e) =>
                                                        e.resource?.categoryTitle
                                                            ? `${e.resource.categoryTitle} — ${e.title}`
                                                            : e.title
                                                    }
                                                    messages={{
                                                        next: 'Next',
                                                        previous: 'Previous',
                                                        today: 'Today',
                                                        week: 'Week',
                                                        agenda: 'Agenda',
                                                    }}
                                                />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </section>
                </div>

                {modal && (
                    <div
                        className="mwadmin-modal-backdrop"
                        role="presentation"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setModal(null);
                        }}
                    >
                        <div className="mwadmin-modal mwadmin-schedule-modal" role="dialog" aria-modal="true">
                            <div className="mwadmin-modal-head">
                                Schedule for Category —{' '}
                                <strong>{modal.category_name}</strong>
                            </div>
                            <div className="mwadmin-modal-body">
                                <table className="mwadmin-schedule-modal-table">
                                    <tbody>
                                        <tr>
                                            <th>Topic name</th>
                                            <td>{modal.title}</td>
                                        </tr>
                                        <tr>
                                            <th>Sub-category</th>
                                            <td>{modal.subcategory_name || '—'}</td>
                                        </tr>
                                        <tr>
                                            <th>Final release status</th>
                                            <td>
                                                {canUpdateStatus ? (
                                                    <select
                                                        value={modalStatus}
                                                        onChange={(e) => setModalStatus(e.target.value)}
                                                        className="mwadmin-select"
                                                    >
                                                        <option value="1">Active</option>
                                                        <option value="0">In-Active</option>
                                                    </select>
                                                ) : (
                                                    <span>
                                                        {modalStatus === '1' ? 'Active' : 'In-Active'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="mwadmin-modal-actions">
                                {canUpdateStatus && (
                                    <button
                                        type="button"
                                        className="mwadmin-news-create-submit"
                                        disabled={saving}
                                        onClick={saveModal}
                                    >
                                        {saving ? 'Saving…' : 'Update'}
                                    </button>
                                )}
                                <button type="button" className="mwadmin-news-create-cancel" onClick={() => setModal(null)}>
                                    Cancel
                                </button>
                                <Link
                                    href={`/mwadmin/newslisting/${modal.id}/edit`}
                                    className="mwadmin-schedule-edit-link"
                                >
                                    Open in Manage Content
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </MwadminLayout>
        </>
    );
}

const convertTimestampToTime = (timestamp) => {
    if (timestamp && timestamp.seconds && timestamp.nanoseconds) {
        return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    return null;
}

// Format a date string (YYYY-MM-DD) to a human readable local format
const formatLocalDate = (yyyyMmDd) => {
    if (!yyyyMmDd) return '';
    try {
        const date = new Date(yyyyMmDd);
        if (Number.isNaN(date.getTime())) return yyyyMmDd;
        return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return yyyyMmDd;
    }
};

// Format a time string (HH:MM) to a human readable local time
const formatLocalTime = (hhMm) => {
    if (!hhMm) return '';
    try {
        const [h, m] = hhMm.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return hhMm;
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return hhMm;
    }
};

export { convertTimestampToTime, formatLocalDate, formatLocalTime };
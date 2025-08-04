const convertTimestampToTime = (timestamp) => {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
}

export { convertTimestampToTime };
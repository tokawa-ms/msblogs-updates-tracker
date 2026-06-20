function toDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getYesterdayDateString(baseDate = new Date()) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() - 1);
  return toDateString(date);
}

function parseToIsoString(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

module.exports = {
  toDateString,
  getYesterdayDateString,
  parseToIsoString,
};

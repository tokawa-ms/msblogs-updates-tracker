const LEVELS = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  debug: 'DEBUG',
};

function print(level, message, data) {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${timestamp}] [${LEVELS[level]}] ${message}`, data);
    return;
  }
  console.log(`[${timestamp}] [${LEVELS[level]}] ${message}`);
}

module.exports = {
  info: (message, data) => print('info', message, data),
  warn: (message, data) => print('warn', message, data),
  error: (message, data) => print('error', message, data),
  debug: (message, data) => print('debug', message, data),
};

const app = require('./app');
const config = require('./config');
const logger = require('./shared/loggers/logger');

const { expireStaleHolds } = require('./modules/booking/service');

app.listen(config.port, () => logger.info(`Server listening on http://localhost:${config.port}`));

// Release rooms from checkouts that were never paid for.
const sweep = () => expireStaleHolds().catch((err) => logger.error(`Hold sweep failed: ${err.message}`));
sweep();
setInterval(sweep, 60 * 1000).unref();

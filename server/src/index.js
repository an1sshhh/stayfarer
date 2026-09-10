const app = require('./app');
const config = require('./config');
const logger = require('./shared/loggers/logger');

app.listen(config.port, () => logger.info(`Server listening on http://localhost:${config.port}`));

// app/lib/relayLogger.js

// Dependencies
const winston = require('winston');
const WinstonLogStash = require('winston3-logstash-transport');

/**
 * A utility class to wrap Winston logging
 * @class RelayLogger
 * @param {object} config - A global configuration object that may contain options on how to initialize the logger
 * @example
 * let logger = new logger(config);
 */
class RelayLogger {
  constructor(config) {
    this.options = { exitOnError: false, json: true, logstash: true };
    this.log = winston.createLogger(this.options);

    const options = {
      mode: config.logstash.relay.mode,
      port: config.logstash.relay.port,
      host: config.logstash.relay.host,
      appName: config.logstash.relay.appName,
      json: true,
      logstash: true,
      level: 'silly'
    };

    this.log.add(new WinstonLogStash(options));
  }
}

module.exports = RelayLogger;

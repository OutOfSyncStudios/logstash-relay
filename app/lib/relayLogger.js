// app/lib/logger.js

// Dependencies
const __ = require('./lodashExt');
const winston = require('winston');
const LogstashUDP = require('winston-logstash-udp').LogstashUDP;

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
    this.log = new winston.Logger(this.options);

    this.log.add(LogstashUDP, {
      port: config.logstash.relay.port,
      host: config.logstash.relay.host,
      appName: config.logstash.relay.appName,
      json: true,
      logstash: true,
      level: 'info'
    });
  }
}

module.exports = RelayLogger;

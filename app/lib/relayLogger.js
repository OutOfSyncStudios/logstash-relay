// app/lib/logger.js

// Dependencies
const winston = require('winston');
const Logstash = require('winston-logstash').Logstash;
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

    const options = {
      port: config.logstash.relay.port,
      host: config.logstash.relay.host,
      appName: config.logstash.relay.appName,
      json: true,
      logstash: true,
      level: 'silly'
    };

    if (config.logstash.relay.mode === 'tcp') {
      this.log.add(Logstash, options);
    } else {
      this.log.add(LogstashUDP, options);
    }
  }
}

module.exports = RelayLogger;

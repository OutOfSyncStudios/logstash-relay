// app/lib/logger.js

// Dependencies
const __ = require('./lodashExt');
const fs = require('fs');
const winston = require('winston');
const LogstashUDP = require('winston-logstash-udp').LogstashUDP;

/**
 * A utility class to wrap Winston logging
 * @class Logger
 * @param {object} config - A global configuration object that may contain options on how to initialize the logger
 * @example
 * let logger = new logger(config);
 */
class Logger {
  constructor(config) {
    this.logDir = config.logging.logDir || './logs';

    const transports = [
      new winston.transports.File({
        filename: `${this.logDir}/info.log`,
        name: 'info-log',
        level: 'info',
        formatter: this.formatter
      }),
      new winston.transports.File({
        filename: `${this.logDir}/error.log`,
        name: 'error-log',
        level: 'error',
        formatter: this.formatter
      })
    ];

    this.options = { exitOnError: false, transports: transports, json: true, logstash: true };

    // Create log folder if it does not already exist
    if (!fs.existsSync(config.logging.logDir)) {
      console.log('Creating log folder');
      fs.mkdirSync(config.logging.logDir);
    }

    // Merge options from config into this object
    this.option = __.assign(this.options, config.logging.options);
    this.log = new winston.Logger(this.options);

    // Add logstash logging when in production
    // if (process.env.NODE_ENV === 'production') {
    this.log.add(LogstashUDP, {
      port: config.logstash.port,
      host: config.logstash.host,
      appName: config.logstash.appName,
      json: true,
      logstash: true,
      level: 'info'
    });
    // }
    // Optimization -- Add console logging if not in production
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      this.log
        .add(winston.transports.Console, { level: 'debug', formatter: this.formatter })
        .add(winston.transports.File, {
          filename: `${this.logDir}/debug.log`,
          name: 'debug-log',
          level: 'debug',
          formatter: this.formatter
        });
    }
  }

  formatter(options) {
    return `${new Date().toISOString()} [${options.level.toUpperCase()}]: ${options.message}`;
  }

  handleError(err) {
    if (this.log) {
      this.log.error(err);
    }
  }
}

module.exports = Logger;

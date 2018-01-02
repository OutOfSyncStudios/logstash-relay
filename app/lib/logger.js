// app/lib/logger.js

// Dependencies
const __ = require('./lodashExt');
const fs = require('fs');
const winston = require('winston');
const LogstashUDP = require('winston-logstash-udp').LogstashUDP;
const Logstash = require('winston-logstash').Logstash;

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

    const transports = [];

    // Create log folder if it does not already exist (and we aren't in a lambda function)
    if (!config.isLambda) {
      transports.push(new winston.transports.File({
        filename: `${this.logDir}/info.log`,
        name: 'info-log',
        level: 'info',
        formatter: this.formatter
      }));
      transports.push(new winston.transports.File({
        filename: `${this.logDir}/error.log`,
        name: 'error-log',
        level: 'error',
        formatter: this.formatter
      }));

      // Optimization -- Add console and debug logging if not in production
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        transports.push(new winston.transports.File({
          filename: `${this.logDir}/debug.log`,
          name: 'debug-log',
          level: 'debug',
          formatter: this.formatter
        }));

        transports.push(new winston.transports.Console({ level: 'debug', formatter: this.formatter }));
      }

      if (!fs.existsSync(config.logging.logDir)) {
        // console.log('Creating log folder');
        fs.mkdirSync(config.logging.logDir);
      }
    } else {
      // Lambda just add console logging
      transports.push(new winston.transports.Console({ level: 'silly', formatter: this.formatter }));
    }

    this.options = { exitOnError: false, transports: transports, json: true, logstash: true };

    // Merge options from config into this object
    this.options = __.merge(this.options, config.logging.options);
    this.log = new winston.Logger(this.options);

    // Add logstash logging when configured for it
    if (config.logging.logstashLogging === true) {
      const logstashOptions = {
        port: config.logstash.logging.port,
        host: config.logstash.logging.host,
        appName: config.logstash.logging.appName,
        json: true,
        logstash: true,
        level: 'silly'
      };
      if (config.logstash.relay.mode === 'tcp') {
        this.log.add(Logstash, logstashOptions);
      } else {
        this.log.add(LogstashUDP, logstashOptions);
      }
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

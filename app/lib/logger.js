// app/lib/logger.js

// Dependencies
const __ = require('@outofsync/lodash-ex');
const fs = require('fs');
const winston = require('winston');
const { format } = winston;
const WinstonLogStash = require('winston3-logstash-transport');

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
        format: format.printf(this.formatter)
      }));
      transports.push(new winston.transports.File({
        filename: `${this.logDir}/error.log`,
        name: 'error-log',
        level: 'error',
        format: format.printf(this.formatter)
      }));

      // Optimization -- Add console and debug logging if not in production
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        transports.push(new winston.transports.File({
          filename: `${this.logDir}/debug.log`,
          name: 'debug-log',
          level: 'debug',
          format: format.printf(this.formatter)
        }));

        transports.push(new winston.transports.Console({
          level: 'debug',
          format: format.printf(this.formatter)
        }));
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
    this.log = winston.createLogger(this.options);

    // Add logstash logging when configured for it
    if (config.logging.logstashLogging === true) {
      const logstashOptions = {
        mode: config.logstash.relay.mode,
        port: config.logstash.logging.port,
        host: config.logstash.logging.host,
        appName: config.logstash.logging.appName,
        json: true,
        logstash: true,
        level: 'silly'
      };

      this.log.add(new WinstonLogStash(logstashOptions));
    }
  }

  // Adds Mixin replacement to strip logs which contain empty string or objects
  addBetterLoggingMixins(log) {
    log.oldSilly = log.silly;
    log.oldInfo = log.info;
    log.oldDebug = log.debug;
    log.oldWarn = log.warn;
    log.oldError = log.error;
    log.genLog = ((replaceFn, ...params) => {
      if (params[0]) {
        const data = Object.assign({}, params[0]);
        if (typeof params[0] !== 'string') {
          if (params[0] instanceof Error) {
            params[0] = JSON.stringify(params[0], Object.getOwnPropertyNames(params[0]));
          } else {
            params[0] = JSON.stringify(params[0]);
          }
        }
        if (data !== '{}' && data !== '') {
          replaceFn(...params);
        }
      }
    });
    log.silly = ((...params) => {
      log.genLog(log.oldSilly, ...params);
    });
    log.info = ((...params) => {
      log.genLog(log.oldInfo, ...params);
    });
    log.debug = ((...params) => {
      log.genLog(log.oldDebug, ...params);
    });
    log.warn = ((...params) => {
      log.genLog(log.oldWarn, ...params);
    });
    log.error = ((...params) => {
      log.genLog(log.oldError, ...params);
    });
  }

  formatter(options) {
    let message = options.message;
    if (!message) {
      message = JSON.parse(options[Symbol.for('message')])['@message'];
    }
    return `${new Date().toISOString()} [${options.level.toUpperCase()}]: ${message}`;
  }

  logstashFormatter(options) {
    let message = options.message;
    if (!message) {
      message = JSON.parse(options[Symbol.for('message')])['@message'];
    }
    const out = {};
    out['@message'] = message;
    out['@timestamp'] = new Date().toISOString();
    out['@fields'] = options;
    let oustr;
    try {
      outstr = JSON.strinify(out);
    } catch {
      outstr = util.inspect(out, { depth: null });
    }
    return outstr;
  }

  handleError(err) {
    if (this.log) {
      this.log.error(err);
    }
  }
}

module.exports = Logger;

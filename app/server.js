// app/server.js

// Dependencies
const __ = require('@outofsync/lodash-ex');
const LogStub = require('logstub');
const RelayLogger = require('./lib/relayLogger');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const url = require('url');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
const express = require('express');
const router = express.Router;
const bodyParser = require('body-parser');
const multer = require('multer');
const timeout = require('connect-timeout');
const cors = require('cors');
const expressWinston = require('express-winston');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const connectionTester = require('connection-tester');

const validLevels = ['silly', 'trace', 'debug', 'info', 'warn', 'error'];
const numericLevels = {
  [0]: 'trace',
  [1]: 'trace',
  [2]: 'debug',
  [3]: 'info',
  [4]: 'warn',
  [5]: 'error',
  [6]: 'error'
};

/**
 * @class Server
 * @classdesc Server Class
 */
class Server {
  constructor(config, log) {
    this.app = express();
    // Setup Express
    this.server = null;
    this.httpsServer = null;
    this.config = config;
    this.hostname = os.hostname();

    // Set the server base configuration
    this.isActive = false;
    this.port = config.server.port || 8080;
    // Configure the port number
    this.timeout = config.server.timeout || 5;
    // Configure the server timeout mechanic
    this.sslEnabled = config.server.sslEnabled || false;
    // Configure servers ssl enablement
    this.sslPort = config.server.sslPort || 8443;

    if (this.sslEnabled) {
      this.sslKey = fs.readFileSync(config.server.sslKey);
      // Load SSL Key
      this.sslCert = fs.readFileSync(config.server.sslCert); // Load SSL Cert
    }

    this.log = log || new LogStub();
    this.relayLogger = {};
    this.relayLog = {};
  }

  // ****************************************************************************
  //  Server Shutdown Logic
  // ***************************************************************************/
  close() {
    // Perform gracful shutdown here
    if (__.hasValue(this.server)) {
      this.log.debug('Shutting down HTTP listener');
      this.server.close();
    }

    if (__.hasValue(this.httpsServer)) {
      this.log.debug('Shutting down HTTPS listener');
      this.httpsServer.close();
    }
    this.isActive = false;
  }

  // ****************************************************************************
  //  Middleware functions (Core)
  // ***************************************************************************/
  setError(err, req, res) {
    const errorBlock = {
      summary: 'General Server Error',
      message: 'An unknown error occurred processed the log message.'
    };
    if (__.hasValue(err)) {
      errorBlock.details = err.toString();
    }
    req.hasError = true;
    req.error = errorBlock;
    req.respCode = req.respCode || 500000;
    req.respStatus = req.respStatus || 500;
    this.setResponse(req, res);
  }

  setResponse(req, res) {
    const code = req.respCode || 200000;
    const status = req.respStatus || 200;
    const respBlock = {
      respCode: code,
      status: status,
      callID: req.callID,
      time: req.time,
      timestamp: req.timestamp,
      ip: req.ip,
      ipForwarding: req.ips,
    };
    if (__.hasValue(req.error)) {
      respBlock.error = req.error;
    }
    res.locals.status = status;
    res.locals.body = respBlock;
  }

  sendResponse(req, res, next) {
    if (!res.headersSent) {
      res.set('Content-Type', 'application/json');
      for (const header in res.locals.headers) {
        if (Object.prototype.hasOwnProperty.call(res.locals.headers, header)) {
          res.header(header, res.locals.headers[header]);
        }
      }
      res.status(res.locals.status);
      res.json(res.locals.body);

      const code = req.respCode || 200000;
      if (code === 200000) {
        const respMsg = {
          status: res.locals.status,
          respCode: code,
          protocol: req.secure ? 'HTTPS' : 'HTTP',
          method: req.method,
          endpoint: req.urlpath,
          actualIP: req.connection.remoteAddress,
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          callID: req.callID,
          server: req.oshost,
          headers: req.headers,
          performance: { response: req.timers.response, route: req.timers.route },
          body: JSON.stringify(res.body)
        };
        this.log.info(JSON.stringify(respMsg));
      }
    }
    next();
  }

  // Returns headers needed for proper Cross-Origin Resource Sharing
  // This is needed so browsers applications can properly request data
  handleCORS(req, res, next) {
    if (__.isUnset(res.locals.headers)) {
      res.locals.headers = {};
    }
    res.locals.headers['Access-Control-Allow-Origin'] = '*';
    res.locals.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    res.locals.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
    next();
  }

  attachCallID(req, res, next) {
    // Generate CallID attach to the request object
    const now = moment();
    req.callID = uuidv4();
    req.time = `${now.format()}Z`;
    req.timestamp = now.format('x');
    req.oshost = this.hostname;
    req.urlpath = url.parse(req.url).pathname;
    req.hasData = false;
    req.hasError = false;
    req.timedout = false;
    next();
  }

  safeDeserialize(data) {
    try {
      return JSON.parse(data);
    } catch (err) {
      return data;
    }
  }

  normalizeLevel(errorLevel) {
    let level = 'error';

    if (__.hasValue(errorLevel)) {
      if (Number.isInteger(errorLevel)) {
        level = numericLevels[Math.floor(errorLevel / 1000)];
      } else {
        const test = errorLevel.toString().toLowerCase();
        if (validLevels.includes(test)) {
          level = test;
        }
      }
    }

    return level;
  }

  handleIncomingLog(req, res, next) {
    try {
      const timestamp = moment().valueOf();
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      if (__.hasValue(req.body.r) && __.hasValue(req.body.lg)) {
        let lg = req.body.lg;
        // Handle JSNLogs style logging
        if (typeof req.body.lg === 'string') {
          lg = this.safeDeserialize(req.body.lg);
        }
        if (!lg || !Array.isArray(lg)) {
          next('Malformed JSNLogs log message');
          return;
        }

        const requestID = req.body.r;
        const count = lg.length;
        for (let itr = 0; itr < count; itr++) {
          const entry = lg[itr];
          const logName = entry.n;
          const level = this.normalizeLevel(entry.l);
          const logMessage = {
            type: 'client_error',
            name: logName,
            requestID: requestID,
            /* eslint-disable camelcase */
            client_error: this.safeDeserialize(entry.m),
            /* eslint-enable camelcase */
            actualIP: req.connection.remoteAddress,
            ip: ip,
            callID: req.callID,
            headers: req.headers,
            clientTimestamp: entry.t,
            timestamp: timestamp
          };
          this.log.debug('Delivering JSNLogs log message to relay.');
          this.log.debug(JSON.stringify(logMessage));
          this.relayLog.log(level, JSON.stringify(logMessage));
        }
      } else if (__.hasValue(req.body.level) && __.hasValue(req.body.message)) {
        // Handle Log4Javascript style logging
        const level = this.normalizeLevel(req.body.level);
        const logMessage = {
          type: 'client_error',
          level: level,
          /* eslint-disable camelcase */
          client_error: { msg: req.body.message },
          /* eslint-enable camelcase */
          actualIP: req.connection.remoteAddress,
          ip: ip,
          callID: req.callID,
          headers: req.headers,
          clientTimestamp: timestamp,
          timestamp: timestamp
        };
        this.log.debug('Delivering Log4JS log message to relay.');
        this.log.debug(JSON.stringify(logMessage));
        this.relayLog.log(level, JSON.stringify(logMessage));
      } else {
        next('Proper logging message was not found');
        return;
      }
      req.hasData = true;
      next();
    } catch (err) {
      this.log.error(err);
      next(err);
    }
  }

  errorHandler(err, req, res, next) {
    this.log.debug('Error Handler');
    this.stopRouteTimerError(req);
    this.stopResponseTimerError(req);
    this.setError(err, req, res);
    const errorMsg = {
      status: 500,
      protocol: req.secure ? 'HTTPS' : 'HTTP',
      actualIP: req.connection.remoteAddress,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      callID: req.callID,
      server: req.oshost,
      headers: req.headers,
      performance: { response: req.timers.response, route: req.timers.route },
      error: err
    };
    this.log.error(JSON.stringify(errorMsg));
    next();
  }

  responseHandler(req, res, next) {
    this.log.debug('Response Handler');
    if (req.hasData === true) {
      this.setResponse(req, res);
    }
    next();
  }

  handle404Error(req, res, next) {
    if (!req.hasData && !req.hasError) {
      req.respCode = 404000;
      req.hasError = true;
      next('Endpoint Not Found.');
    } else {
      next();
    }
  }

  timeoutHandler(req, res, next) {
    if (req.timedout) {
      req.respCode = 408000;
      req.hasError = true;
      next('The request data took too long to send, please attempt your request again.');
    } else {
      next();
    }
  }

  // ****************************************************************************
  // Middleware Functions (Metrics Tracking)
  // ***************************************************************************/
  setupTimers(req, res, next) {
    req.timers = {
      response: null,
      responseStart: null,
      route: null,
      routeStart: null
    };
    next();
  }

  startResponseTimer(req, res, next) {
    req.timers.responseStart = Date.now();
    next();
  }

  startRouteTimer(req, res, next) {
    req.timers.routeStart = Date.now();
    next();
  }

  stopResponseTimer(req, res, next) {
    if (req.timers.responseStart) {
      req.timers.response = Date.now() - req.timers.responseStart;
    }
    next();
  }

  stopRouteTimer(req, res, next) {
    if (req.timers.routeStart) {
      req.timers.route = Date.now() - req.timers.routeStart;
    }
    next();
  }

  stopResponseTimerError(req) {
    if (req.timers.responseStart) {
      req.timers.response = Date.now() - req.timers.responseStart;
    }
  }

  stopRouteTimerError(req) {
    if (req.timers.routeStart) {
      req.timers.route = Date.now() - req.timers.routeStart;
    }
  }

  // ****************************************************************************
  // Server Initialization Logic
  // ***************************************************************************/
  init(isLambda) {
    this.setupRelay(this.config);
    this.setupServer(this.app, isLambda);
    this.isActive = true;
  }

  setupRelay(config) {
    const relay = config.logstash.relay;
    this.log.debug(`Setting up logging relay '${relay.appName}' to ` +
      `${relay.host}:${relay.port}.`);
    const results = connectionTester.test(config.logstash.relay.host, 22, 1000);
    if (results.err) {
      this.log.error(results.err);
    }
    this.log.debug(`Connection Active? ${results.success}`);
    this.relayLogger = new RelayLogger(config);
    this.relayLog = this.relayLogger.log;
  }

  setupServer(app, isLambda) {
    this.log.debug('Starting server');

    app.use(this.setupTimers.bind(this));

    // Start Metrics Gathering on Response processing
    app.use(this.startResponseTimer.bind(this));
    app.use(timeout(`${this.timeout}s`));

    // configure app to use bodyParser()
    // this will let us get the data from a POST x-www-form-urlencode
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    // configure app to use multer()
    // this will let us get the data from multipart/form-data
    app.use(multer().array());

    // Create the router and routes for the API
    /* eslint new-cap: "off" */
    this.router = router();
    /* eslint new-cap: "error" */

    // Handle CORS Headers
    app.use(this.handleCORS.bind(this));
    app.options('*', cors({ origin: true, method: ['POST', 'OPTIONS'] }));

    // Add Lambda Context when in Lambda mode
    if (isLambda === true) {
      app.use(awsServerlessExpressMiddleware.eventContext());
    }

    // bind middleware to use for all requests
    // The 'bind' statements are there to preserve the scope of this class
    app.use(this.attachCallID.bind(this));
    // app.use(this.controllers.AuthController.authenticateRequest.bind(this.controllers.AuthController));

    // Start Metrics Gathering on Route processing
    app.use(this.startRouteTimer.bind(this));

    // perform the logic for pushing the logging information
    app.post('/api/logger', this.handleIncomingLog.bind(this));
    app.post('/jsnlog.logger', this.handleIncomingLog.bind(this));

    // Stop Metrics Gathering on Route processing
    app.use(this.stopRouteTimer.bind(this));

    // middleware for general handling of route responses
    app.use(this.timeoutHandler.bind(this));

    // no data from above routes -- 404 error
    app.use(this.handle404Error.bind(this));

    // Stop Metrics Gathering on Response processing
    app.use(this.stopResponseTimer.bind(this));

    app.use(this.errorHandler.bind(this));
    app.use(this.responseHandler.bind(this));

    expressWinston.requestWhitelist.push('body');
    expressWinston.responseWhitelist.push('body', 'locals');

    // Attach Winston Express logger
    app.use(expressWinston.logger({
      winstonInstance: this.log,
      msg: '{ ' + ' "status": {{res.locals.status}}, ' + ' "respCode": {{(req.respCode || 200000)}}, ' +
          ' "protocol": "{{(req.secure?\'HTTPS\':\'HTTP\')}}", ' +
          ' "method": "{{req.method}}", ' +
          ' "endpoint": "{{req.urlpath}}", ' +
          ' "actualIP": "{{req.connection.remoteAddress}}",' +
          ' "ip": "{{req.headers[\'x-forwarded-for\']||req.connection.remoteAddress}}",' +
          ' "callID": "{{req.callID}}",' +
          ' "server": "{{req.oshost}}",' +
          ' "headers": {{JSON.stringify(req.headers)}},' +
          ' "performance": {' +
          '    "response": {{req.timers.response}},' +
          '    "route": {{req.timers.route}},' +
          '  }' +
          '}',
      statusLevels: { success: 'info', warn: 'info', error: 'error' },
      json: true,
      logstash: true,
      meta: true
    }));

    app.disable('x-powered-by');

    // the buck stops here -- all responses are sent, regardless of status
    app.use(this.sendResponse.bind(this));

    if (isLambda !== true) {
      // Start the HTTP server
      this.server = http.createServer(app).listen(this.port);
      this.log.debug(`Listening for HTTP on port ${this.port}`);

      // Start the HTTPS server
      if (this.sslEnabled) {
        this.httpsServer = https
          .createServer({ key: this.sslKey, cert: this.sslCert }, app)
          .listen(this.sslPort);
        this.log.debug(`Listening for HTTPS on port ${this.sslPort}`);
      }
    }
  }
}

module.exports = Server;

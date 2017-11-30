// app.js

const __ = require('lodash');
const Server = require('./app/server.js');
const Logger = require('./app/lib/logger');

const config = require('./config/config');

/**
  * Class representing the app
  * @class App
  */
class App {
  constructor(logger) {
    this.logger = {};
    this.log = {};
    this.setupLogging(logger);
  }

  setupLogging(logger) {
    if (!logger) {
      this.logger = new Logger(config);
    } else {
      this.logger = logger;
    }
    this.log = this.logger.log;
  }

  // ****************************************************************************
  //  Application Shutdown Logic
  // ***************************************************************************/
  handleSIGTERM() {
    this.close(15);
  }

  handleSIGINT() {
    this.close(2);
  }

  close(code) {
    let sigCode;
    code = code || 0;
    switch (code) {
      case 2:
        sigCode = 'SIGINT';
        break;
      case 15:
        sigCode = 'SIGTERM';
        break;
      default:
        sigCode = code;
        break;
    }

    // Perform gracful shutdown here
    this.log.info(`Received exit code ${sigCode}, performing graceful shutdown`);
    if (!__.isNull(this.server) && !__.isUndefined(this.server)) {
      this.server.close();
    }
    // Shutdown the server
    // End the process after allowing time to close cleanly
    setTimeout(
      (errCode) => {
        process.exit(errCode);
      },
      config.server.shutdownTime,
      code
    );
  }

  // ****************************************************************************
  // Application Initialization Logic
  // ***************************************************************************/
  init() {
    // Setup graceful exit for SIGTERM and SIGINT
    process.on('SIGTERM', this.handleSIGTERM.bind(this));
    process.on('SIGINT', this.handleSIGINT.bind(this));

    // Start Logging & Server
    this.log.debug(config);
    this.server = new Server(config, this.log);
    this.server.init();
  }
}

module.exports = App;

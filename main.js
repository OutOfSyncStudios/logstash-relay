// main.js
/* eslint no-console: "off" */

const fs = require('fs');
const pack = require('./package.json');
const program = require('commander');
const App = require('./app');
const Logger = require('./app/lib/logger');

let config = require('./config/config');

const logr = new Logger(config);
const log = logr.log;

program
  .version(pack.version)
  .option('-c, --config <filename>', 'Use the specified configuration file instead of the file in ./config/');

program.on('--help', () => {
  console.log('');
  console.log(`  LogStash-Relay v${pack.version}`);
});

program.parse(process.argv);

if (program.config) {
  log.info('Loading external configuration...');
  let results;
  try {
    if (program.config.substr(-3) === '.js') {
      config = require(program.config);
    } else if (program.config.substr(-5) === '.json') {
      results = fs.readFileSync(program.config);
      config = JSON.parse(results);
    } else {
      log.info('Invalid file provided, external configuration must end with .js or .json');
      log.info('Falling back to default config');
    }
    log.debug('Settings:');
    log.debug(`Listening on Port: ${config.server.port}`);
    log.debug(`Logstash Host: ${config.logstash.relay.host}:${config.logstash.relay.port}`);
    log.debug(`Logstash App Name: ${config.logstash.relay.appName}`);
  } catch (err) {
    console.log(err.stack || err);
    process.exit(1);
  }
}

const appl = new App();
appl.init();

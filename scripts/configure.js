#!/usr/bin/env node

const configFile = './config/config.js';
const baseConfigFile = './config/default-config.js';

const __ = require('lodash');
const fs = require('fs')
const inquirer = require('inquirer');
const validate = require('./validate');
const baseConfig = require('../config/default-config');
const config = require('../config/config');

let conf = __.merge(baseConfig, config);

const modes = [
  'Stand-alone Server',
  'Embedded service',
  'AWS Lambda Function'
];

const questions = [];

function validateInt(val) {
  return validate(val, 'int');
}

function setupQuestions() {
  questions.push({
    type: 'list',
    name: 'mode',
    default: modes,
    choices: modes,
    message: 'Select the server mode:',
  }, {
    type: 'input',
    name: 'port',
    default: conf.server.port,
    message: 'Server port to listen for HTTP requests:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode !== 'AWS Lambda Function');
    }
  }, {
    type: 'input',
    name: 'shutdownTime',
    default: conf.server.shutdownTime,
    message: 'Graceful server shutdown period in milliseconds:',
    validate: validateInt
  }, {
    type: 'input',
    name: 'timeout',
    default: conf.server.timeout,
    message: 'Request timeout period in seconds:',
    validate: validateInt
  }, {
    type: 'confirm',
    name: 'sslEnabled',
    default: conf.server.sslEnabled,
    message: 'Enable SSL?',
    when: (answers) => {
      return (answers.mode !== 'AWS Lambda Function');
    }
  }, {
    type: 'input',
    name: 'sslPort',
    default: conf.server.sslPort,
    message: 'Server port to listen for HTTP requests:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode !== 'AWS Lambda Function' && answers.sslEnabled);
    }
  }, {
    type: 'input',
    name: 'sslKey',
    default: conf.server.sslKey,
    message: 'Full path to SSL Cert (.key) file:',
    when: (answers) => {
      return (answers.mode !== 'AWS Lambda Function' && answers.sslEnabled);
    }
  }, {
    type: 'input',
    name: 'sslCert',
    default: conf.server.sslCert,
    message: 'Full path to SSL Cert (.pem/.crt) file:',
    when: (answers) => {
      return (answers.mode !== 'AWS Lambda Function' && answers.sslEnabled);
    }
  }, {
    type: 'input',
    name: 'logDir',
    default: conf.logging.logDir,
    message: 'Full or relative path (from service base) to the log folder:',
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server');
    }
  }, {
    type: 'confirm',
    name: 'logJson',
    default: conf.logging.options.json,
    message: 'JSON logging?',
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server');
    }
  }, {
    type: 'input',
    name: 'logMaxSize',
    default: conf.logging.options.maxsize,
    message: 'Max log file size in bytes:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server');
    }
  }, {
    type: 'input',
    name: 'logMaxFiles',
    default: conf.logging.options.maxFiles,
    message: 'Max number of rotated log files:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server');
    }
  }, {
    type: 'list',
    name: 'logLevel',
    choices: ['silly', 'debug', 'verbose', 'info', 'warn', 'error'],
    default: conf.logging.options.level,
    message: 'Select lowest logging level:',
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server');
    }
  }, {
    type: 'confirm',
    name: 'logstashLogging',
    default: conf.logging.logstashLogging,
    message: 'Enable LogStash logging for service events?',
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server');
    }
  }, {
    type: 'input',
    name: 'logstashLoggingHost',
    default: conf.logstash.logging.host,
    message: 'Enter the LogStash IP or Hostname for service events:',
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server' && answers.logstashLogging)
    }
  }, {
    type: 'input',
    name: 'logstashLoggingPort',
    default: conf.logstash.logging.port,
    message: 'Enter the LogStash UDP port for service events:',
    validate: validateInt,
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server' && answers.logstashLogging)
    }
  }, {
    type: 'input',
    name: 'logstashLoggingAppName',
    default: conf.logstash.logging.appName,
    message: 'Enter the unqiue App Name to use for LogStash service events:',
    when: (answers) => {
      return (answers.mode === 'Stand-alone Server' && answers.logstashLogging)
    }
  }, {
    type: 'input',
    name: 'logstashRelayHost',
    default: conf.logstash.relay.host,
    message: 'Enter the LogStash IP or Hostname for relay events:'
  }, {
    type: 'input',
    name: 'logstashRelayPort',
    default: conf.logstash.relay.port,
    message: 'Enter the LogStash UDP port for relay events:',
    validate: validateInt
  }, {
    type: 'input',
    name: 'logstashRelayAppName',
    default: conf.logstash.relay.appName,
    message: 'Enter the unqiue App Name to use for LogStash relay events:'
  });
}

function mapAnswer(answers) {

}

function doConfig() {
  setupQuestions();
  inquirer.prompt(questions)
  .then((answers) => {
    mapAnswer(answers);
    fs.writeFileSync(configFile, `module.exports = ${JSON.stringify(conf, null, 2)};`);
  })
  .catch((err) => {
    console.error(err.stack || err);
  })
}


inquirer.prompt([
  {
    type: 'confirm',
    name: 'ok',
    default: false,
    message: 'This option will overwrite your existing configuration. Are you sure?'
  }
])
.then((answers) => {
  if (answers.ok) {
    doConfig();
  } else {
    console.log('Operation aborted');
  }
})
.catch((err) => {
  console.error(err.stack || err);
});

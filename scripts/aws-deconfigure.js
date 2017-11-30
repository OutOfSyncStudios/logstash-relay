#!/usr/bin/env node

const inquirer = require('inquirer');
const modifyFiles = require('./utils')
const packageJson = require('../package.json')
const config = packageJson.config

inquirer.prompt([
  {
    type: 'confirm',
    name: 'ok',
    default: false,
    message: 'You are about to destroy the current aws configuration. This could lead to undesirable results, are you sure?'
  }
])
.then((answers) => {
  if (answers.ok) {
    modifyFiles(['./simple-proxy-api.yaml', './package.json', './cloudformation.yaml'], [{
        regexp: new RegExp(config.accountId, 'g'),
        replacement: 'YOUR_ACCOUNT_ID'
    }, {
        regexp: new RegExp(config.region, 'g'),
        replacement: 'YOUR_AWS_REGION'
    }, {
        regexp: new RegExp(config.s3BucketName, 'g'),
        replacement: 'YOUR_UNIQUE_BUCKET_NAME'
    }, {
        regexp: new RegExp(config.functionName, 'g'),
        replacement: 'YOUR_SERVERLESS_EXPRESS_LAMBDA_FUNCTION_NAME'
    }])
  } else {
    console.log('Operation aborted');
  }
})
.catch((err) => {
  console.error(err.stack || err);
});

#!/usr/bin/env node

const __ = require('lodash');
const program = require('commander');
const inquirer = require('inquirer');
const modifyFiles = require('./utils');
const pack = require('../package.json');

const availableRegions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'sa-east-1'
];

const options = {
  account: null,
  lambda: null,
  bucket: null,
  region: null
};

const questions = [];

function performModify() {
  modifyFiles(['./package.json'],
    [{
      regexp: /("s3BucketName": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.bucket}",`
    }, {
      regexp: /("region": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.region}",`
    }, {
      regexp: /("functionName": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.lambda}",`
    }, {
      regexp: /("accountId": )"(\w*)",/,
      replacement: `$1"${options.account}",`
    }]
  );

  modifyFiles(['./cloudformation.yaml'],
    [{
      regexp: /^(      Variables:\n        ServerlessExpressLambdaFunctionName: \!Ref )(\w*)$/m,
      replacement: `$1${options.lambda}`
    }, {
      regexp: /^(      Action: lambda:InvokeFunction\n      FunctionName: !GetAtt )(.*)$/m,
      replacement: `$1${options.lambda}.Arn`
    }, {
      regexp: /^(  \w*):\n(    Type: AWS::Serverless::Function)$/m,
      replacement: `  ${options.lambda}:\n$2`
    }, {
      regexp: /^(        - "#\/functions\/")\n(        - !Ref )(\w*)$/m,
      replacement: `$1\n$2${options.lambda}`
    }]
  );

  modifyFiles(['./simple-proxy-api.yaml'],
    [{
      regexp: /(uri: arn:aws:apigateway:)([A-Za-z0-9_-]*)(:lambda:path\/2017-11-28\/functions\/arn:aws:lambda:)([A-Za-z0-9_-]*):([A-Za-z0-9_-]*)(:function:\${stageVariables.ServerlessExpressLambdaFunctionName}\/invocations)/g,
      replacement: `$1${options.region}$3${options.region}:${options.account}$6`
    } ]
  );
}

function setupQuestions() {
  if (!program.account || program.account.length !== 12) {
    questions.push({
      type: 'input',
      name: 'account',
      message: 'Supply a 12-digit AWS Account ID:',
      validate: (v) => {
        if ((/^\w{12}$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid 12 digit AWS account';
        }
      }
    });
  } else {
    options.account = program.account;
  }

  if (!program.lambda) {
    questions.push({
      type: 'input',
      name: 'lambda',
      message: 'Enter the AWS function name:',
      default: 'LogStashRelayFunction',
      validate: (v) => {
        if ((/^[a-zA-Z_$][a-zA-Z_\-$0-9]*$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid function name. Only Alphanumercic, Underscore, and Dash are allowed and must not start with a number or dash.'
        }
      }
    });
  } else {
    options.lambda = program.lambda;
  }

  if (!program.bucket) {
    questions.push({
      type: 'input',
      name: 'bucket',
      message: 'Enter a unique AWS S3 Bucket name:',
      default: 'LogStashRelayBucket',
      validate: (v) => {
        if ((/^[a-zA-Z_\-$0-9]*$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid bucket name. Only Alphanumercic, Underscore, and Dash are allowed.'
        }
      }
    });
  } else {
    options.bucket = program.bucket;
  }

  if (!program.region || !availableRegions.includes(program.region)) {
    questions.push({
      type: 'list',
      name: 'region',
      default: availableRegions,
      choices: availableRegions,
      message: 'Select an AWS Region:'
    });
  } else {
    options.region = program.region;
  }
}

function mapAnswers(answers) {
  if (answers.account) { options.account = answers.account; }
  if (answers.lambda) { options.lambda = answers.lambda; }
  if (answers.bucket) { options.bucket = answers.bucket; }
  if (answers.region) { options.region = answers.region; }
}

function doConfig() {
  setupQuestions();
  if (questions.length !== 0) {
    inquirer.prompt(questions)
    .then((answers) => {
      mapAnswers(answers);
      performModify();
    })
    .catch((err) => {
      console.error(err.stack || err);
    });
  } else {
    performModify();
  }
}

program
  .version(pack.version)
  .option('-a, --account <accountID>','The AWS Account ID to use.')
  .option('-b, --bucket <bucketName>', 'The S3 Bucket Name to configure and use.')
  .option(
    '-l, --lambda <functionName>',
    'The name of the Lambda function to configure and use. Defaults to "AwsServerlessExpressFunction"')
  .option('-r, --region <awsRegion>', 'The AWS region to use. Defaults to "us-east-1"')
  .option('-f, --force', 'Do not ask for confirmation')
  .parse(process.argv);

if (program.force === true) {
  doConfig();
} else {
  inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      default: false,
      message: 'You are about to destroy the current aws configuration. Are you sure?'
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
}

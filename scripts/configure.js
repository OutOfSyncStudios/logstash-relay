#!/usr/bin/env node

const modifyFiles = require('./utils');
const program = require('commander');
const prompt = require('prompt');
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
  region: null,
  bucket: null
};

const promptOpts = {
  properties: {}
};

function performModify() {
  console.log('aaaa');
  console.log(JSON.stringify(options));
  modifyFiles(['./simple-proxy-api.yaml', './package.json', './cloudformation.yaml'],
    [{
      regexp: /YOUR_ACCOUNT_ID/g,
      replacement: options.account
    }, {
      regexp: /YOUR_AWS_REGION/g,
      replacement: options.region
    }, {
      regexp: /YOUR_UNIQUE_BUCKET_NAME/g,
      replacement: options.bucket
    }, {
      regexp: /YOUR_SERVERLESS_EXPRESS_LAMBDA_FUNCTION_NAME/g,
      replacement: options.lambda
    }]
  );
}

program
  .version(pack.version)
  .option('-a, --account <accountID>','The AWS Account ID to use.')
  .option('-b, --bucket <bucketName>', 'The S3 Bucket Name to configure and use.')
  .option(
    '-l, --lambda <functionName>',
    'The name of the Lambda function to configure and use. Defaults to "AwsServerlessExpressFunction"')
  .option('-r, --region <awsRegion>', 'The AWS region to use. Defaults to "us-east-1"');

if (!program.lambda) {
  promptOpts.properties.lambda = {
    name: 'lambda',
    description: 'Enter the AWS Lambda function name',
    default: 'AwsServerlessExpressFunction',
    type: 'string',
    required: true
  };
} else {
  options.lambda = program.lambda;
}

if (!program.region || !availableRegions.includes(program.region)) {
  promptOpts.properties.region = {
    name: 'region',
    description: 'Enter an AWS region',
    message: `Must be a valid AWS Region (${availableRegions.join(', ')})`,
    default: 'us-east-1',
    type: 'string',
    required: true,
    conform: (v) => {
      return availableRegions.includes(v);
    }
  };
} else {
  options.region = program.region;
}

if (!program.account || program.account.length !== 12) {
  promptOpts.properties.account = {
    name: 'account',
    description: 'Supply a 12 digit AWS account ID',
    message: 'Must be a valid 12 digit AWS account',
    type: 'string',
    required: true,
    pattern: /^\w{12}$/
  };
} else {
  options.account = program.account;
}

if (!program.bucket) {
  promptOpts.properties.bucket = {
    name: 'bucket',
    description: 'Supply a unique AWS S3 Bucket name',
    message: 'AWS S3 Bucket name can not be blank',
    type: 'string',
    required: true
  };
} else {
  options.bucket = program.bucket;
}

if (promptOpts.properties !== {}) {
  prompt.start();
  prompt.get(promptOpts, (err, result) => {
    if (result) {
      console.log(JSON.stringify(result));
      if (result.lambda) { options.lambda = result.lambda; }
      if (result.region) { options.region = result.region; }
      if (result.account) { options.account = result.account; }
      if (result.bucket) { options.bucket = result.bucket; }
      console.log(JSON.stringify(options));
      performModify();
    }
    prompt.stop();
  });
} else {
  performModify();
}

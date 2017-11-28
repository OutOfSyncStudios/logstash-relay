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

promptOpts = {
  properties: []
};

program
  .version(pack.version)
  .option('-a, --account <accountID>','The AWS Account ID to use.')
  .option('-b, --bucket <bucketName>', 'The S3 Bucket Name to configure and use.')
  .option(
    '-l, --lambda <functionName>',
    'The name of the Lambda function to configure and use. Defaults to "AwsServerlessExpressFunction"')
  .option('-r, --region <awsRegion>', 'The AWS region to use. Defaults to "us-east-1"');

if (!program.lambda) {
  promptOpts.properties.push({
    name: 'lambda',
    description: 'Enter the AWS Lambda function name',
    default: 'AwsServerlessExpressFunction',
    type: 'string',
    required: true
  });
}

if (!program.region || !availableRegions.includes(program.region)) {
  promptOpts.properties.push({
    name: 'region',
    description: 'Enter an AWS region',
    message: `Must be a valid AWS Region (${availableRegions.join(', ')})`,
    default: 'us-east-1',
    type: 'string',
    required: true,
    conform: (v) => {
      return availableRegions.includes(v);
    }
  });
}

if (!program.account || program.account.length !== 12) {
  promptOpts.properties.push({
    name: 'account',
    description: 'Supply a 12 digit AWS account ID',
    message: 'Must be a valid 12 digit AWS account',
    type: 'string',
    required: true,
    pattern: /^\w{12}$/
  });
}

if (!program.bucket) {
  promptOpts.properties.push({
    name: 'bucket',
    description: 'Supply a unique AWS S3 Bucket name',
    message: 'AWS S3 Bucket name can not be blank',
    type: 'string',
    required: true
  });
}

if (promptOpts.properties.length !== 0) {
  prompt.start();
  prompt.get(promptOpts, (err, result) => {
    if (result) {
      if (result.lambda) { program.lambda = result.lambda; }
      if (result.region) { program.region = result.region; }
      if (result.account) { program.account = result.account; }
      if (result.bucket) { program.bucket = result.bucket; }
    }
    prompt.stop();
  });
}

modifyFiles(['./simple-proxy-api.yaml', './package.json', './cloudformation.yaml'],
  [{
    regexp: /YOUR_ACCOUNT_ID/g,
    replacement: program.account
  }, {
    regexp: /YOUR_AWS_REGION/g,
    replacement: program.region
  }, {
    regexp: /YOUR_UNIQUE_BUCKET_NAME/g,
    replacement: program.bucket
  }, {
    regexp: /YOUR_SERVERLESS_EXPRESS_LAMBDA_FUNCTION_NAME/g,
    replacement: program.lambda
  }]
);

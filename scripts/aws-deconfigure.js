#!/usr/bin/env node

/* eslint-disable no-console */
const inquirer = require('inquirer');
const modifyFiles = require('./utils');

const defaults = {
  account: 'YOUR_ACCOUNT_ID',
  lambda: 'YOUR_SERVERLESS_EXPRESS_LAMBDA_FUNCTION_NAME',
  bucket: 'YOUR_UNIQUE_BUCKET_NAME',
  prefix: 'YOUR_S3_PREFIX',
  region: 'YOUR_AWS_REGION'
};

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
      modifyFiles(
        ['./package.json'],
        [
          {
            regexp: /("s3BucketName": )"([A-Za-z0-9_-]*)",/,
            replacement: `$1"${defaults.bucket}",`
          }, {
            regexp: /("s3Prefix": )"([a-zA-Z_\-0-9/]*)",/,
            replacement: `$1"${defaults.prefix}",`
          }, {
            regexp: /("region": )"([A-Za-z0-9_-]*)",/,
            replacement: `$1"${defaults.region}",`
          }, {
            regexp: /("functionName": )"([A-Za-z0-9_-]*)",/,
            replacement: `$1"${defaults.lambda}",`
          }, {
            regexp: /("accountId": )"(\w*)",/,
            replacement: `$1"${defaults.account}",`
          }
        ]
      );

      modifyFiles(
        ['./cloudformation.yaml'],
        [
          {
            regexp: /^( {6}Variables:\n {8}ServerlessExpressLambdaFunctionName: !Ref )(\w*)$/m,
            replacement: `$1${defaults.lambda}`
          }, {
            regexp: /^( {6}Action: lambda:InvokeFunction\n {6}FunctionName: !GetAtt )(.*)$/m,
            replacement: `$1${defaults.lambda}.Arn`
          }, {
            regexp: /^( {2}\w*):\n( {4}Type: AWS::Serverless::Function)$/m,
            replacement: `  ${defaults.lambda}:\n$2`
          }, {
            regexp: /^( {8}- "#\/functions\/")\n( {8}- !Ref )(\w*)$/m,
            replacement: `$1\n$2${defaults.lambda}`
          }
        ]
      );

      modifyFiles(
        ['./simple-proxy-api.yaml'],
        [
          {
            regexp: /(uri: arn:aws:apigateway:)([A-Za-z0-9_-]*)(:lambda:path\/2017-11-28\/functions\/arn:aws:lambda:)([A-Za-z0-9_-]*):([A-Za-z0-9_-]*)(:function:\${stageVariables.ServerlessExpressLambdaFunctionName}\/invocations)/g,
            replacement: `$1${defaults.region}$3${defaults.region}:${defaults.account}$6`
          }
        ]
      );
    } else {
      console.log('Operation aborted');
    }
  })
  .catch((err) => {
    console.error(err.stack || err);
  });

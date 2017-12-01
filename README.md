# Logstash-Relay

[![NPM](https://nodei.co/npm/logstash-relay.png?downloads=true)](https://nodei.co/npm/logstash-relay/)

[![Actual version published on npm](http://img.shields.io/npm/v/logstash-relay.svg)](https://www.npmjs.org/package/logstash-relay)
[![Travis build status](https://travis-ci.org/MediaXPost/logstash-relay.svg)](https://www.npmjs.org/package/logstash-relay)
[![Total npm module downloads](http://img.shields.io/npm/dt/logstash-relay.svg)](https://www.npmjs.org/package/logstash-relay)
[![Package Quality](http://npm.packagequality.com/shield/logstash-relay.svg)](http://packagequality.com/#?package=logstash-relay)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/f0adb055adc04f98941b7832bdb286ed)](https://www.codacy.com/app/chronosis/logstash-relay?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=MediaXPost/logstash-relay&amp;utm_campaign=Badge_Grade)
[![Codacy Badge](https://api.codacy.com/project/badge/Coverage/d264ea63a69a4e3899ce06d6e81f18fb)](https://www.codacy.com/app/chronosis/logstash-relay?utm_source=github.com&utm_medium=referral&utm_content=chronosis/logstash-relay&utm_campaign=Badge_Coverage)
[![Dependencies badge](https://david-dm.org/MediaXPost/logstash-relay/status.svg)](https://david-dm.org/MediaXPost/logstash-relay?view=list)

A simple NodeJS service to relay JSNLogs or Log4Javascript/Log4JS(client) event messages to Logstash.

# Table of Contents

  1. [Documentation](#documentation)
      1. [Modes of Operation](#relay-modes)
          1. [Stand-alone Service](#standalone)
              1. [Installation](#standalone-installation)
              2. [Configuration](#standalone-configuration)
                  1. [Port Usage](#standalone-configuration-ports)
                  2. [SSL/TLS Certs](#standalone-configuration-certs)
              3. [Running](#standalone-running)
          2. [Embedded Service](#embedded)
              1. [Installation](#embedded-installation)
              2. [Usage](#embedded-usage)
              3. [API](#embedded-api)
          3. [AWS Lambda Function](#awslambda)
              1. [Installation, Packaging, and Deployment](#awslambda-installation)
              2. [Usage](#awslambda-usage)
      2. [Configuration Object](#relay-configuration)
      3. [Logging Object](#relay-logging)
      4. [Logstash](#logstash)
          1. [Configuration](#logstash-configuration)
          2. [Event Data](#logstash-eventdata)
      5. [REST API](#restapi)
          1. [Endpoints](#restapi-endpoints)
          2. [Calling](#restapi-calling)
  2. [License](#license)

# Goals
**`logstash-relay`** is designed to be a simple pass-through service that relays external logging events from JSNLogs or Log4JS/Log4Javascript to Logstash with the goal of easily facilitating the collection of external logging centrally into ElasticSearch. It can be embedded within another service, setup and configured as a stand-alone service, or setup and configured as an AWS Lambda function.

# [Documentation](#documentation)
<a name="documentataion"></a>

## [Modes of Operation](#relay-modes)
<a name="relay-modes"></a>

The logstash-relay service has three possible modes of operation:
 * [Stand-alone Service](#standalone)
 * [Embedded Service](#embedded)
 * [AWS Lambda Function](#awslambda)

### [Stand-alone Service](#standalone)
<a name="standalone"></a>

The stand-alone option is available if you would like to host your own server architecture with which to run the relay. You will need to ensure that firewall rules for your server architecture are open to allow traffic from the appropriate ports.

#### [Installation](#standalone-installation)
<a name="standalone-installation"></a>

To install, clone the git repository:

```shell
$ git clone https://github.com/MediaXPost/logstash-relay.git
$ cd logstash-relay
```

#### [Configuration](#standalone-configuration)
<a name="standalone-configuration"></a>
To setup your configuration, run:
```shell
npm run config
```
This will ask a series of questions which provides the base configuration. Alternatively, you can manually edit the `<logstash-relay-home>/config/config.js` file to make adjustments. The configuration file is an exported version of the [Configuration Object](#relay-configuration).

##### [Port Usage](#standalone-configuration-ports)
<a name="standalone-configuration-ports"></a>
By default, Logstash-Relay listens for HTTP request over port 8080 and HTTPS requests over port 8443 instead of ports 80 and 443 respectively. For security, on most Linux-based platforms the ports 80 and 443 are not available for services that do not run as the root user. To avoid any potential security issues or configuration hangups, it is recommended that Logstash-Relay is configured to use the default ports and that ports 80 and 443 are rerouted using `iptables` (or the system equivalent) to Logstash-Relay's default ports.

***For Example:***

**Add Rules**
```shell
$ iptables -t nat -A PREROUTING -i eth0 -p tcp --sport 80 --dport 8080 -j REDIRECT
$ iptables -t nat -A PREROUTING -i eth0 -p tcp --sport 443 --dport 8443 -j REDIRECT
$ service iptables save
```

**Delete Rules**
```shell
$ iptables -t nat -D PREROUTING -i eth0 -p tcp --sport 80 --dport 8080 -j REDIRECT
$ iptables -t nat -D PREROUTING -i eth0 -p tcp --sport 443 --dport 8443 -j REDIRECT
$ service iptables save
```

##### [SSL/TLS Certs](#standalone-configuration-certs)
<a name="standalone-configuration-certs"></a>
If handling HTTPS requests are desired in stand-alone mode, then SSL/TLS certs must be included within the `./config/ssl` folder of the project. Additionally, the file locations for the certificate files must be provided in the service configuration located in `./config/config.js`. This file may be manually edited or configured using `npm run config` on the command-line. Both the Key and Cert files must be included and the files must have read permissions for the user that will be used to run the service.

#### [Running](#standalone-running)
<a name="standalone-running"></a>

Before running, [Logstash should be configured](#logstash-configuration) as outlined below. You should perform any of the operations listed below from the `logstash-relay` folder.

**Note:** When using stand-alone mode, it is recommended that a process manager, such as [PM2](https://www.npmjs.com/package/pm2), be used. Regardless of how the service is run, proper startup scripts will be needed to ensure that Logstash-Relay restarts whenever the server is rebooted.

##### With NodeJS
```shell
$ node main.js
```

##### With NodeJS and an external configuration
It is possible to pass an external configuration file.

```shell
$ node main.js -c <fullpath to config file>
```

##### With PM2
```shell
$ pm2 start main.js -n "Logstash-Relay" -i 1
```

##### With PM2 and an external configuration
It is possible to pass an external configuration file.

```shell
$ pm2 start main.js -n "Logstash-Relay" -i 1 -- -c <fullpath to config file>
```

### [Embedded Service](#embedded)
<a name="embedded"></a>

The embedded option is available if you would like to include the service bundled as a part of another service.

#### [Installation](#embedded-installation)
<a name="embedded-installation"></a>

```shell
npm install logstash-relay
```

#### [Usage](#embedded-usage)
<a name="embedded-usage"></a>
Within your library or application, add the following code:

```js
const LogstashRelay = require('logstash-relay');

// Create the relay service
let relay = new LogstashRelay(config, logger);
// Start the relay service
relay.init();
// Close the relay service
relay.close();
```

**Note:** The same considerations for [port usage](#standalone-configuration-ports) and [certificates](#standalone-configuration-cerst) apply to using the service in embedded mode.

#### [API](#embedded-api)
<a name="embedded-api"></a>

##### constructor(config[, logger])
Creates a new LogstashRelay agent.
```js
const LogstashRelay = require('logstash-relay');

let relay =  new LogstashRelay(config, logger);
```

Where the [`config`](#embedded-configuration) and [`logger`](#embedded-logger) parameters are as outlined below. The `logger` is optional, and if no logger is provided then all logging is sent to `/dev/null`.

##### .init()
Initializes and starts the Logstash-Relay agent.
```js
relay.init();
```

##### .close()
Shuts down the Logstash-Relay agent. Because the agent maintains an active thread, this operation must be performed to allow the application to gracefully shut down.
```js
relay.close();
```

### [AWS Lambda Function](#awslambda)
<a name="awslambda"></a>
The service is also available to be run in a completely serverless environment by utilizing it as an AWS Lambda Function connected through CloudFormation and API Gateway.  To use this mode, you must have access to an AWS Account ID that has permissions to create and use CloudFormation, S3, API Gateway, CloudFront, and Lambda resources.

#### [Installation, Packaging, and Deployment](#awslambda-installation)
<a name="awslambda-installation"></a>

These steps support Linux and Mac only. When using Windows environment locally, it is recommended that a staging AWS EC2 instance with NVM(NodeJS) and Python is setup and used.

  1. If it is not already, install the [AWS CLI](https://aws.amazon.com/cli/) to your staging environment (mac/linx only).
  2. Clone the git repo:
  ```shell
  $ git clone https://github.com/MediaXPost/logstash-relay.git
  $ cd logstash-relay
  ```
  3. Run the base configurator:
  ```shell
  $ npm run config
  ```
  4. Run the AWS configurator:
  ```shell
  $ npm run aws-config
  ```
  5. Run the Setup:
  ```shell
  $ npm run setup
  ```

  This last step will create an S3 Bucket and a CloudFormation Stack. The CloudFormation Stack will in turn setup an AWS Lambda function and connect it to CloudFront and API GateWay. Additionally, routing through API Gateway and Route53 are possible to create a "pretty" URL that can connect to your API Gateway endpoint for the Lambda function. Please consult the [AWS API Gateway documentation](http://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html) for additional details.

#### [Usage](#awslambda-usage)
<a name="awslambda-usage"></a>

The Lambda function can be called by making the appropriate [REST Endpoint](#restapi) request to the API Gateway `prod` endpoint. The correct `prod` Invoke URL can be retrieved throug the [API Gateway Dashboard](https://console.aws.amazon.com/apigateway/home) under APIs > (Your LogStashRelayAPI Name) > Stages.

## [Configuration Object](#relay-configuration)
<a name="relay-configuration"></a>
```js
{
  server: {
    port: 8080,
    shutdownTime: 1000,
    timeout: 5,
    sslEnabled: false,
    sslPort: 8443,
    sslKey: `${__dirname}/ssl/localhost.key`,
    sslCert: `${__dirname}/ssl/localhost.pem`
  },
  logging: {
    // Logging Configuration
    logDir: './logs',
    options: { json: false, maxsize: '10000000', maxFiles: '10', level: 'silly' },
    logstashLogging: false
  },
  logstash: {
    logging: { host: 'logstash-server', port: 5000, appName: 'logstash-relay' },
    relay: { host: 'logstash-relay-server', port: 5050, appName: 'client-errors' }
  }
}
```

|parameter|type|description|
|---------|----|-----------|
|**`server.port`**|Integer|The server port to listen for HTTP requests|
|**`server.shutdownTime`**|Integer|Time in millisecond to allow for graceful shutdown|
|**`server.timeout`**|Integer|Time in seconds to wait to receive data from client before timeing out|
|**`server.sslEnabled`**|Boolean|Enable handling of HTTPS requests (***stand-alone and embedded modes only***)|
|**`server.sslPort`**|Integer|The server port to listen for HTTPS request when `sslEnabled === true`|
|**`server.sslKey`**|String|The full path to the Certificate .key file for HTTPS request when `sslEnabled === true`|
|**`server.sslCert`**|String|The full path to the Certificate .pem/.crt file for HTTPS request when `sslEnabled === true`|
|**`logging`**|Object|Required but only used in stand-alone mode. These options only pertain to logging events generated by the service, not events which are being relayed through the endpoints.|
|**`logging.logDir`**|Integer|The full or relative path (from the Logstash-Relay base folder to store logs|
|**`logging.options.json`**|Boolean|Store Logstash-Relay service events in JSON format|
|**`logging.options.maxsize`**|Integer String|Max logfile size in bytes before logrotation|
|**`logging.options.maxFiles`**|Integer String|Max number of rotated logfiles to keep for logrotation|
|**`logging.options.level`**|String|The lowest log level to store in files (silly,debug,info,warn,error)|
|**`logging.logstashLogging`**|Boolean|Send service log events to logstash|
|**`logstash.logging`**|Object|Logstash information for Logstash-Relay log events when `logging.logstashLogging === true`|
|**`logstash.relay`**|Object|Logstash information for relayed log events|
|**`logstash.*.host`**|String|IP/Domain of the logstash server for this configuration|
|**`logstash.*.port`**|Integer|UDP Port that handled the event|
|**`logstash.*.appName`**|String|Unique identifying name that Logstash uses to classify events sent to ElasticSearch|

### [Logging Object](#relay-logging)
<a name="relay-logging"></a>
The Logging object is an instance of any logging library, such as [Winston](https://www.npmjs.com/package/winston) or [Bunyan](https://www.npmjs.com/package/bunyan), which support the `.error(...)`, `.info(...)`, `.debug(...)`, and `.log(...)` methods. When in stand-alone mode, the server will use the configuration values to create an instance of Winston.

## [Logstash](#logstash)
<a name="logstash"></a>

### [Configuration](#logstash-configuration)
<a name="logstash-configuration"></a>
This package contains two files -- `./config/logstash-relay.conf` and `./config/logstash-logging.conf` -- that are necessary for proper configuration of the Logstash to listen for incoming events on the correct UDP ports.

`logstash-logging.conf` is only used for the stand-alone mode and handles events created by Logstash-Relay itself when the option `logging.logstashLogging` is set to `true` in the service configuration.

`logstash-relay.conf` handles all events that are passed to the relay and is necessary for proper functioning.

To setup Logstash with these files:

    1. Copy the appropriate files to the Logstash server instance configuration folder. This is usually `/etc/logstash/conf.d` for most configurations.
    2. Edit the file(s) and update the ElasticSearch server host address as appropriate for the environment.
    3. Restart Logstash -- usually this is done with the command `$ initctl restart logstash`.


### [Event Data](#logstash-eventdata)
<a name="logstash-eventdata"></a>
Event data is passed to Logstash as a JSON object formatted like below:
```js
{
  type: 'client_error',
  name: 'The name of the log',
  requestID: 'af4b33d2ae870d',
  client_error: 'error message or JSON object',
  actualIP: 'client_IP_address',
  ip: 'forwarded_client_IP_address_from_proxy',
  callID: 'UID for the relay request',
  headers: 'An object containing all http headers sent to the server',
  clientTimestamp: timestamp
}
```

|parameter|type|description|
|---------|----|-----------|
|**`type`**|String|Always 'client_error'|
|**`name`**|String|The log name from JSNLogs events, not provided in Log4JS events|
|**`requestID`**|String|A unique id used by JSNLogs to group events together, not provided in Log4JS events|
|**`client_error`**|String or Object|The error message or object that was provided in the event|
|**`actual_IP`**|String|The IPv4 or IPv6 of the request origin. If the request was proxied, this will be the proxy server address|
|**`ip`**|String|The IPv4 or IPv6 of the request origin. If the request contains an x-forward header, then this will be the forwarded address|
|**`callID`**|String|A UUIDv4 for the Logstash-Relay request, used for request tracking|
|**`headers`**|Object|An object containing all the request headers from the origin. This usually contains the user-agent and other important details|
|**`clientTimestamp`**|Timestamp|A timestamp of when the error was generated on the client. For JSNLogs, this will be the time the event was generated. For Log4JS, this will be the time the event was recieved by the relay.|

## [REST API](#restapi)
<a name="restapi"></a>
Once the server is setup and running, then the REST API microservice will be available. The service provides two identical POST endpoints.

### [Endpoints](#restapi-endpoints)
<a name="restapi-endpoints"></a>

### OPTIONS *
This exists for CORS requests.

### POST /api/logger
### POST jsnlog.logger
Takes standard JSNLogs or Log4JS events passed in the `POST` `body`, and sends them to the configured Logstash service.

#### JSNLogs Events
JSNLogs events are structured as follows:
```js
{
  r: 'requestID',
  lg: [
    {
      n: 'logName',
      l: 'logLevel',
      t: timestamp
      m: 'logMessage (may be a JSON object or string)'
    },
    ...
  ]
}
```

#### Log4JS Events
```js
{
  level: 'logLevel',
  message: 'logMessage (string only)'
}
```

### [Calling](#restapi-calling)
<a name="restapi-calling"></a>

Setup JSNLogs or Log4JS to create AJAX requests that point to `http(s)://<yourserviceURL>/api/logger` or `http(s)://<yourserviceURL>/jsnlog.logger`.  Alternatively, call these endpoints directly in your client or server application using one of the log formats outlined above.



# License
<a name="license"></a>

Copyright (c) 2017 Jay Reardon -- Licensed under the MIT license.

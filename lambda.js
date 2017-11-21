const awsServerlessExpress = require('aws-serverless-express');
const App = require('./app');

const binaryMimeTypes = [
  'application/javascript',
  'application/json',
  'application/octet-stream',
  'application/xml',
  'font/eot',
  'font/opentype',
  'font/otf',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'text/comma-separated-values',
  'text/css',
  'text/html',
  'text/javascript',
  'text/plain',
  'text/text',
  'text/xml'
];

const app = new App();
app.init(true);

const server = awsServerlessExpress.createServer(app.server.app, null, binaryMimeTypes);

exports.handler = ((event, context) => {
  awsServerlessExpress.proxy(server, event, context);
});

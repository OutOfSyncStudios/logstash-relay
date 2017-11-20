module.exports = {
  server: {
    port: 8080,
    shutdownTime: 1000,
    namespace: '/',
    timeout: 5,
    sslEnabled: true,
    sslPort: 8443,
    sslKey: `${__dirname}/ssl/localhost.key`,
    sslCert: `${__dirname}/ssl/localhost.pem`
  },
  logging: {
    // Logging Configuration
    logDir: './logs',
    options: { json: false, maxsize: '10000000', maxFiles: '10', level: 'silly' }
  },
  logstash: {
    logging: { host: 'logstashserver', port: 5001, appName: 'loggingRelay-local' },
    relay: { host: 'logstashserver', port: 5051, appName: 'client-errors' }
  }
};

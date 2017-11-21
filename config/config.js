module.exports = {
  server: {
    port: 8080,
    shutdownTime: 1000,
    namespace: '/',
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
    logging: { host: 'logstash-server', port: 5000, appName: 'logging-relay' },
    relay: { host: 'logstash-relay-server', port: 5050, appName: 'client-errors' }
  }
};

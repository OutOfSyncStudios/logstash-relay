const request = require('supertest');
const test = require('unit.js');
const config = require('../config/config');

describe('hermes', () => {
  const Hermes = require('../');
  const logRelay = new Hermes(config);

  let svr;

  it('load', () => {
    const MyModule = require('../');
    const myClass = new MyModule(config);

    test.assert(myClass instanceof Hermes);
  });

  it('startup', async() => {
    await logRelay.init();
    svr = logRelay.server;
    test.assert(logRelay.isActive);
  }).timeout(3000);

  it('Bad Endpoint GET', (done) => {
    request(svr).get('/test')
      .expect(500, done);
  });

  it('Bad Endpoint POST', (done) => {
    request(svr).post('/test')
      .expect(500, done);
  });

  it('Good Endpoint GET', (done) => {
    request(svr).get('/api/logger')
      .expect(500, done);
  });

  it('Good Endpoint POST -- no data', (done) => {
    request(svr).post('/api/logger')
      .expect(500, done);
  });

  it('Good Endpoint POST -- missing data', (done) => {
    request(svr).post('/api/logger')
      .send({ level: 'error' })
      .expect(500, done);
  });

  it('Good Endpoint POST -- good Log4JS data', (done) => {
    request(svr).post('/api/logger')
      .send({ level: 'error', message: 'LAME' })
      .expect(200, done);
  });

  /* eslint id-length: off */
  it('Good Endpoint POST -- good JSNLogs data', (done) => {
    request(svr).post('/api/logger')
      .send({ r: 'ABCDEFG', lg: [{ n: 'test', l: 'error', t: Date.now(), m: 'LAME' }] })
      .expect(200, done);
  });

  it('shutdown', () => {
    logRelay.close();
    test.assert(!logRelay.isActive);
  });
});

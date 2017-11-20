const test = require('unit.js');
const config = require('../config/config');

describe('hermes', () => {
  const Hermes = require('../');
  const logRelay = new Hermes(config);

  it('load', () => {
    const MyModule = require('../');
    const myClass = new MyModule(config);

    test.assert(myClass instanceof Hermes);
  });

  it('startup', () => {
    logRelay.init();
    test.assert(logRelay.isActive);
  });

  it('shutdown', () => {
    logRelay.close();
    test.assert(!logRelay.isActive);
  });
});

'use strict';

const {
  prepareWorkerThreadExecution,
  prepareMainThreadExecution
} = require('internal/process/pre_execution');

if (internalBinding('worker').isMainThread) {
  prepareMainThreadExecution(true);
} else {
  prepareWorkerThreadExecution();
}

(function () {
  var __require__ = require;
  var fs = __require__('fs');
  var vm = __require__('vm');
  function readPrelude (fd) {
    var PAYLOAD_POSITION = '// PAYLOAD_POSITION //' | 0;
    var PAYLOAD_SIZE = '// PAYLOAD_SIZE //' | 0;
    var PRELUDE_POSITION = '// PRELUDE_POSITION //' | 0;
    var PRELUDE_SIZE = '// PRELUDE_SIZE //' | 0;
    if (!PRELUDE_POSITION) {
      // no prelude - remove entrypoint from argv[1]
      process.argv.splice(1, 1);
      return { undoPatch: true };
    }
    var prelude = Buffer.alloc(PRELUDE_SIZE);
    var read = fs.readSync(fd, prelude, 0, PRELUDE_SIZE, PRELUDE_POSITION);
    if (read !== PRELUDE_SIZE) {
      console.error('Pkg: Error reading from file.');
      process.exit(1);
    }
    var s = new vm.Script(prelude, { filename: 'pkg/prelude/bootstrap.js' });
    var fn = s.runInThisContext();
    return fn(process, __require__,
      console, fd, PAYLOAD_POSITION, PAYLOAD_SIZE);
  }
  (function () {
    var fd = fs.openSync(process.execPath, 'r');
    var result = readPrelude(fd);
    if (result && result.undoPatch) {
      var bindingFs = process.binding('fs');
      fs.internalModuleStat = bindingFs.internalModuleStat;
      fs.internalModuleReadJSON = bindingFs.internalModuleReadJSON;
      fs.closeSync(fd);
    }
  }());
}());

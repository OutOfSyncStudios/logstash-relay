const fs = require('fs');

/* eslint-disable no-console */
module.exports = ((files, replacements) => {
  files.forEach((file) => {
    let fileContentModified = fs.readFileSync(file, 'utf8');

    replacements.forEach((val) => {
      fileContentModified = fileContentModified.replace(val.regexp, val.replacement);
    });

    fs.writeFileSync(file, fileContentModified, 'utf8');
  });
});

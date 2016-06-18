'use strict';
const loadJsonFile = require('load-json-file');
const path = require('path');
const _ = require('lodash');

const splitSets = (data, percent) => {
  data = _.shuffle(data);

  let limit = data.length*percent;
  let trainingsSet = _.slice(data, 0, limit);
  let testSet = _.slice(data, limit);

  return {
    training: trainingsSet,
    testing: testSet
  };
};

const load = (filename) => {
  return loadJsonFile(path.resolve(__dirname, `resources/${filename}.json`));
};

exports.splitSets = splitSets;
exports.load = load;

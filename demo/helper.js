'use strict';
const loadJsonFile = require('load-json-file');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

const parseToNumber = (value) => {
  if(_.isNumber(value)) {
    return value;
  }
  return 0;
};

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

const getAverageLoss = (stats) => {
  let sum = _.sumBy(stats, function(data) {
    if(data.loss === Infinity) return 0;
    return data.loss;
  });
  return sum/stats.length;
};

const getFilenames = (dir) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if(err) reject(err);
      resolve(files);
    });
  });
};

const slice = (collection, count) => {
  return count ? _.slice(collection, 0 , count) : collection;
};

exports.splitSets = splitSets;
exports.load = load;
exports.getAverageLoss = getAverageLoss;
exports.parseToNumber = parseToNumber;
exports.getFilenames = getFilenames;
exports.slice = slice;

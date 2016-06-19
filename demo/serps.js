'use strict';
const _ = require('lodash');
const helper = require('./helper.js');
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');

const blueprint = _.fill(Array(20), 0);

const prepare = (row) => {
  /*let prepared = {
    avgmonthlysearch: helper.parseToNumber(row.avgmonthlysearch),
    competition: helper.parseToNumber(row.competition),
    bid: helper.parseToNumber(row.bid),
  };*/

  let prepared = [
    helper.parseToNumber(row.avgmonthlysearch),
    helper.parseToNumber(row.competition),
    helper.parseToNumber(row.bid),
  ];

  let gsurls = _.clone(blueprint);
  _.forEach(row.gsurls, (data, index) => {
    if(index < 10) {
      gsurls[2*index] = helper.parseToNumber(data.pda)/100;
      gsurls[2*index+1] = helper.parseToNumber(data.upa)/100;
    }
  });

  return _.concat(prepared, gsurls);
};

const getSerps = (fileNames) => {
  return Promise.map(fileNames, function(fileName) {
    fileName = _.replace(fileName, '.json', '');
    return helper.load(`crawled/${fileName}`)
      .then((data) => {
        data = _.filter(data, (point) => _.has(point, 'gsurls'));
        return _.map(data, prepare);
      });
  });
};

const writePreparedAsFile = () => {
  return helper.getFilenames(path.resolve(__dirname, 'resources/crawled'))
  .then(getSerps)
  .then((data) => {
    data = _.flatten(data);
    console.log(data.length);
    console.log(_.first(data));
    fs.writeFile(path.resolve(__dirname, 'resources/dense.json'), JSON.stringify(data), () => {
      console.log('crawled serps saved as densed.json!');
    });
  })
  .catch(console.log);
};

const getPrepared = () => {
  return helper.load('dense')
  .then((data) => {
    //console.log(data.length);
    //console.log(_.first(data));
    return data;
  });
};

module.exports = {
  get: getPrepared,
  write: writePreparedAsFile
};

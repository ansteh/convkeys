'use strict';
const _ = require('lodash');
const helper = require('./helper.js');
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');
const keywords = require('./keywords.js');
const leven = require('leven');

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
        return _.filter(data, (point) => _.has(point, 'gsurls'));
      });
  });
};

const writePreparedAsFile = () => {
  return helper.getFilenames(path.resolve(__dirname, 'resources/crawled'))
  .then(getSerps)
  .then(data => _.map(data, prepare))
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

const saveKeywordNames = () => {
  return helper.getFilenames(path.resolve(__dirname, 'resources/crawled'))
    .then(getSerps)
    .then(data => _.flatten(data))
    .then(data => _.map(data, point => point.keyword))
    .then((data) => {
      console.log(_.first(data), data.length);
      fs.writeFile(path.resolve(__dirname, 'resources/keyword-names.json'), JSON.stringify(data), () => {
        console.log('crawled serps saved as keyword-names.json!');
      });
    });
};

//saveKeywordNames();

const getKeywordNames = () => {
  return new Promise((resolve, reject) => {
    helper.load('keyword-names')
    .then((data) => {
      resolve(_.uniq(data));
    })
    .catch(reject);
  });
};

const levenKeywords = _.curry((names, count, needle) => {
  let targets = _.filter(names, name => Math.abs(needle.length - name.length) < 10);
  //console.log(targets.length);
  let levens = _.map(targets, name => {
    return {
      name: name,
      leven: leven(needle, name)
    }
  });
  levens = _.sortBy(levens, function(o) { return o.leven; });
  return _.slice(levens, 1, count);
});

const getKeywordsWithLeven = (count) => {
  return getKeywordNames()
    .then((names) => {
      if(count) names = _.slice(names, 0, count);
      let parse = levenKeywords(names, 10);
      /*_.forEach(names, (needle, index) => {
        //console.log(needle, parse(needle));
        console.log(`levenshtein progress: ${Math.round(index/names.length*100, 10)} %`);
      });*/
      return _.map(names, (needle, index) => {
        let result = {
          needle: needle,
          leven:  parse(needle)
        };
        //console.log(result);
        console.log(`levenshtein progress:${index/names.length}  ${Math.round(index/names.length*100, 10)} %`);
        return result;
      });
    });
};

const findKeywordMeta = (data, keyword) => {
  return _.find(data, point => point.keyword === keyword);
};

const writePreparedLevenshteinAsFile = (levens) => {
  return helper.getFilenames(path.resolve(__dirname, 'resources/crawled'))
  .then(getSerps)
  .then((data) => {
    data = _.flatten(data);
    console.log(data.length);

    let extractRow = (leven) => {
      let prepared = _.map(leven.leven, (info) => {
        let neighbour = prepare(findKeywordMeta(data, info.name));
        neighbour.push(info.leven);
        return neighbour;
      });
      prepared.push(prepare(findKeywordMeta(data, leven.needle)));
      return _.flatten(prepared);
    };

    let rows = _.map(levens, extractRow);
    //console.log(rows.length, _.last(rows));

    fs.writeFile(path.resolve(__dirname, 'resources/leven.json'), JSON.stringify(rows), () => {
      console.log('crawled serps saved as leven.json!');
    });

    //return _.first(data);
    return 'prepare to save as file: leven.json';
  })
  .catch(console.log);
};

/*getKeywordsWithLeven(10000)
.then((levens) => {
  return writePreparedLevenshteinAsFile(levens);
})
.then(console.log);*/

const getLeven = () => {
  return helper.load('leven')
  .then((data) => {
    //console.log(data.length);
    //console.log(_.first(data));
    return data;
  });
};

module.exports = {
  get: getPrepared,
  write: writePreparedAsFile,
  getLeven: getLeven
};

'use strict';
const _ = require('lodash');
const helper = require('./helper.js');

let keywords;

const getKeywords = () => {
  return new Promise((resolve, reject) => {
    if(keywords) {
      resolve(keywords);
    } else {
      helper.load('keywords')
      .then((data) => {
        keywords = data;
        resolve(keywords);
      })
      .catch(reject);
    }
  });
};

exports.getNames= () => {
  return getKeywords().then((keywords) => {
    //console.log(keywords.length);
    return _.map(keywords, obj => obj.keyword);
  }).catch(console.log);
};

exports.getInfo = (needles) => {
  return getKeywords().then((keywords) => {
    //console.log(keywords.length);
    return _.filter(keywords, (info) => {
      return _.includes(needles, info.keyword);
    });
  }).catch(console.log);
};

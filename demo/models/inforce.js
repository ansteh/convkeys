'use strict';
const convnetjs = require('convnetjs');
const _ = require('lodash');
const helper = require('../helper.js');
const deepqlearn = require('../../node_modules/convnetjs/build/deepqlearn.js');

var prepare = (row) => {
  let input = [];
  input.push(helper.parseToNumber(row.bid));
  input.push(helper.parseToNumber(row.competition));

  let output = (row.avgmonthlysearch > 1000) ? 1 : 0;

  return {
    input: input,
    output: output
  };
};

const getKeywords = () => {
  return helper.load('keywords')
  .then((keywords) => {
    keywords = _.map(keywords, prepare);
    return helper.splitSets(keywords, 0.8);
  });
};

getKeywords().then((sets) => {
  var brain = new deepqlearn.Brain(2, 2); // 3 inputs, 2 possible outputs (0,1)

  let count = 10000;
  let trainingsSet = count ? _.slice(sets.training, 0 , count) : sets.training;

  _.forEach(trainingsSet, (state, index) => {
    console.log(`${Math.round(index/trainingsSet.length*100)} %`);
    var action = brain.forward(state.input); // returns index of chosen action
    var reward = action === state.output ? 1 : 0;
    brain.backward([reward]);
  });

  brain.epsilon_test_time = 0.0; // don't make any more random choices
  brain.learning = false;
  // get an optimal action from the learned policy
  //var action = brain.forward(array_with_num_inputs_numbers);
  var rightCount = 0;

  _.forEach(sets.testing, (state) => {
    var action = brain.forward(state.input);
    if(action === state.output) rightCount += 1;
  });

  console.log('validation accurancy', rightCount/sets.testing.length );
}).catch(console.log);

'use strict';
const convnetjs = require('convnetjs');
const _ = require('lodash');
const helper = require('./helper.js');
const serps = require('./serps.js');

/* insert into: node_modules/convnetjs/build/deepqlearn.js
var convnetjs = require('convnetjs');
var cnnutil = require('./util.js');
*/
const deepqlearn = require('../node_modules/convnetjs/build/deepqlearn.js');

var prepare = (row) => {
  let input = [];

  let output = (row[0] > 1000) ? 1 : 0;

  return {
    input: _.slice(row, 3),
    output: output
  };
};

const validate = (count) => {
  return serps.get()
  .then(data => helper.splitSets(data, 0.8))
  .then((sets) => {
    var brain = new deepqlearn.Brain(20, 2);
    //console.log(sets.training.length, sets.testing.length);

    let trainingsSet = helper.slice(sets.training, count);

    //console.log(prepare(_.first(trainingsSet)));
    _.forEach(trainingsSet, (state, index) => {
      state = prepare(state);
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
      state = prepare(state);
      var action = brain.forward(state.input);
      if(action === state.output) rightCount += 1;
    });

    console.log('validation accurancy', rightCount/sets.testing.length);
  })
  .catch(console.log);
};

validate(20000);

'use strict';
const convnetjs = require('convnetjs');
const loadJsonFile = require('load-json-file');
const path = require('path');
const _ = require('lodash');

const getNet = () => {
  let layer_defs = [];
  layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:2});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'softmax', num_classes:2});

  let net = new convnetjs.Net();
  net.makeLayers(layer_defs);

  return net;
};

const getTrainer = (net) => {
  return new convnetjs.Trainer(net, {learning_rate:0.01, l2_decay:0.001});
};

const parseToNumber = (value) => {
  if(_.isNumber(value)) {
    return value;
  }
  return 0;
};

var prepare = (row) => {
  let input = [];
  input.push(parseToNumber(row.bid));
  input.push(parseToNumber(row.competition));

  let output = (row.avgmonthlysearch > 1000) ? 1 : 0;

  return {
    input: input,
    output: output
  };
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

loadJsonFile(path.resolve(__dirname, 'resources/keywords.json')).then(json => {
  let net = getNet();
  let trainer = getTrainer(net);

  let sets = splitSets(json, 0.8);
	//console.log(json.length, json[0], _.last(json), prepare(_.first(json)));

  _.forEach(sets.training, (meta) => {
    let options = prepare(meta);
    trainer.train(new convnetjs.Vol(options.input), options.output);
  });

  var rightCount = 0;

  _.forEach(sets.testing, (meta) => {
    let options = prepare(meta);
    //trainer.train(new convnetjs.Vol(options.input), options.output);
    var x = new convnetjs.Vol(options.input);
    var probability_volume2 = net.forward(x);
    //console.log('probability that x is class 0: ' + probability_volume2.w[0]);
    let forecast = probability_volume2.w[0] > 0.5 ? 0 : 1;
    if(forecast === options.output) rightCount += 1;
  });

  console.log(rightCount, sets.testing.length, rightCount/sets.testing.length );
}).catch(console.log);

'use strict';
const convnetjs = require('convnetjs');
const _ = require('lodash');
const helper = require('../helper.js');
const serps = require('../serps.js');

const getNet = () => {
  let layer_defs = [];
  layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:22});
  layer_defs.push({type:'fc', num_neurons:40, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'softmax', num_classes:2});

  let net = new convnetjs.Net();
  net.makeLayers(layer_defs);

  return net;
};

const getTrainer = (net) => {
  return new convnetjs.Trainer(net, {learning_rate:0.01, l2_decay:0.001});
};

var prepare = (row) => {
  let input = [];

  let output = (row[0] > 1000) ? 1 : 0;

  return {
    input: _.slice(row, 1),
    output: output
  };
};

const validate = (count) => {
  return serps.get()
  .then(data => helper.splitSets(data, 0.8))
  .then((sets) => {
    let net = getNet();
    let trainer = getTrainer(net);
    //console.log(sets.training.length, sets.testing.length);

    let trainingsSet = helper.slice(sets.training, count);

    var stats = [];
    _.forEach(trainingsSet, (meta, index) => {
      let options = prepare(meta);
      stats.push(trainer.train(new convnetjs.Vol(options.input), options.output));
      //console.log(`training ${index} :`, helper.getAverageLoss(stats));
    });
    console.log('average loss:', helper.getAverageLoss(stats));

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

    console.log('validation accurancy', rightCount/sets.testing.length );
    return {
      net: net,
      trainer: trainer
    };
  })
  .catch(console.log);
};

validate();

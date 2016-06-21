'use strict';
const convnetjs = require('convnetjs');
const _ = require('lodash');
const helper = require('../helper.js');
const serps = require('../serps.js');

let start = 0;
let end = 200;

const getNet = () => {
  let layer_defs = [];
  layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:end-start});
  layer_defs.push({type:'fc', num_neurons:40, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:40, activation:'sigmoid', drop_prob: 0.5 });
  //layer_defs.push({type:'fc', num_neurons:400, activation:'relu', drop_prob: 0.5 });
  layer_defs.push({type:'softmax', num_classes:2});

  let net = new convnetjs.Net();
  net.makeLayers(layer_defs);

  return net;
};

const getTrainer = (net) => {
  return new convnetjs.SGDTrainer(net, {method: 'adadelta', learning_rate:0.001, l2_decay:0.001, momentum: 0.9, batch_size: 50});
};

var prepare = (row) => {
  let input = [];
  let slice = _.slice(row, start, end);
  if(slice.length === end-start) {
    let output = (row[0] > 1000) ? 1 : 0;
    //console.log('length', _.slice(row, 0, 100).length);
    return {
      input: slice,
      output: output
    };
  }
};

const validate = (count) => {
  return serps.getLeven()
  .then(data => helper.splitSets(data, 0.5))
  .then((sets) => {
    let net = getNet();
    let trainer = getTrainer(net);
    //console.log(sets.training.length, sets.testing.length);

    let trainingsSet = helper.slice(sets.training, count);

    var stats = [];
    var rightCount = 0;
    let loss;

    _.forEach(trainingsSet, (meta, index) => {
      let options = prepare(meta);
      if(options) {
        let x = new convnetjs.Vol(options.input);
        stats.push(trainer.train(x, options.output));
        //console.log(`training ${index} :`, helper.getAverageLoss(stats));
        var probability_volume = net.forward(x);
        let forecast = probability_volume.w[0] > 0.5 ? 0 : 1;
        if(forecast === options.output) rightCount += 1;

        loss = helper.getAverageLoss(stats);
        if(_.isNaN(loss)) return false;
        console.log(`${Math.round(index/trainingsSet.length*100)} %`, loss, rightCount/index, options.input.length);
      }
    });
    console.log('average loss:', helper.getAverageLoss(stats));
    if(_.isNaN(loss)) return false;

    rightCount = 0;

    _.forEach(sets.testing, (meta) => {
      let options = prepare(meta);
      //trainer.train(new convnetjs.Vol(options.input), options.output);
      var x = new convnetjs.Vol(options.input);
      var probability_volume = net.forward(x);
      //console.log('probability that x is class 0: ' + probability_volume2.w[0]);
      let forecast = probability_volume.w[0] > 0.5 ? 0 : 1;
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

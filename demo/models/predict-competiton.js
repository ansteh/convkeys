'use strict';
const convnetjs = require('convnetjs');
const _ = require('lodash');
const helper = require('../helper.js');
const serps = require('../serps.js');

const getNet = () => {
  let layer_defs = [];
  layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:20});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  //layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'sigmoid', drop_prob:0.5});
  layer_defs.push({type:'regression', num_neurons:2});

  /*layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:22});
  layer_defs.push({type:'fc', num_neurons:40, activation:'relu'});
  //layer_defs.push({type:'fc', num_neurons:40, activation:'relu', drop_prob:0.5});
  layer_defs.push({type:'fc', num_neurons:40, activation:'sigmoid'});
  layer_defs.push({type:'regression', num_neurons:1});*/

  let net = new convnetjs.Net();
  net.makeLayers(layer_defs);

  return net;
};

const getTrainer = (net) => {
  return new convnetjs.Trainer(net, {method: 'adadelta', learning_rate:0.001, l2_decay:0.001, batch_size: 1});
};

let conversion = [0.182, 0.101, 0.072, 0.048, 0.031, 0.028, 0.019, 0.018, 0.015, 0.01];

var prepare = (row) => {
  let serps = _.slice(row, 3);
  _.forEach(serps, (serp, index) => {
    serp[2*index] *= conversion[index];
    serp[2*index+1] *= conversion[index];
  });

  return {
    //input: _.concat([row[0]], serps),
    input: serps,
    output: [row[1], row[2]]
  };
};

let isValid = _.curry((bench, index, volume, options) => {
  //if(options.output[index] === 0) return volume.w[index];
  return Math.abs(volume.w[index]-options.output[index])/options.output[index] < bench
});

let competition = isValid(0.5, 0);
let bid = isValid(0.5, 1);

const validate = (count) => {
  return serps.get()
  .then(data => helper.splitSets(data, 0.8))
  .then((sets) => {
    let net = getNet();
    let trainer = getTrainer(net);
    //console.log(sets.training.length, sets.testing.length);

    let trainingsSet = helper.slice(sets.training, count);

    let filter = (row) => { return row[0]>0 && row[1]>0 && row[2]>0 };
    //let filter = (row) => { return true; };
    trainingsSet = _.filter(trainingsSet, filter);
    sets.testing = _.filter(sets.testing, filter);

    var stats = [];
    var maxSearches = _.maxBy(_.concat(trainingsSet, sets.testing), function(o) { return o[0]; })[0];
    //console.log(trainingsSet[0].length, maxSearches);

    var rightCount = 0;
    let iterations = 1;

    for(var i=0; i<iterations; i+=1) {
      _.forEach(trainingsSet, (meta, index) => {
        let options = prepare(meta);
        //console.log(options.input, options.output, options.input.length);
        var x = new convnetjs.Vol(options.input);
        stats.push(trainer.train(x, options.output));
        //console.log(`training ${i*trainingsSet.length + index} :`, helper.getAverageLoss(stats), rightCount/(i*trainingsSet.length + index));

        var probability_volume = net.forward(x);
        if(competition(probability_volume, options)) {
          rightCount += 1;
        }
        //console.log(_.last(stats));
      });
    }

    console.log('average loss:', helper.getAverageLoss(stats));
    console.log('training accurancy:', rightCount/(iterations*trainingsSet.length));

    rightCount = 0;

    _.forEach(sets.testing, (meta) => {
      let options = prepare(meta);
      var x = new convnetjs.Vol(options.input);
      var probability_volume = net.forward(x);
      //console.log(probability_volume, options.output);
      //console.log(Math.abs(probability_volume.w[0] - options.output[0])/options.output[0]);
      if(competition(probability_volume, options)) {
        rightCount += 1;
      }
      /*if(Math.abs(probability_volume.w[0]-options.output[0])/options.output[0] < 0.2) {
        rightCount += 1;
      }*/
    });
    console.log('validation accurancy', rightCount/sets.testing.length);

    return {
      net: net,
      trainer: trainer
    };
  })
  .catch(console.log);
};

validate();

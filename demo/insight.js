'use strict';
const convnetjs = require('convnetjs');
const _ = require('lodash');
const helper = require('./helper.js');
const keywords = require('./keywords.js');

const getNet = () => {
  let layer_defs = [];
  layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:7});
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

  input.push(parseToNumber(row.info.bid));
  input.push(parseToNumber(row.info.competition));

  input.push(parseToNumber(row.split.bids.searches));
  input.push(parseToNumber(row.split.bids.margin));

  input.push(parseToNumber(row.split.outBids.searches));
  //input.push(parseToNumber(row.split.outBids.margin));

  input.push(parseToNumber(row.split.notBids.searches));
  input.push(parseToNumber(row.split.outNotBids.searches));

  let output = (row.split.outBids.margin > 1000) ? 1 : 0;

  return {
    input: input,
    output: output
  };
};

const getInsights = () => {
  return helper.load('insight')
  .then((data) => {
    return keywords.getInfo(_.map(data, 'keyword'))
      .then((infos) => {
        var insights = [];
        _.forEach(infos, (info) => {
          let insight = _.find(data, { keyword: info.keyword, mined: true });
          if(_.has(insight, 'split')) {
            _.set(insight, 'info', info);
            insights.push(insight);
          }
        });
        return insights;
      });
  }).catch(console.log);
};

const preview = () => {
  getInsights().then((insights) => {
    //console.log(insights[0]);
    let sets = helper.splitSets(insights, 0.8);
    //console.log(sets);
    let net = getNet();
    let trainer = getTrainer(net);

    _.forEach(sets.training, (meta) => {
      //console.log(meta);
      let options = prepare(meta);
      //console.log(options);
      trainer.train(new convnetjs.Vol(options.input), options.output);
    });

    var rightCount = 0;
    var count = 1;
    for(var i=0; i<count; i+=1) {
      _.forEach(sets.testing, (meta) => {
        let options = prepare(meta);
        //trainer.train(new convnetjs.Vol(options.input), options.output);
        var x = new convnetjs.Vol(options.input);
        var probability_volume2 = net.forward(x);
        //console.log('probability that x is class 0: ' + probability_volume2.w[0]);
        let forecast = probability_volume2.w[0] > 0.5 ? 0 : 1;
        if(forecast === options.output) rightCount += 1;
      });
    }

    console.log(rightCount, sets.testing.length*count, rightCount/(sets.testing.length*count));
  }).catch(console.log);
};

preview();

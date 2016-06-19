'use strict';
const convnetjs = require('convnetjs');
const _ = require('lodash');
const helper = require('./helper.js');
const keywords = require('./keywords.js');

const getNet = () => {
  let layer_defs = [];
  layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:7});
  layer_defs.push({type:'fc', num_neurons:10, activation:'relu'});
  layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});
  //layer_defs.push({type:'fc', num_neurons:6, activation:'relu'});
  layer_defs.push({type:'softmax', num_classes:2});

  let net = new convnetjs.Net();
  net.makeLayers(layer_defs);

  return net;
};

const getTrainer = (net) => {
  return new convnetjs.Trainer(net, {method: 'adadelta', learning_rate:0.01, l2_decay:0.001, batch_size: 1, momentum:0.9});
};

const parseToNumber = (value) => {
  if(_.isNumber(value)) {
    return value;
  }
  return 0;
};

const prepare = (row) => {
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

    let prepared = _.map(sets.training, prepare);

    var rightCount = 0;
    var count = 1000;
    var percent = 0.2;

    var stats = [];
    let batch_count = Math.round(percent*prepared.length);
    for(var i=0; i<count; i+=1) {
      let epoch = _.slice(_.shuffle(prepared), 0, batch_count);
      //console.log(epoch.length);
      _.forEach(epoch, (options, index) => {
        stats.push(trainer.train(new convnetjs.Vol(options.input), options.output));
        //console.log(`training ${batch_count*i+index} :`, helper.getAverageLoss(stats));
      });
    }

    console.log(stats.length, _.first(stats), _.last(stats));
    console.log(helper.getAverageLoss(stats));

    _.forEach(sets.testing, (meta) => {
      let options = prepare(meta);
      //trainer.train(new convnetjs.Vol(options.input), options.output);
      var x = new convnetjs.Vol(options.input);
      var probability_volume2 = net.forward(x);
      //console.log('probability that x is class 0: ' + probability_volume2.w[0]);
      let forecast = probability_volume2.w[0] > 0.5 ? 0 : 1;
      if(forecast === options.output) rightCount += 1;
    });

    console.log(rightCount, sets.testing.length, rightCount/(sets.testing.length));
  }).catch(console.log);
};

preview();

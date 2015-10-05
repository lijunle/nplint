'use strict';

var rules = require('./rules');
var parser = require('./JSON-parser');
var async = require('async');

module.exports = (function() {
  var api = {},
    messages = [];

  function parse(data) {
    if (typeof data !== 'string') {
      messages.push({
        fatal: true,
        severity: 2,
        message: 'Invalid data - Not a string',
        line: 0,
        column: 0
      });

      return null;
    }

    var parsed;
    try {
      parsed = parser(data);
    } catch (e) {
      messages.push(e);
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null || parsed instanceof Array) {
      messages.push({
        fatal: true,
        severity: 2,
        message: 'Expected an object and instead saw ' + typeof parsed,
        line: 0,
        column: 0
      });

      return null;
    }

    return parsed;
  }

  api.verify = function(data, config, callback) {
    config = config || {};
    var parsed = parse(data);

    if (!parsed) {
      return {messages: messages};
    }

    async.parallel(
      Object.keys(config.rules).map(function(ruleId) {
        return function(_callback) {
          rules.get(ruleId).verify(parsed, config, config.rules[ruleId], function(err, _messages) {
            messages = messages.concat(_messages);
            _callback(err && {
              err: err,
              rule: ruleId
            });
          });
        };
      }),
      function(err) {
        if (err) {
          messages.push({
            fatal: true,
            severity: 2,
            message: 'Error when running rule ' + err.rule + ': ' + err.err.message,
            line: 0,
            column: 0
          });
        }
        callback({messages: messages});
      });
  };

  return api;

}());

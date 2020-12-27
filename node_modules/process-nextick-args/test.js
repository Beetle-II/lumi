var test = require("tap").test;
var pna = require('./');

test('should work', function (t) {
  t.plan(5);
  pna.nextTick(function (a) {
    t.ok(a);
    pna.nextTick(function (thing) {
      t.equals(thing, 7);
    }, 7);
  }, true);
  pna.nextTick(function (a, b, c) {
    t.equals(a, 'step');
    t.equals(b, 3);
    t.equals(c, 'profit');
  }, 'step', 3,  'profit');
});

test('correct number of arguments', function (t) {
  t.plan(1);
  pna.nextTick(function () {
    t.equals(2, arguments.length, 'correct number');
  }, 1, 2);
});

test('uses the current value of process.nextTick', function (t) {
  t.plan(1);
  var oldNextTick = process.nextTick;
  var called = false;
  process.nextTick = function() {
    called = true
  };
  pna.nextTick(function () {});
  process.nextTick = oldNextTick;
  t.ok(called);
});

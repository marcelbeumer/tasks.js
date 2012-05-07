/*jshint forin:false, noempty:false, browser:true */
/*global console:true, $:true, */
(function(global){
  var tasks = global.tasks;

  QUnit.testStart(function() {
    // Reset tasks on each test!
    tasks.reset();
  });


  //
  function runTests() {

    //
    module("context creation");

    test("scope and ownership", function() {
      var a, b, c, a2, b2;
      a = tasks.context("a");
      b = tasks.context("b");
      c = tasks.context("c");
      a2 = a.context("foo.bar.har");
      b2 = b.context("foo.bar.har");

      equal(a.fullScope, "a", "full scope correct");
      equal(b.fullScope, "b", "full scope correct");
      equal(c.fullScope, "c", "full scope correct");
      equal(a2.fullScope, "a.foo.bar.har", "full scope correct");
      equal(b2.fullScope, "b.foo.bar.har", "full scope correct");
      equal(a.relScope, "a", "rel scope correct");
      equal(a2.relScope, "foo.bar.har", "rel scope correct");

      equal(b2.owner, b, "correct ownership");
      equal(b2.owner.owner, tasks, "correct ownership");
    });


    //
    module("task creation");

    test("create a few tasks", function() {
      var l = 10;
      while (l--) {
        tasks.create("sample.task");
      }
      equal(tasks.find("sample.task").length, 10, "found created");
    });


    test("create and cancel", function() {
      var cancelled = 0,
          samples,
          l,
          onfail;

      l = 10;
      while (l--) {
        tasks.create("sample.task");
      }

      samples = tasks.find("sample.task");
      equal(samples.length, 10, "found created");

      onfail = function() {
        cancelled++;
      };

      l = samples.length;
      while (l--) {
        samples[l].fail(onfail);
      }

      tasks.cancel("sample.task");
      equal(cancelled, 10, "cancelled");
    });


    test("create and destroy", function() {
      var l = 10;
      while (l--) {
        tasks.create("sample.task").resolve();
      }

      l = 10;
      while (l--) {
        tasks.create("sample.task").reject();
      }

      samples = tasks.find("sample.task");
      equal(samples.length, 0, "no tasks because all resolved or rejected");
    });


    //
    module("advanced scoping and finding");

    test("find all from root", function() {
      var c1, c2, c12;

      c1 = tasks.context("foo.bar.common");
      c12 = c1.context("har.deeper");
      c2 = tasks.context("foo.bar.common");

      c1.create("test");
      c1.create("test");
      c1.create("test");

      c2.create("test");
      c2.create("test");
      c2.create("test");

      c12.create("test");
      c12.create("test");
      c12.create("test");

      equal(tasks.tasks.length, 9, "low level registering");
      equal(tasks.find("*").length, 9, "find all with *");
      equal(tasks.find("foo.bar.*").length, 9, "find all with sel");
      equal(tasks.find("foo*").length, 9, "find all with sel");
      equal(tasks.find("*test").length, 9, "find all with sel");
      equal(tasks.find("*test2").length, 0, "find nothing with sel");
    });


    test("find own, others, all", function() {
      var c1, c2, c12;

      c1 = tasks.context("foo.bar.common");
      c2 = tasks.context("foo.bar.common");

      c1.create("test");
      c1.create("test");
      c1.create("test");

      c2.create("test");
      c2.create("test");
      c2.create("test");
      c2.create("test");
      c2.create("test");
      c2.create("test");

      equal(tasks.tasks.length, 9, "low level registering");
      equal(c1.find("test").length, 3, "Default find");
      equal(c2.find("test").length, 6, "Default find");
      equal(c2.find("test [all]").length, 9, "Find all");
      equal(c2.find("test [mine]").length, 6, "Find mine");
      equal(c2.find("test [others]").length, 3, "Find others");
    });


    test("find scheduled, running", function() {
      var c1, c2, c12;

      tasks.capture("*.delayed");

      c1 = tasks.context("foo.bar.common");
      c2 = tasks.context("foo.bar.common");

      // Using .schedule to do scheduling.
      // Could also have used .schedule(ctx.create(
      // But this test also includes timing wrt schedulers

      c1.schedule("test");
      c1.schedule("test");
      c1.schedule("test");
      c1.schedule("test.delayed");

      c2.schedule("test.delayed");
      c2.schedule("test.delayed");
      c2.schedule("test.delayed");
      c2.schedule("test.delayed");
      c2.schedule("test");
      c2.schedule("test");

      equal(tasks.tasks.length, 10, "low level registering");
      equal(c1.find("test*").length, 4, "Default find");
      equal(c2.find("test*").length, 6, "Default find");
      equal(c2.find("test* [mine, scheduled]").length, 4, "Find my scheduled");
      equal(c2.find("test* [mine, running]").length, 2, "Find my running");
      equal(c2.find("test* [others, running]").length, 3, "Find other running");
      equal(c2.find("test* [all, running]").length, 5, "Find all running");
    });


    //
    module("scheduling order");

    asyncTest("scheduling a few tasks", function() {
      var log = [],
          expect = '',
          l = 10,
          add;

      add = function(x) {
        tasks.schedule("sample.task." + x).done(function(task) {
          log.push(x);
          equal(task.fullType, "sample.task." + x, "fullScope correct");

          // Hold back the resolve, there is no capture!
          window.setTimeout(function() {
            task.resolve();
          }, 0);
        });
      };

      while (l--) {
        add(l);
        if (expect) expect += ",";
        expect += l;
      }

      equal(tasks.find("sample.task.*").length, 10, "tasks can be found");

      tasks.when("sample.task.*").done(function() {
        equal(log.join(","), expect, "correct order");
        start();
      });
    });


    //
    module("capture and release");

    asyncTest("capturing all and releasing all", function() {
      var log = [],
          expect = '',
          l = 10,
          add;

      tasks.capture("*");

      add = function(x) {
        tasks.schedule("sample.task." + x).done(function(task) {
          log.push(x);
          task.resolve();
        });
      };

      while (l--) {
        add(l);
        if (expect) expect += ",";
        expect += l;
      }

      equal(tasks.find("sample.task.*").length, 10, "tasks can be found");

      tasks.when("sample.task.*").done(function() {
        equal(log.join(","), expect, "correct order");
        start();
      });

      // Release now, otherwise they are not created yet
      tasks.release("*");

    });
  }

  $(function() {
    runTests();
  });

}(this));

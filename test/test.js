/*jshint undef:true, forin:false, noempty:false, browser:true */
/*global console:true, $:true, module:true, test:true, ok:true */
(function(global){
  var tasks = global.tasks;

  function runTests() {
    module("context creation");

    test("first test within module", function() {
      ok( true, "all pass" );
    });

    test("second test within module", function() {
      ok( true, "all pass" );
    });
  }

  $(function() {
    runTests();
  });

}(this));

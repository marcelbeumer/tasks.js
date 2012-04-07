/*jshint undef:true, forin:false, noempty:false, browser:true */
/*global console:true, $:true */
(function(global) {

var _ = global.boba;


// // TasksContext constructor
// function TasksContext(manager, scope) {
//   _.bindAll(this);
//   this.scope = scope;
//   this.manager = manager;
//   this.schedulers = [];
// }
//
// // Curry some TaskManager methods
// ["create", "find", "cancel", "forget", "remember",
//     "capture", "release", "when"].forEach(function(name) {
//   var prop = name;
//
//   TasksContext.prototype[prop] = function() {
//     var args = arguments;
//     if (typeof(args[0]) === "string") args[0] = this.scope + "." + args[0];
//     return this.manager[prop].apply(this.manager, args);
//   };
// });
//
//
// // Public addScheduler
// // Adds scheduler function.
// // Each scheduler should returns true, undefined or promise to accept,
// // false or string for reason
// TasksContext.prototype.addScheduler = function(fn) {
//   if (typeof(fn) === "function") this.schedulers.push(fn);
// };
//
//
// // Public allowed
// TasksContext.prototype.allowed = function(type) {
//   var own,
//       manager;
//
//   // TODO: move allowed impl to separate, clean, function
//   own = this.manager.constructor.
//       prototype.allowed.apply(this, [type]);
//   if (own === false || typeof(own) === "string") return own;
//
//   manager = this.manager.allowed(type);
//   if (manager === false || typeof(manager) === "string") return manager;
//
//   if (!own || own === true) return manager;
//   if (!manager || manager === true) return own;
//
//   if (_.isArray(own) && _.isArray(manager)) {
//     return manager.concat(own);
//   }
// };
//
//
// // Public schedule
// // Wraps TasksManager::schedule, also doing a ::allowed check on
// // context itself.
// TasksContext.prototype.schedule = function(typeOrTask) {
//   var own,
//       manager,
//       r = new $.Deferred(),
//       type,
//       task;
//
//   if (typeof(typeOrTask) === "string") {
//     type = this.scope + "." + typeOrTask;
//   } else {
//     task = typeOrTask;
//     type = task.type;
//   }
//
//   // Run manager schedule code without creating task
//   // and using our own allowed check
//   own = this.manager.schedule(task || type,
//       this.allowed(type), true);
//
//   own.done(function() {
//
//     // We are fine, so let's see if the manager agrees
//     manager = this.manager.schedule(task || type);
//
//     // Wrapping manager promise
//     manager.done(function() {
//       r.resolve.apply(r, arguments);
//     }).fail(function() {
//       r.reject.apply(r, arguments);
//     });
//
//   }.bind(this)).fail(function() {
//     // If we are not fine, we pass the arguments
//     r.reject.apply(r, arguments);
//   });
//
//   return r.promise();
// };
//
//
// // TaskManager constructor
// function TasksManager() {
//   _.bindAll(this);
//   this.tasks = []; // TODO: rename to deferreds
//   this.schedulers = []; // TODO: implement
// }
//
//
// // Public context
// // Returns TasksContext on scope string. Example:
// // tasks = bm.tasks.context("widgetA");
// // tasks.create("reload"); // created "widgetA.reload"
// TasksManager.prototype.context = function(scope) {
//   return new TasksContext(this, scope);
// };
//
//
// // Public create
// // Creates deferred and returns it. Can not be
// // captured, rejected or delayed, but can be cancelled.
// TasksManager.prototype.create = function(type) {
//   var d = new $.Deferred();
//   d.type = type;
//
//   this.tasks.push(d);
//   // console.log("Pushed task " + type);
//
//   // Always clean up
//   d.always(function() {
//     this.forget(d);
//   }.bind(this));
//
//   return d;
// };
//
//
// // Public forget - removes task out of task list,
// // effectively forgetting it
// TasksManager.prototype.forget = function(task) {
//   var tasks = this.tasks,
//       l = this.tasks.length;
//
//   while (l--) {
//     if (tasks[l] === task) {
//       tasks.splice(l, 1);
//       break;
//     }
//   }
// };
//
//
// // Public remember - remember a task by putting in
// // the task list.
// TasksManager.prototype.remember = function(task) {
//   this.forget(task);
//   this.tasks.push(task);
// };
//
//
// // Public schedule
// // schedules deferred creation. Returns promise that can be rejected
// // with or without reason argument, or allowed with create deferred
// // as argument. Can be be captured.
// TasksManager.prototype.schedule = function(typeOrTask, _allowed, _nocreate) {
//   var r = new $.Deferred(),
//       allowed,
//       type,
//       task,
//       getTask;
//
//   if (typeof(typeOrTask) === "string") {
//     type = typeOrTask;
//   } else {
//     task = typeOrTask;
//     type = task.type;
//     this.forget(task);
//   }
//
//   getTask = function() {
//     if (task) {
//       this.remember(task);
//       return task;
//     } else {
//       return this.create(type);
//     }
//   }.bind(this);
//
//   allowed = _allowed !== undefined ? _allowed : this.allowed(type);
//
//   if (allowed === true) {
//     r.resolve(_nocreate ? true : getTask());
//   } else if (allowed === false || typeof(allowed) === "string") {
//     r.reject(allowed);
//   } else {
//     allowed.done(function() {
//       r.resolve(_nocreate ? true : getTask());
//     }).fail(function(reason) {
//       r.reject(reason);
//     });
//   }
//
//   return r.promise();
// };
//
//
// // Public addScheduler
// // Adds scheduler function.
// // Each scheduler should returns true, undefined or promise to accept,
// // false or string for reason
// TasksManager.prototype.addScheduler = function(fn) {
//   if (typeof(fn) === "function") this.schedulers.push(fn);
// };
//
//
// // Public allowed
// // Method that determines if tasks of passed type is allowed.
// // Returns true or promise to accept, false or string for reason
// // to reject.
// TasksManager.prototype.allowed = function(type) {
//   var s, x, l, r, promises = [];
//   l = this.schedulers.length;
//
//   for (x = 0; x < l; x++) {
//
//     // Run scheduler
//     r = this.schedulers[x].apply(this, [type]);
//
//     // In case of negative result, return right away
//     if (r === false || typeof(r) === "string") return r;
//
//     // Collect promises
//     if (r && typeof(r.then) === "function") promises.push(r);
//   }
//
//   // Return new promise or true
//   if (promises.length > 0) {
//     return $.when.apply($, promises);
//   } else {
//     return true;
//   }
// };
//
//
// // Public find
// // Returns all tasks matching type selector
// TasksManager.prototype.find = function(typeSel) {
//   var re = this.typeSelToRegExp(typeSel),
//       l = this.tasks.length,
//       r = [],
//       t;
//
//   while (l--) {
//     t = this.tasks[l];
//     if (re.test(t.type)) r.push(t);
//   }
//
//   return r.reverse();
// };
//
//
// // Public cancel
// // Rejects all current deferreds that match type selector
// TasksManager.prototype.cancel = function(typeSel) {
//   var tasks = this.find(typeSel),
//       l, x;
//
//   for (x = 0; x < (l = tasks.length); x++) {
//     tasks[x].reject("canceled");
//   }
// };
//
//
// // $.when wrapper
// TasksManager.prototype.when = function(/* typeSel, array or arguments */) {
//   var args = _.toArray(arguments),
//       l = args.length,
//       wargs;
//
//   if (l > 1) {
//     // arguments with promises
//     wargs = args;
//   } else if (_.isArray(args[0])) {
//     // array of promises
//     wargs = args[0];
//   } else if (typeof(args[0]) === "string") {
//     // typeSel
//     wargs = this.find(args[0]);
//   }
//
//   return $.when.apply($, wargs);
// };
//
//
// // TODO
// TasksManager.prototype.capture = function(typeSel) {
// };
//
//
// // TODO
// TasksManager.prototype.release = function(typeSel) {
// };
//
//
// // TODO: make use of this
// TasksManager.prototype.isValidType = function(type) {
//   return (/^[a-z\.\d]+$/.test(type));
// };
//
//
// // TODO: make use of this
// TasksManager.prototype.isValidTypeSel = function(typeSel) {
//   return (/^[a-z\.\*\d]+$/.test(typeSel));
// };
//
//
// TasksManager.prototype.typeSelToRegExp = function(typeSel) {
//   var r = "^" +
//       typeSel.replace(/\./g, "\\.", "g").
//       replace("*", ".*?", "g") + "$";
//   return new RegExp(r);
// };


// TasksManager constructor
function TasksManager() {
  _.bindAll(this);
  this.deferreds = [];
  this.schedulers = [];
}


//
TasksManager.prototype.create = function(type) {
  var d;

  if (!this.isValidType(type)) {
    throw new Error("invalid type");
  }

  // Create deferred
  d = new $.Deferred();
  d.type = type;
  d.status = "running";

  // Push it
  this.deferreds.push(d);

  // Always clean up
  d.always(_.bind(function() {
    this.forget(d);
  }, this));

  return d;
};


// Public forget - removes task out of task list,
// effectively forgetting it
TasksManager.prototype.forget = function(task) {
  var deferreds = this.deferreds,
      l = this.deferreds.length;

  while (l--) {
    if (deferreds[l] === task) {
      deferreds.splice(l, 1);
      break;
    }
  }
};


// Public remember - remember a task by putting in
// the task list.
TasksManager.prototype.remember = function(task) {
  this.forget(task);
  this.deferreds.push(task);
};


// Public find
// Returns all tasks matching type selector
TasksManager.prototype.find = function(typeSel) {
  var re = this.typeSelToRegExp(typeSel),
      l = this.deferreds.length,
      r = [],
      t;

  while (l--) {
    t = this.deferreds[l];
    if (re.test(t.type)) r.push(t);
  }

  return r.reverse();
};


// Public cancel
// Rejects all current deferreds that match type selector
TasksManager.prototype.cancel = function(typeSel) {
  var deferreds = this.find(typeSel),
      l, x;

  for (x = 0; x < (l = deferreds.length); x++) {
    deferreds[x].reject('canceled');
  }
};


// $.when wrapper
TasksManager.prototype.when = function(/* typeSel, array or arguments */) {
  var args = _.toArray(arguments),
      l = args.length,
      wargs;

  if (l > 1) {
    // arguments with promises
    wargs = args;
  } else if (_.isArray(args[0])) {
    // array of promises
    wargs = args[0];
  } else if (typeof(args[0]) === 'string') {
    // typeSel
    wargs = this.find(args[0]);
  }

  return $.when.apply($, wargs);
};


// Adds scheduler function.
// Each scheduler should returns true, undefined or promise to accept,
// false or string for reason to reject
TasksManager.prototype.addScheduler = function(fn) {
  if (typeof(fn) !== "function") {
    throw new Error("scheduler must be a function");
  }
  this.schedulers.push(fn);
};


// Public allowed
// Method that determines if tasks of passed type is allowed.
// Returns true or promise to accept, false or string for reason
// to reject.
TasksManager.prototype.allowed = function(type) {
  var s, x, l, r, promises = [];
  l = this.schedulers.length;

  for (x = 0; x < l; x++) {

    // Run scheduler
    r = this.schedulers[x].apply(this, [type]);

    // In case of negative result, return right away
    if (r === false || typeof(r) === "string") return r;

    // Collect promises
    if (r && typeof(r.then) === "function") promises.push(r);
  }

  // Return new promise or true
  if (promises.length > 0) {
    return $.when.apply($, promises);
  } else {
    return true;
  }
};


TasksManager.prototype.schedule = function(typeOrTask) {
  var scheduling,
      allowed,
      task;

  // The scheduling as such is a deferred
  scheduling = new $.Deferred();

  // Get or create task
  if (typeof(typeOrTask) === "string") {
    task = this.create(typeOrTask);
  } else {
    task = typeOrTask;
  }

  // Set task as being scheduled
  task.status = "scheduling";

  // See if we are allowed to
  allowed = this.allowed(task.type);

  if (allowed === true) {
    // If result is true, we can resolve now
    task.status = "running";
    scheduling.resolve(task);
  } else if (allowed === false || typeof(allowed) === "string") {
    // If false or string (reason), reject now
    scheduling.reject(allowed);
  } else {
    // We must have a promise, so we wait for it
    allowed.done(function() {
      task.status = "running";
      scheduling.resolve(task);
    }).fail(function(reason) {
      scheduling.reject(reason);
    });
  }

  // Promise
  return scheduling.promsise();
};


//
TasksManager.prototype.parseTypeSel = function(typeSel) {
  var result = [], // 0: regex, 1: status
      parts,
      status,
      r;

  if (!this.isValidTypeSel(typeSel)) {
    throw new Error('invalid type selector');
  }

  // Split and create regex
  parts = typeSel.split(' ');
  r = '^' +
      parts[0].replace(/\./g, '\\.', 'g').
      replace('*', '.*?', 'g') +
      '$';

  // Get status
  status = parts[1].match(/\[(.*)\]/)[1];

  // Result
  return [new RegExp(r), status];
};


//
TasksManager.prototype.isValidTypeSel = function(typeSel) {
  return (/^[a-z\.\*\d]+\s\[(\any|running|scheduled)\]+$/.test(typeSel));
};


//
TasksManager.prototype.isValidType = function(type) {
  return (/^[a-z\.\d]+$/.test(type));
};


global.tasks = new TasksManager();

})(this);

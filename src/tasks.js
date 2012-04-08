/*jshint undef:true, forin:false, noempty:false, browser:true */
/*global console:true, $:true */
(function(global) {


//
function joinTypes(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a + "." + b;
}


//
function isNegAllowed(r) {
  return r === false || typeof(r) === "string";
}


//
function isPromiseAllowed(r) {
  return r && typeof(r.then) === "function";
}


//
function selfOrOwners(obj, self) {
  var o = self;
  while (o) {
    if (obj === o) return true;
    o = o.owner;
  }
}


// TasksManager constructor
function TasksManager(relScope, owner) {
  if (relScope && !this.isValidType(relScope)) {
    throw new Error("invalid scope");
  }

  // All instances work on the same list of tasks.
  // We assume there will always be a short list
  // of tasks running at the same time.
  // It's either this, or keeping track of a context
  // tree and walking to find tasks.
  if (owner) {
    this.owner = owner;
    this.tasks = owner.tasks;
    this.fullScope = joinTypes(owner.fullScope, relScope);
    this.relScope = relScope;
  } else {
    this.tasks = [];
    this.scope = relScope || "";
  }

  // But have their own schedulers
  this.schedulers = [];
}


//
TasksManager.prototype.context = function(relScope) {
  return new TasksManager(relScope, this);
};


//
TasksManager.prototype.create = function(scopedType) {
  var d, type;

  // Prefix scope
  type = joinTypes(this.fullScope, scopedType);

  if (!this.isValidType(type)) {
    throw new Error("invalid type");
  }

  // Create deferred
  d = new $.Deferred();
  d.creator = this;
  d.fullType = type;
  d.scopedType = scopedType;
  d.status = "running";

  // Push it
  this.tasks.push(d);

  // Always clean up
  d.always($.proxy(function() {
    this.forget(d);
  }, this));

  return d;
};


// Public forget - removes task out of task list,
// effectively forgetting it
TasksManager.prototype.forget = function(task) {
  var tasks = this.tasks,
      l = this.tasks.length;

  while (l--) {
    if (tasks[l] === task) {
      tasks.splice(l, 1);
      break;
    }
  }
};


// Public remember - remember a task by putting in
// the task list.
TasksManager.prototype.remember = function(task) {
  this.forget(task);
  this.tasks.push(task);
};


// Public find
// Returns all tasks matching type selector
TasksManager.prototype.find = function(scopedTypeSel) {
  var p, l, r, t, all, typeSel;

  typeSel = joinTypes(this.fullScope, typeSel);
  p = this.parseTypeSel(typeSel)[0];
  all = p[1] === "all";
  l = this.tasks.length;
  r = [];

  // Find tasks that match the type, status
  // and are either of our own or of one of
  // our owners (and not another context within
  // the same scope)
  while (l--) {
    t = this.tasks[l];
    if (p[0].test(t.fullType) &&
        (all || t.status === p[1]) &&
        selfOrOwners(t.creator, this)) {
      r.push(t);
    }
  }

  return r.reverse();
};


// Public cancel
// Rejects all current tasks that match type selector
TasksManager.prototype.cancel = function(scopedTypeSel) {
  var tasks, l, x, typeSel;

  tasks = this.find(scopedTypeSel);
  for (x = 0; x < (l = tasks.length); x++) {
    tasks[x].reject('canceled');
  }
};


// $.when wrapper
TasksManager.prototype.when =
    function(/* scopedTypeSel, array or arguments */) {

  var args = arguments,
      l = args.length,
      wargs;

  if (l > 1) {
    // arguments with promises
    wargs = args;
  } else if ($.isArray(args[0])) {
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
TasksManager.prototype.allowed = function(scopedType) {
  var s, x, l, r, promises = [];

  l = this.schedulers.length;

  for (x = 0; x < l; x++) {

    // Run scheduler
    s = this.schedulers[x];
    r = s.apply(this, scopedType);

    // In case of negative result, return right away,
    if (isNegAllowed(r)) return r;
    // Collect promises
    if (isPromiseAllowed(r)) promises.push(r);
  }

  // Does the owner allow?
  if (this.owner) {
    r = this.owner.allowed(joinTypes(this.relScope, scopedType));
    if (isNegAllowed(r)) return r;
    if (isPromiseAllowed(r)) promises.push(r);
  }

  if (promises.length > 0) {
    // Return single promise using when
    return $.when.apply($, promises);
  } else {
    // Or simply so all is fine
    return true;
  }
};


TasksManager.prototype.schedule = function(scopedTypeOrTask) {
  var scheduling,
      allowed,
      task;

  // The scheduling as such is a deferred
  scheduling = new $.Deferred();

  // Get or create task
  if (typeof(typeOrTask) === "string") {
    task = this.create(scopedTypeOrTask);
  } else {
    task = scopedTypeOrTask;
  }

  // Set task as being scheduled
  task.status = "scheduling";

  // See if we are allowed to
  allowed = this.allowed(task.scopedType);

  if (allowed === true) {

    // If result is true, we can resolve now
    task.status = "running";
    scheduling.resolve(task);

  } else if (isNegAllowed(allowed)) {

    // If false or string (reason), reject now
    task.reject(allowed);
    scheduling.reject(allowed);

  } else {

    // We must have a promise, so we wait for it
    allowed.done(function() {
      task.status = "running";
      scheduling.resolve(task);
    }).fail(function(reason) {
      task.reject(reason);
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

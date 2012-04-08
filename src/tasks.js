/*jshint undef:true, forin:false, noempty:false, browser:true */
/*global console:true, $:true */
(function(global) {


var reType = /^[a-z_\.\d]+$/,
    reTypeSel = /^([a-z\.\*\d]+)\s*?(\[[a-z\s,]+\])?$/,
    reProps = /(\w+)/g;


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


// TasksContext constructor
function TasksContext(relScope, owner) {
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
TasksContext.prototype.context = function(relScope) {
  return new TasksContext(relScope, this);
};


//
TasksContext.prototype.create = function(scopedType) {
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
TasksContext.prototype.forget = function(task) {
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
TasksContext.prototype.remember = function(task) {
  this.forget(task);
  this.tasks.push(task);
};


// Public find
// Returns all tasks matching type selector
TasksContext.prototype.find = function(scopedTypeSel) {
  var p, l, r, t, all, typeSel, mine;

  typeSel = joinTypes(this.fullScope, scopedTypeSel);
  p = this.parseTypeSel(typeSel);
  l = this.tasks.length;
  r = [];

  // Find tasks that match the type, status
  // and are either of our own or of one of
  // our owners (and not another context within
  // the same scope)
  while (l--) {
    t = this.tasks[l];

    // Check conditions
    if (!p[0].test(t.fulltype)) continue;
    if (p[1] !== "all" || p[1] !== t.status) continue;
    if (p[2] !== "all") {
      mine = selfOrOwners(t.creator, this);
      if (p[2] === "mine" && !mine) continue;
      if (p[2] === "others" && mine) continue;
    }

    // We survived, so push
    r.push(t);
  }

  // Fix order
  return r.reverse();
};


// Public cancel
// Rejects all current tasks that match type selector
TasksContext.prototype.cancel = function(scopedTypeSel) {
  var tasks, l, x, typeSel;

  tasks = this.find(scopedTypeSel);
  for (x = 0; x < (l = tasks.length); x++) {
    tasks[x].reject('canceled');
  }
};


// $.when wrapper
TasksContext.prototype.when =
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
TasksContext.prototype.addScheduler = function(fn) {
  if (typeof(fn) !== "function") {
    throw new Error("scheduler must be a function");
  }
  this.schedulers.push(fn);
};


// Public allowed
// Method that determines if tasks of passed type is allowed.
// Returns true or promise to accept, false or string for reason
// to reject.
TasksContext.prototype.allowed = function(scopedType) {
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


TasksContext.prototype.schedule = function(scopedTypeOrTask) {
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
TasksContext.prototype.parseTypeSel = function(typeSel) {
  var result = [], // 0: regex, 1: status
      parts,
      properties,
      r;

  if (!this.isValidTypeSel(typeSel)) {
    throw new Error('invalid type selector');
  }

  // Split and create regex
  parts = typeSel.match(reTypeSel);
  r = '^' +
      parts[1].replace(/\./g, '\\.', 'g').
      replace('*', '.*?', 'g') +
      '$';

  // Get properties
  properties = this._resolveProperties(parts[2]); // 0 status, 1 owner

  // Result
  return [new RegExp(r), properties[0], properties[1]];
};


//
TasksContext.prototype.isValidTypeSel = function(typeSel) {
  return reTypeSel.test(typeSel);
};


//
TasksContext.prototype.isValidType = function(type) {
  return reType.test(type);
};


// Returns [status, owner]
TasksContext.prototype._resolveProperties = function(properties) {
  var words,
      status,
      owner,
      someAll,
      l;

  // Defaults
  if (!properties) return ["all", "mine"];

  words = properties.match(reProps);

  // [all] or [all, all]
  if (words.length === 1 && words[0] === "all" ||
      words.length === 2 && words[0] === "all" && words[1] === "all") {
    return ["all", "all"];
  }

  if (words.length > 2) {
    throw new Error("onyl two selector properties support (you gave: " +
        properties + ")");
  }

  // One or two props, distribute!
  l = words.length;
  while (l--) {
    if (",running,scheduled,".indexOf("," + words[l] + ",") !== -1) {
      status = words[l];
    } else if (",mine,others,".indexOf("," + words[l] + ",") !== -1) {
      owner = words[l];
    } else if ("all" === words[l]) {
      someAll = true;
    } else {
      throw new Error("unknown selector property " + words[l]);
    }
  }

  if (!status && someAll) status = "all";
  if (!owner && someAll) owner = "all";

  return [status || "all", owner || "mine"];
};


global.tasks = new TasksContext();

})(this);

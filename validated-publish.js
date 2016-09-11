/* global ValidatedPublish:true */

ValidatedPublish = class ValidatedPublish {
  constructor(options) {
    // Default to no mixins
    options.mixins = options.mixins || [];
    check(options.mixins, [Function]);
    options = applyMixins(options, options.mixins);

    // Allow validate: null shorthand for publishes that take no arguments
    if (options.validate === null) {
      options.validate = function () {};
    }

    // If this is null/undefined, make it an empty object
    options.applyOptions = options.applyOptions || {};

    check(options, Match.ObjectIncluding({
      name: Match.Maybe(String),
      validate: Function,
      run: Function,
      mixins: [Function],
      applyOptions: Object,
    }));

    // Default options
    const defaultApplyOptions = {
      // Use meteorhacks unblock call inside publish
      unblock: true,

      // Uses publishComposite, if true the run function must return a publishComposite
      // object with find method and children array
      publishComposite: false,
    };

    options.applyOptions = _.extend({}, defaultApplyOptions, options.applyOptions);

    // Attach all options to the ValidatedPublish instance
    _.extend(this, options);
  }

  register() {
    const registration = this;
    if (Meteor.isClient)
      throw new Meteor.Error(`Register for publish ${registration.name} can only be called on client side`);

    let publish = Meteor.publish;
    if (registration.applyOptions.publishComposite)
      publish = Meteor.publishComposite;

    return publish(registration.name, function(args) {
      if (registration.unblock)
        this.unblock();

      registration.validate(args);

      return registration.run.call(this, args);
    });
  }

  getSubscription(args) {
    this.validate(args);

    return [this.name, args];
  }

  // This will work well for simple publishes, for more complex publishes, you
  // will need to use johanbrook:publication-collector
  _execute(publishInvocation, args) {
    publishInvocation = publishInvocation || {};

    // Add `this.name` to reference the publish name
    publishInvocation.name = this.name;

    const validateResult = this.validate.call(publishInvocation, args);

    if (typeof validateResult !== 'undefined') {
      throw new Error(`Returning from validate doesn't do anything; \
perhaps you meant to throw an error?`);
    }

    return this.run.call(publishInvocation, args);
  }
};

// Mixins get a chance to transform the arguments before they are passed to the actual Publish
function applyMixins(args, mixins) {
  // You can pass nested arrays so that people can ship mixin packs
  const flatMixins = _.flatten(mixins);
  // Save name of the publish here, so we can attach it to potential error messages
  const {name} = args;

  flatMixins.forEach((mixin) => {
    args = mixin(args);

    if(!Match.test(args, Object)) {
      const functionName = mixin.toString().match(/function\s(\w+)/);
      let msg = 'One of the mixins';

      if(functionName) {
        msg = `The function '${functionName[1]}'`;
      }

      throw new Error(`Error in ${name} publish: ${msg} didn't return the options object.`);
    }
  });

  return args;
}

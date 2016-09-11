const plainPublish = new ValidatedPublish({
  name: 'plainPublish',
  validate: new SimpleSchema({}).validator(),
  run() {
    return 'result';
  }
});

const noArgsPublish = new ValidatedPublish({
  name: 'noArgsPublish',
  validate: null,
  run() {
    return 'result';
  }
});

const publishWithArgs = new ValidatedPublish({
  name: 'publishWithArgs',
  validate: new SimpleSchema({
    int: { type: Number },
    string: { type: String },
  }).validator(),
  run() {
    return 'result';
  }
});

const publishThrowsImmediately = new ValidatedPublish({
  name: 'publishThrowsImmediately',
  validate: null,
  run() {
    throw new Meteor.Error('error');
  }
});

const publishReturnsName = new ValidatedPublish({
  name: 'publishReturnsName',
  validate: null,
  run() {
    return this.name;
  }
});

const publishWithSchemaMixin = new ValidatedPublish({
  name: 'publishWithSchemaMixin',
  mixins: [schemaMixin],
  schema: new SimpleSchema({
    int: { type: Number },
    string: { type: String },
  }),
  run() {
    return 'result';
  }
});

let resultReceived = false;
const publishWithApplyOptions = new ValidatedPublish({
  name: 'publishWithApplyOptions',
  validate: new SimpleSchema({}).validator(),
  applyOptions: {
    unblock: false
  },
  run() {
    return 'result';
  }
});

function schemaMixin(publishOptions) {
  publishOptions.validate = publishOptions.schema.validator();
  return publishOptions;
}

describe('gnil:validated-pubish', () => {
  it('defines a publish that can be called', (done) => {
    const result = plainPublish._execute({}, {});
    assert.equal(result, 'result');
    done();
  });

  it('allows publishes that take no arguments', (done) => {
    const result = noArgsPublish._execute();
    assert.equal(result, 'result');
    done();
  });


  [publishWithArgs, publishWithSchemaMixin].forEach((publish) => {
    it('checks schema ' + publish.name, (done) => {
      assert.throws(() => {
        publish._execute({}, {});
      }, /error/);

      const result = publish._execute({}, {
        int: 5,
        string: "what",
      });
      assert.equal(result, 'result');
      done();
    });
  });

  it('throws error if invalid callback passed', (done) => {
    assert.throws(() => {
      publishThrowsImmediately._execute({}, {});
    }, /error/);

    done();
  });

  it('throws error if a mixin does not return the options object', () => {
    assert.throws(() => {
      new ValidatedPublish({
        name: 'publishWithFaultySchemaMixin',
        mixins: [function nonReturningFunction() {}],
        schema: null,
        run() {
          return 'result';
        }
      });
    }, /Error in publishWithFaultySchemaMixin publish: The function 'nonReturningFunction' didn't return the options object/);

    assert.throws(() => {
      new ValidatedPublish({
        name: 'publishWithFaultySchemaMixin',
        mixins: [function (args) { return args}, function () {}],
        schema: null,
        run() {
          return 'result';
        }
      });
    }, /Error in publishWithFaultySchemaMixin publish: One of the mixins didn't return the options object/);
  });

  it('has access to the name on this.name', (done) => {
    const ret = publishReturnsName._execute();
    assert.equal(ret, 'publishReturnsName');

    done();
  });

  it('can accept apply options', (done) => {
    const result = publishWithApplyOptions._execute({}, {});
    assert.equal(result, 'result');
    done();
  });

  it('registers only on the server', (done) => {
    if (Meteor.isClient) {
      assert.throws(() => {
        plainPublish.register(); },
      /Register for publish plainPublish can only be called on client side/);

      done();
    }

    if (Meteor.isServer) {
      assert.doesNotThrow(() => {
        plainPublish.register();
      });

      done();
    }

  });

  it('gets subscription', (done) => {
    let result = plainPublish.getSubscription({})
    assert.deepEqual(result, ['plainPublish', {}]);

    result = publishWithArgs.getSubscription({int: 42, string: 'Deep Thought'})
    assert.deepEqual(result, ['publishWithArgs', {int: 42, string: 'Deep Thought'}]);

    assert.throws(() => {
      publishWithArgs.getSubscription({});
    }, /error/);

    done();
  });
});

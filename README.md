# gnil:validated-publish

### Define Publications in a structured way, with mixins

```js
// Publication definition
const publish = new ValidatedPublish({
  name, // publication name (can be null)
  mixins, // publication extensions
  validate, // argument validation
  applyOptions, // options used in publication
  run // publication body
});

// Register publication on the server
publish.register();

// Get subscription on client and pass to meteor subscribe
Meteor.subscribe(...publish.getSubscription(args));
```

This is a simple wrapper package for `Meteor.publish`. The need for such a package came
after the Meteor Guide was written and I realized there was a lot of best-practices
boilerplate around publications that could be easily abstracted away. (In an incredibly similar way
to that in which Meteor methods could be helped by validated methods).

> Note: the code samples in this README use the Meteor 1.3 import/export syntax, but this package works okay in Meteor 1.2 as well. In that case, I would recommend attaching your ValidatedPublish objects to the relevant collection, like `Lists.publications.list = new ValidatedPublish(...)`.

### Benefits of ValidatedPublish

1. Have an object that represents your publication. Refer to it through JavaScript scope rather than
by a magic string name.
1. Built-in validation of arguments through `aldeed:simple-schema`, or roll your own argument validation.
1. Easily call your publication from tests or server-side code, passing in any user ID you want. (Note that this only works well for basic publications)
1. Throw errors from the client-side publish simulation to prevent execution of the server-side
check - this means you can do complex client-side validation in the body on the client, and not
waste server-side resources.
1. Take advantage of common core publication packages like [meteorhacks:unblock](https://github.com/meteorhacks/unblock) and [reywood:publish-composite](https://atmospherejs.com/reywood/publish-composite)
1. Install Pu extensions via mixins.

### Defining a publish

#### Using SimpleSchema

Let's examine a publish from the new [Todos example app](https://github.com/meteor/todos/blob/b890fc2ac8846051031370035421893fa4145b86/packages/lists/publishs.js#L17) which makes a list private and takes the `listId` as an argument. The publish also does permissions checks based on the currently logged-in user. Note this code uses new [ES2015 JavaScript syntax features](http://info.meteor.com/blog/es2015-get-started).

```js
// Export your publication from this module
export const getList = new ValidatedPublish({
  // The name of the publication, sent over the wire. Same as the key provided
  // when calling Meteor.subscribe
  name: 'Lists.publication.getList',

  // Validation function for the arguments. Only keyword arguments are accepted,
  // so the arguments are an object rather than an array. The SimpleSchema validator
  // throws a ValidationError from the mdg:validation-error package if the args don't
  // match the schema
  validate: new SimpleSchema({
    listSubject: {type: String}
  }).validator(),

  // This is optional, but you can use this to pass options for publications,
  // the two basic options are unblocking and composite publications
  applyOptions: {
    unblock: false,
  },

  // This is the body of the publication. Use ES2015 object destructuring to get
  // the keyword arguments
  run({ listSubject }) {
    // `this` is the same normal publication this
    if (!this.userId) {
      // Throw errors with a specific error code
      throw new Meteor.Error('Lists.publishs.makePrivate.notLoggedIn',
        'Must be logged in to make private lists.');
    }

    return Lists.find({
        userId: this.userId,
        listSubject
      }, {
        fields: Lists.publicFields
      });
  }
});
```

The `validator` function called in the example requires SimpleSchema version 1.4+.

Be aware that by default the `validator` function does not [clean](https://github.com/aldeed/meteor-simple-schema#cleaning-data)
the publication parameters before checking them. This behavior differs from that of
`aldeed:collection2`, which always cleans the input data before inserts, updates,
or upserts.

If you want the validator to clean its inputs before checking, make sure to pass
the `{ clean: true }` option to the `validator` function:

```js
  validate: new SimpleSchema({
    listId: { type: String }
  }).validator({ clean: true }),
```

#### Using your own argument validation function

If `aldeed:simple-schema` doesn't work for your validation needs, just define a custom `validate`
publication that throws a [`ValidationError`](https://github.com/meteor/validation-error) instead:

```js
const publication = new ValidatedPublish({
  name: 'publishName',

  validate({ myArgument }) {
    const errors = [];

    if (myArgument % 2 !== 0) {
      errors.push({
        name: 'myArgument',
        type: 'not-even',
        details: {
          value: myArgument
        }
      });
    }

    if (errors.length) {
      throw new ValidationError(errors);
    }
  },

  // ...
});
```

#### Using `check` to validate arguments

You can use `check` in your validate function if you don't want to pass `ValidationError` objects to the client, like so:

```js
const publish = new ValidatedPublish({
  name: 'publishName',

  validate(args) {
    check(args, {
      myArgument: String
    });
  },

  // ...
});
```

#### Skipping argument validation

If your publish does not need argument validation, perhaps because it does not take any arguments, you can use `validate: null` to skip argument validation.

#### Defining a default publication

You can define a default publication (one that automatically publishes), by leaving out the name property.

#### Options to ValidatedPublish

By default, `ValidatedPublish` uses the following options:

```js
{
  // Use meteorhacks unblock call inside publish
  unblock: true,

  // Uses publishComposite, if true the run function must return a publishComposite
  // object with find publish and children array
  publishComposite: false,
}
```

### Using a ValidatedPublish

#### publish#register()

Register a publication like so:

```js
import {
  getList
} from '/imports/api/lists/publications';

getList.register();

});
```

This will only work in server-side code. If called on the client-side it will throw.

#### publish#getSubscription(args: Object)

Subscribe to a publication like so:

```js
import {
  getList
} from '/imports/api/lists/publications';

Meteor.subscribe(...getList.getSubscription(args));

});
```

This returns an array containing the validated args and the name of the subscription as the result

#### publish#\_execute(context: Object, args: Object)

Call this from your test code to simulate publishing on behalf of a particular user:

```js
  const context = { userId };
  const args = { listSubject };

  const result = getList._execute(context, args);

  result.fetch();

```

### Mixins

Every `ValidatedPublish` can optionally take an array of _mixins_. A mixin is simply a function that takes the options argument from the constructor, and returns a new object of options. For example, a mixin that enables a `schema` property and fills in `validate` for you would look like this:

```js
function schemaMixin(publishOptions) {
  publishOptions.validate = publishOptions.schema.validator();
  return publishOptions;
}
```

Then, you could use it like this:

```js
const publishWithSchemaMixin = new ValidatedPublish({
  name: 'publishWithSchemaMixin',
  mixins: [schemaMixin],
  schema: new SimpleSchema({
    int: { type: Number },
    string: { type: String },
  }),

});
```

### Community mixins

If you write a helpful `ValidatedPublish` mixin, please file an issue or PR so that it can be listed here!

### Ideas

- It could be nice to have a `SimpleSchema` mixin which just lets you specify a `schema` option rather than having to pass a `validator` function into the `validate` option. This would enable the below.

### Running tests

```
meteor test-packages --driver-package practicalmeteor:mocha ./
```

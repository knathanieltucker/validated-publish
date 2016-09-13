Package.describe({
  name: 'gnil:validated-publish',
  summary: 'A simple wrapper for Meteor.publish',
  version: '0.1.1',
  documentation: 'README.md',
});

Package.onUse(function (api) {
  api.versionsFrom('1.2');

  api.use([
    'ecmascript',
    'check',
    'underscore',
    'reywood:publish-composite@1.4.2',
    'meteorhacks:unblock@1.1.0'
  ]);

  api.addFiles('validated-publish.js');
  api.export('ValidatedPublish');
});

Package.onTest(function (api) {
  api.use([
    'ecmascript',
    'practicalmeteor:mocha@2.1.0_5',
    'practicalmeteor:chai@2.1.0_1',
    'aldeed:simple-schema@1.4.0',
    'gnil:validated-publish',
    'random'
  ]);

  api.addFiles('validated-publish-tests.js');
});

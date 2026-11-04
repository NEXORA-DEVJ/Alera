const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withDisableMinify(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => item.key !== 'android.enableMinifyInReleaseBuilds'
    );
    config.modResults.push({
      type: 'property',
      key: 'android.enableMinifyInReleaseBuilds',
      value: 'false',
    });
    return config;
  });
};

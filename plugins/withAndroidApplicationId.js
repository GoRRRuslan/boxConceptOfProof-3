// The required Android application id is `com.gorrr.mysterywatch.native`, but `native` is a Java keyword and Gradle rejects
// it as a package / namespace. So the code lives in the package `com.gorrr.mysterywatch.nativeapp` (expo `android.package`) and
// this plugin only changes the application id that the device sees.
const { withAppBuildGradle } = require('expo/config-plugins')

module.exports = function withAndroidApplicationId(config, { applicationId }) {
  return withAppBuildGradle(config, buildGradleConfig => {
    buildGradleConfig.modResults.contents = buildGradleConfig.modResults.contents.replace(
      /applicationId\s+['"][^'"]+['"]/,
      `applicationId "${applicationId}"`,
    )

    return buildGradleConfig
  })
}

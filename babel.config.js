module.exports = function (api) {
  api.cache(true)

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@app': './src/app',
            '@i18next': './src/i18next',
            '@configs': './src/configs',
            '@assets': './src/assets',
            '@components': './src/components',
            '@flows': './src/flows',
            '@models': './src/models',
            '@navigation': './src/navigation',
            '@networking': './src/networking',
            '@services': './src/services',
            '@utils': './src/utils',
          },
          extensions: ['.ts', '.tsx', '.js', '.json'],
        },
      ],
      'react-native-worklets/plugin',
    ],
  }
}

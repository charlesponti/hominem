const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  context: path.join(__dirname, 'src'),
  entry: ['./index.js'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    publicPath: '/',
  },
  devtool: 'cheap-module-eval-source-map',
  watch: true,
  watchOptions: {
    ignored: [/node_modules/, /dist/],
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    port: 8080,
  },
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'index.html'),
      filename: path.join(__dirname, 'dist', 'index.html'),
      hash: true, // Cache bust the js bundle
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        loader: 'babel-loader',
      },
    ],
  },
}

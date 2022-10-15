const path = require('path');
const mqtt = require('mqtt')
const bunyan = require('bunyan')
const RotatingFileStream = require('bunyan-rotating-file-stream')
const dotenv = require('dotenv')

dotenv.config()

const bformat = require('bunyan-format')
const formatOut = bformat({ outputMode: 'short', levelInString: true })

//init logger
const bunyanOpts = {
  name: 'app',
  streams: [
    {
      type: 'stream',
      stream: formatOut,
    },
    {
      type: 'raw',
      stream: new RotatingFileStream({
        path: path.resolve(__dirname, 'logs/alarm.log'),
        period: '1d',
        totalFiles: 365,
        rotateExisting: false,
        threshold: '10m',
        totalSize: '200m',
        gzip: true,
      })
    }

  ],
}
const log = bunyan.createLogger(bunyanOpts)


//const clientId = `texeLogger_${Math.random().toString(16).slice(3)}`


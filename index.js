const path = require('path')
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

const parseZoneStatus = (status) => {
  const statuses = {
    0: 'Secure',
    1: 'active',
  }
  return statuses[status] || status;
}

const storeAreaMessage = (payload) => {
  try {
    const message = JSON.parse(payload);
    log.info(`AREA event, ID: ${message.id}, Number: ${message.number}, Name: ${message.name}, Status: ${message.status}`)
  } catch(error) {
    log.error('Unable to parse AREA MQTT payload.', payload, error)
  }
}


const storeZoneMessage = (payload) => {
  try {
    const message = JSON.parse(payload);
    const areas = message.areas.join(', ')
    log.info(`ZONE event, Number: ${message.number}, Name: ${message.name} (${message.type}), Areas: ${areas},  Status: ${parseZoneStatus(message.status)}`)
  } catch(error) {
    log.error('Unable to parse ZONE MQTT payload.', payload, error)
  }
}

//check mandatory params
if (!process.env.MQTT_PROTOCOL ||
  !process.env.MQTT_HOST ||
  !process.env.MQTT_PORT ||
  !process.env.MQTT_TOPIC_PREFIX) {
  log.error('Mandatory MQTT params missing. Please set at least MQTT_PROTOCOL MQTT_HOST MQTT_PORT in .env')
  process.exit()
}

const topics = [
  `${process.env.MQTT_TOPIC_PREFIX}/zone/#`,
  `${process.env.MQTT_TOPIC_PREFIX}/area/#`,
]
const clientId = `texeLogger_${Math.random().toString(16).slice(3)}`
const connectUrl = `${process.env.MQTT_PROTOCOL}://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`
const mqttOpts = {
  clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
}

if (process.env.MQTT_USER && process.env.MQTT_PASS) {
  mqttOpts.username = process.env.MQTT_USER
  mqttOpts.password = process.env.MQTT_PASS
}

const mqttClient = mqtt.connect(connectUrl, mqttOpts)

mqttClient.on('connect', () => {
  log.info(`Connected to ${connectUrl} with client id ${clientId}`)
  mqttClient.subscribe(topics, () => {
    log.info('Subscribe to topics')
  })
})

mqttClient.on('message', (topic, payload) => {
  if (topic.startsWith(`${process.env.MQTT_TOPIC_PREFIX}/zone`)) {
    storeZoneMessage(payload.toString())
    return
  }
  if (topic.startsWith(`${process.env.MQTT_TOPIC_PREFIX}/area`)) {
    storeAreaMessage(payload.toString())
    return
  }
})
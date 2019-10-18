'use strict'

// create default logger
let logger = require('./logger')()

// get configuration
let config = require('./config')(logger)

// update logger with configuration
logger.updateConfig(config.logger)

// load xmpp module
const xmpp = require('./xmpp')(logger, config)

// load webhook module
const webhookListener = require('./webhook')(logger, config, xmpp)

// handle error and process ending
require('./error')(logger, xmpp)

exports.close = () => {
  webhookListener.close()
}

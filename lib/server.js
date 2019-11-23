'use strict'

// create default logger
let logger = require('./logger')()

// get configuration
let config = require('./config')(logger)

// update logger with configuration
logger.updateConfig(config.logger)

// output application version
const { name, version } = require('./../package.json')
logger.info(`Start ${name} service - version ${version}`)

// load xmpp module
const xmpp = require('./xmpp')(logger, config)

// load webhook module
require('./webhook')(logger, config, xmpp)

// handle error and process ending
require('./error')(logger, xmpp)

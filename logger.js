/**
 * Logger
 *
 * Create logger
 *
 * @file   This files defines the logger
 * @author nioc
 * @since  1.0.0
 * @license AGPL-3.0+
 */

module.exports = () => {
  // default configuration (info to stdout)
  const log4js = require('log4js')
  let logger = log4js.getLogger()
  logger.level = 'info'

  // function updating logger with configuration
  logger.updateConfig = (config) => {
    // coloured console in dev
    if (process.env.NODE_ENV !== 'production') {
      config.console.active = true
      config.stdout.active = false
      config.level = 'trace'
    }

    // add appenders
    let appenders = []
    if (config.file.active) {
      const fs = require('fs')
      if (!fs.existsSync(config.file.path)) {
        try {
          fs.mkdirSync(config.file.path)
        } catch (error) {
          logger.fatal(`Can not write logs: ${error.message}`)
          process.exit(99)
        }
      }
      appenders.push('file')
    }
    let layout = 'basic'
    if (config.console.active) {
      if (config.console.coloured) {
        layout = 'coloured'
      }
      appenders.push('console')
    }
    if (config.stdout.active) {
      appenders.push('stdout')
    }
    if (appenders.length === 0) {
      logger.fatal('App require at least one log appender')
      process.exit(99)
    }

    // configure logger
    try {
      log4js.configure({
        appenders: {
          console: {
            type: 'console',
            layout: { type: layout }
          },
          stdout: {
            type: 'stdout',
            layout: { type: 'pattern', pattern: config.stdout.pattern }
          },
          file: {
            type: 'file',
            layout: { type: 'pattern', pattern: config.file.pattern },
            filename: config.file.path + config.file.filename,
            maxLogSize: 1048576
          }
        },
        categories: {
          default: { appenders: appenders, level: 'info' }
        }
      })
      logger = log4js.getLogger()
    } catch (error) {
      logger.error(`Invalid logs config: ${error.message}`)
      process.exit(99)
    }

    logger.level = config.level
  }

  // synchronize logs before closing app
  logger.shutdown = (cb) => {
    log4js.shutdown(cb)
  }

  return logger
}

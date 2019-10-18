/**
 * Configuration
 *
 * Handle configuration file
 *
 * @file   This files defines the configuration
 * @author nioc
 * @since  1.0.0
 * @license AGPL-3.0+
 */

module.exports = function Configuration (logger) {
  let config
  try {
    let data = require('fs').readFileSync('./lib/config/config.json')
    config = JSON.parse(data)
  } catch (error) {
    logger.fatal(`Invalid configuration file: ${error.message}`)
    process.exit(99)
  }
  return {
    listener: {
      path: config.webhooksListener.path,
      port: config.webhooksListener.port,
      ssl: config.webhooksListener.ssl,
      log: config.webhooksListener.accessLog,
      users: config.webhooksListener.users.reduce((acc, user) => {
        acc[user.login] = user.password
        return acc
      }, {})
    },
    xmpp: config.xmppServer,
    logger: config.logger,
    getWebhookAction: (path) => {
      return config.incomingWebhooks.find((webhook) => {
        return (webhook.path === path)
      })
    },
    getOutgoingWebhook: (code) => {
      return config.outgoingWebhooks.find((webhook) => {
        return (webhook.code === code)
      })
    },
    getXmppHookAction: (room) => {
      return config.xmppHooks.find((xmppHook) => {
        return (xmppHook.room === room)
      })
    }
  }
}
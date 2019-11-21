/**
 * Close handler
 *
 * Disconnect bot from XMPP server before app closes
 *
 * @file   This files defines the closing handler
 * @author nioc
 * @since  1.0.0
 * @license AGPL-3.0+
 */

module.exports = (logger, xmpp) => {
  let nodeCleanup = require('node-cleanup')
  nodeCleanup(function (exitCode, signal) {
    logger.warn(`Received ${exitCode}/${signal} (application is closing), disconnect from XMPP server`)
    try {
      xmpp.close()
        .then(logger.debug('Connection successfully closed'))
        .catch((error) => {
          logger.error('Error during XMPP disconnection', error)
        })
    } catch (error) {
      logger.error('Error during XMPP disconnection: ' + error.message)
    }
    logger.debug('Synchronize logs file')
    logger.shutdown()
  })
}

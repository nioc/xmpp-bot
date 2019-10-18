/**
 * XMPP bot
 *
 * Create XMPP client, connect bot to server and handle interactions
 *
 * @exports xmpp
 * @file   This files defines the XMPP bot
 * @author nioc
 * @since  1.0.0
 * @license AGPL-3.0+
 */

module.exports = (logger, config) => {
  const xmpp = require('simple-xmpp')
  this.jid = null

  // handle connection
  xmpp.on('online', function (data) {
    logger.info(`XMPP connected on ${config.xmpp.host}:${config.xmpp.port} with JID: ${data.jid.user}`)
    this.jid = data.jid.user
    // join rooms
    config.xmpp.rooms.forEach(function (room) {
      logger.debug(`Join room: ${room.id} ('${room.id}/${data.jid.user}')`)
      xmpp.join(room.id + '/' + data.jid.user, room.password)
      logger.info(`Joined room: ${room.id}`)
    })
  })

  // handle direct message
  xmpp.on('chat', function (from, message) {
    logger.info(`Incoming chat message from ${from}`)
    logger.debug(`Message: "${message}"`)
    let xmppHook = config.getXmppHookAction('bot')
    if (!xmppHook) {
      logger.error('There is no action for incoming chat message from bot')
      return
    }
    switch (xmppHook.action) {
      case 'outgoing_webhook':
        logger.debug(`Call outgoing webhook: ${xmppHook.args[0]}`)
        require('../outgoing')(logger, config, xmpp, from, from, message, false, xmppHook.args[0])
        break
      default:
        break
    }
  })

  // handle group message
  xmpp.on('groupchat', function (conference, from, message, stamp, delay) {
    // logger.trace(`Get following group message: "${message}" in ${conference} from ${from}. stamp = ${stamp} - delay = `, delay)
    if (from === this.jid || stamp !== null) {
      // message from bot, do nothing
      return
    }
    logger.info(`Incoming groupchat message from ${from} in ${conference}`)
    logger.debug(`Message: "${message}"`)
    let xmppHook = config.getXmppHookAction(conference)
    if (!xmppHook) {
      logger.error(`There is no action for incoming groupchat message from conference: "${conference}"`)
      return
    }
    switch (xmppHook.action) {
      case 'outgoing_webhook':
        logger.debug(`Call outgoing webhook: ${xmppHook.args[0]}`)
        require('../outgoing')(logger, config, xmpp, from, conference, message, true, xmppHook.args[0])
        break
      default:
        break
    }
  })

  // handle error
  xmpp.on('error', function (err) {
    logger.error(err)
  })

  // connect
  xmpp.connect(config.xmpp)

  // get roster
  xmpp.getRoster()

  return xmpp
}

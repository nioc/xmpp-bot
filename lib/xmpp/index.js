/**
 * XMPP bot
 *
 * Create XMPP client, connect bot to server and handle interactions
 *
 * @exports xmpp
 * @file   This files defines the XMPP bot
 * @author nioc
 * @since  2.0.0
 * @license AGPL-3.0+
 */

module.exports = (logger, config) => {
  const { client, xml, jid } = require('@xmpp/client')
  const outgoing = require('../outgoing')
  this.jid = null

  // declare send chat/groupchat function
  this.send = async (to, message, type) => {
    logger.debug(`Send ${type} message to ${to}: '${message}'`)
    const stanza = xml(
      'message', {
        to,
        type
      },
      xml(
        'body', {
        },
        message)
    )
    await xmppClient.send(stanza)
  }

  // declare close function
  this.close = async () => {
    await xmppClient.stop()
  }

  // create XMPP client
  const xmppClient = client(config.xmpp)

  // handle connection
  xmppClient.on('online', (address) => {
    logger.info(`XMPP connected on ${config.xmpp.service} with JID: ${address.toString()}`)
    this.jid = address
    // send presence
    xmppClient.send(xml('presence'))
      .then(() => {
        logger.debug('presence sent')
      })
      .catch((error) => {
        logger.warn('presence returned following error:', error)
      })
    // join rooms
    config.xmpp.rooms.forEach(function (room) {
      let occupantJid = room.id + '/' + address.local
      logger.debug(`Join room: ${room.id} ('${occupantJid}')`)
      const stanza = xml(
        'presence', {
          to: occupantJid
        },
        xml(
          'x', {
            xmlns: 'http://jabber.org/protocol/muc'
          }
        )
      )
      xmppClient.send(stanza)
      logger.info(`Joined room: ${room.id}`)
    })
  })

  // handle stanzas
  xmppClient.on('stanza', stanza => {
    if (!stanza.is('message')) {
      // not a message, do nothing
      return
    }
    let type = stanza.attrs.type
    switch (type) {
      case 'chat':
      case 'groupchat':
        let body = stanza.getChild('body')
        if (!body) {
          // empty body, do nothing
          return
        }
        let fromJid = jid(stanza.attrs.from)
        // for chat, "to" and "replyTo" must be something like "user@domain.ltd", "from" is local part "user"
        let to = this.jid.bare()
        let from = fromJid.local
        let replyTo = fromJid.bare()
        if (type === 'groupchat') {
          // for groupchat, "to" and "replyTo" is conference name, "from" is nickname
          to = fromJid.bare()
          from = fromJid.getResource()
          replyTo = to
          if (from === this.jid.local || stanza.getChild('delay')) {
            // message from bot or old message, do nothing
            return
          }
        }
        let message = body.text()
        logger.info(`Incoming ${type} message from ${from} (${fromJid.toString()}) to ${to}`)
        logger.debug(`Message: "${message}"`)
        let xmppHook = config.getXmppHookAction(to.toString())
        if (!xmppHook) {
          logger.error(`There is no action for incoming ${type} message to: "${to}"`)
          return
        }
        switch (xmppHook.action) {
          case 'outgoing_webhook':
            logger.debug(`Call outgoing webhook: ${xmppHook.args[0]}`)
            outgoing(logger, config, this, from.toString(), replyTo.toString(), message, type, xmppHook.args[0])
            break
          default:
            break
        }
        break
    }
  })

  // handle status
  xmppClient.on('status', (status) => {
    logger.trace(`Status changed to ${status}`)
  })

  // trace input/output
  // xmppClient.on('input', (input) => {
  //   logger.trace('<<<<', input)
  // })
  // xmppClient.on('output', (output) => {
  //   logger.trace('>>>', output)
  // })

  // handle error
  xmppClient.on('error', (err) => {
    logger.error('XMPP client encountered following error:', err.message)
    process.exit(99)
  })

  // connect
  xmppClient.start()
    .catch((error) => {
      logger.error('XMPP client encountered following error at connection', error)
    })

  return this
}

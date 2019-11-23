/**
 * Webhooks listener
 *
 * Create webhooks listener
 *
 * @file   This files defines the webhooks listener
 * @author nioc
 * @since  1.0.0
 * @license AGPL-3.0+
 */

module.exports = (logger, config, xmpp) => {
  const http = require('http')
  const express = require('express')
  const bodyParser = require('body-parser')
  const basicAuth = require('express-basic-auth')
  const jmespath = require('jmespath')
  const port = config.listener.port || 8000
  const portSsl = config.listener.ssl.port || 8001

  var webhook = express()

  // handle connection from proxy (get IP in 'X-Forwarded-For' header)
  webhook.set('trust proxy', true)

  // logs request
  if (config.listener.log.active) {
    const morgan = require('morgan')
    const fs = require('fs')
    // create path if not exists
    if (!fs.existsSync(config.listener.log.path)) {
      try {
        fs.mkdirSync(config.listener.log.path)
      } catch (error) {
        logger.fatal(`Can not create webhooks log folder: ${error.message}`)
        process.exit(99)
      }
    }
    // create log
    const accessLogStream = fs.createWriteStream(config.listener.log.path + config.listener.log.filename, { flags: 'a' })
    accessLogStream.on('error', (err) => {
      logger.fatal('Can not create webhooks log file: ' + err.message)
      process.exit(99)
    })
    webhook.use(morgan('combined', { stream: accessLogStream }))
  }

  // parse request
  webhook.use(bodyParser.json())

  // add basic authentification
  webhook.use(basicAuth({
    users: config.listener.users,
    unauthorizedResponse: 'Invalid authorization'
  }))

  // handle post request
  webhook.post(config.listener.path + '/*', (req, res) => {
    logger.info(`Incoming webhook from ${req.auth.user}`)
    let webhook = config.getWebhookAction(req.path)
    if (!webhook) {
      logger.error(`Webhook received: ${req.path}, not found`)
      return res.status(404).send('Webhook not found')
    }
    logger.debug(`Webhook received: ${webhook.path}, start action: ${webhook.action}`)
    logger.trace(req.body)
    switch (webhook.action) {
      case 'send_xmpp_message':

        // get destination
        if ('destination' in req.body === false) {
          logger.error('Destination not found')
          return res.status(400).send('Destination not found')
        }
        let destination = req.body.destination

        // get message
        if ('message' in req.body === false) {
          logger.error('Message not found')
          return res.status(400).send('Message not found')
        }
        let message = req.body.message

        // check if destination is a group chat
        const type = config.xmpp.rooms.some((room) => room.id === destination) ? 'groupchat' : 'chat'

        // send message
        logger.trace(`Send to ${destination} (group:${type}) following message :\r\n${message}`)
        xmpp.send(destination, message, type)
          .then(() => {
            return res.status(200).send({ 'status': 'ok', destination })
          })
          .catch(() => {
            return res.status(500).send('Could not send message')
          })
        break

      case 'send_xmpp_template':

        // bind data in template
        let msg = webhook.template.replace(/\$\{(.+?)\}/g, (match, $1) => {
          return jmespath.search(req.body, $1) || ''
        })
        logger.trace(`Message:\r\n${msg}`)
        logger.trace(`Arguments: ${webhook.args}`)

        // send message
        logger.trace(`Send to ${webhook.args.destination} (group:${webhook.args.type}) following message :\r\n${msg}`)
        xmpp.send(webhook.args.destination, msg, webhook.args.type)
          .then(() => {
            return res.status(200).send('ok')
          })
          .catch(() => {
            return res.status(500).send('Could not send message')
          })
        break

      default:
        return res.status(204).send()
    }
  })

  // handle non post requests
  webhook.all('*', (req, res) => {
    return res.status(405).send('Method not allowed')
  })

  // handle server error
  webhook.on('error', (error) => {
    logger.error('Error', error)
  })

  // start HTTP listener
  const httpServer = http.createServer(webhook).listen(port, () => {
    logger.info(`Listening webhooks on http://localhost:${port}${config.listener.path}`)
  })

  // start HTTPS listener
  if (config.listener.ssl.port !== null) {
    if (process.getuid) {
      logger.debug(`App is started with uid: ${process.getuid()}`)
    }
    logger.debug(`Start HTTPS on port ${portSsl}, private key: ${config.listener.ssl.keyPath}, cert: ${config.listener.ssl.certPath}`)
    const https = require('https')
    const fs = require('fs')
    // check if cert is readable
    try {
      fs.accessSync(config.listener.ssl.keyPath, fs.constants.R_OK)
      logger.debug('Can read private key')
      try {
        fs.accessSync(config.listener.ssl.certPath, fs.constants.R_OK)
        logger.debug('Can read certificate')
        let credentials = {
          key: fs.readFileSync(config.listener.ssl.keyPath),
          cert: fs.readFileSync(config.listener.ssl.certPath)
        }
        https.createServer(credentials, webhook).listen(portSsl, () => {
          logger.info(`Listening webhooks on https://localhost:${portSsl}${config.listener.path}`)
        })
      } catch (err) {
        logger.error(`Can not read certificate: ${err.message}`)
      }
    } catch (err) {
      logger.error(`Can not read private key: ${err.message}`)
    }
  }

  // Closing HTTP listener (for test)
  webhook.close = () => {
    httpServer.close()
  }

  return webhook
}

/**
 * Slack webhooks component
 *
 * Create webhooks publisher
 *
 * @file   This files defines the webhooks publisher
 * @author nioc
 * @since  1.0.0
 * @license AGPL-3.0+
 */

module.exports = async (logger, config, xmpp, user, destination, message, type, code) => {
  let webhook = config.getOutgoingWebhook(code)
  if (!webhook) {
    logger.warn(`There is no webhook with code "${code}"`)
    throw new Error(`There is no webhook with code "${code}"`)
  }
  const { promisify } = require('util')
  const request = promisify(require('request'))
  // request.debug = true
  let options = {
    method: 'POST',
    url: webhook.url,
    strictSSL: webhook.strictSSL
  }
  logger.trace('Outgoing webhook url:', webhook.url)
  switch (webhook.authMethod) {
    case 'basic':
      logger.trace(`Basic auth method user: ${webhook.user} pass: ${webhook.password}`)
      options.auth = {
        user: webhook.user,
        pass: webhook.password
      }
      break
    case 'bearer':
      logger.trace(`Bearer token auth method bearer: ${webhook.bearer}`)
      options.auth = {
        user: null,
        pass: null,
        sendImmediately: true,
        bearer: webhook.bearer
      }
      break

    default:
      break
  }
  switch (webhook.contentType) {
    case 'application/x-www-form-urlencoded':
      logger.trace('Content-type: application/x-www-form-urlencoded')
      options.form = {
        from: user,
        message: message,
        channel: destination
      }
      logger.trace('Outgoing webhook request:', options.form)
      break
    case 'application/json':
      logger.trace('Content-type: application/json')
      options.json = {
        from: user,
        message: message,
        channel: destination
      }
      logger.trace('Outgoing webhook request:', options.json)
      break
    default:
      break
  }
  options.timeout = webhook.timeout || 5000
  logger.trace('Outgoing webhook options:', options)
  try {
    const { statusCode, body } = await request(options)
    if (statusCode === 200) {
      logger.trace('Response:', body)
      if (body && typeof (body) === 'object' && 'reply' in body === true) {
        logger.debug(`There is a reply to send back in chat ${destination}: ${body.reply.replace(/\n|\r/g, ' ')}`)
        xmpp.send(destination, body.reply, type)
        return `Message sent. There is a reply to send back in chat ${destination}: ${body.reply}`
      }
      return 'Message sent'
    }
    throw new Error(`HTTP error: ${statusCode}`)
  } catch (error) {
    logger.error(`Error during outgoing webhook request: ${error.message}`)
    throw error
  }
}

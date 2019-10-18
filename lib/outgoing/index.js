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

module.exports = (logger, config, xmpp, user, destination, message, sendToGroup, code) => {
  let webhook = config.getOutgoingWebhook(code)
  if (!webhook) {
    logger.warn(`There is no webhook with code "${code}"`)
    return
  }
  const request = require('request')
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
  logger.trace('Outgoing webhook options:', options)
  request(options, function (error, response, body) {
    logger.debug('statusCode:', response && response.statusCode)
    if (error) {
      logger.error('HTTP error:', error)
      return
    }
    if (response.statusCode === 200) {
      logger.trace('Response:', body)
      if (body && 'reply' in body === true) {
        logger.debug(`There is a reply to send back in chat ${destination}: ${body.reply}`)
        xmpp.send(destination, body.reply, sendToGroup)
      }
    }
  })
}

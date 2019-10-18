/* eslint-disable handle-callback-err */
/* eslint-disable no-undef */
process.env.NODE_ENV = 'production'
// eslint-disable-next-line no-unused-vars
const should = require('chai').should()
let request = require('request')
let server = require('../lib/server')
const baseUrl = 'http://localhost:8000/'

after((done) => {
  server.close()
  done()
})

describe('Webhook', () => {
  options = {
    method: 'POST',
    url: baseUrl + 'webhooks/',
    auth: {
      user: 'login1',
      pass: '1pass'
    }
  }
  describe('POST unauthorized', () => {
    it('Should return 401', (done) => {
      request.post(baseUrl, (error, response, body) => {
        response.statusCode.should.equal(401)
        done()
      })
    })
  })
  describe('GET', () => {
    it('Should return 405', (done) => {
      request.get(baseUrl, { auth: options.auth }, (error, response, body) => {
        response.statusCode.should.equal(405)
        done()
      })
    })
  })
  describe('POST unknown webhook', () => {
    it('Should return 404', (done) => {
      request(options, (error, response, body) => {
        response.statusCode.should.equal(404)
        done()
      })
    })
  })
  describe('POST dummy webhook', () => {
    it('Should return 204', (done) => {
      options.url = baseUrl + 'webhooks/dummy'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(204)
        done()
      })
    })
  })
  describe('POST missing destination webhook', () => {
    it('Should return 400 and error detail', (done) => {
      options.url = baseUrl + 'webhooks/w1'
      request(options, (error, response, body) => {
        response.statusCode.should.equal(400)
        response.body.should.equal('Destination not found')
        done()
      })
    })
  })
  describe('POST missing message webhook', () => {
    it('Should return 400 and error detail', (done) => {
      options.json = {
        destination: 'destination'
      }
      request(options, (error, response, body) => {
        response.statusCode.should.equal(400)
        response.body.should.equal('Message not found')
        done()
      })
    })
  })
  describe('POST valid webhook', () => {
    it('Should return 200', (done) => {
      options.json = {
        destination: 'destination',
        message: 'message'
      }
      request(options, (error, response, body) => {
        response.statusCode.should.equal(200)
        done()
      })
    })
  })
})

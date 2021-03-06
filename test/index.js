/* eslint-env mocha */
var assert = require('assert')
var path = require('path')
var Intimidate = require('../index')

describe('Intimidate', function() {
  var noopKnox = {createClient: function() {}}

  it('throws an error if required options are not passed in', function() {
    assert.throws(function () {
      var client = new Intimidate({})
    })
  })

  it('does not throw an error if required options are passed in', function () {
    assert.doesNotThrow(function() {
      var client = new Intimidate({key: 1, secret: 1, bucket: 1}, noopKnox)
    })
  })

  it('does not throw an error if alternative options are passed in', function () {
    assert.doesNotThrow(function() {
      var client = new Intimidate({accessKeyId: 1, secretAccessKey: 1, bucket: 1}, noopKnox)
    })
  })

  describe('calculateBackoff', function() {
    it('returns a larger backoff for larger numbers of retries', function() {
      var client = new Intimidate({key: 1, secret: 1, bucket: 1}, noopKnox)
      var lessRetriesBackoff = client.calculateBackoff(1)
      var moreRetriesBackoff = client.calculateBackoff(10)
      assert(moreRetriesBackoff > lessRetriesBackoff)
    })
  })

  // THIS IS SPARTA
  var failKnox = {
    createClient: function() {
      return {
        put: function(put, destination) {
          return {
            eventHandlers: {},
            on: function(event, cb) {
              this.eventHandlers[event] = cb
            },
            end: function(data) {
              this.eventHandlers['error']('AN ERROR')
            }
          }
        }
      }
    }
  }

  var successKnox = {
    createClient: function() {
      return {
        put: function(put, destination) {
          return {
            eventHandlers: {},
            on: function(event, cb) {
              this.eventHandlers[event] = cb
            },
            end: function(data) {
              this.eventHandlers['response']({statusCode: 200})
            }
          }
        }
      }
    }
  }

  describe('upload', function() {
    it('tries uploading to s3 until maxRetries tries or it gets the hose again', function(done) {
      var client = new Intimidate({key: 1, secret: 1, bucket: 1, backoffInterval: 1, maxRetries:4 }, failKnox)
      client.upload(path.join(__dirname, 'fakeFile.txt'), 'destination', function(err, res, timesRetried) {
        assert(err)
        assert(res == null)
        assert.equal(timesRetried, 4)
        done()
      })
    })

    it('tries uploading to s3 until maxRetries tries or it gets the hose again: passing headers', function(done) {
      var client = new Intimidate({key: 1, secret: 1, bucket: 1, backoffInterval: 1, maxRetries: 4 }, failKnox)
      var headers = { 'Content-Type': 'application/text' }
      client.upload(path.join(__dirname, 'fakeFile.txt'), 'destination', headers, function(err, res, timesRetried) {
        assert(err)
        assert(res == null)
        assert.equal(timesRetried, 4)
        done()
      })
    })

    it('calls the callback with a response object if the request succeeds', function(done) {
      var client = new Intimidate({key: 1, secret: 1, bucket: 1 }, successKnox)
      client.upload(path.join(__dirname, 'fakeFile.txt'), 'destination', function(err, res) {
        assert.ifError(err)
        assert(res)
        done()
      })
    })
  })

  it('calls the callback with a response object if the request succeeds: passing headers', function(done) {
    var client = new Intimidate({key: 1, secret: 1, bucket: 1 }, successKnox)
    var headers = { 'Content-Type': 'application/text' }
    client.upload(path.join(__dirname, 'fakeFile.txt'), 'destination', headers, function(err, res) {
      assert.ifError(err)
      assert(res)
      done()
    })
  })

  describe('uploadBuffer', function() {
    it('uploads a buffer', function(done) {
      var data = new Buffer('Shall i compare thee to a summer\'s day?')
      var headers = {
        'Content-Type': 'application/text'
      }

      var client = new Intimidate({key: 1, secret: 1, bucket: 1}, successKnox)
      client.uploadBuffer(data, headers, 'poem.txt', function(err, res) {
        assert.ifError(err)
        assert(res)
        done()
      })
    })
  })

  describe('uploadFiles', function() {
    it('calls the callback with a array response object if the request succeeds', function(done) {
      var client = new Intimidate({key: 1, secret: 1, bucket: 1 }, successKnox)
      var files = [{
        src: path.join(__dirname, 'fakeFile.txt'),
        dest: 'destination'
      },{
        src: path.join(__dirname, 'fakeFile.txt'),
        dest: 'another_destination'
      }]

      client.uploadFiles(files, function(err, res) {
        assert.ifError(err)
        assert(res)
        assert(res.length == files.length)
        done()
      })
    })
    it('calls the callback with the first error ', function(done) {
      var client = new Intimidate({key: 1, secret: 1, bucket: 1 }, successKnox)
      var files = [{
        src: path.join(__dirname, 'doesNotExist.txt'),
        dest: 'destination'
      },{
        src: path.join(__dirname, 'fakeFile.txt'),
        dest: 'another_destination'
      }]

      client.uploadFiles(files, function(err, res) {
        assert(err)
        assert(res)
        done()
      })
    })
  })

  describe('uploadBuffers', function() {
    it('calls the callback with a array response object if the request succeeds', function(done) {
      var client = new Intimidate({key: 1, secret: 1, bucket: 1 }, successKnox)
      var buffers = [{
        data: new Buffer('Shall I compare thee to a summer\'s day?'),
        dest: 'destination'
      },{
        data: new Buffer('When you need those uploads to back off, use intimidate'),
        dest: 'another_destination'
      }]

      client.uploadBuffers(buffers, function(err, res) {
        assert.ifError(err)
        assert(res)
        assert(res.length == buffers.length)
        done()
      })
    })
  })
})

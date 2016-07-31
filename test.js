var Decoder = require('blob-log-decoder')
var Encoder = require('./')
var asyncEachSeries = require('async-each-series')
var concatStream = require('concat-stream')
var crypto = require('crypto')
var fs = require('fs')
var mktempd = require('temporary-directory')
var path = require('path')
var tape = require('tape')

tape('round-trip 100 blobs', function (test) {
  // Create a temporary directory for test files.
  mktempd(function (error, directory, cleanUp) {
    test.ifError(error, 'no error')
    var filePath = path.join(directory, 'test.log')
    // Generate 100 random blobs of test data.
    var testBlobs = randomBlobs(100)
    // Create an initial encoder to write the blobs, starting from
    // sequence number 1.
    var encoder = new Encoder(1)
    // Pipe to a new log file.
    encoder
    .pipe(fs.createWriteStream(filePath))
    .once('error', function (error) {
      test.fail(error)
      finish()
    })
    .once('finish', function () {
      // Read the blobs written to the file.
      var readBlobs = []
      fs.createReadStream(filePath)
      .pipe(new Decoder())
      .once('error', function (error) {
        test.fail(error)
        finish()
      })
      .on('data', function (blob) {
        readBlobs.push(blob)
      })
      .once('end', function () {
        test.equal(
          readBlobs.length, testBlobs.length,
          'received ' + testBlobs.length
        )
        asyncEachSeries(readBlobs, bufferBlob, function (error) {
          test.ifError(error, 'no error')
          test.deepEqual(
            readBlobs.map(function (blob) {
              return blob.buffered.toString('hex')
            }),
            testBlobs.map(function (blob) {
              return blob.toString('hex')
            }),
            'streams blobs'
          )
          finish()
        })
      })
    })
    // Write test blobs.
    asyncEachSeries(
      testBlobs,
      encoder.write.bind(encoder),
      encoder.end.bind(encoder)
    )
    function finish () {
      cleanUp()
      test.end()
    }
  })
})

tape('append additional blobs', function (test) {
  mktempd(function (error, directory, cleanUp) {
    test.ifError(error, 'no error')
    var filePath = path.join(directory, 'test.log')
    var testBlobs = randomBlobs(100)
    // Write half the blobs to disk, with initial sequence number 1.
    var firstEncoder = new Encoder(1)
    firstEncoder
    .pipe(fs.createWriteStream(filePath))
    .once('error', function (error) {
      test.fail(error)
    })
    .once('finish', function () {
      // Append the other half of the blobs using a second encoder,
      // appending to the existing file.
      var secondEncoder = new Encoder() // no first sequence number
      secondEncoder
      .pipe(fs.createWriteStream(filePath, {flags: 'a'})) // append
      .once('error', function (error) {
        test.fail(error)
      })
      .once('finish', function () {
        // Read the blobs written to the file.
        var readBlobs = []
        fs.createReadStream(filePath)
        .pipe(new Decoder())
        .once('error', function (error) {
          test.fail(error)
          finish()
        })
        .on('data', function (blob) {
          readBlobs.push(blob)
        })
        .once('end', function () {
          test.equal(
            readBlobs.length, testBlobs.length,
            'received ' + testBlobs.length
          )
          asyncEachSeries(readBlobs, bufferBlob, function (error) {
            test.ifError(error, 'no error')
            test.deepEqual(
              readBlobs.map(function (blob) {
                return blob.buffered.toString('hex')
              }),
              testBlobs.map(function (blob) {
                return blob.toString('hex')
              }),
              'streams blobs'
            )
            finish()
          })
        })
      })
      asyncEachSeries(
        testBlobs.slice(50),
        secondEncoder.write.bind(secondEncoder),
        secondEncoder.end.bind(secondEncoder)
      )
    })
    asyncEachSeries(
      testBlobs.slice(0, 50),
      firstEncoder.write.bind(firstEncoder),
      firstEncoder.end.bind(firstEncoder)
    )
    function finish () {
      cleanUp()
      test.end()
    }
  })
})

function bufferBlob (blob, done) {
  blob.stream.pipe(concatStream(function (buffered) {
    blob.buffered = buffered
    done()
  }))
}

function randomBlobs (count) {
  var blobs = []
  while (blobs.length < count) {
    blobs.push(crypto.randomBytes(randomInteger(4, 64)))
  }
  return blobs
}

function randomInteger (from, through) {
  return Math.floor(Math.random() * (through - from + 1)) + from
}

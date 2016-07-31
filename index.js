var Transform = require('readable-stream').Transform
var crc = require('crc').crc32
var inherits = require('util').inherits

var NUMBER_BYTES = 4
var CRC_BYTES = 4
var LENGTH_BYTES = 4

module.exports = Encoder

function Encoder (firstSequenceNumber) {
  if (!(this instanceof Encoder)) {
    return new Encoder(firstSequenceNumber)
  }

  Transform.call(this, {
    writableObjectMode: true,
    readableObjectMode: false
  })

  if (firstSequenceNumber !== undefined) {
    var validArgument = (
      Number.isInteger(firstSequenceNumber) &&
      firstSequenceNumber > 0
    )
    if (validArgument) {
      this._writeFirstSequenceNumber(firstSequenceNumber)
    } else {
      throw new Error('invalid first sequence number')
    }
  }
}

inherits(Encoder, Transform)

var prototype = Encoder.prototype

prototype._transform = function (blob, _, callback) {
  if (!Buffer.isBuffer(blob)) {
    var error = new Error('object not a Buffer or string')
    error.object = blob
    callback(error)
  } else {
    var buffer = new Buffer(CRC_BYTES + LENGTH_BYTES + blob.length)
    // 1. CRC-32 of the blob.
    buffer.writeUInt32BE(crc(blob))
    // 2. Byte length of the blob.
    buffer.writeUInt32BE(blob.length, CRC_BYTES)
    // 3. The blob.
    blob.copy(buffer, CRC_BYTES + LENGTH_BYTES)
    callback(null, buffer)
  }
}

prototype._writeFirstSequenceNumber = function (number) {
  var firstSequenceNumberBuffer = new Buffer(NUMBER_BYTES)
  firstSequenceNumberBuffer.writeUInt32BE(number)
  this.push(firstSequenceNumberBuffer)
}

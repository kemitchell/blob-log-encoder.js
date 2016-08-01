## Usage

```javascript
var BlobLogEncoder = require('blob-log-encoder')
var fs = require('fs')
```

`BlobLogEncoder` is a `Transform` stream.  It has an object mode
`Writable` side that accepts Node.js `Buffer` objects that are
converted to a stream of bytes on the `Readable` side.

_Don't be fooled._ The `Writable` side takes `Buffer` objects, but
in object mode.  Regular-mode streams read `Buffer` chunks, too, but
those chunks represent arbitrary slices of a single, continuous stream
of of bytes.  In contrast, each `Buffer` written to a `BlobLogEncoder`
represents _all_ the bytes in a _single_ blob.

It's possible to stream data to blob-log files, too, though it takes
an extra write to write in correct CRC-32 and length prefixes when
those values aren't known ahead of time.  See [stream-to-blob-log].

[stream-to-blob-log]: https://www.npmjs.com/package/stream-to-blob-log

### Write Blobs to a New Log File

```javascript
var writeEncoder = new BlobLogEncoder(1) // first sequence number = 1
var newFile = fs.createWriteStream('new.log')
writeEncoder.pipe(newFile)
writeEncoder.write(new Buffer('First blob!', 'utf8'))
writeEncoder.write(new Buffer('Second blob!', 'utf8'))
writeEncoder.end()
```

### Append Blobs to an Existing Log File

```javascript
var appendEncoder = new BlobLogEncoder() // no sequence number
var existingFile = fs.createWriteStream('existing.log', {flags: 'a'})
appendEncoder.pipe(existingFile)
appendEncoder.write(new Buffer('Another blob!', 'utf8'))
appendEncoder.write(new Buffer('Yet another blob!', 'utf8'))
appendEncoder.end()
```

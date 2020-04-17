const fs = require(`fs`);
const assert = require(`assert`);
const simdjson = require(`../index`);

const examplesPath = `${__dirname}/../jsonexamples`;
const jsonExamples = {
  demo: fs.readFileSync(`${examplesPath}/small/demo.json`, `utf-8`),
  adversarial: fs.readFileSync(`${examplesPath}/small/adversarial.json`, `utf-8`),
  canada: fs.readFileSync(`${examplesPath}/canada.json`, `utf-8`),
  cars: fs.readFileSync(`${examplesPath}/small/cars.json`, `utf-8`),
  apache_builds: fs.readFileSync(`${examplesPath}/apache_builds.json`, `utf-8`),
};

describe(`simdjson`, function () {
  context(`isValid`, function () {
    it(`returns true for valid json strings`, function () {
      assert.equal(simdjson.isValid(jsonExamples.canada), true);
      assert.equal(simdjson.isValid(jsonExamples.apache_builds), true);
    });

    it(`returns false for valid json strings`, function () {
      assert.equal(simdjson.isValid(`@#$`), false);
      assert.equal(simdjson.isValid(`{"hello"}`), false);
      assert.equal(simdjson.isValid(`{hello: "world"}`), false);
      assert.equal(simdjson.isValid(`[1,2, {"hello: "world"}`), false);
    });
  });

  context(`parse`, function () {
    it(`parses into valid js object`, function () {
      assert.deepStrictEqual(simdjson.parse(jsonExamples.demo), {
        Image: {
          Width: 800,
          Height: 600,
          Title: `View from 15th Floor`,
          Thumbnail: {
            Url: `http://www.example.com/image/481989943`,
            Height: 125,
            Width: 100,
          },
          Animated: false,
          IDs: [116, 943, 234, 38793],
        },
      });
    });

    it(`throws error for invalid json str`, function () {
      assert.throws(
        () => simdjson.parse(jsonExamples.demo + `#$`),
        new Error(`Something went wrong while writing to the tape`)
      );
    });
  });

  context(`lazyParse`, function () {
    it(`returns value from keyPath`, function () {
      const jsonTape = simdjson.lazyParse(jsonExamples.apache_builds);
      assert.equal(
        jsonTape.valueForKeyPath(`jobs[400].name`),
        `Lucene-Solr-Clover-4.x`
      );
    });

    it(`throws error for invalid keyPath`, function () {
      const jsonTape = simdjson.lazyParse(jsonExamples.canada);
      assert.throws(
        () => jsonTape.valueForKeyPath(`foo.bar.yolo`),
        new Error(`The JSON field referenced does not exist in this object.`)
      );
    });

    it(`empty keyPath returns full value`, function () {
      const jsonTape = simdjson.lazyParse(jsonExamples.demo);
      assert.deepStrictEqual(jsonTape.valueForKeyPath(``), {
        Image: {
          Width: 800,
          Height: 600,
          Title: `View from 15th Floor`,
          Thumbnail: {
            Url: `http://www.example.com/image/481989943`,
            Height: 125,
            Width: 100,
          },
          Animated: false,
          IDs: [116, 943, 234, 38793],
        },
      });
    });
  });

  context(`parseToBuffers`, function () {
    it(`returns array buffers`, function () {
      const {tapeBuf, strBuf} = simdjson.parseToBuffers(jsonExamples.demo);
      dumpTape(new DataView(tapeBuf), new DataView(strBuf));
    });
  });
});


const TapeType = {
  ROOT: 'r'.charCodeAt(0),
  START_ARRAY: '['.charCodeAt(0),
  START_OBJECT: '{'.charCodeAt(0),
  END_ARRAY: ']'.charCodeAt(0),
  END_OBJECT: '}'.charCodeAt(0),
  STRING: '"'.charCodeAt(0),
  INT64: 'l'.charCodeAt(0),
  UINT64: 'u'.charCodeAt(0),
  DOUBLE: 'd'.charCodeAt(0),
  TRUE_VALUE: 't'.charCodeAt(0),
  FALSE_VALUE: 'f'.charCodeAt(0),
  NULL_VALUE: 'n'.charCodeAt(0),
};

/**
 * @param {DataView} tapeBufView
 * @param {DataView} strBufView
 */
function dumpTape(tapeBufView, strBufView) {
  const size64 = 8 ; // sizeof(uint64_t)
  const size32 = 4;
  const textDecoder = new TextDecoder();

  const nestStack = [];
  const indentStr = () => ('  '.repeat(nestStack.length));

  for(let tapeIdx = 0, len = tapeBufView.byteLength; tapeIdx < len; tapeIdx += size64) {
    const tapeType = tapeBufView.getUint8(tapeIdx + 7);
    switch (tapeType) {
      case TapeType.ROOT:
        // we start and end at root, nothing to do here
        break;
      case TapeType.START_ARRAY:
      case TapeType.START_OBJECT: {
        console.log(`${indentStr()}${String.fromCharCode(tapeType)}`);
        nestStack.push(tapeType);
        break;
      }
      case TapeType.END_ARRAY:
      case TapeType.END_OBJECT: {
        nestStack.pop();
        console.log(`${indentStr()}${String.fromCharCode(tapeType)}`);
        break;
      }
      case TapeType.TRUE_VALUE: {
        console.log(`${indentStr()}true`);
        break;
      }
      case TapeType.FALSE_VALUE: {
        console.log(`${indentStr()}false`);
        break;
      }
      case TapeType.NULL_VALUE: {
        console.log(`${indentStr()}null`);
        break;
      }
      case TapeType.STRING: {
        const strIdx = tapeBufView.getUint32(tapeIdx, true)
        const strLen = strBufView.getUint32(strIdx, true)
        const str = textDecoder.decode(new DataView(strBufView.buffer, strBufView.byteOffset + strIdx + size32, strLen));
        console.log(`${indentStr()}"${str}"`);
        break;
      }
      case TapeType.INT64: {
        tapeIdx += size64;
        const val = tapeBufView.getInt32(tapeIdx, true)
        console.log(`${indentStr()}${val}`);
        break;
      }
      case TapeType.UINT64: {
        tapeIdx += size64;
        const val = tapeBufView.getUint32(tapeIdx, true)
        console.log(`${indentStr()}${val}`);
        break;
      }
      case TapeType.DOUBLE: {
        tapeIdx += size64;
        const val = tapeBufView.getFloat64(tapeIdx, true)
        console.log(`${indentStr()}${val}`);
        break;
      }
      default: {
        throw new Error(`unknown type ${tapeType}, this should never happen`);
      }
    }
  }
}
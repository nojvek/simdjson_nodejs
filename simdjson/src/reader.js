const fs = require(`fs`);
const carsTapeBuffer = fs.readFileSync(`${__dirname}/tape.buffer`);
const carsStrBuffer = fs.readFileSync(`${__dirname}/str.buffer`);

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
  console.log(tapeBufView);
  console.log(strBufView);
  const size64 = 8 ; // sizeof(uint64_t)
  const size32 = 4;
  const textDecoder = new TextDecoder();

  for(let tapeIdx = 0, len = tapeBufView.byteLength; tapeIdx < len; tapeIdx += size64) {
    const elemType = tapeBufView.getUint8(tapeIdx + 7);
    switch (elemType) {
      case TapeType.ROOT:
      case TapeType.START_ARRAY:
      case TapeType.START_OBJECT:
      case TapeType.END_ARRAY:
      case TapeType.END_OBJECT: {
        const elemVal = tapeBufView.getUint32(tapeIdx, true)
        console.log(String.fromCharCode(elemType));
        break;
      }
      case TapeType.TRUE_VALUE:
      case TapeType.FALSE_VALUE:
      case TapeType.NULL_VALUE: {
        console.log(String.fromCharCode(elemType));
        break;
      }
      case TapeType.STRING: {
        const strIdx = tapeBufView.getUint32(tapeIdx, true)
        const strLen = strBufView.getUint32(strIdx, true)
        const str = textDecoder.decode(new DataView(strBufView.buffer, strBufView.byteOffset + strIdx + size32, strLen));
        console.log(String.fromCharCode(elemType), str);
        break;
      }
      case TapeType.INT64: {
        tapeIdx += size64;
        const elemVal = tapeBufView.getInt64(tapeIdx, true)
        console.log(String.fromCharCode(elemType), elemVal);
        break;
      }
      case TapeType.UINT64: {
        tapeIdx += size64;
        const elemVal = tapeBufView.getUint64(tapeIdx, true)
        console.log(String.fromCharCode(elemType), elemVal);
        break;
      }
      case TapeType.DOUBLE: {
        tapeIdx += size64;
        const elemVal = tapeBufView.getFloat64(tapeIdx, true)
        console.log(String.fromCharCode(elemType), elemVal);
        break;
      }
      default: {
        throw new Error(`unknown type ${elemType}, this should never happen`);
        break;
      }
    }
  }
}

dumpTape(
  new DataView(carsTapeBuffer.buffer, carsTapeBuffer.byteOffset, carsTapeBuffer.length),
  new DataView(carsStrBuffer.buffer, carsStrBuffer.byteOffset, carsStrBuffer.length)
);
'use strict';
const path=require('node:path'),fs=require('node:fs');
const app=path.resolve(process.argv[2]);
require(path.join(app,'js/haituo-ocr.js')).recognize(fs.readFileSync(path.join(app,'native/ocr-fixture.png'))).then(result=>{
 if(!/HELLO\s*1234/i.test(result.original))throw Error('OCR fixture text mismatch: '+result.original);
 console.log('Native offline OCR passed:',process.platform,result.blocks.length,'blocks');
}).catch(error=>{console.error(error);process.exitCode=1});

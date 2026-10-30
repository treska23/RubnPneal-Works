'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const {inspect} = require('../scripts/check-win7-pe.cjs');
function fixture(symbol='GetSystemTimeAsFileTime') {
 const bytes=Buffer.alloc(0x800);bytes.write('MZ');bytes.writeUInt32LE(0x80,0x3c);bytes.write('PE\0\0',0x80);
 bytes.writeUInt16LE(0x14c,0x84);bytes.writeUInt16LE(1,0x86);bytes.writeUInt16LE(224,0x94);
 const opt=0x98;bytes.writeUInt16LE(0x10b,opt);bytes[opt+2]=14;bytes[opt+3]=44;
 bytes.writeUInt16LE(6,opt+48);bytes.writeUInt16LE(1,opt+50);bytes.writeUInt32LE(0x1000,opt+104);
 const section=opt+224;bytes.writeUInt32LE(0x600,section+8);bytes.writeUInt32LE(0x1000,section+12);bytes.writeUInt32LE(0x600,section+16);bytes.writeUInt32LE(0x200,section+20);
 bytes.writeUInt32LE(0x1040,0x200);bytes.writeUInt32LE(0x1060,0x20c);bytes.writeUInt32LE(0x1040,0x210);
 bytes.writeUInt32LE(0x1080,0x240);bytes.write('KERNEL32.dll\0',0x260);bytes.write(symbol+'\0',0x282);return bytes;
}
test('Windows 7 native PE fixture passes',()=>assert.equal(inspect(fixture()).passed,true));
test('the exact missing Windows 7 symbol from v0.4 is rejected',()=>assert.equal(inspect(fixture('GetSystemTimePreciseAsFileTime')).passed,false));
test('v145 cannot be packaged even if import selection changes',()=>{const bytes=fixture();bytes[0x98+3]=51;assert.equal(inspect(bytes).passed,false);});
test('a Windows 10 minimum subsystem is rejected',()=>{const bytes=fixture();bytes.writeUInt16LE(10,0x98+48);assert.equal(inspect(bytes).passed,false);});
test('a CLR executable cannot pass as native',()=>{const bytes=fixture();bytes.writeUInt32LE(0x1100,0x98+96+14*8);assert.equal(inspect(bytes).passed,false);});
test('a private runtime DLL requires explicit review',()=>{const bytes=fixture();bytes.write('vcruntime.dll\0',0x260);assert.equal(inspect(bytes).passed,false);});
test('the system MSVCRT used by the official legacy extractor is accepted',()=>{const bytes=fixture('memcpy');bytes.write('MSVCRT.dll\0',0x260);assert.equal(inspect(bytes).passed,true);});
test('non-PE input is rejected',()=>assert.throws(()=>inspect(Buffer.from('not an executable'))));

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const allowedDlls = new Set(('kernel32 kernelbase user32 advapi32 shell32 ole32 oleaut32 comdlg32 comctl32 gdi32 gdiplus wintrust crypt32 msi bcrypt winhttp taskschd userenv wtsapi32 shlwapi rpcrt4 version setupapi iphlpapi ws2_32 ntdll msvcrt').split(' ').map(x=>x+'.dll'));
const unavailable = new Set(['GetSystemTimePreciseAsFileTime','GetTickCount64Precise','WaitOnAddress','WakeByAddressAll','WakeByAddressSingle','GetTempPath2W','GetTempPath2A','SetThreadDescription','GetThreadDescription','GetDpiForWindow','GetDpiForSystem','SetProcessDpiAwarenessContext','GetCurrentPackageId','GetCurrentPackageFamilyName','GetSystemTimeAdjustmentPrecise','SetThreadInformation','GetThreadInformation','SetProcessInformation','GetProcessInformation','GetOverlappedResultEx','GetSystemCpuSetInformation','VirtualAlloc2','VirtualAlloc2FromApp','MapViewOfFile3','CreateFile2','PathCchCombineEx']);
function inspect(bytes) {
 const errors=[];
 const fail=x=>errors.push(x);
 if(bytes.length<64||bytes.toString('ascii',0,2)!=='MZ')throw Error('Archivo no PE');
 const pe=bytes.readUInt32LE(0x3c);
 if(bytes.toString('ascii',pe,pe+4)!=='PE\0\0')throw Error('Cabecera PE no válida');
 const machine=bytes.readUInt16LE(pe+4), count=bytes.readUInt16LE(pe+6),optSize=bytes.readUInt16LE(pe+20),opt=pe+24;
 if(machine!==0x14c)fail('Se requiere un ejecutable x86 (PE32), válido también en Windows x64');
 if(bytes.readUInt16LE(opt)!==0x10b)throw Error('Se requiere PE32');
 const linker=[bytes[opt+2],bytes[opt+3]];
 if(linker[0]>14||(linker[0]===14&&linker[1]>=50))fail('El enlazador MSVC 2026 ya no admite Windows 7');
 const subsystem=[bytes.readUInt16LE(opt+48),bytes.readUInt16LE(opt+50)];
 if(subsystem[0]>6||(subsystem[0]===6&&subsystem[1]>1))fail('La versión mínima del subsistema supera Windows 7');
 const directories=opt+96;
 if(bytes.readUInt32LE(directories+14*8)!==0)fail('Contiene CLR/.NET: la entrega debe ser nativa, sin WPF ni .NET');
 const sections=[];for(let i=0;i<count;i++){const p=opt+optSize+i*40;sections.push({va:bytes.readUInt32LE(p+12),size:Math.max(bytes.readUInt32LE(p+8),bytes.readUInt32LE(p+16)),raw:bytes.readUInt32LE(p+20)});}
 const offset=rva=>{const s=sections.find(s=>rva>=s.va&&rva<s.va+s.size);if(!s)throw Error('RVA fuera de las secciones PE');return s.raw+rva-s.va;};
 const string=rva=>{const p=offset(rva),end=bytes.indexOf(0,p);if(end<0)throw Error('Nombre de importación no válido');return bytes.toString('ascii',p,end);};
 const imports=[];
 function readTable(rva,delayed=false){
  if(!rva)return;let p=offset(rva);const stride=delayed?32:20;
  for(let i=0;i<4096;i++,p+=stride){
   const nameRva=bytes.readUInt32LE(p+(delayed?4:12));if(!nameRva)break;
   if(delayed&&!(bytes.readUInt32LE(p)&1))throw Error('Tabla diferida con direcciones absolutas no admitida');
   const dll=string(nameRva),list=[];
   if(!allowedDlls.has(dll.toLowerCase()))fail('Dependencia ajena a la base Windows 7: '+dll);
   const thunk=bytes.readUInt32LE(p+(delayed?16:0))||bytes.readUInt32LE(p+16);let t=offset(thunk);
   for(let n=0;n<65536;n++,t+=4){const value=bytes.readUInt32LE(t);if(!value)break;
    const symbol=value&0x80000000?'#'+(value&0xffff):string(value+2);list.push(symbol);
    if(unavailable.has(symbol))fail('Función no disponible en Windows 7: '+dll+'!'+symbol);
   }
   imports.push({dll,symbols:list});
  }
 }
 readTable(bytes.readUInt32LE(directories+8));readTable(bytes.readUInt32LE(directories+13*8),true);
 if(!imports.length)fail('No se ha encontrado una tabla de importaciones válida');
 return {machine:'x86',native:true,linker:linker.join('.'),subsystem:subsystem.join('.'),imports,errors,passed:!errors.length};
}
module.exports={inspect};
if(require.main===module){try{
 const filename=process.argv[2];if(!filename)throw Error('Uso: node check-win7-pe.cjs aplicacion.exe');
 const result=inspect(fs.readFileSync(filename));
 fs.writeFileSync(path.join(path.dirname(filename),'compatibilidad-win7.json'),JSON.stringify(result,null,2)+'\n');
 for(const error of result.errors)console.error(error);
 console.log((result.passed?'PASS':'FAIL')+' comprobación PE: '+result.machine+', nativo, enlazador '+result.linker+', subsistema '+result.subsystem);
 process.exitCode=result.passed?0:1;
}catch(error){console.error(error.message);process.exitCode=1;}}

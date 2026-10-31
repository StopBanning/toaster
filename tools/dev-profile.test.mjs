import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const main=fs.readFileSync(new URL('../main.js',import.meta.url),'utf8');
const source=main.slice(main.indexOf('const switchValue'), main.indexOf('// One Toaster at a time'));
function profile(argv=[],env={}) {
 const paths={appData:'/tmp/toaster-appdata'}, app={isPackaged:false,setPath:(k,v)=>paths[k]=v,getPath:k=>paths[k],exit:()=>{throw Error('refused')}};
 vm.runInNewContext(source,{app,process:{argv,env},mac:false,fs,path,console:{error(){}}});return paths;
}
test('source profiles isolate settings and session cache; default stays Toaster (dev)',()=>{
 for(const p of [profile(['--user-data-dir=/tmp/toaster-explicit']),profile([],{TOASTER_USER_DATA:'/tmp/toaster-explicit'})]){
 assert.equal(p.userData,'/tmp/toaster-explicit');assert.equal(p.sessionData,p.userData);
 }
 assert.equal(profile().userData,'/tmp/toaster-appdata/Toaster (dev)');
 assert.throws(()=>profile(['--user-data-dir=/tmp/toaster-appdata/Toaster (dev)']),/refused/);
});

const {app,BrowserWindow}=require('electron');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kick-entry-'));
app.setPath('userData',dir);app.dock?.hide();
app.whenReady().then(async()=>{
try {
 const w=new BrowserWindow({show:false,webPreferences:{offscreen:true}});
 await w.loadFile(path.join(__dirname,'kick-entry-check.html'), {query:{entry:process.env.KICK_TEST_ENTRY || 'fast'}});
 let r;for(let i=0;i<100;i++){r=await w.webContents.executeJavaScript('window.result');if(r)break;await new Promise(r=>setTimeout(r,30));}
 console.log(JSON.stringify(r));w.destroy();app.exit(r?.ok?0:1);
}catch(e){console.error(e);app.exit(1)}
});

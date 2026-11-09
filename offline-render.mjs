import {FFmpeg} from './vendor/ffmpeg/index.js';
import {sourceDetails,framePlan,segmentArgs,concatArgs,rate} from './render-plan.mjs';
let engine=null,cancelled=false;
export function cancelRender(){cancelled=true;engine?.terminate();engine=null;}
export async function renderCountdown({clips,settings,background,overlayFor,onProgress=()=>{}}){
cancelled=false;const ff=engine=new FFmpeg();let lastLog=[],stage='',scratch=null,scratchRoot=null;const segments=[];
ff.on('log',({message})=>{lastLog.push(message);if(lastLog.length>35)lastLog.shift();});
ff.on('progress',({progress})=>onProgress(stage+' '+Math.min(99,Math.max(0,Math.round(progress*100)))+'%'));
const check=()=>{if(cancelled)throw Error('Export cancelled.');};
const write=async(name,blob)=>{check();await ff.writeFile(name,new Uint8Array(await blob.arrayBuffer()));};
const command=async args=>{check();lastLog=[];const code=await ff.exec(args);check();if(code!==0)throw Error('Rendering failed: '+lastLog.slice(-4).join(' ').slice(0,500));};
const probe=async(name,report)=>{check();await ff.deleteFile(report).catch(()=>{});const code=await ff.ffprobe(['-v','error','-show_streams','-show_format','-of','json',name,'-o',report]);if(code!==0&&code!==-1)throw Error('Could not inspect this video: '+lastLog.slice(-6).join(' '));return JSON.parse(await ff.readFile(report,'utf8'));};
try{
onProgress('Loading frame-by-frame renderer (about 32 MB, first use)…');
const pieces=await Promise.all([0,1].map(async i=>{const response=await fetch(new URL('./vendor/core/ffmpeg-core-'+i+'.bin',import.meta.url));if(!response.ok)throw Error('Could not download the rendering engine. Refresh and try again.');return response.arrayBuffer();}));check();const wasmURL=URL.createObjectURL(new Blob(pieces,{type:'application/wasm'}));try{await ff.load({coreURL:new URL('./vendor/core/ffmpeg-core.js',import.meta.url).href,wasmURL});}finally{URL.revokeObjectURL(wasmURL);}check();
pieces.length=0;await ff.createDir('/input');await ff.createDir('/parts');try{if(navigator.storage?.getDirectory){scratchRoot=await navigator.storage.getDirectory();scratch=await scratchRoot.getDirectoryHandle('youkit-render-'+crypto.randomUUID(),{create:true});}}catch{}const metadata=[];
for(let i=0;i<clips.length;i++){onProgress('Inspecting clip '+(i+1)+' / '+clips.length+'…');const response=await fetch(clips[i].url);if(!response.ok)throw Error('Could not read source clip.');const blob=await response.blob();if(blob.size>512*1024*1024)throw Error('This source exceeds the browser renderer’s 512 MiB per-file limit.');await ff.mount('WORKERFS',{blobs:[{name:'source',data:blob}]},'/input');try{metadata.push(sourceDetails(await probe('/input/source','probe.json')));}finally{await ff.unmount('/input');}}
let fpsString=settings.fps==='auto'?metadata.reduce((best,m)=>m.fps>rate(best)?m.fpsString:best,'0'):String(settings.fps);if(!rate(fpsString))fpsString='30';const fps=rate(fpsString);
if(fps>120)throw Error('Sources above 120 fps exceed this browser renderer’s limit.');
const plans=clips.map((c,i)=>framePlan(c,metadata[i],fps)),totalFrames=plans.reduce((n,p)=>n+p.frames,0),totalDuration=totalFrames/fps;
if(settings.fps!=='auto'&&metadata.some(m=>m.fps>fps+.01))throw Error('The selected frame rate is below a source. Choose Match sources to preserve motion.');
await write('background.png',background);
let totalBytes=0;
for(let i=0;i<clips.length;i++){check();stage='Rendering clip '+(i+1)+' / '+clips.length;onProgress(stage+'…');const sourceBlob=await (await fetch(clips[i].url)).blob();await ff.mount('WORKERFS',{blobs:[{name:'source',data:sourceBlob}]},'/input');await write('overlay.png',await overlayFor(i));await command(segmentArgs({input:'/input/source',background:'background.png',overlay:'overlay.png',output:'part'+i+'.nut',plan:plans[i],meta:metadata[i],settings,fps,fpsString}));const partMeta=await probe('part'+i+'.nut','probe.json');totalBytes+=Number(partMeta.format.size||0);if(totalBytes>900*1024*1024)throw Error('Rendered segments exceed browser memory capacity. Use a shorter project or smaller output size.');await ff.unmount('/input');const bytes=await ff.readFile('part'+i+'.nut');await ff.deleteFile('part'+i+'.nut');let stored;if(scratch){const handle=await scratch.getFileHandle('part'+i+'.nut',{create:true});const writer=await handle.createWritable();await writer.write(bytes);await writer.close();stored=await handle.getFile();}else stored=new Blob([bytes]);segments.push({name:'part'+i+'.nut',data:stored});await ff.deleteFile('overlay.png');}
await ff.mount('WORKERFS',{blobs:segments},'/parts');await ff.writeFile('concat.txt',clips.map((_,i)=>"file '/parts/part"+i+".nut'\nduration "+plans[i].duration).join('\n'));
stage='Assembling final video';onProgress(stage+'…');const name=settings.lossless?'youkit-ranking.mkv':'youkit-ranking.mp4';
await command(concatArgs({list:'concat.txt',output:name,lossless:settings.lossless,audio:settings.audio,totalFrames,totalDuration}));
const outputMeta=sourceDetails(await probe(name,'final.json'));if(Math.abs(outputMeta.duration-totalDuration)>Math.max(.1,2/fps))throw Error('Export failed duration verification. No incomplete video was saved.');
stage='Verifying exported frames';onProgress(stage+'…');
await ff.ffprobe(['-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=nb_read_frames','-of','json',name,'-o','frame-count.json']);
const actualFrames=Number(JSON.parse(await ff.readFile('frame-count.json','utf8')).streams?.[0]?.nb_read_frames);
if(actualFrames!==totalFrames)throw Error('Frame-count verification failed. Expected '+totalFrames+', found '+actualFrames+'. No incomplete video was saved.');

const bytes=await ff.readFile(name);check();
return {blob:new Blob([bytes],{type:settings.lossless?'video/x-matroska':'video/mp4'}),name,frames:totalFrames,fps,duration:totalDuration};
}catch(err){if(cancelled)throw Error('Export cancelled.');const message=String(err?.message||err);if(/memory|out of bounds|allocation/i.test(message))throw Error('Export ran out of memory during '+(stage||'source inspection')+'. No partial video was saved. Try High quality MP4 if lossless output is too large.');throw err;}finally{ff.terminate();if(engine===ff)engine=null;if(scratch&&scratchRoot)await scratchRoot.removeEntry(scratch.name,{recursive:true}).catch(()=>{});}
}






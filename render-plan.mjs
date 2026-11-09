export function rate(s){const [a,b=1]=String(s||'0').split('/').map(Number);return b?a/b:0;}
export function sourceDetails(meta){const v=meta.streams?.find(s=>s.codec_type==='video');if(!v)throw Error('No video stream in source.');const nominal=rate(v.r_frame_rate);const fpsString=nominal>0&&nominal<=120?v.r_frame_rate:(rate(v.avg_frame_rate)>0?v.avg_frame_rate:v.r_frame_rate);return {duration:Number(v.duration||meta.format?.duration),fps:rate(fpsString),fpsString,width:v.width,height:v.height,audio:meta.streams.some(s=>s.codec_type==='audio')};}
export function framePlan(clip,meta,fps){const start=Number(clip.start||0),end=clip.end==null||clip.end===''?meta.duration:Number(clip.end);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>meta.duration+.03)throw Error('Invalid trim: start/end must be within the source duration.');const frames=Math.max(1,Math.round((Math.min(end,meta.duration)-start)*fps));return {start,frames,duration:frames/fps};}
export function segmentArgs({input,background,overlay,output,plan,meta,settings,fps,fpsString}){
const {width,height,lossless,audio,fit}=settings;const k=width/1080,even=n=>Math.max(2,Math.round(n*k/2)*2),vw=even(settings.videoW),vh=even(settings.videoH),x=Math.round(settings.videoX*k),y=Math.round(settings.videoY*k),d=plan.duration.toFixed(9);
const fitFilter=fit==='cover'?'scale='+vw+':'+vh+':force_original_aspect_ratio=increase:flags=lanczos,crop='+vw+':'+vh:'scale='+vw+':'+vh+':force_original_aspect_ratio=decrease:flags=lanczos,pad='+vw+':'+vh+':(ow-iw)/2:(oh-ih)/2:color=black';
const vf='[0:v]setpts=PTS-STARTPTS,'+fitFilter+',setsar=1,fps='+fpsString+':round=near,tpad=stop_mode=clone:stop_duration=1,trim=end_frame='+plan.frames+',setpts=N/('+fpsString+'*TB)[clip];[1:v][clip]overlay='+x+':'+y+':shortest=1:format=auto[base];[base][2:v]overlay=0:0:shortest=1:format=auto,format='+(lossless?'bgr0':'yuv420p')+'[v]';
let af=audio?';['+(meta.audio?'0:a':'3:a')+']atrim=duration='+d+',asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=flt:channel_layouts=stereo,apad=whole_dur='+d+'[a]':'';
const args=['-threads','1','-filter_threads','1','-filter_complex_threads','1','-ss',String(plan.start),'-t',d,'-i',input,'-loop','1','-framerate',fpsString,'-i',background,'-loop','1','-framerate',fpsString,'-i',overlay];
if(audio&&!meta.audio)args.push('-f','lavfi','-i','anullsrc=r=48000:cl=stereo');
args.push('-filter_complex',vf+af,'-map','[v]');if(audio)args.push('-map','[a]');
if(lossless)args.push('-c:v','ffv1','-level','3','-g','1','-pix_fmt','bgr0');else args.push('-c:v','libx264','-preset','fast','-tune','zerolatency','-rc-lookahead','0','-crf','16','-pix_fmt','yuv420p');
if(audio)args.push('-c:a','pcm_f32le');else args.push('-an');
args.push('-t',d,'-r',fpsString,'-threads','1',output);
return args;
}
export function concatArgs({list,output,lossless,audio,totalFrames,totalDuration}){const a=['-f','concat','-safe','0','-i',list,'-map','0:v:0','-c:v','copy'];if(audio)a.push('-map','0:a:0','-c:a',lossless?'copy':'aac',...(lossless?[]:['-b:a','320k']));else a.push('-an');if(!lossless)a.push('-movflags','+faststart');return a.concat(['-t',String(totalDuration),output]);}




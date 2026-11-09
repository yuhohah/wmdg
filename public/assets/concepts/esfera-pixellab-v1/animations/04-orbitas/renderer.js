(() => {
  'use strict';
  const canvas = document.getElementById('orbit-canvas');
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, preserveDrawingBuffer: true });
  if (!gl) { document.getElementById('status').textContent = 'Este navegador precisa habilitar WebGL para exibir a animação.'; return; }
  const TAU = Math.PI * 2, rad = n => n * Math.PI / 180;
  const rings = [
    { name: 'Meridiano', radius: 174, width: 7, thickness: 2, beta: rad(90), phase: rad(73), tilt: rad(-10), period: 12, direction: 1 },
    { name: 'Equador', radius: 150, width: 7, thickness: 2, beta: rad(12), phase: 0, tilt: 0, period: 16, direction: -1 },
    { name: 'Órbita oblíqua', radius: 199, width: 7, thickness: 2, beta: rad(30), phase: 0, tilt: rad(35), period: 24, direction: 1 },
    { name: 'Aro externo', radius: 222, width: 7, thickness: 2, beta: rad(90), phase: 0, tilt: 0, period: 24, direction: 1, axis: 'pitch' }
  ];
  function shader(type, code) { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `
    attribute vec3 position;
    uniform float beta, phi, tilt;
    uniform mediump int kind;
    varying vec3 world;
    void main() {
      vec3 p = position;
      if (kind == 1) {
        p = vec3(p.x, p.y*sin(beta)-p.z*cos(beta), p.y*cos(beta)+p.z*sin(beta));
        p = vec3(p.x*cos(phi)+p.z*sin(phi), p.y, -p.x*sin(phi)+p.z*cos(phi));
        p = vec3(p.x*cos(tilt)-p.y*sin(tilt), p.x*sin(tilt)+p.y*cos(tilt), p.z);
      }
      world = p;
      gl_Position = vec4(p.x/256.0, p.y/256.0, -p.z/256.0, 1.0);
    }`));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision highp float;
    uniform sampler2D globe;
    uniform float globeAngle;
    uniform mediump int kind;
    varying vec3 world;
    void main() {
      vec3 ink;
      if (kind == 0) {
        // Match the 300 px placement used by the previous final-form SVG preview.
        // The source already contains its engraved meridians and latitude lines.
        // Inverse texture lookup makes the image turn clockwise on screen.
        vec2 samplePosition = vec2(
          world.x*cos(globeAngle)-world.y*sin(globeAngle),
          world.x*sin(globeAngle)+world.y*cos(globeAngle)
        );
        ink = texture2D(globe, vec2(0.5+samplePosition.x/300.0, 0.5-samplePosition.y/300.0)).rgb;
      } else {
        // Same smooth ivory surface as the SVG rings, without engraved ticks.
        ink = vec3(222.0,220.0,205.0)/255.0;
      }
      gl_FragColor = vec4(ink,1.0);
    }`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const locations = {};
  ['beta','phi','tilt','kind','globe','globeAngle'].forEach(n => locations[n] = gl.getUniformLocation(program,n));
  const pos = gl.getAttribLocation(program,'position');
  function mesh(vertices) { const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW); return { buffer, count: vertices.length/6 }; }
  function sphere() {
    const v=[], rows=64, cols=128;
    const point=(i,j)=>{ const a=Math.PI*i/rows,b=TAU*j/cols; return [130*Math.sin(a)*Math.cos(b),130*Math.cos(a),130*Math.sin(a)*Math.sin(b),0,0,0]; };
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);v.push(...a,...b,...c,...a,...c,...d);}
    return mesh(v);
  }
  function band(r) {
    const v=[],n=384;
    const w=r.width/2,h=r.thickness/2;
    const cross=[[-w+.65,h], [w-.65,h], [w,h-.65], [w,-h+.65], [w-.65,-h], [-w+.65,-h], [-w,-h+.65], [-w,h-.65]];
    function vertex(i,k,tone){const u=i/n*TAU,[dr,z]=cross[k];return [(r.radius+dr)*Math.cos(u),(r.radius+dr)*Math.sin(u),z,u,dr/w,tone];}
    for(let i=0;i<n;i++)for(let k=0;k<8;k++){const q=(k+1)%8,tone=k===0||k===4?1:k===2||k===6?.38:.7;const a=vertex(i,k,tone),b=vertex(i+1,k,tone),c=vertex(i+1,q,tone),d=vertex(i,q,tone);v.push(...a,...b,...c,...a,...c,...d);}
    return mesh(v);
  }
  const globeMesh=sphere(); rings.forEach(r=>r.mesh=band(r));
  function bind(m){gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);}
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.clearColor(0,0,0,1);
  const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(locations.globe,0);
  let loaded=false,time=0,speed=1,playing=true,last=null;
  function draw(at=time, reverse=false) {
    if(!loaded)return;
    gl.viewport(0,0,512,512);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(locations.globeAngle,TAU*(at%24)/24);
    function paintGlobe(){gl.uniform1i(locations.kind,0);bind(globeMesh);gl.drawArrays(gl.TRIANGLES,0,globeMesh.count);}
    if(!reverse)paintGlobe();
    gl.uniform1i(locations.kind,1);
    const list=reverse?rings.slice().reverse():rings;
    for(const r of list){
      const angle=r.direction*TAU*(at%r.period)/r.period;
      // Pitch the outer hoop around the horizontal axis; inner hoops keep their yaw.
      gl.uniform1f(locations.beta,r.beta+(r.axis==='pitch'?angle:0));
      gl.uniform1f(locations.phi,r.phase+(r.axis==='pitch'?0:angle));
      gl.uniform1f(locations.tilt,r.tilt);bind(r.mesh);gl.drawArrays(gl.TRIANGLES,0,r.mesh.count);
    }
    if(reverse)paintGlobe();
  }
  const image=new Image();image.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);loaded=true;draw();document.getElementById('status').textContent='Esfera em giro horário de 24 s · quatro aros independentes';window.orbitReady=true;};image.onerror=()=>{document.getElementById('status').textContent='Não foi possível carregar a gravura incorporada.';};image.src=document.getElementById('globe-data').textContent.trim();
  function tick(now){if(last!==null&&playing)time=(time+Math.min((now-last)/1000,.1)*speed)%48;last=now;draw();requestAnimationFrame(tick);}requestAnimationFrame(tick);
  const play=document.getElementById('play'),scrub=document.getElementById('time');
  play.onclick=()=>{playing=!playing;play.textContent=playing?'Pausar':'Continuar';};
  document.getElementById('speed').onchange=e=>speed=Number(e.target.value);
  document.getElementById('reset').onclick=()=>{time=0;draw();scrub.value=0;};
  scrub.oninput=()=>{playing=false;play.textContent='Continuar';time=Number(scrub.value);draw();};
  setInterval(()=>{if(playing)scrub.value=time;},100);
  document.addEventListener('visibilitychange',()=>{last=null;});
  window.orbitDemo={rings,setTime(t){playing=false;time=t;play.textContent='Continuar';draw();},draw,verify(){
    const snapshots=[];playing=false;
    for(const t of [0,3,7,13,24,41,48]){
      draw(t);const a=new Uint8Array(512*512*4);gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,a);
      draw(t,true);const b=new Uint8Array(a.length);gl.readPixels(0,0,512,512,gl.RGBA,gl.UNSIGNED_BYTE,b);
      let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>6)changed++;
      snapshots.push({time:t,orderDependentPixels:changed});
    }
    draw(time);return {depthBuffer:gl.getParameter(gl.DEPTH_BITS),glError:gl.getError(),samples:snapshots,radialClearances:[16.5,17,18,16]};
  }};
})();

// Authored miniature worlds. Architecture stays specific; atmosphere sets the pace.
const DIRECTIONS = {
  d1s3a:['Blue-hour promises','night',0x182440,0xe3a398,0xa9c9ff,.82,1.65,.0042,-.55],
  d1s4c:['Lantern-lit bustle','lantern',0x102035,0x72516a,0xffc184,.85,1.45,.005,.65],
  d2s1a:['Porcelain and gold','court',0x89adbd,0xf0ddba,0xffd3a0,.72,2.4,.0032,-.8],
  d2s4b:['Ochre alley afternoon','lane',0x91b5bf,0xf3d4ab,0xffcd8d,.82,2.1,.005,-.65],
  d4s4a:['A cathedral of ginkgo','grove',0x768e86,0xefcc8e,0xffc56e,.72,2.3,.008,-.9],
  d4s4b:['Brick and slow coffee','lane',0x96a9ad,0xf0c8a0,0xffc082,.86,2,.0045,.7],
  d6s7b:['Violet tide, golden bridge','night',0x111e3c,0xa789ad,0xbacaff,.82,1.5,.004,-.6],
  d7s1a:['Candy-colour coast','coast',0x78bccc,0xf2e6c7,0xffdfa9,.9,2.1,.003,.7],
  d7s4a:['A prayer above the sea','coast',0x7baeb9,0xefdfb6,0xffd091,.78,2.3,.0035,-.75],
  d8s1a:['A pocket of painted hills','village',0x8bb8c2,0xf1d3c1,0xffd8b0,.85,2.05,.005,.8],
  d2s7b:['Silver stream at dusk','river',0x182e4b,0x9289aa,0xb7d5ee,.85,1.6,.005,.6],
  d3s5b:['Fountain afterglow','night',0x17253e,0xba869d,0xc4cbff,.82,1.5,.0035,-.8],
  d5s2a:['Cobalt design district','modern',0x85a6bb,0xe7d6c4,0xffdfb8,.9,1.85,.004,.8],
  d5s3a:['Autumn on mirrored water','garden',0x8ab2b5,0xeacda5,0xffcd8f,.8,2.1,.006,-.7],
  d5s4a:['Above the violet city','modern',0x343853,0xdfaba1,0xffd1b7,.88,1.6,.003,.5],
  d8s2a:['Salt, steel and morning','coast',0x7fa9b5,0xe6dfc9,0xffe3bd,.88,1.95,.004,-.65],
  d8s3a:['White walls, blue infinity','coast',0x69afc3,0xf0dfb9,0xffdca0,.9,2.2,.003,.8],
  d9s4a:['Terracotta sunset walk','ridge',0x839dab,0xf1b98d,0xffbc77,.76,2.25,.005,-.85],
  d9s6b:['Liquid silver after dark','modern',0x191d37,0x717b9f,0xc1c6ff,.8,1.5,.004,.65],
  d10s1a:['The jade garden','garden',0x778f8b,0xe1cba6,0xffd69c,.72,2.05,.008,-.75],
  d1s2a:['Scarlet above the gold','ridge',0x8fabb5,0xefc292,0xffc486,.78,2.15,.0055,-.7],
  d2s1b:['The city opens out','court',0x8caeba,0xf2dfbd,0xffd7a1,.82,2.2,.0035,.8],
  d2s5a:['A spiral of small discoveries','lane',0x9bafad,0xedd2ac,0xffd196,.9,1.9,.005,-.65],
  d2s5b:['Under the lantern canopy','lantern',0x808e9e,0xe4be9c,0xffd5a4,.8,2,.006,.7],
  d3s3a:['The quiet royal courtyard','court',0x99b7b9,0xead6b1,0xffd49d,.72,2.25,.004,-.85],
  d3s4b:['An island reclaimed by green','garden',0x83a5a0,0xdcdab4,0xffdfa9,.8,2.05,.006,.6],
  d4s2b:['Flour, timber and morning','lane',0x9fbab7,0xf2ddba,0xffdea8,.9,1.95,.004,-.7],
  d5s2b:['One more slow coffee','lane',0x9daeb2,0xeecda8,0xffce95,.86,2,.0045,.65],
  d5s3b:['One tree, endless sky','grove',0x90afa6,0xf1d7a3,0xffce87,.78,2.2,.005,-.8],
  d6s2a:['A blue ribbon to Busan','rail',0x9bb9cc,0xe9e1c9,0xffe5bb,.95,1.9,.0035,.75],
  d6s5b:['Wind on the basalt edge','coast',0x74a9b5,0xe0dbc0,0xffd7a6,.8,2.15,.004,-.75],
  d7s2a:['Walking on the horizon','coast',0x7abacc,0xeee5c5,0xffe0ac,.9,2.05,.0028,.75],
  d7s2b:['Two lights on a quiet harbour','coast',0x8cbdc5,0xf0debb,0xffd9a8,.9,2,.0035,-.8],
  d7s5b:['Pine shade and sea glass','garden',0x83afa9,0xe7dfb8,0xffd8a3,.78,2.15,.005,.7],
  d7s7a:['Gold in the midnight marina','night',0x0e1931,0x52678a,0xb3ceef,.78,1.45,.0035,-.7],
  d7s7c:['A ceiling made of colour','modern',0x191e39,0x786d9b,0xd3ccff,.82,1.55,.004,.8],
  d8s1b:['Old paper in warm light','lane',0x92acae,0xe8d2ad,0xffd39c,.86,2,.006,-.7],
  d8s3b:['Bright cabins, open water','coast',0x71b4c5,0xf0dfbd,0xffdaa5,.9,2.1,.003,.7],
  d8s4a:['An amber sanctuary','interior',0xa9a694,0xe5d4b1,0xffcb8c,.95,1.5,.008,-.65],
  d9s5a:['Supper under a hundred lights','lantern',0x26334a,0x98684d,0xffc484,.86,1.6,.007,.7],
  d10s2a:['A glass jewel in autumn','garden',0x96babc,0xf0deb6,0xffdba5,.82,2,.0045,-.75],
};

export function createPlaceScenes(T, helpers) {
  const { box:flatBox, cyl, reg, lowEnd, reduced } = helpers;
  function box(w,h,d,m,x=0,y=0,z=0){
    if(Math.min(w,h,d)<1||Math.max(w,h,d)>110)return flatBox(w,h,d,m,x,y,z);
    const radius=Math.min(.16,Math.min(w,h,d)*.09),half=[w/2,h/2,d/2];
    const geometry=new T.BoxGeometry(1,1,1,4,4,4),positions=geometry.attributes.position,normals=geometry.attributes.normal;
    const vertex=new T.Vector3(),inner=new T.Vector3(),normal=new T.Vector3();
    for(let i=0;i<positions.count;i++){
      vertex.fromBufferAttribute(positions,i);
      for(const [axis,j] of [['x',0],['y',1],['z',2]]){
        const unit=vertex[axis],magnitude=Math.abs(unit);
        vertex[axis]=Math.sign(unit)*(magnitude===.5?half[j]:magnitude===.25?half[j]-radius:0);
        inner[axis]=Math.max(-half[j]+radius,Math.min(half[j]-radius,vertex[axis]));
      }
      normal.subVectors(vertex,inner).normalize();vertex.copy(inner).addScaledVector(normal,radius);
      positions.setXYZ(i,vertex.x,vertex.y,vertex.z);normals.setXYZ(i,normal.x,normal.y,normal.z);
    }
    const mesh=new T.Mesh(geometry,m);mesh.position.set(x,y+h/2,z);
    return mesh;
  }
  const palette = {};
  const material = (color, emission = .045, roughness = .85) => {
    const key = `${color}:${emission}:${roughness}`;
    if(!palette[key]){palette[key]=new T.MeshStandardMaterial({color, roughness, emissive:color, emissiveIntensity:emission});palette[key].userData.shared=true;}
    return palette[key];
  };
  const C = {
    stone:material(0xb9b5a8), pale:material(0xe5dfcf), wood:material(0x795037),
    roof:material(0x253c48), tile:material(0x40525a), red:material(0xa23e32),
    teal:material(0x237a69), blue:material(0x296da1), gold:material(0xdbaa4e,.12),
    glass:material(0x22424b,.08,.3), black:material(0x1d2c32), brick:material(0x9d4c36),
    sand:material(0xd8bc82), grass:material(0x667851), concrete:material(0x8c938c),
    white:material(0xe8ede4), ochre:material(0xe8b83c), orange:material(0xd46e29),
    rust:material(0xaa462b), pine:material(0x2e6855), pink:material(0xdd8278),
    light:material(0xffd494,1.4), night:material(0x111c33), road:material(0x394a4b),
  };
  const geo = {
    leaf:new T.DodecahedronGeometry(1,1), sphere:new T.SphereGeometry(1,12,8),
    rock:new T.DodecahedronGeometry(1,0), bead:new T.SphereGeometry(.1,6,4),
    book:new T.BoxGeometry(1,1,1),
  };
  Object.values(geo).forEach(g=>g.userData.shared=true);
  const seed = (a,b=1) => { const f=Math.sin(a*127.1+b*311.7)*43758.5453; return f-Math.floor(f); };
  const sphere = (g,m,x,y,z,sx=1,sy=sx,sz=sx,geometry=geo.sphere) => {
    const p = new T.Mesh(geometry,m); p.position.set(x,y,z); p.scale.set(sx,sy,sz); g.add(p); return p;
  };
  const line = (g,points,m,r=.055) => {
    const curve = new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const tube = new T.Mesh(new T.TubeGeometry(curve,Math.max(8,points.length*4),r,5,false),m);
    g.add(tube); return tube;
  };
  function groundOutline(w,d){
    const s=new T.Shape(),r=Math.min(w,d)*.08,x=-w/2,z=-d/2;
    s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);
    s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);
    s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);
    s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);return s;
  }
  function floor(g,m,w=180,d=180,x=0,z=0,y=-.06) {
    const ground=m.clone();delete ground.userData.shared;ground.userData.sharedTexture=true;
    ground.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTerrain;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrain=position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vTerrain;')
        .replace('#include <color_fragment>',`#include <color_fragment>
          float grain=fract(sin(dot(floor(vTerrain.xy*19.),vec2(12.9898,78.233)))*43758.5453);
          float patina=sin(vTerrain.x*.16)*cos(vTerrain.y*.12);
          diffuseColor.rgb*=.95+grain*.065+patina*.035;`);
    };
    ground.customProgramCacheKey=()=>'cinematic-terrain';
    const outline=w>=100&&d>=80?groundOutline(w,d):null;
    const p=new T.Mesh(outline?new T.ShapeGeometry(outline):new T.PlaneGeometry(w,d),ground);p.rotation.x=-Math.PI/2;p.position.set(x,y,z);p.receiveShadow=true;p.userData.terrain={w,d,outline};g.add(p);return p;
  }
  function tree(g,x,z,size=1,m=C.ochre,y=0) {
    const trunk=cyl(.15*size,.3*size,4*size,C.wood,x,y,z,7); g.add(trunk);
    [-1,1].forEach((s,i)=>line(g,[[x,y+2*size,z],[x+s*.8*size,y+3.5*size,z+.3*size],[x+s*1.35*size,y+4.3*size,z-.2*size]],C.wood,.11*size));
    [[0,5,0,1.9],[-1.3,4.5,.3,1.55],[1.25,4.6,-.3,1.6],[-.4,6.1,-.6,1.4],[.7,5.5,.9,1.3]].forEach(([dx,dy,dz,s],i)=>{
      const p=sphere(g,m,x+dx*size,y+dy*size,z+dz*size,s*size,s*.8*size,s*size,geo.leaf);
      p.rotation.y=seed(x,z+i)*6;
    });
  }
  function leaves(g,x,z,w,d,n=60) {
    const count=lowEnd?Math.floor(n*.55):n;
    const mesh=new T.InstancedMesh(new T.PlaneGeometry(.18,.3),C.ochre,count), m=new T.Matrix4(), q=new T.Quaternion();
    for(let i=0;i<count;i++){
      q.setFromEuler(new T.Euler(-Math.PI/2,0,seed(i,2)*6));
      m.compose(new T.Vector3(x+(seed(i,3)-.5)*w,.02,z+(seed(i,7)-.5)*d),q,new T.Vector3(1,1,1));
      mesh.setMatrixAt(i,m); mesh.setColorAt(i,new T.Color([0xe6bd3c,0xdb8a32,0xb84d2b][i%3]));
    }
    g.add(mesh);
  }
  const signs=new Map();
  function sign(g,text,x,y,z,w=5,h=1.4,bg='#193f38',fg='#f3d890',rotation=0) {
    const key=[text,bg,fg,w,h].join('|');
    if(!signs.has(key)){
      const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=Math.round(512*h/w);
      const ctx=canvas.getContext('2d'); ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.strokeStyle=fg; ctx.lineWidth=3; ctx.strokeRect(9,9,canvas.width-18,canvas.height-18);
      ctx.fillStyle=fg; ctx.textAlign='center'; ctx.textBaseline='middle';
      const lines=text.split('\n');
      ctx.font=`700 ${Math.min(canvas.height*.62/lines.length,canvas.width/(Math.max(...lines.map(l=>l.length))+.5))}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
      lines.forEach((l,i)=>ctx.fillText(l,256,canvas.height*(i+.5)/lines.length,480));
      const tx=new T.CanvasTexture(canvas); tx.colorSpace=T.SRGBColorSpace; tx.anisotropy=4;
      const m=new T.MeshStandardMaterial({map:tx,roughness:.65,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:.45});m.userData.shared=true;signs.set(key,m);
    }
    const p=new T.Mesh(new T.PlaneGeometry(w,h),signs.get(key)); p.position.set(x,y,z); p.rotation.y=rotation; g.add(p); return p;
  }
  function roof(g,w,d,h,x,y,z) {
    const nx=18,nz=12,positions=[],indices=[];
    for(let j=0;j<=nz;j++) for(let i=0;i<=nx;i++){
      const u=i/nx*2-1,v=j/nz*2-1;
      const end=Math.max(0,(Math.abs(u)-.64)/.36);
      const rise=h*Math.pow(1-Math.abs(v),1.6)*(1-.48*end)+h*.2*(Math.pow(Math.abs(v),8)+Math.pow(Math.abs(u),8));
      positions.push(x+u*w/2,y+rise,z+v*d/2);
      if(i<nx&&j<nz){ const a=j*(nx+1)+i; indices.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1); }
    }
    const geom=new T.BufferGeometry(); geom.setAttribute('position',new T.Float32BufferAttribute(positions,3)); geom.setIndex(indices); geom.computeVertexNormals();
    const m=C.roof; m.side=T.DoubleSide;
    g.add(new T.Mesh(geom,m));
    line(g,[[x-w*.5,y+h*.2,z],[x-w*.32,y+h,z],[x,y+h,z],[x+w*.32,y+h,z],[x+w*.5,y+h*.2,z]],C.tile,.16);
    for(let i=1;i<16;i++) for(const s of [-1,1]){
      const u=i/16*2-1,xx=x+u*w/2, end=Math.max(0,(Math.abs(u)-.64)/.36);
      const pts=[0,.28,.6,.82,1].map(v=>[xx,y+h*Math.pow(1-v,1.6)*(1-.48*end)+h*.2*(v**8+Math.abs(u)**8)+.045,z+s*v*d/2]);
      line(g,pts,C.tile,.045);
    }
    for(const s of [-1,1]) line(g,[[x-w/2,y+h*.4,z+s*d/2],[x,y+h*.2,z+s*d/2],[x+w/2,y+h*.4,z+s*d/2]],C.roof,.13);
  }
  function hall(g,x,z,w=22,d=11,y=1,h=5,double=false,plaque='') {
    g.add(box(w+5,.7,d+4,C.stone,x,y-.7,z),box(w,h,d,C.red,x,y,z));
    for(let i=0;i<9;i++){
      const xx=x-w/2+1+i*(w-2)/8;
      g.add(cyl(.23,.25,h,C.red,xx,y,z+d/2+.2,8),box(.9,h*.62,.08,C.black,xx,y+.35,z+d/2+.03));
      for(let k=0;k<3;k++)g.add(box(.06,h*.62,.09,C.wood,xx-.3+k*.3,y+.35,z+d/2+.09));
      for(let k=0;k<4;k++)g.add(box(.9,.055,.1,C.wood,xx,y+.65+k*h*.14,z+d/2+.12));
    }
    g.add(box(w+1,.3,d+1,C.teal,x,y+h-.35,z),box(w+1.4,.18,d+1.4,C.gold,x,y+h-.1,z));
    for(let i=0;i<14;i++)g.add(box(.4,.45,d+1.3,i%2?C.teal:C.red,x-w/2+.7+i*(w-1.4)/13,y+h-.45,z));
    roof(g,w+5,d+5,2.8,x,y+h,z);
    if(double){g.add(box(w*.66,1.65,d*.68,C.red,x,y+h+2.3,z)); roof(g,w*.8,d*.98,2.4,x,y+h+3.9,z);}
    if(plaque)sign(g,plaque,x,y+h-1,z+d/2+.4,4.5,1.1);
  }
  function house(g,x,y,z,w=5,d=5,color=C.pale,hanok=false,rotation=0) {
    const s=new T.Group(); s.position.set(x,y,z); s.rotation.y=rotation;
    s.add(box(w,3.5,d,color),box(w+.2,.35,d+.2,C.stone,0,0,0));
    for(const xx of [-w*.3,w*.3]){
      s.add(box(w*.23,1.3,.06,C.glass,xx,1.25,d/2+.02));
      s.add(box(.07,1.3,.1,C.wood,xx,1.25,d/2+.05),box(w*.23,.06,.1,C.wood,xx,1.86,d/2+.05));
    }
    s.add(box(1,2.5,.09,C.wood,0,.2,d/2+.06));
    if(hanok){
      for(const xx of [-w/2,w/2])s.add(cyl(.1,.1,3.4,C.wood,xx,.1,d/2,6));
      roof(s,w+1.7,d+1.8,1.6,0,3.5,0);
    }else{s.add(box(w+.3,.2,d+.3,C.blue,0,3.5,0)); sphere(s,C.white,w*.3,4.2,-d*.2,.4,.55,.4);}
    g.add(s);return s;
  }
  function skyline(g,z=-60,night=false) {
    for(let i=0;i<19;i++){
      const x=-55+i*6,h=6+seed(i,8)*15,w=3.3+seed(i,3)*2;
      g.add(box(w,h,3,night?C.night:material(0x869aa3),x,0,z-seed(i,2)*8));
      if(night)for(let j=0;j<3;j++)for(let k=0;k<7;k++)if(seed(i+j,k)>.3)g.add(box(.32,.55,.05,j===1?C.light:material(0x80b6db,.6),x+(j-1)*.85,1+k*(h-1)/7,z-seed(i,2)*8+1.52));
    }
  }
  function mountains(g,z=-65){
    [-35,0,33].forEach((x,i)=>{
      const m=new T.Mesh(new T.ConeGeometry(28,25-i*4,7),material([0x637c73,0x718476,0x859382][i]));m.position.set(x,10,z-i*9);m.scale.set(1.3,1,.65);g.add(m);
    });
  }
  function bench(g,x,z,rot=0){
    const b=new T.Group(); b.add(box(3.7,.18,1,C.wood,0,.65,0),box(3.7,.85,.16,C.wood,0,.72,-.42));
    [-1.3,1.3].forEach(xx=>b.add(box(.17,.65,.8,C.black,xx,0,0)));b.position.set(x,0,z);b.rotation.y=rot;g.add(b);
  }
  function lamp(g,x,z,height=6){
    g.add(cyl(.07,.1,height,C.black,x,0,z,6)); sphere(g,C.light,x,height,z,.3,.3,.3);
  }
  function water(g,w=220,d=160,z=-55,night=false){
    const m=new T.ShaderMaterial({transparent:false,uniforms:{time:{value:0},deep:{value:new T.Color(night?0x092b52:0x107b9a)},light:{value:new T.Color(night?0x287aaf:0x77c8cb)}},
      vertexShader:'varying vec2 vUv; uniform float time; void main(){ vUv=uv; vec3 p=position; p.z+=sin(p.x*.24+time)*.045+cos(p.y*.29+time*.7)*.04; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }',
      fragmentShader:`varying vec2 vUv; uniform float time; uniform vec3 deep,light;
        void main(){
          float swell=sin(vUv.x*95.+vUv.y*32.+time*.45);
          float ripple=sin(vUv.x*240.+sin(vUv.y*110.+time*.55)*1.8);
          float glint=pow(max(0.,swell*ripple),18.);
          float ribbon=pow(max(0.,sin(vUv.x*70.+vUv.y*12.+time*.22)),26.);
          float distanceTint=smoothstep(0.,1.,vUv.y);
          vec3 c=mix(deep,light,.13+distanceTint*.22+glint*.34+ribbon*.08);
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    const plane=new T.Mesh(new T.PlaneGeometry(w,d,60,40),m);plane.rotation.x=-Math.PI/2;plane.position.set(0,-.2,z);g.add(plane);
    reg(g,(dt,t)=>m.uniforms.time.value=reduced?0:t);
    return plane;
  }
  function foam(g,z,w=100){
    const strips=[];
    for(let i=0;i<4;i++){ const s=box(w,.025,.18,material(0xc9eff0,.2),0,-.02,z-i*1.5);g.add(s);strips.push(s); }
    reg(g,(dt,t)=>strips.forEach((s,i)=>{s.position.z=z-i*1.5+Math.sin((reduced?0:t)*.7+i)*.7;s.scale.x=.8+Math.sin((reduced?0:t)*.5+i)*.08;}));
  }
  function rocks(g,z=-7,n=12){
    for(let i=0;i<n;i++){const p=sphere(g,material(i%2?0x73877f:0x5d726c),-26+i*52/n,1.1+seed(i,2)*2,z+(seed(i,4)-.5)*12,4+seed(i,3)*2,2.5+seed(i,5)*3,4,geo.rock);p.rotation.y=seed(i)*6;}
  }
  function configure(g,id,camera,target,accent,sky,light){
    const [name,kind,zen,hor,sun,ambient,key,fog,angle]=DIRECTIONS[id];
    light.night??=(kind==='night'||zen===0x191d37||zen===0x191e39||id==='d9s5a'?1:0);
    Object.assign(light,{sun,ambient,key,sky:zen,ground:kind==='night'?0x34324e:0x9c8870});
    Object.assign(sky,{zen,hor});
    const sunDirection=[angle,.58,1];
    g.userData.visual={id,camera,target,accent,sky,light,name,kind,fog,sunDirection};
    cinematicDetails(g,kind,accent,hor,id);
    g.userData.dispose=()=>{
      const owned=new Set();g.traverse(o=>{if(o.material)for(const m of [].concat(o.material))if(!m.userData.shared)owned.add(m);});
      owned.forEach(m=>{if(m.map&&!m.userData.sharedTexture)m.map.dispose();m.dispose();});
    };
  }
  function cinematicDetails(g,kind,accent,horizon,id){
    const salt=[...id].reduce((a,c)=>a+c.charCodeAt(0),0);
    const colour=new T.Color(accent),distant=new T.Color(horizon);
    if(!['interior','lane','lantern'].includes(kind)){
      const bands=lowEnd?2:3;
      for(let i=0;i<bands;i++){
        const haze=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
          uniforms:{uTint:{value:distant.clone().lerp(new T.Color(kind==='night'?0x8e9abf:0xffffff),.35)},uTime:{value:0},uSeed:{value:seed(salt,i)*9}},
          vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:`varying vec2 vUv;uniform vec3 uTint;uniform float uTime,uSeed;void main(){
            float x=vUv.x+uTime*.0015;float crest=.48+sin(x*11.+uSeed)*.06+sin(x*23.+uSeed)*.025;
            float band=exp(-pow((vUv.y-crest)*12.,2.));
            float edge=smoothstep(0.,.16,vUv.x)*(1.-smoothstep(.82,1.,vUv.x));
            float wisps=.55+.45*sin(x*17.+uSeed);
            gl_FragColor=vec4(uTint,band*edge*wisps*.2);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`});
        const cloud=new T.Mesh(new T.PlaneGeometry(160+i*24,22),haze);cloud.position.set((i-1)*26,26+i*11,-120-i*18);cloud.userData.noShadow=true;g.add(cloud);
        if(!reduced)reg(g,(dt,t)=>haze.uniforms.uTime.value=t);
      }
    }
    const isLand=!['coast','night','river','interior','rail'].includes(kind);
    if(isLand){
      const terrain=g.children.find(o=>o.userData.terrain?.outline);
      if(terrain){
        const base=new T.Mesh(new T.ExtrudeGeometry(terrain.userData.terrain.outline,{depth:1.2,bevelEnabled:true,bevelSize:.65,bevelThickness:.35,bevelSegments:2,steps:1}),material(distant.clone().multiplyScalar(.58).getHex()));
        base.rotation.x=-Math.PI/2;base.position.copy(terrain.position);base.position.y-=1.6;
        base.userData.noShadow=true;g.add(base);
        for(const side of [-1,1]){
          const ridge=sphere(g,material(distant.clone().lerp(colour,.22).multiplyScalar(.68).getHex()),side*70,2,-75,38,9+seed(salt,side)*9,19,geo.leaf);
          ridge.userData.noShadow=true;
        }
      }
    }
    if(['court','ridge','grove','garden','village'].includes(kind)){
      const shades=[colour.clone().lerp(new T.Color(0xf2d6a1),.3),new T.Color(0x93734a),new T.Color(0xc16b44)];
      const count=lowEnd?70:140,geom=new T.PlaneGeometry(.16,.32);
      const mulch=new T.InstancedMesh(geom,new T.MeshStandardMaterial({color:0xffffff,roughness:1,side:T.DoubleSide}),count);
      const matrix=new T.Matrix4(),q=new T.Quaternion();
      for(let i=0;i<count;i++){
        const side=i%2?1:-1,x=side*(17+seed(i,salt)*27),z=-30+seed(i,salt+2)*40;
        q.setFromEuler(new T.Euler(-Math.PI/2,0,seed(i,5)*6));
        matrix.compose(new T.Vector3(x,.045,z),q,new T.Vector3(1,1,1));
        mulch.setMatrixAt(i,matrix);mulch.setColorAt(i,shades[i%3]);
      }
      g.add(mulch);
    }
    if(['lane','lantern','interior'].includes(kind)){
      const warm=material(0xffd2a0,.8);
      for(const side of [-1,1]){
        const glow=new T.Mesh(new T.PlaneGeometry(3.8,2.6),new T.MeshBasicMaterial({color:0xffd2a0,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide}));
        glow.rotation.x=-Math.PI/2;glow.rotation.z=side*.35;glow.position.set(side*7,.055,1);g.add(glow);
        if(kind==='lane'){
          const pot=cyl(.45,.6,.65,C.brick,side*19,0,7,10);g.add(pot);
          sphere(g,C.pine,side*19,1.05,7,.7,.6,.7,geo.leaf);
        }
        sphere(g,warm,side*18,2.2,-6,.12);
      }
    }
    const count=reduced?0:(lowEnd?28:64);
    if(!count)return;
    const positions=new Float32Array(count*3),colours=new Float32Array(count*3),sizes=new Float32Array(count);
    const particles=new T.BufferGeometry();particles.setAttribute('position',new T.BufferAttribute(positions,3));particles.setAttribute('color',new T.BufferAttribute(colours,3));particles.setAttribute('aSize',new T.BufferAttribute(sizes,1));
    const motes=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{uTime:{value:0},uWarm:{value:kind==='night'||kind==='lantern'?1:0}},
      vertexShader:`attribute float aSize;varying vec3 vColor;uniform float uTime;void main(){
        vColor=color;vec3 p=position;p.x+=sin(uTime*.24+position.z)*.65;p.y+=sin(uTime*.32+position.x)*.4;
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(aSize*170./max(1.,-mv.z),1.,5.);gl_Position=projectionMatrix*mv;
      }`,
      fragmentShader:`varying vec3 vColor;uniform float uWarm;void main(){
        float r=length(gl_PointCoord-.5);float a=(1.-smoothstep(.12,.5,r))*.42;
        if(a<.01)discard;gl_FragColor=vec4(vColor*(1.+uWarm*.5),a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    for(let i=0;i<count;i++){
      positions.set([(seed(i,salt)-.5)*84,2+seed(i,salt+1)*16,-12-seed(i,salt+2)*62],i*3);
      colour.clone().lerp(new T.Color(0xffffff),seed(i,8)*.65).toArray(colours,i*3);sizes[i]=.45+seed(i,3)*.7;
    }
    const points=new T.Points(particles,motes);points.userData.noShadow=true;g.add(points);reg(g,(dt,t)=>motes.uniforms.uTime.value=t);
  }
  function palace(g){
    floor(g,C.pale);floor(g,C.stone,45,28,0,3,.005);
    for(let i=-10;i<=10;i++)g.add(box(.035,.01,36,material(0x9c9e95),i*2,.01,5));
    for(let i=-5;i<=9;i++)g.add(box(45,.01,.035,material(0x9c9e95),0,.01,i*2));
    hall(g,0,-7,25,13,2.1,5.8,true,'勤政殿');
    for(let i=0;i<7;i++)g.add(box(9,.28,1.2,C.stone,0,i*.28,5-i*.8));
    for(const x of [-18,18]){hall(g,x,-13,8,6,.7,3,false);tree(g,x*1.5,-7,1.5,C.ochre);tree(g,x*1.5,-23,1.2,C.rust);}
    for(const x of [-14,14])for(let i=0;i<5;i++){
      const z=2-i*4;g.add(cyl(.12,.17,1.1,C.stone,x,.1,z,8),box(.55,.12,.5,C.stone,x,1.2,z));
    }
    mountains(g);leaves(g,0,16,40,20,70);
    configure(g,'d2s1a',[25,15,52],[0,6,-1],'#d6a84c',{zen:0x7ea9bb,hor:0xe3d6b1}, {sun:0xffddb0,ambient:.78,key:2});
  }
  function namsan(g){
    floor(g,C.grass);skyline(g,-64,true);
    const hill=sphere(g,C.pine,0,.6,-15,18,5,14,geo.leaf);
    g.add(cyl(.6,1.2,25,C.white,0,4,-15,20),cyl(3.5,2.9,2.9,C.white,0,26,-15,24),cyl(3.35,3.35,.9,material(0x51b6d0,.7),0,27.1,-15,24),cyl(.08,.3,8,C.white,0,29,-15,10));
    const band=new T.Mesh(new T.TorusGeometry(3.4,.18,8,36),material(0x7dc6fa,.8));band.rotation.x=Math.PI/2;band.position.set(0,28.3,-15);g.add(band);
    floor(g,C.stone,30,21,0,8,.01);
    for(const side of [-1,1])for(let i=0;i<6;i++){
      const x=side*(3+i*1.8);g.add(cyl(.065,.065,1.5,C.black,x,0,6,6));
      if(i<5)g.add(box(1.8,.07,.07,C.black,x+side*.9,.85,6),box(1.8,.07,.07,C.black,x+side*.9,1.4,6));
      for(let j=0;j<6;j++){const color=material([0xecc249,0xe5757d,0x59afbd,0xcc847b][(j+i)%4]);g.add(box(.18,.25,.14,color,x+(seed(i,j)-.5)*1.4,.45+seed(j,i)*.7,6.08));}
    }
    for(let i=0;i<4;i++)tree(g,(i%2?1:-1)*(22+seed(i)*5),-30-seed(i,4)*10,1.1,i%3?C.ochre:C.rust); // only behind the tower, never between camera and couple
    sign(g,'N서울타워',-10,3,6,5,1.2);lamp(g,-13,14);lamp(g,13,14);
    configure(g,'d1s3a',[24,14,65],[0,14,-8],'#72c7e5',{zen:0x142548,hor:0xc38681},{sun:0xbccdfd,ambient:.9,key:1.35});
  }
  function bukchon(g){
    floor(g,material(0xa7a291));floor(g,C.stone,7,80,0,-17,.005);
    for(const s of [-1,1])for(let i=0;i<4;i++){
      const z=3-i*11,x=s*(8.1+seed(i,s)*.8),y=i*.32;
      house(g,x,y,z,7.5,8,C.pale,true,s*-.05);
      g.add(box(6,.9,.3,C.stone,s*7,0,z+4.2));
      sign(g,i%2?'북촌':'공방',s*4.5,2.8,z+4.35,1.2,.65,'#78523a','#ffefbd');
    }
    for(let i=0;i<10;i++)g.add(box(6.8,.025,.08,material(0x807f72),0,.01,9-i*4));
    tree(g,-16,-3,1.2);tree(g,16,-25,1.6,C.rust);skyline(g,-72);leaves(g,0,-4,7,50,65);
    configure(g,'d2s4b',[9,10,38],[0,4,-14],'#c98d43',{zen:0x89b6c7,hor:0xe7dac0},{sun:0xffd69a,ambient:.8,key:1.9});
  }
  function steam(g,x,y,z){
    const m=new T.MeshStandardMaterial({color:0xe5d7bc,transparent:true,opacity:.3,depthWrite:false});
    const puffs=[];for(let i=0;i<5;i++)puffs.push(sphere(g,m.clone(),x,y+i*.2,z,.2,.3,.2));
    reg(g,(dt,t)=>puffs.forEach((p,i)=>{const f=((reduced?0:t*.4)+i/5)%1;p.position.set(x+Math.sin(f*5+i)*.15,y+f*1.8,z);p.scale.setScalar(.18+f*.4);p.material.opacity=.3*(1-f);}));
  }
  function market(g){
    floor(g,C.road);floor(g,material(0x6f7166),22,85,0,-12,.01);
    const words=['화장품','명동교자','커피','약국','노래방','분식','서울','옷가게'];
    for(const s of [-1,1])for(let i=0;i<5;i++){
      const x=s*13,z=3-i*10,h=10+seed(i,s)*9,col=[0x6a766f,0x7e7770,0x8f6e5c,0x455662][(i+(s>0?1:0))%4];
      const b=new T.Group();b.position.set(x,0,z);b.rotation.y=s>0?-Math.PI/2:Math.PI/2;
      b.add(box(9,h,7,material(col)),box(8,2.8,.12,C.glass,0,.6,3.56));
      for(let j=0;j<3;j++)for(let k=0;k<3;k++)b.add(box(1.4,1.6,.08,(j+k)%3?C.glass:C.light,-2.8+j*2.8,5+k*3.2,3.57));
      sign(b,words[(i+(s>0?3:0))%words.length],0,3.9,3.7,8,1.3,i%2?'#233859':'#a74330','#ffe4a8');
      sign(b,i%2?'약\n국':'명\n동',-3.8,7,4.2,1,4,'#ad393a','#fff2cd');
      g.add(b);
    }
    [-1,1,-1,1,-1,1].forEach((s,i)=>{
      const x=s*6.6,z=6-Math.floor(i/2)*12-(s>0?5:0);g.add(box(3.9,1.2,2,C.wood,x,0,z),box(4.1,.12,2.1,C.black,x,1.2,z));
      g.add(box(4.8,.16,2.8,C.red,x,3.1,z),cyl(.05,.05,3.1,C.black,x-1.8,0,z+.8,6),cyl(.05,.05,3.1,C.black,x+1.8,0,z+.8,6));
      sign(g,i?'어묵 · 만두':'떡볶이 · 호떡',x,2.7,z+1.45,4,.7,'#b64a2b','#ffedb2');
      const tray=box(1.6,.16,1,C.rust,x-.8,1.33,z);g.add(tray);
      for(let j=0;j<12;j++)g.add(cyl(.065,.065,.28,C.orange,x-1.4+(j%4)*.28,1.52,z-.3+Math.floor(j/4)*.23,6));
      g.add(cyl(.6,.6,.25,C.white,x+1,1.32,z,16));steam(g,x+.9,1.6,z);lamp(g,x,z+2,3.7);
    });
    for(let row=0;row<4;row++){
      const z=5-row*11;
      line(g,[[-10,8,z],[0,7.3,z],[10,8,z]],C.black,.025);
      for(let i=0;i<9;i++)sphere(g,C.light,-8+i*2,7.3+Math.abs(i-4)*.12,z,.17);
    }
    line(g,[[-10,7.5,8],[0,6.8,8],[10,7.5,8]],C.black,.03);
    const glow=new T.PointLight(0xffbc66,24,22,2);glow.position.set(0,4,0);g.add(glow);
    configure(g,'d1s4c',[3,7.5,34],[0,4,-9],'#f5a345',{zen:0x10223e,hor:0x365174},{sun:0xadc5f0,ambient:1.6,key:1.3});
  }
  function brickMaterial(){
    const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#7a5e4a';x.fillRect(0,0,256,256);
    for(let row=0;row<12;row++)for(let col=-1;col<6;col++){x.fillStyle=['#a3573f','#b76b4b','#994d36','#ab6145'][(row+col+8)%4];x.fillRect(col*48+(row%2)*24,row*23,45,20);}
    const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(2.5,1.4);return new T.MeshStandardMaterial({map:tx,roughness:.93});
  }
  const brick=brickMaterial();brick.userData.shared=true;
  function seongsu(g){
    floor(g,C.concrete);floor(g,material(0x666d69),18,100,0,-25,.005);
    g.add(box(30,9,11,brick,0,0,-18),box(30.5,.4,12,C.black,0,9,-18));
    for(let i=0;i<7;i++){
      const x=-12+i*4;g.add(box(3.1,5,.08,C.glass,x,1.1,-12.43));
      for(let j=0;j<3;j++)g.add(box(.08,5,.1,C.black,x-1.1+j*1.1,1.1,-12.32));
      g.add(box(3.1,.08,.1,C.black,x,3.6,-12.32));
    }
    sign(g,'성수 · COFFEE & DESIGN',0,7.7,-12.2,15,1.25,'#e3d8bd','#274036');
    for(const [x,z] of [[-17,-2],[19,-1]]){
      g.add(box(10,7,14,brick,x,0,z),box(10.5,.2,15,C.black,x,7,z));
      sign(g,x<0?'공방':'카페',x,5.1,z+7.1,6,1.4,'#ddd6ba','#354844');
      g.add(box(7,3.2,.08,C.glass,x,.9,z+7.03));
    }
    for(const x of [-9,9])for(let i=0;i<2;i++){
      const z=3-i*5;g.add(cyl(.8,.8,.12,C.wood,x,.9,z,12),cyl(.07,.07,.9,C.black,x,0,z,6));
      for(const dx of [-1.2,1.2])g.add(box(.65,.1,.65,C.wood,x+dx,.5,z),box(.1,.5,.5,C.black,x+dx,0,z));
    }
    tree(g,-23,8,1.4,C.ochre);tree(g,22,-9,1.7,C.ochre);leaves(g,0,8,40,28);
    configure(g,'d4s4b',[22,13,43],[0,3,-9],'#d79b43',{zen:0x95b9be,hor:0xe7ccad},{sun:0xffcc88,ambient:.9,key:1.8});
  }
  function forest(g){
    floor(g,material(0x698451));floor(g,material(0xb4a080),5.5,110,0,-32,.005);
    for(const s of [-1,1])for(let i=0;i<9;i++)tree(g,s*(4.9+seed(i,s)*1.5),8-i*8,1.4+seed(i,6)*.35,i%5===0?C.orange:C.ochre);
    for(let i=0;i<6;i++)tree(g,(i%2?1:-1)*(14+seed(i)*10),-12-seed(i,4)*30,1.5,i%2?C.rust:C.pine);
    bench(g,-9,8,.25);bench(g,9,-4,-.25);leaves(g,0,-18,18,95,280);
    const drifting=[];for(let i=0;i<(lowEnd?10:20);i++){
      const p=new T.Mesh(new T.PlaneGeometry(.22,.3),i%2?C.ochre:C.orange);p.material.side=T.DoubleSide;g.add(p);drifting.push(p);
    }
    reg(g,(dt,t)=>drifting.forEach((p,i)=>{const f=((reduced?0:t*.13)+i/drifting.length)%1;p.position.set(Math.sin(i*3+(reduced?0:t*.4))*7,8-f*8,8-seed(i,4)*45);p.rotation.set(f*5,i,f*7);}));
    configure(g,'d4s4a',[10,8,35],[0,5,-20],'#e2b733',{zen:0x829fa1,hor:0xe7cc95},{sun:0xffca73,ambient:.9,key:2.1});
  }
  function bridge(g){
    const z=-40,w=100,y=10;g.add(box(w,.65,3.1,material(0x889aad),0,y,z),box(w,.11,.11,material(0x61c9f0,1.1),0,y+.7,z+1.7));
    const towers=[-24,24];
    for(const x of towers){for(const dz of [-1.4,1.4])g.add(box(.65,17,.65,C.white,x,0,z+dz));g.add(box(3,.45,3.8,C.white,x,16.5,z));}
    for(const s of [-1,1]){
      const pts=[[-50,y+1,z+s*1.4],[-24,17,z+s*1.4],[0,11.6,z+s*1.4],[24,17,z+s*1.4],[50,y+1,z+s*1.4]];line(g,pts,material(0x99ddf2,1),.08);
      for(let i=-22;i<=22;i++){
        const x=i*2,yTop=Math.abs(x)<24?11.6+5.4*(Math.abs(x)/24)**2:17-6*((Math.abs(x)-24)/26);
        g.add(cyl(.025,.025,Math.max(.1,yTop-y-.4),C.white,x,y+.4,z+s*1.4,4));
        sphere(g,material(i%3?0xffce9c:0xbdabed,1.2),x,y+.7,z+s*1.7,.09);
      }
    }
    for(let i=0;i<22;i++){
      const x=-45+i*4.3;const mat=new T.MeshBasicMaterial({color:[0xedbd86,0xb896d4,0x76adcc][i%3],transparent:true,opacity:.16,depthWrite:false});
      const p=new T.Mesh(new T.PlaneGeometry(.35+seed(i)*.5,16+seed(i,3)*16),mat);p.rotation.x=-Math.PI/2;p.position.set(x,-.12,-21);g.add(p);
      reg(g,(dt,t)=>{p.scale.x=.65+Math.sin((reduced?0:t)*1.3+i)*.35;});
    }
  }
  function gwangalli(g){
    water(g,280,180,-65,true);floor(g,C.sand,240,70,0,39,-.05);foam(g,5,160);bridge(g);skyline(g,-91,true);
    for(const x of [-38,39]){
      g.add(box(13,12,10,C.pale,x,0,18),box(10,4,.08,C.glass,x,.9,23.04));
      sign(g,'광안리 · CAFE',x,5.9,23.1,10,1.2,'#304751','#ffdda1');lamp(g,x*.7,21,5);
    }
    floor(g,material(0x8d9387),160,5,0,30,.01);bench(g,-14,22);bench(g,14,22);sign(g,'광안리',-19,2.5,23,4,1.2);
    configure(g,'d6s7b',[14,10,61],[0,7,-24],'#74badd',{zen:0x050d20,hor:0x182a4b},{sun:0xb5c7f4,ambient:1.0,key:1.45});
  }
  function capsule(g){
    water(g,250,170,-64);floor(g,C.sand,220,46,0,32,-.04);foam(g,5,120);
    g.add(box(61,.28,2.6,C.concrete,0,5,-1),box(61,.12,.09,C.black,0,5.29,-2),box(61,.12,.09,C.black,0,5.29,0));
    for(let x=-27;x<=27;x+=9)g.add(cyl(.3,.42,5,C.concrete,x,0,-1,10));
    const pods=[];
    for(let i=0;i<4;i++){
      const p=new T.Group(),m=material([0xc4483e,0xe4b339,0x2d89b1,0x438367][i]);
      p.add(box(2.5,1.3,1.65,m,0,0,0),box(2.4,.18,1.9,m,0,2.1,0));
      sphere(p,m,0,1.6,0,1.4,.7,1.05,geo.leaf);
      p.add(box(2.1,.85,.08,C.glass,0,1.18,1.02),box(.9,.9,.09,C.glass,-.63,1.13,1.08),box(.9,.9,.09,C.glass,.63,1.13,1.08));
      for(const xx of [-.3,.3])p.add(box(.08,1.05,.1,m,xx,1.03,1.12));
      p.position.set(-21+i*14,5.36,-1);g.add(p);pods.push(p);
    }
    reg(g,(dt,t)=>pods.forEach((p,i)=>p.position.x=((i*14+(reduced?0:t)*1.1)%61)-30));
    for(let i=0;i<8;i++)tree(g,(i%2?1:-1)*(22+seed(i)*7),17-seed(i,2)*7,1.1,C.pine);
    sign(g,'해운대 블루라인파크',-19,3.3,17,9,1.5,'#e2d7bc','#214b57');
    configure(g,'d7s1a',[19,12,51],[0,5,-8],'#42a8bd',{zen:0x66aec2,hor:0xc4e2d8},{sun:0xffe4ba,ambient:.9,key:1.8});
  }
  function seaTemple(g){
    water(g,260,190,-60);rocks(g,-27,17);floor(g,C.stone,34,21,0,1,.01);
    g.add(box(34,2.7,18,C.stone,0,0,-13));
    hall(g,5,-12,17,9,3.7,4.4,false,'해동용궁사');hall(g,-15,-17,8,6,2.7,3.2,false);
    for(let i=0;i<8;i++)g.add(box(7,.4,1.1,C.stone,5,i*.4,5-i*.9));
    for(let i=0;i<12;i++){const x=-17+i*3;g.add(cyl(.15,.22,1.4,C.pale,x,.1,9,8),box(.7,.12,.6,C.pale,x,1.5,9));if(i<11)g.add(box(3,.12,.16,C.pale,x+1.5,.9,9));}
    for(let i=0;i<7;i++)tree(g,(i%2?1:-1)*(23+seed(i)*5),9-seed(i,2)*22,1.2,C.pine);
    for(let tier=0;tier<4;tier++){const w=3-tier*.5;g.add(box(w,.3,w,C.pale,-10,1.8+tier*.8,1),box(w*.5,.5,w*.5,C.stone,-10,2.1+tier*.8,1));}
    g.add(cyl(.05,.2,1.3,C.gold,-10,5.1,1,8));
    for(let i=0;i<8;i++){const x=-15+i*4;sphere(g,i%2?C.pink:C.light,x,4.4,6,.35,.45,.35);}
    line(g,[[-16,4.9,6],[0,4.35,6],[16,4.9,6]],C.black,.025);
    foam(g,-23,65);sign(g,'해동용궁사',-13,3.5,10,5,1.2);leaves(g,0,15,30,10,20);
    configure(g,'d7s4a',[27,17,53],[0,5,-11],'#58b4b7',{zen:0x79afbd,hor:0xd5e0c8},{sun:0xffdeb1,ambient:.8,key:1.9});
  }
  function gamcheon(g){
    floor(g,material(0x818e7c));water(g,170,80,-104);
    const colors=[0xe5ad52,0xdd8178,0x58a5ad,0x719cc2,0xdfc783,0xd5d7c0,0x7cafb2];
    for(let row=0;row<6;row++){
      const y=row*2.6,z=2-row*7.5;
      g.add(box(76,2.8,8,material(0x8e9682),0,y-2.8,z));
      for(let col=0;col<10;col++){
        const x=-33+col*7.1+(seed(row,col)-.5)*1.8;if(Math.abs(x)<4.7&&row<2)continue;
        const h=house(g,x,y,z+(seed(col,row)-.5)*3.5,5.3+seed(col,row)*.8,5.3,material(colors[(row*3+col)%colors.length]),false,(seed(row,col)-.5)*.1);
        h.scale.y=.82+seed(row+11,col)*.5;
        if(col%3===1){h.add(box(2.5,.12,.8,C.pale,0,1.25,3),box(2.5,.08,.08,C.white,0,2.1,3.35));for(let k=0;k<5;k++)h.add(box(.05,.8,.05,C.white,-1+k*.5,1.3,3.35));}
        if(col%4===2){line(h,[[-2,3.2,3.1],[0,2.9,3.1],[2,3.2,3.1]],C.black,.018);for(let k=0;k<3;k++)h.add(box(.55,.65,.03,[C.pink,C.white,C.ochre][k],-1+k,2.4,3.1));}
        if(col%3===0)sign(h,col%2?'카페':'감천',0,2.4,2.8,2.6,.6,'#f1dfac','#315365');
      }
    }
    floor(g,C.stone,70,21,0,16,.012);
    for(let i=0;i<12;i++)g.add(box(4.6,.23,1,C.stone,0,i*.23,7-i*.72));
    for(const s of [-1,1])for(let i=0;i<8;i++){
      const x=s*(5+i*3.8);g.add(cyl(.06,.06,1.25,C.black,x,0,8,6));if(i<7)g.add(box(3.8,.08,.08,C.black,x+s*1.9,1.2,8));
    }
    sign(g,'감천문화마을',-16,3,10,9,1.7,'#276875','#ffefc6');
    tree(g,-35,15,1.1,C.rust);tree(g,35,-20,1.5,C.ochre);
    configure(g,'d8s1a',[27,23,65],[0,10,-11],'#edbe62',{zen:0x76b4c9,hor:0xd7e2c1},{sun:0xffe1a8,ambient:.85,key:1.95});
  }
  function cheonggyecheon(g){
    floor(g,C.concrete,180,85,0,56);floor(g,C.concrete,180,84,0,-57);water(g,110,10,-1,true);
    floor(g,C.stone,100,13,0,13,.01);floor(g,C.stone,100,12,0,-15,.01);
    for(const z of [-7,5]){
      g.add(box(100,1.4,.7,C.stone,0,-1.4,z),box(100,.13,.9,C.pale,0,0,z));
      for(let i=0;i<28;i++)g.add(box(3.3,.08,.04,C.wood,-47+i*3.5,-.65,z+.37));
      for(let i=0;i<12;i++){const x=-44+i*8;g.add(box(.4,.12,.35,C.light,x,.1,z));}
    }
    for(let i=0;i<7;i++){const x=-9+i*1.3,z=-5+i*1.5;g.add(box(1.15,.22,.95,C.pale,x,-.1,z));}
    g.add(box(5,.4,19,C.stone,-29,2,-1));
    for(const x of [-31.5,-26.5]){
      line(g,[[x,.3,-9],[x,2.8,-5],[x,3.5,-1],[x,2.8,4],[x,.3,8]],C.black,.09);
      for(let i=0;i<9;i++)g.add(cyl(.05,.05,1.15,C.black,x,2.3,-9+i*2,5));
    }
    for(const x of [-39,-16,17,40]){tree(g,x,-19,1.05,C.ochre);lamp(g,x,16,5);}
    skyline(g,-45,true);sign(g,'청계천',-19,2.5,15,5,1.2,'#214d58','#d8e4cc');
    configure(g,'d2s7b',[24,16,53],[0,2,-7],'#58b8c2',{zen:0x071327,hor:0x263e61},{sun:0xb8cde5,ambient:1.1,key:1.2,night:1});
  }
  function banpo(g){
    water(g,270,190,-66,true);floor(g,C.grass,220,55,0,31);floor(g,C.stone,170,8,0,13,.01);
    for(let x=-48;x<=48;x+=12)g.add(box(1.3,4.2,7,C.concrete,x,0,-30));
    g.add(box(108,.8,8,C.concrete,0,4.1,-30),box(108,.5,8,C.pale,0,6.3,-30));
    for(const z of [-33.5,-26.5])g.add(box(108,.16,.08,C.white,0,7.1,z));
    const n=lowEnd?14:26;
    for(let i=0;i<n;i++){
      const x=-48+i*96/(n-1),h=3.5+seed(i)*1.5;
      const m=new T.MeshBasicMaterial({color:[0x4dd5e7,0x997bdd,0xf0a1ca,0xead981][i%4],transparent:true,opacity:.62,depthWrite:false});
      const p=line(g,[[x,6.3,-26],[x,6.5+h,-22],[x,6.3+h*.7,-16],[x,.1,-9]],m,.075);
      reg(g,(dt,t)=>{p.scale.y=.9+.1*Math.sin((reduced?0:t)*.8+i*.3);m.opacity=.5+.13*Math.sin((reduced?0:t)+i*.5);});
      const r=new T.Mesh(new T.PlaneGeometry(.5,18),new T.MeshBasicMaterial({color:m.color,transparent:true,opacity:.14,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set(x,-.12,-15);g.add(r);
    }
    skyline(g,-94,true);bench(g,-13,19);bench(g,15,19);lamp(g,-28,17);lamp(g,30,17);
    sign(g,'반포대교',-25,2.7,22,5,1.2,'#2d425a','#e6dcbc');
    configure(g,'d3s5b',[19,13,59],[0,4,-24],'#8bbacb',{zen:0x172342,hor:0x60547e},{sun:0xc6caef,ambient:1.15,key:1.1,night:.8});
  }
  function container(g,x,y,z,color,label){
    const c=new T.Group();c.position.set(x,y,z);c.add(box(13,4.2,7,material(color)),box(13.2,.15,7.2,C.black,0,4.2,0));
    const n=lowEnd?18:30;
    for(let i=0;i<n;i++)c.add(box(.09,4,.09,material(color),-6.1+i*12.2/(n-1),.1,3.55));
    c.add(box(6,2.6,.09,C.glass,0,.55,3.62),box(.1,2.6,.12,C.white,0,.55,3.69));
    for(const xx of [-6.2,6.2])for(const yy of [.2,3.8])c.add(box(.22,.22,.22,C.concrete,xx,yy,3.56));
    if(label)sign(c,label,0,3.6,3.7,5.5,.8,'#254f80','#ffebc0');g.add(c);return c;
  }
  function commonGround(g){
    floor(g,material(0xb6b3a1));floor(g,C.concrete,50,46,0,-4,.01);
    [-15,0,15].forEach((x,i)=>{container(g,x,0,-16,[0x2458a2,0x2f68ad,0x2b5d9b][i],['COMMON GROUND','커먼그라운드','쇼핑 · 카페'][i]);container(g,x,4.35,-16,0x235294,i===1?'SEOUL MADE':'');});
    container(g,-22,0,-1,0x255da5,'푸드 · 디자인');container(g,22,0,-1,0x3071b5,'커피');
    g.add(box(46,.18,2,C.black,0,4.35,-10.9));
    for(let i=0;i<24;i++)g.add(box(.06,1.1,.06,C.white,-22+i*1.92,4.5,-10));
    g.add(box(46,.07,.08,C.white,0,5.6,-10));
    for(let i=0;i<12;i++)g.add(box(3,.36,1.2,C.concrete,20,i*.36,9-i*1.3));
    line(g,[[18.4,1.1,9],[18.4,5.5,-5]],C.white,.06);line(g,[[21.6,1.1,9],[21.6,5.5,-5]],C.white,.06);
    for(let i=0;i<11;i++){
      const p=new T.Mesh(new T.PlaneGeometry(.65,.9),[C.pink,C.ochre,C.white][i%3]);p.position.set(-15+i*3,6.5+Math.abs(i-5)*.07,4);g.add(p);
    }
    line(g,[[-18,7,4],[0,6.5,4],[18,7,4]],C.black,.025);
    bench(g,-13,13);tree(g,-30,9,1.1,C.ochre);tree(g,30,-15,1.2,C.rust);
    configure(g,'d5s2a',[27,15,52],[0,4,-9],'#3673b5',{zen:0x7caabf,hor:0xe1d5ba},{sun:0xffe7bf,ambient:1.05,key:1.9});
  }
  function lotteTower(g,x,z,y=0){
    const m=material(0x6997ad,.08,.32);m.metalness=.35;
    g.add(cyl(1.6,5.5,60,m,x,y,z,18));
    for(let i=0;i<30;i++){
      const r=5.5-(i*2/60)*3.9,p=new T.Mesh(new T.TorusGeometry(r,.045,4,18),material(0xb8cbd1,.15));
      p.rotation.x=Math.PI/2;p.position.set(x,y+i*2,z);g.add(p);
    }
    g.add(cyl(.3,1.6,8,C.pale,x,y+60,z,12));
    for(const side of [-1,1])line(g,[[x+side*1.3,y+58,z],[x+side*.7,y+64,z],[x+side*.5,y+68,z]],C.white,.13);
  }
  function seokchon(g){
    floor(g,C.grass,250,70,0,43);floor(g,C.grass,250,18,0,-2);floor(g,C.grass,250,28,0,-98);
    water(g,250,130,-61);floor(g,C.stone,160,8,0,14,.01);
    lotteTower(g,7,-87);skyline(g,-105);
    for(let i=0;i<(lowEnd?12:22);i++){
      const x=-62+i*124/(lowEnd?11:21),z=-4-Math.abs(x)*.08;
      tree(g,x,z,.95+seed(i)*.3,[C.ochre,C.rust,C.orange][i%3]);
    }
    const island=new T.Group();island.position.set(-34,0,-58);island.add(box(14,.6,10,C.pale));
    for(const x of [-4,4]){island.add(cyl(1.1,1.1,6,C.pink,x,.5,0,9));const top=new T.Mesh(new T.ConeGeometry(1.6,2.5,9),C.blue);top.position.set(x,7.75,0);island.add(top);}g.add(island);
    bench(g,-14,19);bench(g,22,19);leaves(g,0,14,100,8,85);sign(g,'석촌호수',-28,3,19,5,1.2);
    configure(g,'d5s3a',[25,16,73],[0,17,-33],'#73bcc1',{zen:0x73aac3,hor:0xe0d4b7},{sun:0xffdba4,ambient:1.0,key:1.9});
  }
  function seoulSky(g){
    floor(g,material(0xb8b2a5),100,46,0,14);
    const city=new T.Group();skyline(city,-61,true);city.position.y=-12;g.add(city);
    floor(city,material(0x7e9091),250,160,0,-65,-.05);
    for(let i=0;i<28;i++){const h=7+seed(i)*17;city.add(box(4,h,5,material([0x65798d,0x94a5af,0x536b7c][i%3]),-67+seed(i,2)*135,0,-35-seed(i,3)*60));}
    const river=water(g,240,35,-47);river.position.y=-11.95;
    const glass=new T.MeshPhysicalMaterial({color:0x91c6d3,roughness:.15,metalness:.1,transparent:true,opacity:.13,depthWrite:false});
    for(let i=0;i<9;i++){
      const x=-40+i*10;g.add(box(.15,24,.18,C.black,x,0,-9));
      if(i<8){const p=box(9.8,23,.06,glass,x+5,.1,-9);p.castShadow=false;p.userData.noShadow=true;g.add(p);}
    }
    for(const yy of [.3,10,23.8])g.add(box(80,.14,.15,C.black,0,yy,-9));
    for(const xx of [-41,41])g.add(box(.3,24,42,C.black,xx,0,11));
    g.add(box(80,.2,45,material(0xc7c5b5),0,24,10));
    const floorGlass=new T.MeshPhysicalMaterial({color:0x61a9bd,transparent:true,opacity:.5,roughness:.2});
    g.add(box(8,.045,6,floorGlass,11,.025,14));
    for(const x of [6.8,15.2])g.add(box(.14,.08,6.4,C.black,x,.01,14));
    bench(g,-24,13);sign(g,'SEOUL SKY · 서울스카이',-26,5,5,12,1.7,'#263f55','#eadbbb');
    configure(g,'d5s4a',[16,13,38],[0,-5,-30],'#89b9ca',{zen:0x7398c3,hor:0xefba91},{sun:0xffd5a1,ambient:1.25,key:1.55});
    g.userData.visual.indoors=true;
  }
  function fish(g,x,y,z,color=0xacc7c5){
    const f=new T.Group();sphere(f,material(color,.06,.35),0,0,0,.43,.11,.13);sphere(f,C.black,.26,.055,.08,.025);
    const tail=new T.Mesh(new T.ConeGeometry(.19,.35,3),material(color));tail.rotation.z=-Math.PI/2;tail.position.set(-.47,0,0);f.add(tail);f.position.set(x,y,z);f.rotation.y=seed(x,z)*.8;g.add(f);
  }
  function jagalchi(g){
    floor(g,C.concrete);water(g,230,125,-85);
    g.add(box(44,8,18,material(0x849da4),0,0,-18),box(41,5,.08,C.glass,0,1.5,-8.94));
    const p=[],idx=[],nx=30,nz=5;
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
      const u=i/nx*2-1,v=j/nz*2-1;p.push(u*25,9+4*Math.pow(Math.abs(u),1.7)+.7*Math.cos(v*Math.PI/2),-18+v*12);
      if(i<nx&&j<nz){const a=j*(nx+1)+i;idx.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1);}
    }
    const roofG=new T.BufferGeometry();roofG.setAttribute('position',new T.Float32BufferAttribute(p,3));roofG.setIndex(idx);roofG.computeVertexNormals();
    const rm=material(0xe1e3d7,.08,.4);rm.side=T.DoubleSide;g.add(new T.Mesh(roofG,rm));
    for(let i=0;i<11;i++)g.add(box(.15,6,.1,C.white,-20+i*4,1,-8.84));
    sign(g,'자갈치시장',0,7.8,-8.65,14,1.8,'#2e5963','#fff0c6');
    for(let i=0;i<6;i++){
      const x=-19+i*7.6;g.add(box(5.8,1.1,3,C.blue,x,0,3),box(5.6,.2,2.9,C.white,x,1.1,3));
      for(let k=0;k<3;k++){g.add(box(1.65,.1,2.2,material(0x5bafba),x-1.8+k*1.8,1.3,3));for(let j=0;j<3;j++)fish(g,x-1.8+k*1.8,1.52,2.3+j*.65);}
      g.add(box(.07,3,.07,C.black,x-2.7,0,4.4),box(.07,3,.07,C.black,x+2.7,0,4.4));sign(g,i%2?'생선구이':'싱싱한 생선',x,3,4.5,5.4,.9,'#166b78','#fff0c6');
    }
    for(const x of [-29,29]){lamp(g,x,11,6);tree(g,x,-12,1,C.pine);}
    configure(g,'d8s2a',[25,15,56],[0,4,-9],'#4098a6',{zen:0x76aeba,hor:0xe1dcc0},{sun:0xffe5b6,ambient:1.1,key:1.85});
  }
  function huinnyeoul(g){
    const sea=water(g,300,280,-20);sea.position.y=-12.5;
    g.add(box(106,12,22,material(0x8f9282),0,-12,-3));floor(g,C.pale,108,7,0,12,.02);
    for(let i=0;i<9;i++){
      const x=-42+i*10.5,h=house(g,x,0,-3+(seed(i)*2),8,8,C.white,false,(seed(i,2)-.5)*.08);h.scale.y=.8+seed(i,3)*.6;
      h.add(box(2,2.5,.12,[C.blue,C.ochre,C.teal][i%3],0,.2,4.1));
      if(i%2===0)sign(h,'흰여울',0,3.1,4.18,4,.8,'#e7e7d6','#2c7d91');
      if(i%3===1){sphere(h,C.blue,-2,1.8,4.05,.75,.75,.03);sphere(h,C.ochre,2,1.4,4.05,.6,.9,.03);}
    }
    for(let i=0;i<28;i++){const x=-52+i*3.85;g.add(cyl(.065,.065,1.15,C.white,x,0,15.2,6));}
    g.add(box(106,.08,.08,C.white,0,1.15,15.2));
    for(let i=0;i<17;i++)g.add(box(3.8,.6,1.1,C.pale,31,-i*.6,16+i*.65));
    for(let i=0;i<14;i++)sphere(g,C.stone,-49+i*7.6,-7+seed(i)*3,8,3,4,2,geo.rock);
    bench(g,-21,13);sign(g,'흰여울문화마을',-34,3,12,9,1.4,'#287b8c','#fff4d2');tree(g,-49,0,1.1,C.pine);
    configure(g,'d8s3a',[28,14,51],[0,1,-4],'#52b9c2',{zen:0x62a8c2,hor:0xc6e0d5},{sun:0xffe9c2,ambient:1.1,key:1.8});
  }
  function naksan(g){
    floor(g,material(0x827e5e));floor(g,C.stone,110,7,0,12,.01);
    const count=lowEnd?23:35,w=98/count;
    for(let i=0;i<count;i++){
      const x=-49+i*w,z=-5+Math.sin(x*.035)*3;
      for(let row=0;row<5;row++)g.add(box(w-.04,.65,.8,material([0xb1a993,0xc5bca5,0x9d9e91][(i+row)%3]),x+(row%2?w*.18:0),row*.67,z));
      g.add(box(w+.05,.2,1,C.pale,x,3.37,z),box(w*.62,.75,1,C.stone,x,3.55,z));
    }
    skyline(g,-69,true);for(let i=0;i<7;i++)tree(g,(i%2?1:-1)*(25+seed(i)*25),5+seed(i,3)*19,.85,[C.ochre,C.rust][i%2]);
    for(const x of [-37,-16,18,38])lamp(g,x,8,3.6);bench(g,25,15);sign(g,'낙산공원',-25,2.8,15,5,1.1);
    configure(g,'d9s4a',[27,12,50],[0,4,-11],'#db9f60',{zen:0x667bb0,hor:0xefaa78},{sun:0xffcb86,ambient:.95,key:1.8});
  }
  function ddp(g){
    floor(g,material(0x45505d));floor(g,material(0x7d858b),120,90,0,-5,.01);
    const metal=material(0xb3bcc1,.07,.38);metal.metalness=.5;
    sphere(g,metal,0,5,-14,25,7,15,new T.SphereGeometry(1,40,22));sphere(g,metal,-22,3,-4,13,4,9);sphere(g,metal,20,4,-23,14,7,12);
    const seam=material(0x657787,.08,.6);
    for(let i=1;i<15;i++){
      const th=i/15*Math.PI,s=Math.sin(th),ring=new T.Mesh(new T.TorusGeometry(25*s,.025,4,64),seam);ring.rotation.x=Math.PI/2;ring.scale.y=15/25;ring.position.set(0,5+7*Math.cos(th),-14);g.add(ring);
    }
    for(let i=0;i<(lowEnd?10:20);i++){
      const a=i*Math.PI*2/(lowEnd?10:20),points=[];for(let k=0;k<20;k++){const th=k/19*Math.PI;points.push([25.02*Math.sin(th)*Math.cos(a),5+7.025*Math.cos(th),-14+15.025*Math.sin(th)*Math.sin(a)]);}line(g,points,seam,.024);
    }
    line(g,[[-38,.2,4],[-19,.2,9],[0,.2,7],[23,.2,1],[39,.2,-10]],material(0x87cce4,.9),.09);
    for(let i=0;i<22;i++){const x=-40+i*3.8;g.add(box(.3,.4,.3,C.light,x,0,20+Math.sin(i*.3)*2));}
    sign(g,'DDP · 동대문디자인플라자',-25,3.2,19,12,1.6,'#29384d','#e9e7c9');
    skyline(g,-65,true);bench(g,24,19);tree(g,-41,-9,1.2,C.rust);
    configure(g,'d9s6b',[28,12,58],[0,4,-10],'#a0c6d5',{zen:0x0b1431,hor:0x2b4266},{sun:0xc6d4f2,ambient:1.2,key:1.4,night:1});
  }
  function secretGarden(g){
    floor(g,C.grass);floor(g,C.stone,43,13,0,13,.01);
    const pond=water(g,30,20,-9);pond.position.y=.025;pond.material.uniforms.deep.value.setHex(0x305c52);pond.material.uniforms.light.value.setHex(0x78a295);
    for(const z of [-19,1])g.add(box(31,.3,.5,C.stone,0,-.1,z));for(const x of [-15.5,15.5])g.add(box(.5,.3,20,C.stone,x,-.1,-9));
    const pav=new T.Group();pav.position.set(-18,0,-11);pav.add(box(10,.6,8,C.stone));
    for(const x of [-4,4])for(const z of [-3,3])pav.add(cyl(.16,.2,3.6,C.red,x,.6,z,8));
    pav.add(box(9.5,.25,7.5,C.teal,0,4.1,0));roof(pav,12,10,2.3,0,4.35,0);sign(pav,'부용정',0,3.8,3.3,3,.8);g.add(pav);
    g.add(box(32,5,15,material(0x738561),0,0,-39));hall(g,0,-39,20,10,5.8,4.1,false,'宙合樓');
    for(let i=0;i<15;i++)g.add(box(4,.35,.8,C.stone,0,i*.35,-22-i*.85));
    const n=lowEnd?14:25;for(let i=0;i<n;i++){const x=(i%2?1:-1)*(23+seed(i)*13),z=9-seed(i,2)*63;tree(g,x,z,1+seed(i,3)*.7,[C.rust,C.ochre,C.orange,C.pine][i%4]);}
    bench(g,22,14);leaves(g,0,13,45,12,90);sign(g,'창덕궁 후원',-25,3.3,16,6,1.2);
    configure(g,'d10s1a',[27,17,60],[0,6,-15],'#d6a349',{zen:0x7fadb7,hor:0xe1d9b9},{sun:0xffdda5,ambient:1,key:1.85});
  }
  // Batch three: twenty more itinerary options, using the same scene primitives.
  function rail(g,x1,x2,z,y=0,m=C.wood){
    for(let x=x1;x<=x2;x+=2.5)g.add(cyl(.055,.07,1.15,m,x,y,z,6));
    g.add(box(x2-x1,.07,.07,m,(x1+x2)/2,y+1.1,z));
  }
  function lanterns(g,x1,x2,z,y=8,rows=4){
    for(let j=0;j<rows;j++){
      const zz=z-j*3;line(g,[[x1,y,zz],[0,y-.65,zz],[x2,y,zz]],C.black,.025);
      for(let i=0;i<13;i++){const x=x1+(x2-x1)*(i+.5)/13,h=y-.7*(1-(x/(x2-x1)*2)**2);
        sphere(g,[C.pink,C.ochre,C.teal,material(0xa39ad2,.25)][(i+j)%4],x,h-.45,zz,.38,.48,.38);
        g.add(cyl(.11,.11,.09,C.light,x,h-.05,zz,8));
      }
    }
  }
  function gondola(g,x,y,z,color=C.red){
    const c=new T.Group();c.position.set(x,y,z);c.add(box(4.4,1.15,3.1,color,0,0,0),box(4.2,1.5,3,C.glass,0,1.15,0),box(4.6,.22,3.3,color,0,2.65,0));
    for(const xx of [-1.8,0,1.8])c.add(box(.1,1.5,.1,C.white,xx,1.15,1.56));
    c.add(box(.1,2.4,.1,C.black,0,2.85,0));g.add(c);return c;
  }
  function namsanCar(g){
    floor(g,C.grass);mountains(g,-58);skyline(g,-80);
    for(let i=0;i<(lowEnd?14:23);i++)tree(g,-42+seed(i)*84,-20+seed(i,2)*32,.8+seed(i,3),[C.ochre,C.rust,C.orange,C.pine][i%4]);
    const platform=new T.Group();platform.add(box(13,.7,10,C.stone,0,0,0),box(13,5,7,C.pale,0,.7,-4),box(11,3,.1,C.glass,0,1.5,-.4),box(16,.3,10,C.road,0,5.7,-2));platform.position.set(-16,0,-2);g.add(platform);
    sign(g,'남산케이블카',-16,5,-.3,9,1.2,'#8b3f30','#fff0ca');
    for(const z of [-7,-4])line(g,[[-25,8,z],[0,13,z-13],[33,24,z-35]],C.black,.07);
    const car=gondola(g,-2,9,-13,C.red);reg(g,(dt,t)=>{const a=reduced?0:Math.sin(t*.16)*.17;car.position.set(-2+a*25,9+a*7,-13-a*20);});
    for(const x of [-27,25])bench(g,x,15);leaves(g,0,13,55,17);
    configure(g,'d1s2a',[28,17,53],[0,9,-10],'#b64c34',{zen:0x80b6c6,hor:0xedcca0},{sun:0xffd5a0,ambient:1,key:1.8});
  }
  function gwanghwamun(g){
    floor(g,C.stone);floor(g,C.pale,22,100,0,-26,.01);mountains(g,-98);
    hall(g,0,-57,28,12,2,5,true,'光化門');g.add(box(90,5,5,C.pale,0,0,-63));
    for(const x of [-38,38])for(let i=0;i<5;i++){const h=13+seed(i,x)*20;g.add(box(9,h,9,material(0x8196a3),x,0,-18-i*14));tree(g,x*.65,13-i*11,1.1,C.ochre);}
    // Seated royal silhouette on a bronze pedestal, with open plaza in front.
    const bronze=material(0xc6a15e,.08,.6);g.add(box(6,1.8,6,C.stone,0,0,-15),box(3.2,3.3,2.7,bronze,0,1.8,-15));
    sphere(g,bronze,0,5.9,-15,.8,1,.75);g.add(box(1.8,.3,1.5,bronze,0,6.65,-15),box(3.2,.4,2,bronze,0,3,-13.5));
    sign(g,'세종대왕',0,1.1,-11.95,4,1);sign(g,'광화문광장',-19,3.1,12,7,1.3);bench(g,20,12);leaves(g,0,12,64,30);
    configure(g,'d2s1b',[24,15,60],[0,5,-20],'#ceab5a',{zen:0x7cacbc,hor:0xe5dfbf},{sun:0xffe3b7,ambient:1,key:1.8});
  }
  function ssamziegil(g){
    floor(g,material(0xb1a083));const brick=brickMaterial();
    for(const x of [-18,18])g.add(box(9,15,32,brick,x,0,-10));g.add(box(45,15,6,brick,0,0,-29));
    for(let level=0;level<3;level++){
      const y=level*4.7;
      for(const x of [-13,13]){g.add(box(3.3,.2,29,C.pale,x,y+4.2,-10));for(let j=0;j<6;j++){const z=3-j*4.7;g.add(box(.12,1.8,2.6,C.glass,x+(x<0?-1.5:1.5),y+1.1,z));sign(g,['공방','찻집','도자기'][j%3],x,y+3.2,z,2.9,.8,'#435e52','#f7df99',x<0?Math.PI/2:-Math.PI/2);}}
      rail(g,-11,11,-25,y+4.2,C.black);
      g.add(box(26,.2,3,C.pale,0,y+4.2,-25));
      const ramp=box(3,.18,27,C.wood,11,y+.3,-10);ramp.rotation.x=-.15;g.add(ramp);
      for(let j=0;j<12;j++)g.add(cyl(.045,.045,1.1,C.black,-11,y+4.4,3-j*2.4,6));g.add(box(.08,.08,27,C.black,-11,y+5.5,-10));
    }
    sign(g,'쌈지길',0,14,-25.8,9,2.3,'#71844c','#fff0c8');
    for(const x of [-7,7]){tree(g,x,-13,.7,C.ochre);bench(g,x,-3);g.add(cyl(1,1.2,.9,C.brick,x,0,-13));}
    lanterns(g,-12,12,2,12,2);sign(g,'인사동 · 차와 공예',-10,2.8,12,8,1.3);
    configure(g,'d2s5a',[21,15,51],[0,7,-12],'#c79757',{zen:0x8ab3ba,hor:0xe3d8af},{sun:0xffdfab,ambient:1.15,key:1.7});
  }
  function jogyesa(g){
    floor(g,C.pale);hall(g,0,-23,28,13,.8,6,false,'大雄殿');
    for(let i=0;i<3;i++){const x=-6+i*6;sphere(g,C.gold,x,3.1,-16.35,1,1.5,.55);sphere(g,C.gold,x,5.05,-16.35,.65,.65,.55);}
    lanterns(g,-24,24,3,10,6);tree(g,-28,-10,2.1,C.pine);tree(g,29,-15,1.8,C.ochre);
    for(let i=0;i<5;i++){const w=4-i*.55;g.add(box(w,.6,w,C.stone,17,.8+i*1.05,0),box(w+.4,.15,w+.4,C.pale,17,1.4+i*1.05,0));}
    sign(g,'조계사',-18,3.3,12,6,1.4);bench(g,22,16);leaves(g,0,14,50,12,60);
    configure(g,'d2s5b',[25,16,55],[0,7,-8],'#eab864',{zen:0x84afb7,hor:0xeadbb1},{sun:0xffdfac,ambient:1.1,key:1.65});
  }
  function gyeonghuigung(g){
    floor(g,C.grass);floor(g,C.stone,56,38,0,1,.02);
    hall(g,0,-21,23,12,1.1,5.4,false,'崇政殿');
    for(let i=0;i<6;i++)g.add(box(10,.18,1,C.stone,0,i*.18,-7-i));
    for(const x of [-28,28]){
      g.add(box(2,3,45,C.pale,x,0,-10));roof(g,3,46,.6,x,3,-10);
      for(let i=0;i<4;i++)tree(g,x*1.35,-8-i*13,1.1,[C.ochre,C.rust][i%2]);
    }
    hall(g,-25,-46,10,6,.6,3.5,false,'興化門');
    mountains(g,-95);bench(g,23,15);sign(g,'경희궁 · 숭정전',-21,3,13,9,1.2);
    leaves(g,0,13,52,25,80);
    configure(g,'d3s3a',[27,15,56],[0,6,-15],'#db9c43',{zen:0x89b4bd,hor:0xefdab0},{sun:0xffd5a0,ambient:1,key:1.8});
  }
  function seonyudo(g){
    const sea=water(g,240,220,-30);floor(g,C.grass,105,75,0,0,.01);
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){
      const x=-26+col*23,z=-8-row*24;floor(g,material(0x638e70),18,17,x,z,.025);
      for(const xx of [x-9,x+9])g.add(box(.6,2.3,18,C.concrete,xx,0,z));for(const zz of [z-9,z+9])g.add(box(18,.8,.6,C.concrete,x,0,zz));
      for(let k=0;k<3;k++){g.add(box(.6,5,.6,C.concrete,x-6+k*6,0,z-7));sphere(g,C.pine,x-6+k*6,4.3,z-6.7,.8,1.4,.25,geo.leaf);}
      for(let k=0;k<2;k++)tree(g,x-4+k*8,z,.6,[C.pine,C.rust][k]);
    }
    line(g,[[-47,1,-39],[-24,9,-46],[0,11,-49],[24,9,-46],[47,1,-39]],C.red,.35);
    floor(g,C.pale,95,8,0,13,.04);bench(g,24,14);sign(g,'선유도공원',-31,3.3,14,7,1.4);floor(g,C.grass,190,30,0,-103,.01);skyline(g,-95);
    configure(g,'d3s4b',[29,21,57],[0,4,-14],'#89a561',{zen:0x8dbcc2,hor:0xe1e0bb},{sun:0xffe6b2,ambient:1,key:1.8});
  }
  function onion(g){
    floor(g,C.concrete);const brick=brickMaterial();g.add(box(42,8,2,brick,0,0,-25),box(3,8,29,brick,-21,0,-11),box(3,8,29,C.concrete,21,0,-11));
    for(let i=0;i<7;i++){const x=-17+i*5.7;g.add(box(4.6,4.7,.1,C.glass,x,1,-23.95),box(4.9,.18,6,C.black,x,7,-22));g.add(box(.09,4.7,.13,C.black,x,1,-23.87));}
    sign(g,'onion',0,6.8,-23.8,11,2,'#b4aaa0','#2d3031');sign(g,'성수 · 커피와 빵',-13,2.7,13,7,1.1,'#534437','#eadbbe');
    for(const x of [-10,9]){g.add(box(9,1,3,C.wood,x,0,-9));bench(g,x,-5);bench(g,x,-13,Math.PI);}
    for(let i=0;i<6;i++){const x=-13+i*1.25;sphere(g,C.ochre,x,1.65,-9,.45,.6,.45,geo.rock);sphere(g,C.white,x,2.05,-9,.33,.08,.3);}
    tree(g,14,-15,1.5,C.ochre);tree(g,-26,-6,1.2,C.rust);g.add(box(9,.1,6,C.pale,13,0,-15));leaves(g,0,9,42,20,65);
    configure(g,'d4s2b',[23,13,48],[0,4,-10],'#b98049',{zen:0x89b4be,hor:0xe6caa9},{sun:0xffd2a1,ambient:1,key:1.9});
  }
  function loneTree(g){
    floor(g,material(0x84a25c));const mound=sphere(g,material(0x87a75e),0,-4,-18,34,8,28);tree(g,0,-18,2.4,C.ochre,3.6);
    for(let i=0;i<8;i++)tree(g,-57+i*16,-57,.8,[C.pine,C.rust,C.orange][i%3]);
    line(g,[[-54,.03,20],[-26,.03,14],[0,.03,18],[29,.03,10],[51,.03,-9]],C.sand,1.8);bench(g,26,11);sign(g,'나홀로나무',-24,2.7,15,6,1.2);skyline(g,-105);
    configure(g,'d5s3b',[25,15,56],[0,7,-13],'#c8ac45',{zen:0x82b5d0,hor:0xe2e6c7},{sun:0xffe5ad,ambient:1.1,key:1.75});
  }
  function ktx(g){
    floor(g,C.road);floor(g,C.pale,130,16,0,12,.01);g.add(box(130,.03,.7,C.ochre,0,.03,4.2));
    for(const z of [-3,-8]){g.add(box(150,.09,.1,C.tile,0,0,z));for(let i=0;i<43;i++)g.add(box(1.8,.09,6,C.wood,-73+i*3.5,-.07,-5.5));}
    const train=new T.Group();
    for(let i=0;i<4;i++){const x=-45+i*25;train.add(box(24,3.8,4.5,C.white,x,.6,-5.5),box(24,.32,4.6,C.blue,x,1.6,-5.5));for(let j=0;j<8;j++)train.add(box(1.6,1,.08,C.glass,x-9+j*2.6,2.6,-3.19));train.add(box(.12,3,.1,C.blue,x+10,1,-3.17));}
    const nose=sphere(train,C.white,49,2,-5.5,8,2.1,2.3);sign(train,'KTX',44,1.6,-3.14,5,1.1,'#e8ede4','#296da1');g.add(train);
    for(const x of [-43,-22,19,42])g.add(box(.5,12,.5,C.tile,x,0,0));g.add(box(120,.5,25,C.concrete,0,12,-4));
    sign(g,'서울 → 부산',-10,9.2,1,13,1.8,'#17384a','#f8ddb1');sign(g,'KTX · 고속열차',-30,3.4,15,9,1.2,'#296da1','#ffffff');bench(g,25,14);
    configure(g,'d6s2a',[9,12,75],[0,4,-3],'#4e91c4',{zen:0x8db5c7,hor:0xdae4d7},{sun:0xffe8bf,ambient:1.15,key:1.6});
  }
  function igidae(g){
    const sea=water(g,300,250,-32);sea.position.y=-5;
    floor(g,C.grass,63,95,-44,-17,0);for(let i=0;i<16;i++)sphere(g,C.stone,-17+Math.sin(i*.4)*5,-3,-48+i*5,5,5,4,geo.rock);
    floor(g,C.wood,13,64,-4,-13,.02);floor(g,C.wood,64,10,20,14,.03);rail(g,-11,49,19);for(const x of [-4,12,29,46])g.add(box(.45,5,.45,C.wood,x,-5,14));g.add(box(63,5,95,C.stone,-44,-5,-17));
    for(let i=0;i<20;i++)g.add(box(13,.015,.08,C.black,-4,.045,17-i*3.1));
    for(let i=0;i<10;i++)tree(g,-30-seed(i)*16,-41+seed(i,2)*60,1.1,C.pine);g.add(box(180,5,22,C.stone,0,-5,-122));floor(g,C.grass,180,22,0,-122,.01);skyline(g,-113);
    line(g,[[5,1,-87],[23,3,-87],[46,3,-87],[64,1,-87]],C.white,.22);for(const x of [22,46])g.add(box(.6,12,.6,C.white,x,0,-87));
    bench(g,29,13);sign(g,'이기대 해안산책로',-21,3.2,14,10,1.4);
    configure(g,'d6s5b',[30,17,58],[0,3,-17],'#4caaad',{zen:0x7aafc7,hor:0xd7e4d3},{sun:0xffe3b1,ambient:1.1,key:1.8});
  }
  function daritdol(g){
    const sea=water(g,280,260,-45);sea.position.y=-8;floor(g,C.stone,80,15,0,13,0);g.add(box(80,8,15,C.stone,0,-8,13),box(26,8,100,C.stone,-45,-8,-27));floor(g,C.grass,26,100,-45,-27,.02);for(let i=0;i<11;i++)sphere(g,C.stone,-29,-3,-62+i*8,4,5,4,geo.rock);
    const glass=material(0x6ac0cc,.15,.22);g.add(box(10,.55,53,C.blue,0,-.5,-16));floor(g,glass,7.5,53,0,-16,.07);
    for(let i=0;i<19;i++){const z=10-i*3;for(const x of [-5,5])g.add(cyl(.06,.06,1.4,C.white,x,0,z,6));g.add(box(10,.025,.07,C.white,0,.09,z));}
    for(const x of [-5,5])g.add(box(.08,.08,53,C.white,x,1.4,-16));
    sphere(g,C.blue,0,0,-42,7,.5,5);for(const x of [-3.4,3.4])g.add(box(.65,12,.65,C.concrete,x,-12,-32));
    for(let i=0;i<4;i++)house(g,-44,0,-6-i*18,8,6,[C.pale,C.white,C.pink][i%3],false,Math.PI/2);
    sign(g,'청사포 다릿돌전망대',-20,3,14,10,1.4,'#226c85','#fff0d3');bench(g,25,14);
    configure(g,'d7s2a',[27,23,54],[0,0,-20],'#62bacb',{zen:0x66aecb,hor:0xd3e9df},{sun:0xffe6bf,ambient:1.15,key:1.8});
  }
  function lighthouse(g,x,z,m){
    g.add(cyl(1.25,1.9,9,m,x,0,z,20),cyl(2,1.7,.4,m,x,8.7,z,20),cyl(1.1,1.1,1.6,C.glass,x,9.1,z,12),cyl(0,1.6,1,m,x,10.7,z,12));
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.add(cyl(.03,.03,1,C.white,x+1.8*Math.cos(a),9.1,z+1.8*Math.sin(a),4));}sign(g,'청사포',x,2,z+1.8,2.5,.65,'#2a535d','#fff0c7');
  }
  function cheongsapo(g){
    water(g,280,240,-38);floor(g,C.concrete,112,25,0,10,.01);
    for(const x of [-28,28])g.add(box(8,.7,47,C.stone,x,-.5,-24));lighthouse(g,-28,-38,C.red);lighthouse(g,28,-38,C.white);
    for(let i=0;i<5;i++){house(g,-44+i*10,0,-9,7,7,[C.white,C.pale,C.blue][i%3]);}
    for(let i=0;i<5;i++){const b=new T.Group();sphere(b,[C.blue,C.pink,C.white][i%3],0,0,0,1.4,.5,3);b.add(box(1.7,1.3,2,C.white,0,0,-.5),cyl(.04,.04,4,C.black,0,0,0,5));b.position.set(-17+i*8,.3,-18-(i%2)*9);g.add(b);reg(g,(dt,t)=>b.position.y=.3+(reduced?0:Math.sin(t*.8+i)*.1));}
    for(let i=0;i<4;i++)g.add(box(5,.04,1.7,C.pine,20,0,4+i*3));sign(g,'청사포 쌍둥이등대',-12,3.5,15,10,1.4);bench(g,33,14);
    configure(g,'d7s2b',[29,17,61],[0,5,-20],'#d75845',{zen:0x70b6cc,hor:0xe2e4c7},{sun:0xffe3ad,ambient:1.15,key:1.85});
  }
  function dongbaek(g){
    const sea=water(g,300,260,-40);sea.position.y=-5;floor(g,C.grass,90,58,0,-11,.01);g.add(box(90,5,58,C.stone,0,-5,-11));floor(g,C.wood,110,9,0,15,.02);rail(g,-53,53,19);
    const pavilion=new T.Group();pavilion.add(cyl(13,13,6,C.glass,0,0,0,32));
    const dome=sphere(pavilion,material(0xc9b6a4,.05,.5),0,5.8,0,15,3.5,15);pavilion.add(cyl(15,15,.2,C.pale,0,5.7,0,32));pavilion.position.set(11,0,-22);g.add(pavilion);
    for(let i=0;i<15;i++){const a=i/15*Math.PI*2;pavilion.add(cyl(.12,.12,5.8,C.white,13*Math.cos(a),0,13*Math.sin(a),6));}
    for(let i=0;i<14;i++)tree(g,-38+seed(i)*70,-29+seed(i,2)*36,.85+seed(i,3)*.6,C.pine);g.add(box(180,5,22,C.stone,0,-5,-120));floor(g,C.grass,180,22,0,-120,.01);skyline(g,-110);bench(g,-21,14);sign(g,'동백섬 · 누리마루',-34,3,16,10,1.4);
    configure(g,'d7s5b',[29,17,59],[0,5,-13],'#658e67',{zen:0x76b2c2,hor:0xdce4c0},{sun:0xffdbab,ambient:1.1,key:1.8});
  }
  function bay101(g){
    water(g,280,240,-50,true);floor(g,C.wood,160,26,0,15,.01);floor(g,C.concrete,150,28,0,-79,.01);
    for(let i=0;i<11;i++){
      const x=-53+i*10,h=24+seed(i)*35,m=material([0x253852,0x344766,0x2b4261][i%3]);g.add(box(7,h,8,m,x,0,-69));
      for(let row=0;row<16;row++)for(let c=0;c<3;c++)if(seed(i+c,row)>.3)g.add(box(.6,.45,.08,C.light,x-2+c*2,2+row*(h-3)/16,-64.92));
      const reflection=floor(g,material(0xdfbd79,.7),1.2,19+seed(i)*17,x,-43,.03);reflection.material.transparent=true;reflection.material.opacity=.45;
    }
    for(const x of [-26,25]){const yacht=new T.Group();sphere(yacht,C.white,0,0,0,5,1,2);yacht.add(box(4,1.5,3,C.glass,0,.5,0),box(6,.18,3.4,C.white,0,2,0));yacht.position.set(x,.6,-6);g.add(yacht);}
    rail(g,-58,58,4,0,C.white);for(const x of [-42,-18,18,42]){lamp(g,x,19,4);bench(g,x,14);}sign(g,'더베이101',-26,3.4,14,8,1.5,'#172944','#f5cc87');
    configure(g,'d7s7a',[30,17,61],[0,14,-31],'#eac082',{zen:0x07132c,hor:0x28466c},{sun:0xa6c9ed,ambient:1.1,key:1.3,night:1});
  }
  function cinema(g){
    floor(g,material(0x384b63));const wing=new T.Group();wing.position.set(0,18,-14);wing.rotation.z=-.03;
    wing.add(box(76,1.2,39,material(0xb7bcc7),0,0,0));
    const count=lowEnd?13:22,panels=[];
    for(let i=0;i<count;i++)for(let j=0;j<7;j++){
      const m=new T.MeshStandardMaterial({color:0x62b7dd,emissive:0x62b7dd,emissiveIntensity:.8});const p=box(76/count-.2,.08,4.7,m,-36+(i+.5)*72/count,-.1,-17+j*5.5);wing.add(p);panels.push([m,i,j]);
    }
    g.add(wing);g.add(cyl(5,9,18,C.white,22,0,-19,24),box(25,13,16,material(0x63758a),-23,0,-32));
    for(let i=0;i<8;i++)g.add(box(45,.36,1.5,C.stone,0,i*.36,-11-i*1.7));
    sign(g,'영화의전당',-23,11,-23.9,17,2,'#142a47','#e2e9dd');sign(g,'BUSAN · CINEMA',-28,3,15,12,1.4,'#142a47','#ffd8ad');skyline(g,-87,true);
    reg(g,(dt,t)=>panels.forEach(([m,i,j])=>{m.color.setHSL((.52+i*.02+j*.025+(reduced?0:t*.015))%1,.6,.5);m.emissive.copy(m.color);}));
    configure(g,'d7s7c',[34,10,60],[0,11,-11],'#99a0dd',{zen:0x111b37,hor:0x36456e},{sun:0xcbd9ee,ambient:1.05,key:1.4,night:1});
  }
  function bookAlley(g){
    floor(g,C.stone);const brick=brickMaterial();
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const z=-i*8;g.add(box(8,8,7.9,i%2?C.pale:brick,side*13,0,z));g.add(box(7.8,.2,8.3,C.blue,side*13,7.8,z));
      const shelves=new T.Group();shelves.position.set(side*8.95,0,z);shelves.rotation.y=side<0?Math.PI/2:-Math.PI/2;
      const books=[C.teal,C.rust,C.ochre,C.pale,C.blue].map(m=>{const mesh=new T.InstancedMesh(geo.book,m,12);mesh.count=0;shelves.add(mesh);return mesh;});
      const matrix=new T.Matrix4(),rotation=new T.Quaternion();
      for(let r=0;r<5;r++){
        shelves.add(box(6,.12,1.6,C.wood,0,.5+r*.9,0));
        for(let b=0;b<12;b++){
          const h=.5+seed(b,r)*.25,mesh=books[(b+r+i)%5];
          matrix.compose(new T.Vector3(-2.65+b*.47,.63+r*.9+h/2,0),rotation,new T.Vector3(.3,h,1.2));
          mesh.setMatrixAt(mesh.count++,matrix);
        }
      }
      books.forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();});
      g.add(shelves);
      sign(g,['헌책방','보수서점','책과 사람'][i%3],side*8.85,6,z,6,1.4,'#e8d8b6','#654a35',side<0?Math.PI/2:-Math.PI/2);
    }
    sign(g,'보수동 책방골목',0,7,-40,14,1.8,'#345e64','#f7e2b6');tree(g,-23,9,1.1,C.ochre);bench(g,20,12);leaves(g,0,10,30,20,65);
    configure(g,'d8s1b',[5,11,43],[0,4,-13],'#be9b5b',{zen:0x83b2bd,hor:0xe2d7b9},{sun:0xffdfae,ambient:1.2,key:1.6});
  }
  function songdo(g){
    const sea=water(g,320,260,-55);floor(g,C.sand,145,24,0,12,.02);foam(g,-1,135);
    for(let i=0;i<11;i++)sphere(g,C.stone,38+i*4,1,-35-i*3,5,4+seed(i)*5,6,geo.rock);
    for(const z of [-6,-10])line(g,[[-58,20,z+1],[0,16,z-15],[65,28,z-52]],C.black,.07);
    for(const x of [-45,46])g.add(cyl(.55,.85,23,C.white,x,0,x<0?-5:-48,12),box(10,.6,6,C.white,x,23,x<0?-5:-48));
    for(let i=0;i<4;i++){const c=gondola(g,-29+i*19,13+i*.9,-10-i*9,[C.red,C.blue,C.ochre,C.teal][i]);reg(g,(dt,t)=>c.rotation.z=reduced?0:Math.sin(t*.7+i)*.015);}
    line(g,[[-40,.3,7],[-22,.3,-4],[0,.3,-7],[20,.3,-4],[31,.3,4]],C.white,.5);
    bench(g,30,14);tree(g,-45,15,1.2,C.pine);sign(g,'송도해상케이블카',-24,3.5,15,11,1.5,'#25738c','#fff1c7');
    configure(g,'d8s3b',[32,20,62],[0,9,-16],'#54b8c8',{zen:0x65b0c9,hor:0xe3e6cb},{sun:0xffdfa9,ambient:1.1,key:1.85});
  }
  function spaLand(g){
    floor(g,material(0xdbcdb3),100,90);g.add(box(80,10,.8,material(0xc7b89c),0,0,-32));
    const pool=water(g,27,16,-17);pool.position.y=.08;pool.material.uniforms.deep.value.setHex(0x4d9994);pool.material.uniforms.light.value.setHex(0xb4d5bd);
    for(const x of [-14,14])g.add(box(1,.35,18,C.pale,x,0,-17));for(const z of [-26,-8])g.add(box(29,.35,1,C.pale,0,0,z));
    for(const x of [-25,25]){g.add(box(12,7.5,18,C.wood,x,0,-18),box(8,5,.1,C.glass,x,.6,-8.92));sign(g,x<0?'황토방':'휴식',x,6.4,-8.8,6,1.1,'#765744','#f7dfac');for(let i=0;i<9;i++)g.add(box(.12,7.5,.12,C.pale,x-5+i*1.25,0,-8.84));}
    for(const x of [-17,17])for(const z of [4,12]){g.add(box(5,.4,3,C.pale,x,0,z));const back=box(5,.25,2,C.pale,x,.5,z-1.8);back.rotation.x=-.6;g.add(back);sphere(g,C.ochre,x,.65,z+.4,1.2,.15,.8);}
    for(let i=0;i<7;i++){g.add(box(4,.2,4,C.wood,-30+i*10,9.7,-17));sphere(g,C.light,-30+i*10,9.4,-17,.35,.16,.35);}
    sign(g,'스파랜드',0,6,-31.5,14,2,'#c7b89c','#5b6251');configure(g,'d8s4a',[27,16,52],[0,4,-10],'#bba276',{zen:0xbcb9a6,hor:0xe6dcc2},{sun:0xffd49b,ambient:1.25,key:1.4});g.userData.visual.indoors=true;
  }
  function gwangjang(g){
    floor(g,C.concrete);const frame=new T.Group();frame.add(box(45,.4,62,C.teal,0,10,-17));for(const x of [-22,22])for(let i=0;i<7;i++)frame.add(cyl(.14,.14,10,C.black,x,0,10-i*9,6));g.add(frame);
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const z=3-i*9,x=side*14;g.add(box(13,1.1,6,C.wood,x,0,z),box(13,.15,6,C.tile,x,1.1,z));sign(g,i%2?'막걸리 · 빈대떡':'순희네빈대떡',x,5.1,z+3.2,12,1.4,i%2?'#d5b84f':'#b53e2d','#fff2d0');
      for(let k=0;k<3;k++){const pan=cyl(1.1,1.1,.15,C.black,x-3.5+k*3.4,1.3,z,16);g.add(pan);g.add(cyl(.82,.82,.06,C.ochre,x-3.5+k*3.4,1.47,z,16));}
      for(let j=0;j<3;j++)g.add(cyl(.43,.48,.7,C.red,side*6.7,0,z-1.8+j*1.7,8));
      g.add(cyl(.75,1.1,.35,C.stone,x,1.3,z-1.8,16));
    }
    for(let i=0;i<7;i++){sphere(g,C.light,0,9.5,6-i*8,.35,.25,.35);if(i<3){const l=new T.PointLight(0xffcf8b,9,20,2);l.position.set(0,6,6-i*12);g.add(l);}}sign(g,'광장시장',0,8.5,-45,14,2,'#184d53','#fff0c6');sign(g,'광장시장 · 먹거리골목',-14,3.3,15,12,1.4,'#b13f2c','#fff0c6');
    configure(g,'d9s5a',[20,13,49],[0,5,-10],'#d8a14b',{zen:0x253e5a,hor:0x665044},{sun:0xffcf92,ambient:1.2,key:1.5,night:1});g.userData.visual.indoors=true;
  }
  function glasshouse(g){
    floor(g,C.grass);floor(g,C.pale,65,20,0,13,.02);const glass=material(0x86bec0,.07,.22);glass.transparent=true;glass.opacity=.3;glass.depthWrite=false;
    const houseG=new T.Group();houseG.position.set(0,0,-18);
    houseG.add(box(37,7,15,glass,0,.4,0),box(40,.4,18,C.white,0,0,0));
    const verts=[],indices=[];for(let i=0;i<=16;i++){const x=-19+i*38/16;verts.push(x,7.5,8,x,12,0,x,7.5,-8);if(i<16){let a=i*3;indices.push(a,a+3,a+1,a+1,a+3,a+4,a+1,a+4,a+2,a+2,a+4,a+5);}}
    const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(verts,3));geom.setIndex(indices);geom.computeVertexNormals();const roofM=glass.clone();roofM.userData.shared=false;roofM.side=T.DoubleSide;houseG.add(new T.Mesh(geom,roofM));
    for(let i=0;i<17;i++){const x=-19+i*38/16;for(const z of [-8,8])houseG.add(box(.1,7.5,.1,C.white,x,0,z));line(houseG,[[x,7.5,8],[x,12,0],[x,7.5,-8]],C.white,.06);}
    for(const z of [-8.04,8.04])for(const y of [2,4,6])houseG.add(box(38,.1,.1,C.white,0,y,z));
    for(let i=0;i<8;i++){const x=-15+i*4.3;tree(houseG,x,-2,.7,C.pine);houseG.add(cyl(.8,1,.9,C.brick,x,0,-2));}
    houseG.add(box(4,4,.15,C.white,0,0,8.13),box(2.6,3.6,.18,C.glass,0,.2,8.23));sign(houseG,'대온실',0,5,8.2,6,1);g.add(houseG);
    for(const x of [-31,31])for(let i=0;i<3;i++)tree(g,x,-10-i*16,1.3,[C.ochre,C.rust,C.orange][i]);
    for(const x of [-18,18]){floor(g,C.pine,10,5,x,7,.03);bench(g,x,14);}sign(g,'창경궁 대온실',-25,3.3,16,8,1.3);leaves(g,0,14,63,19,80);
    configure(g,'d10s2a',[26,17,60],[0,6,-11],'#79aca9',{zen:0x85b7c1,hor:0xe6dcb5},{sun:0xffe0ae,ambient:1.15,key:1.6});
  }
  return {
    d1s3a:namsan,d1s4c:market,d2s1a:palace,d2s4b:bukchon,d4s4a:forest,d4s4b:seongsu,d6s7b:gwangalli,d7s1a:capsule,d7s4a:seaTemple,d8s1a:gamcheon,
    d2s7b:cheonggyecheon,d3s5b:banpo,d5s2a:commonGround,d5s3a:seokchon,d5s4a:seoulSky,d8s2a:jagalchi,d8s3a:huinnyeoul,d9s4a:naksan,d9s6b:ddp,d10s1a:secretGarden,
    d1s2a:namsanCar,d2s1b:gwanghwamun,d2s5a:ssamziegil,d2s5b:jogyesa,d3s3a:gyeonghuigung,d3s4b:seonyudo,d4s2b:onion,d5s2b:g=>{onion(g);g.userData.visual.id='d5s2b';g.userData.visual.name=DIRECTIONS.d5s2b[0];},d5s3b:loneTree,d6s2a:ktx,d6s5b:igidae,
    d7s2a:daritdol,d7s2b:cheongsapo,d7s5b:dongbaek,d7s7a:bay101,d7s7c:cinema,d8s1b:bookAlley,d8s3b:songdo,d8s4a:spaLand,d9s5a:gwangjang,d10s2a:glasshouse
  };
}

'use strict';
const K=['students','classes','attendance','billing','payments','history','settings'];
const S={};K.forEach(k=>{try{S[k]=JSON.parse(localStorage.getItem('classflow_'+k))}catch(e){}if(!S[k])S[k]=k=='settings'?{theme:'light'}:[]});
const save=(...ks)=>ks.forEach(k=>localStorage.setItem('classflow_'+k,JSON.stringify(S[k])));
const $=s=>document.querySelector(s),uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const p2=n=>String(n).padStart(2,'0'),iso=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const fd=s=>s.split('-').reverse().join('/'),mins=t=>{const[a,b]=t.split(':');return+a*60+ +b};
const dur=m=>{const h=Math.floor(m/60),r=m%60;return((h?h+' giờ':'')+(h&&r?' ':'')+(r?r+' phút':''))||'0 phút'};
const money=(v,c)=>{const n=Math.round(v).toLocaleString('vi-VN');return c=='JPY'?'¥'+n:n+' ₫'};
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const HOL={"2026-01-01":"元日","2026-01-12":"成人の日","2026-02-11":"建国記念の日","2026-02-23":"天皇誕生日","2026-03-20":"春分の日","2026-04-29":"昭和の日","2026-05-03":"憲法記念日","2026-05-04":"みどりの日","2026-05-05":"こどもの日","2026-05-06":"振替休日","2026-07-20":"海の日","2026-08-11":"山の日","2026-09-21":"敬老の日","2026-09-22":"国民の休日","2026-09-23":"秋分の日","2026-10-12":"スポーツの日","2026-11-03":"文化の日","2026-11-23":"勤労感謝の日",
"2027-01-01":"元日","2027-01-11":"成人の日","2027-02-11":"建国記念の日","2027-02-23":"天皇誕生日","2027-03-21":"春分の日","2027-03-22":"振替休日","2027-04-29":"昭和の日","2027-05-03":"憲法記念日","2027-05-04":"みどりの日","2027-05-05":"こどもの日","2027-07-19":"海の日","2027-08-11":"山の日","2027-09-20":"敬老の日","2027-09-23":"秋分の日","2027-10-11":"スポーツの日","2027-11-03":"文化の日","2027-11-23":"勤労感謝の日"};
const ST={plan:'🟡 Sắp học',done:'🟢 Đã học',cancel:'⚪ Đã hủy'},PS={un:'🟥 Chưa trả',part:'🟨 Trả một phần',paid:'🟩 Đã trả'};
const AI={n:'○',p:'✓',a:'✕'},AT={n:'Chưa điểm danh',p:'Có mặt',a:'Vắng'};
const now=new Date(),TD=iso(now);
let V='cal',C={y:now.getFullYear(),m:now.getMonth()},B={f:'all',sid:''},H={f:'all',q:''},cur=null,pend=null;
const mr=(y,m)=>[`${y}-${p2(m+1)}-01`,iso(new Date(y,m+1,0))];
[B.from,B.to]=mr(C.y,C.m);

/* ---------- dữ liệu ---------- */
const cls=()=>S.classes.filter(c=>!c.archived),act=()=>S.students.filter(s=>!s.archived);
const stu=id=>S.students.find(s=>s.id==id)||{name:'(không rõ)',currency:'JPY',rate:0,unit:60};
const nm=s=>s.name+(s.nick?` (${s.nick})`:'');
const cd=c=>mins(c.end)-mins(c.start);
const att=(c,s)=>S.attendance.find(a=>a.classId==c&&a.studentId==s);
const rm=(m,r)=>r=='down'?Math.floor(m/30)*30:r=='up'?Math.ceil(m/30)*30:r=='near'?Math.round(m/30)*30:m;
const fee=(s,m)=>Math.round(s.rate*rm(m,s.round)/s.unit);
function log(type,text,sid){S.history.push({id:uid(),ts:new Date().toISOString(),type,text,sid:sid||null});save('history')}
const tot=b=>b.lines.reduce((a,l)=>a+l.amount,0)+b.adjust.reduce((a,l)=>a+l.amount,0);
const paid=b=>S.payments.filter(p=>p.billId==b.id).reduce((a,p)=>a+p.amount,0);
const pst=b=>{const t=tot(b),p=paid(b);return p>=t?'paid':p>0?'part':'un'};
function prev(st,from,to){const had=new Set(S.billing.filter(b=>b.studentId==st.id).flatMap(b=>b.lines.map(l=>l.classId)));
 return cls().filter(c=>c.status=='done'&&c.date>=from&&c.date<=to&&c.studentIds.includes(st.id)&&!had.has(c.id)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).map(c=>{const a=att(c.id,st.id),d=cd(c),ok=!!(a&&(a.status=='p'||a.charge)),m=Math.min(a&&a.minutes!=null?a.minutes:d,d);
  return{classId:c.id,date:c.date,start:c.start,end:c.end,minutes:m,att:a?a.status:'n',ok,amount:ok?fee(st,m):0}})}
const billed=l=>l.filter(x=>x.ok).reduce((a,x)=>a+x.minutes,0);

/* ---------- giao diện chung ---------- */
function toast(t){const x=$('#toast');x.textContent='✓ '+t;x.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('on'),2000)}
function sh(title,body,re){cur=re||null;$('#ov').hidden=false;$('#sheet').innerHTML=`<div class="sh-h"><b>${title}</b><button class="ic" data-a="x" aria-label="Đóng">✕</button></div>${body}`}
const closeSh=()=>{$('#ov').hidden=true;cur=null};
const rs=()=>{render();if(cur&&!$('#ov').hidden)cur()};
const err=t=>{let x=$('#sheet .err');if(!x){x=document.createElement('div');x.className='err';$('#sheet').append(x)}x.textContent=t;x.scrollIntoView({block:'nearest'})};
const theme=()=>document.documentElement.dataset.theme=S.settings.theme;
const monthLabel=ym=>`Tháng ${ym.slice(5)}/${ym.slice(0,4)}`;
function chips(list,cur,a){return`<div class="chips">${list.map(([k,t])=>`<button class="chip ${cur==k?'on':''}" data-a="${a}" data-i="${k}">${t}</button>`).join('')}</div>`}

/* ---------- render ---------- */
function render(){
 $('#nav').innerHTML=[['cal','📅','Lịch'],['stu','👥','Học viên'],['bill','💰','Thu tiền'],['his','🕘','Nhật ký']].map(([k,i,t])=>`<button class="${V==k?'on':''}" data-a="nav" data-i="${k}"><span>${i}</span>${t}</button>`).join('');
 $('#main').innerHTML={cal:vCal,stu:vStu,bill:vBill,his:vHis}[V]();
}
function dayCard(c){const ss=c.studentIds.map(i=>nm(stu(i))).join(', ');return`<div class="card" data-a="vc" data-i="${c.id}"><div class="row sp"><b>${c.start} – ${c.end}</b><span class="sm">${ST[c.status]}</span></div><div class="sm mut">${c.studentIds.length} học viên${ss?': '+e(ss):''}</div>${c.note?`<div class="sm">${e(c.note)}</div>`:''}</div>`}
function vCal(){
 const{y,m}=C,ym=`${y}-${p2(m+1)}`,all=cls(),mc=all.filter(c=>c.date.startsWith(ym)),ok=mc.filter(c=>c.status!='cancel');
 const tc=all.filter(c=>c.date==TD&&c.status!='cancel').sort((a,b)=>a.start.localeCompare(b.start));
 const nowT=p2(now.getHours())+':'+p2(now.getMinutes());
 const nx=all.filter(c=>c.status=='plan'&&(c.date>TD||(c.date==TD&&c.start>nowT))).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
 const exp={};ok.forEach(c=>c.studentIds.forEach(id=>{const s=stu(id),a=att(c.id,id);if(a&&a.status=='a'&&!a.charge)return;const mm=Math.min(a&&a.minutes!=null?a.minutes:cd(c),cd(c));exp[s.currency]=(exp[s.currency]||0)+fee(s,mm)}));
 const ids=new Set();ok.forEach(c=>c.studentIds.forEach(i=>ids.add(i)));
 let cells='<div class="h red">CN</div>'+['T2','T3','T4','T5','T6'].map(t=>`<div class="h">${t}</div>`).join('')+'<div class="h blue">T7</div>';
 for(let i=0;i<new Date(y,m,1).getDay();i++)cells+='<div class="cell e"></div>';
 for(let d=1;d<=new Date(y,m+1,0).getDate();d++){const ds=`${ym}-${p2(d)}`,wd=new Date(y,m,d).getDay(),cc=all.filter(c=>c.date==ds),act2=cc.filter(c=>c.status!='cancel'),dn=act2.length&&act2.every(c=>c.status=='done');
  cells+=`<button class="cell ${wd==0?'sun':wd==6?'sat':''} ${HOL[ds]?'hol':''} ${ds==TD?'today':''}" data-a="day" data-i="${ds}"><b>${d}</b>${HOL[ds]?`<i class="hn">${HOL[ds]}</i>`:''}${act2.length?`<span class="${dn?'grn':''}">${dn?'✓':'●'} ${act2.length} buổi</span>`:cc.length?'<span class="mut">⚪ hủy</span>':''}</button>`}
 return`<div class="row sp"><h1>Lịch dạy</h1><button class="btn p" data-a="add" data-i="${TD}">＋ Thêm buổi học</button></div>
 <div class="cols"><div class="card"><h2>HÔM NAY · ${fd(TD)}</h2>${tc.length?tc.map(c=>`<div class="row sp"><div><b>${c.start} – ${c.end}</b><div class="sm mut">${c.studentIds.length} học viên</div></div><button class="btn s p" data-a="vc" data-i="${c.id}">Xem buổi học</button></div>`).join('<hr>'):'<b>Hôm nay không có buổi học.</b>'}</div>
 <div class="card"><h2>BUỔI TIẾP THEO</h2>${nx?`<div class="row sp"><div><b>${fd(nx.date)}</b><div>${nx.start} – ${nx.end}</div><div class="sm mut">${nx.studentIds.length} học viên</div></div><button class="btn s p" data-a="vc" data-i="${nx.id}">Xem buổi học</button></div>`:'<b>Chưa có buổi học sắp tới.</b>'}</div></div>
 <div class="card mt"><h2>THÁNG ${m+1}</h2><div class="sm">${new Set(ok.map(c=>c.date)).size} ngày dạy · ${ok.length} buổi · ${dur(ok.reduce((a,c)=>a+cd(c),0))} · ${ids.size} học viên</div><div class="row mt">${Object.keys(exp).map(c=>`<div><span class="mut sm">${c} dự kiến</span><div class="big">${money(exp[c],c)}</div></div>`).join('')||'<span class="mut">Chưa có tiền dự kiến.</span>'}</div></div>
 <div class="row sp"><button class="btn s" data-a="mv" data-i="-1" aria-label="Tháng trước">←</button><b>Tháng ${m+1} ${y}</b><button class="btn s" data-a="mv" data-i="1" aria-label="Tháng sau">→</button><button class="btn s" data-a="tdy">Hôm nay</button></div><div class="cal mt">${cells}</div>`}
function stMonth(s){const ym=TD.slice(0,7),b=S.billing.find(b=>b.studentId==s.id&&b.from.startsWith(ym));if(b)return{amt:tot(b),ps:pst(b),b};const l=prev(s,mr(now.getFullYear(),now.getMonth())[0],mr(now.getFullYear(),now.getMonth())[1]);return{amt:l.reduce((a,x)=>a+x.amount,0),ps:l.length?'un':null,l}}
function vStu(){
 const L=S.students.filter(s=>!!s.archived==H.arc).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 return`<div class="row sp"><h1>${H.arc?'Học viên đã lưu trữ':'Học viên'}</h1>${H.arc?'':'<button class="btn p" data-a="addS">＋ Thêm học viên</button>'}</div>
 <div class="list">${L.map(s=>{const cc=cls().filter(c=>c.status=='done'&&c.studentIds.includes(s.id)),mc=cc.filter(c=>c.date.startsWith(TD.slice(0,7))),at=S.attendance.filter(a=>a.studentId==s.id&&cc.some(c=>c.id==a.classId)),p=at.filter(a=>a.status=='p').length,ab=at.filter(a=>a.status=='a').length,sm=stMonth(s);
  return`<div class="card" data-a="vs" data-i="${s.id}"><b>${e(nm(s))}</b> <span class="tag">${e(s.level||'')}</span><div class="sm">${mc.length} buổi · ${dur(mc.reduce((a,c)=>a+Math.min(att(c.id,s.id)?.minutes??cd(c),cd(c)),0))}</div><div class="sm mut">Tỷ lệ đi học: ${p+ab?(p/(p+ab)*100).toFixed(1).replace('.',','):'–'}%</div><div class="row sp mt"><span>Học phí tháng: <b>${money(sm.amt,s.currency)}</b></span><span class="sm">${sm.ps?PS[sm.ps]:''}</span></div>${H.arc?`<button class="btn s mt" data-a="restS" data-i="${s.id}">Khôi phục</button>`:''}</div>`}).join('')||'<p class="mut">Chưa có học viên. Bấm “Thêm học viên” để bắt đầu.</p>'}</div>
 <button class="btn w mt" data-a="arcS">${H.arc?'← Về danh sách chính':'Xem học viên đã lưu trữ'}</button>`}
function sumBy(bs){const r={};bs.forEach(b=>{const x=r[b.currency]||(r[b.currency]={t:0,p:0});x.t+=tot(b);x.p+=Math.min(paid(b),tot(b))});return r}
function vBill(){
 const bs=S.billing.filter(b=>b.from<=B.to&&b.to>=B.from),sm=sumBy(bs),ym=B.from.slice(0,7);
 const vis=bs.filter(b=>B.f=='all'||pst(b)==B.f),pv=B.f=='all'||B.f=='un'?act().filter(s=>!B.sid||s.id==B.sid).map(s=>({s,l:prev(s,B.from,B.to)})).filter(x=>x.l.length):[];
 return`<div class="row sp"><h1>Thu tiền</h1><button class="btn p" data-a="calc">💰 Tính học phí</button></div>
 <div class="row sp"><button class="btn s" data-a="bm" data-i="-1" aria-label="Tháng trước">←</button><b>${B.from.endsWith('-01')&&B.to==mr(+ym.slice(0,4),+ym.slice(5)-1)[1]?monthLabel(ym).toUpperCase():fd(B.from)+' → '+fd(B.to)}</b><button class="btn s" data-a="bm" data-i="1" aria-label="Tháng sau">→</button></div>
 <div class="cols mt">${Object.keys(sm).map(c=>`<div class="card"><h2>${c}</h2>Cần thu: <b>${money(sm[c].t,c)}</b><br>Đã thu: <b class="grn">${money(sm[c].p,c)}</b><br>Còn thiếu: <b class="red">${money(sm[c].t-sm[c].p,c)}</b></div>`).join('')||'<div class="card mut">Chưa có kỳ học phí nào được chốt.</div>'}</div>
 <div class="mt">${chips([['all','Tất cả'],['un','Chưa trả'],['part','Trả một phần'],['paid','Đã trả']],B.f,'bf')}</div>
 <div class="list">${vis.map(b=>`<div class="card" data-a="vb" data-i="${b.id}"><b>${e(b.name)}</b> <span class="sm mut">🟢 Đã chốt</span><div class="sm">${b.lines.filter(l=>l.ok).length} buổi · ${dur(billed(b.lines))}</div><div class="row sp mt"><b class="big">${money(tot(b),b.currency)}</b><span class="sm">${PS[pst(b)]}</span></div>${pst(b)!='paid'?`<div class="sm red">Còn thiếu ${money(tot(b)-paid(b),b.currency)}</div>`:''}</div>`).join('')}
 ${pv.map(({s,l})=>`<div class="card" data-a="vp" data-i="${s.id}"><b>${e(nm(s))}</b> <span class="sm mut">🟡 Chưa chốt</span><div class="sm">${l.filter(x=>x.ok).length} buổi · ${dur(billed(l))}</div><div class="row sp mt"><b class="big">${money(l.reduce((a,x)=>a+x.amount,0),s.currency)}</b><span class="sm">Tạm tính</span></div></div>`).join('')}</div>${vis.length+pv.length?'':'<p class="mut">Không có gì để hiển thị.</p>'}`}
const HT=[['all','Tất cả'],['class','Buổi học'],['attendance','Điểm danh'],['billing','Học phí'],['payment','Thanh toán'],['archive','Lưu trữ']];
function hl(){const q=H.q.toLowerCase();const L=S.history.filter(h=>(H.f=='all'||h.type==H.f)&&(!q||h.text.toLowerCase().includes(q))).reverse().slice(0,200);
 return L.map(h=>{const d=new Date(h.ts);return`<div class="card"><div class="sm mut">${fd(iso(d))} ${p2(d.getHours())}:${p2(d.getMinutes())}</div>${e(h.text).replace(/\n/g,'<br>')}</div>`}).join('')||'<p class="mut">Chưa có nhật ký.</p>'}
function vHis(){return`<h1>Nhật ký</h1>${chips(HT,H.f,'hf')}<input type="search" id="hq" data-c="hq" placeholder="Tìm trong nhật ký…" value="${e(H.q)}"><div class="mt" id="hl">${hl()}</div>`}

/* ---------- buổi học ---------- */
function classForm(c,date){
 const c0=c||{date,start:'18:00',end:'19:30',status:'plan',studentIds:[],link:'',note:''};
 sh(c?'Sửa buổi học':'Thêm buổi học',`<label>Ngày</label><input type="date" id="fd" value="${c0.date}"><div class="grid"><div><label>Bắt đầu</label><input type="time" id="fs" value="${c0.start}" data-c="du"></div><div><label>Kết thúc</label><input type="time" id="fe" value="${c0.end}" data-c="du"></div></div><div class="mut sm mt" id="du"></div>
 <label>Trạng thái</label><select id="ft">${Object.keys(ST).map(k=>`<option value="${k}" ${c0.status==k?'selected':''}>${ST[k]}</option>`).join('')}</select>
 <label>Học viên</label>${act().map(s=>`<label class="ck"><input type="checkbox" name="st" value="${s.id}" ${c0.studentIds.includes(s.id)?'checked':''}>${e(nm(s))}</label>`).join('')||'<span class="mut">Hãy thêm học viên trước.</span>'}
 <label>Link học online</label><input type="url" id="fl" placeholder="https://meet.google.com/..." value="${e(c0.link)}"><label>Ghi chú</label><input type="text" id="fn" placeholder="Ví dụ: HSK 3 – bài 5" value="${e(c0.note)}">
 <button class="btn p w mt" data-a="svc" data-i="${c?c.id:''}">Lưu</button>`);duShow()}
function duShow(){const a=$('#fs').value,b=$('#fe').value;$('#du').textContent=a&&b&&mins(b)>mins(a)?'Thời lượng: '+dur(mins(b)-mins(a)):''}
function viewClass(id){
 const c=S.classes.find(x=>x.id==id);if(!c)return closeSh();
 sh('Buổi học',`<div class="card"><b>${fd(c.date)}</b> · ${c.start} – ${c.end}<br>Thời lượng: ${dur(cd(c))}<br>${ST[c.status]}${HOL[c.date]?`<br>🇯🇵 Ngày lễ: ${HOL[c.date]}`:''}${c.archived?'<br><b>Đã lưu trữ</b>':''}</div>
 ${c.studentIds.map(sid=>{const s=stu(sid),a=att(id,sid)||{status:'n'};return`<div class="card"><div class="row sp"><b>${e(nm(s))}</b><button class="att ${a.status}" data-a="tg" data-i="${id}|${sid}" aria-label="Điểm danh: ${AT[a.status]}">${AI[a.status]}</button></div><div class="sm mut">${AT[a.status]}</div>${a.status=='p'?`<div class="row sm mt">Thời gian thực học: <input type="number" class="mini" min="0" max="${cd(c)}" data-c="mn" data-i="${id}|${sid}" value="${a.minutes??cd(c)}"> phút</div>`:''}${a.status=='a'?`<label class="ck"><input type="checkbox" data-c="ch" data-i="${id}|${sid}" ${a.charge?'checked':''}>Vẫn tính tiền buổi này</label>`:''}</div>`}).join('')}
 ${c.link?`<a class="btn p w" href="${e(c.link)}" target="_blank" rel="noopener">🔗 Mở lớp</a>`:''}${c.note?`<div class="card mt"><h2>Ghi chú</h2>${e(c.note)}</div>`:''}
 ${c.status=='plan'?`<button class="btn p w mt" data-a="stc" data-i="${id}|done">✓ Đã học</button><button class="btn w mt" data-a="stc" data-i="${id}|cancel">Hủy buổi này</button>`:`<button class="btn w mt" data-a="stc" data-i="${id}|plan">Chuyển về Sắp học</button>`}
 <div class="grid mt"><button class="btn" data-a="ec" data-i="${id}">Sửa</button><button class="btn" data-a="cp" data-i="${id}">Sao chép</button></div>
 ${c.archived?`<button class="btn w mt" data-a="urc" data-i="${id}">Khôi phục</button>`:`<button class="btn w mt" data-a="arc" data-i="${id}">Lưu trữ</button>`}`,()=>viewClass(id))}

/* ---------- học viên ---------- */
function stuForm(id){
 const s=id?stu(id):{name:'',nick:'',level:'',contact:'',note:'',currency:'JPY',rate:'',unit:60,round:'exact'};
 sh(id?'Sửa học viên':'Thêm học viên',`<label>Họ tên</label><input type="text" id="sn" value="${e(s.name)}"><label>Tên gọi (không bắt buộc)</label><input type="text" id="sk" value="${e(s.nick)}"><label>HSK / trình độ</label><input type="text" id="sl" value="${e(s.level)}"><label>Số điện thoại hoặc liên hệ</label><input type="text" id="sc" value="${e(s.contact)}"><label>Ghi chú</label><input type="text" id="so" value="${e(s.note)}">
 <div class="grid"><div><label>Loại tiền</label><select id="sy"><option value="JPY" ${s.currency=='JPY'?'selected':''}>🇯🇵 JPY (¥)</option><option value="VND" ${s.currency=='VND'?'selected':''}>🇻🇳 VND (₫)</option></select></div><div><label>Đơn giá</label><input type="number" id="sr" min="0" value="${s.rate}"></div></div>
 <label>Tính theo</label><label class="ck"><input type="radio" name="un" value="30" ${s.unit==30?'checked':''}>30 phút</label><label class="ck"><input type="radio" name="un" value="60" ${s.unit==60?'checked':''}>60 phút</label>
 <label>Làm tròn</label><select id="sd"><option value="exact">Tính đúng theo thời gian</option><option value="down">Làm tròn xuống 30 phút</option><option value="up">Làm tròn lên 30 phút</option><option value="near">Làm tròn gần nhất 30 phút</option></select>
 <div class="sm mut">Đổi giá chỉ áp dụng cho học phí chốt sau này.</div><button class="btn p w mt" data-a="svs" data-i="${id||''}">Lưu</button>`);$('#sd').value=s.round||'exact'}
function viewStu(id){
 const s=stu(id),bs=S.billing.filter(b=>b.studentId==id).sort((a,b)=>b.from.localeCompare(a.from));
 sh(e(nm(s)),`<div class="card">${s.level?`<span class="tag">${e(s.level)}</span><br>`:''}${s.contact?`📞 ${e(s.contact)}<br>`:''}Đơn giá: <b>${money(s.rate,s.currency)} / ${s.unit} phút</b>${s.round&&s.round!='exact'?`<br>Làm tròn: ${{down:'xuống',up:'lên',near:'gần nhất'}[s.round]} 30 phút`:''}${s.note?`<br>${e(s.note)}`:''}</div>
 <h2 class="mt">Lịch sử học phí</h2>${bs.map(b=>`<div class="card" data-a="vb" data-i="${b.id}"><div class="row sp"><b>${monthLabel(b.from.slice(0,7))}</b><b>${money(tot(b),b.currency)}</b></div><span class="sm">${PS[pst(b)]}</span></div>`).join('')||'<p class="mut">Chưa có kỳ học phí nào.</p>'}
 ${s.archived?`<button class="btn w mt" data-a="restS" data-i="${id}">Khôi phục</button>`:`<div class="grid mt"><button class="btn" data-a="es" data-i="${id}">Sửa</button><button class="btn d" data-a="arcs" data-i="${id}">Lưu trữ học viên</button></div>`}`,()=>viewStu(id))}

/* ---------- học phí ---------- */
function lineHtml(l,c){return`<div class="card sm"><b>${fd(l.date)}</b> · ${l.start}–${l.end}<br>${dur(l.minutes)} · ${AT[l.att]}${l.att=='a'&&l.ok?' (vẫn tính)':''} · <b>${money(l.amount,c)}</b></div>`}
function viewPrev(sid){
 const s=stu(sid),l=prev(s,B.from,B.to),t=l.reduce((a,x)=>a+x.amount,0);
 sh('Bạn sắp chốt',`<div class="card"><b>${e(nm(s))}</b><br>${fd(B.from)} → ${fd(B.to)}<br>${l.filter(x=>x.ok).length} buổi · ${dur(billed(l))}<br>Đơn giá: ${money(s.rate,s.currency)} / ${s.unit} phút${s.round!='exact'?' (có làm tròn)':''}<div class="big mt">${money(t,s.currency)}</div></div>${l.map(x=>lineHtml(x,s.currency)).join('')}<button class="btn p w mt" data-a="cf" data-i="${sid}">Chốt học phí</button>`,()=>viewPrev(sid))}
function confirmClose(sid){
 const s=stu(sid),l=prev(s,B.from,B.to),t=l.reduce((a,x)=>a+x.amount,0);
 if(S.billing.some(b=>b.studentId==sid&&b.from==B.from&&b.to==B.to))return toast('Kỳ này đã chốt rồi');
 sh('Chốt học phí',`<p>Bạn muốn chốt học phí ${fd(B.from)} → ${fd(B.to)} cho <b>${e(nm(s))}</b>?</p><div class="card">${l.filter(x=>x.ok).length} buổi<br>${dur(billed(l))}<br>Tổng: <b class="big">${money(t,s.currency)}</b></div><div class="grid"><button class="btn" data-a="x">Hủy</button><button class="btn p" data-a="dc" data-i="${sid}">Chốt</button></div>`)}
function viewBill(id){
 const b=S.billing.find(x=>x.id==id);if(!b)return closeSh();const t=tot(b),p=paid(b),ps=S.payments.filter(x=>x.billId==id);
 sh(e(b.name),`<div class="card">🟢 Đã chốt ${fd(b.createdAt.slice(0,10))}<br>${fd(b.from)} → ${fd(b.to)}<br>Đơn giá lúc chốt: ${money(b.rate,b.currency)} / ${b.unit} phút${b.round!='exact'?' (có làm tròn)':''}<br>${dur(billed(b.lines))}<div class="big mt">${money(t,b.currency)}</div>Đã trả: <b class="grn">${money(p,b.currency)}</b><br>Còn thiếu: <b class="red">${money(t-p,b.currency)}</b><br>${PS[pst(b)]}</div>
 ${b.lines.map(l=>lineHtml(l,b.currency)).join('')}${b.adjust.map(a=>`<div class="card sm">Điều chỉnh ${fd(a.date)}: <b>${a.amount>0?'+':''}${money(a.amount,b.currency)}</b><br>${e(a.note)}</div>`).join('')}
 ${ps.map(x=>`<div class="card sm">💵 ${fd(x.date)}: ${money(x.amount,b.currency)}</div>`).join('')}
 ${t>p?`<button class="btn p w mt" data-a="pay" data-i="${id}">Ghi nhận thanh toán</button>`:''}<button class="btn w mt" data-a="adj" data-i="${id}">Tạo điều chỉnh</button>`,()=>viewBill(id))}

/* ---------- sao lưu / cài đặt ---------- */
function settings(){
 const ac=S.classes.filter(c=>c.archived),demo=S.students.some(s=>s.id.startsWith('demo_'));
 sh('Cài đặt',`<div class="grid"><button class="btn" data-a="th" data-i="light">☀ Chế độ sáng</button><button class="btn" data-a="th" data-i="dark">🌙 Chế độ tối</button></div>
 <button class="btn w mt" data-a="bk">Tải bản sao lưu</button><label>Khôi phục dữ liệu</label><input type="file" accept=".json" data-c="rf">
 ${ac.length?`<h2 class="mt">Buổi học đã lưu trữ</h2>${ac.map(c=>`<div class="card sm row sp">${fd(c.date)} ${c.start}<button class="btn s" data-a="urc" data-i="${c.id}">Khôi phục</button></div>`).join('')}`:''}
 ${demo?'<button class="btn w mt" data-a="cdm">Xóa dữ liệu mẫu</button>':''}<button class="btn w d mt" data-a="rst">Xóa dữ liệu đang dùng</button>`,settings)}
function seed(){
 const d=n=>iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()+n)),lm=new Date(now.getFullYear(),now.getMonth()-1,1);
 S.students=[{id:'demo_s1',name:'Nguyễn Văn A',nick:'',level:'HSK 3',contact:'',note:'',currency:'JPY',rate:2000,unit:60,round:'exact'},{id:'demo_s2',name:'Trần Thị B',nick:'',level:'HSK 4',contact:'',note:'',currency:'VND',rate:150000,unit:60,round:'exact'},{id:'demo_s3',name:'Lê Văn C',nick:'',level:'HSK 2',contact:'',note:'',currency:'JPY',rate:1000,unit:30,round:'down'}];
 const mk=(i,n,s,e2,st,ids,note)=>({id:'demo_c'+i,date:d(n),start:s,end:e2,status:st,studentIds:ids,link:i==1?'https://meet.google.com/':'',note});
 S.classes=[mk(1,0,'19:00','20:30','plan',['demo_s1','demo_s2','demo_s3'],'Ôn nói'),mk(2,-6,'18:00','19:30','done',['demo_s1','demo_s2'],'HSK 3 – bài 5'),mk(3,-4,'18:30','20:00','done',['demo_s1','demo_s3'],'Bài tập về nhà'),mk(4,-2,'18:00','19:00','cancel',['demo_s2'],''),mk(5,6,'18:30','20:00','plan',['demo_s1','demo_s2'],'')];
 S.attendance=[['demo_c2','demo_s1','p'],['demo_c2','demo_s2','p',60],['demo_c3','demo_s1','p'],['demo_c3','demo_s3','a']].map(([c,s,st,m])=>({id:uid(),classId:c,studentId:s,status:st,minutes:m??null,charge:false}));
 const ld=n=>iso(new Date(lm.getFullYear(),lm.getMonth(),n)),L=(n,m,a)=>({classId:null,date:ld(n),start:'18:00',end:p2(18+m/60|0)+':'+p2(m%60?30:0),minutes:m,att:'p',ok:true,amount:a});
 S.billing=[{id:'demo_b1',studentId:'demo_s1',name:'Nguyễn Văn A',currency:'JPY',rate:2000,unit:60,round:'exact',from:mr(lm.getFullYear(),lm.getMonth())[0],to:mr(lm.getFullYear(),lm.getMonth())[1],lines:[L(3,60,2000),L(10,90,3000)],adjust:[],createdAt:new Date().toISOString()}];
 S.payments=[];S.settings.seeded=true;K.forEach(k=>save(k));log('class','Đã tạo dữ liệu mẫu');
}

/* ---------- hành động ---------- */
const A={
 nav:i=>{V=i;render();scrollTo(0,0)},x:closeSh,
 mv:i=>{C.m+=+i;if(C.m<0){C.m=11;C.y--}if(C.m>11){C.m=0;C.y++}render()},tdy:()=>{C={y:now.getFullYear(),m:now.getMonth()};render()},
 day:ds=>{const f=()=>{const L=cls().filter(c=>c.date==ds).sort((a,b)=>a.start.localeCompare(b.start));sh(fd(ds),`${HOL[ds]?`<div class="red"><b>🇯🇵 Ngày lễ: ${HOL[ds]}</b></div>`:''}${L.map(dayCard).join('')||'<p class="mut">Chưa có buổi học.</p>'}<button class="btn p w mt" data-a="add" data-i="${ds}">＋ Thêm buổi học</button>`,f)};f()},
 add:ds=>classForm(null,ds),ec:i=>classForm(S.classes.find(c=>c.id==i)),vc:viewClass,
 svc:i=>{const date=$('#fd').value,s=$('#fs').value,en=$('#fe').value,ids=[...document.querySelectorAll('[name=st]:checked')].map(x=>x.value),link=$('#fl').value.trim();
  if(!date)return err('Vui lòng chọn ngày.');if(!s||!en)return err('Vui lòng nhập giờ học.');if(mins(en)<=mins(s))return err('Giờ kết thúc phải sau giờ bắt đầu.');if(!ids.length)return err('Vui lòng chọn ít nhất một học viên.');
  if(link){try{if(!/^https?:$/.test(new URL(link).protocol))throw 0}catch(x){return err('Link học chưa đúng. Hãy bắt đầu bằng https://')}}
  const o={date,start:s,end:en,status:$('#ft').value,studentIds:ids,link,note:$('#fn').value.trim()};
  if(i){Object.assign(S.classes.find(c=>c.id==i),o);log('class',`Đã sửa buổi học ${fd(date)} ${s}–${en}`)}else{S.classes.push({id:uid(),...o});log('class',`Đã thêm buổi học ${fd(date)} ${s}–${en}`)}
  save('classes');closeSh();render();toast(i?'Đã lưu buổi học':'Đã thêm buổi học')},
 tg:i=>{const[c,s]=i.split('|');let a=att(c,s);if(!a){a={id:uid(),classId:c,studentId:s,status:'n',minutes:null,charge:false};S.attendance.push(a)}
  a.status={n:'p',p:'a',a:'n'}[a.status];if(a.status!='a')a.charge=false;save('attendance');log('attendance',`${AT[a.status]}: ${stu(s).name} (${fd(S.classes.find(x=>x.id==c).date)})`,s);rs();toast('Đã lưu điểm danh')},
 stc:i=>{const[id,st]=i.split('|'),c=S.classes.find(x=>x.id==id);c.status=st;save('classes');
  log('class',`${st=='done'?'✓ Hoàn thành buổi học':st=='cancel'?'Đã hủy buổi học':'Chuyển về sắp học'} ${fd(c.date)} ${c.start}–${c.end}\n${c.studentIds.map(s=>stu(s).name).join(', ')}`);rs();toast(st=='done'?'Đã học xong':'Đã lưu')},
 cp:i=>{const c=S.classes.find(x=>x.id==i);sh('Sao chép buổi học',`<div class="card">${c.start} – ${c.end}<br>${c.studentIds.map(s=>e(stu(s).name)).join(', ')}</div><label>Chọn ngày mới</label><input type="date" id="nd" value="${iso(new Date(new Date(c.date).getTime()+7*864e5))}"><button class="btn p w mt" data-a="dcp" data-i="${i}">Sao chép</button>`)},
 dcp:i=>{const d=$('#nd').value;if(!d)return err('Vui lòng chọn ngày.');const c=S.classes.find(x=>x.id==i);S.classes.push({...c,id:uid(),date:d,status:'plan',archived:false});save('classes');log('class',`Đã sao chép buổi học sang ${fd(d)}`);closeSh();render();toast('Đã thêm buổi học')},
 arc:i=>{const c=S.classes.find(x=>x.id==i);c.archived=true;save('classes');log('archive',`Đã lưu trữ buổi học ${fd(c.date)} ${c.start}`);closeSh();render();toast('Đã lưu trữ buổi học')},
 urc:i=>{const c=S.classes.find(x=>x.id==i);c.archived=false;save('classes');log('archive',`Đã khôi phục buổi học ${fd(c.date)}`);rs();toast('Đã khôi phục')},
 addS:()=>stuForm(),es:stuForm,vs:viewStu,
 svs:i=>{const n=$('#sn').value.trim(),r=+$('#sr').value;if(!n)return err('Vui lòng nhập tên học viên.');if($('#sr').value===''||r<0)return err('Đơn giá không được để trống hoặc âm.');
  const o={name:n,nick:$('#sk').value.trim(),level:$('#sl').value.trim(),contact:$('#sc').value.trim(),note:$('#so').value.trim(),currency:$('#sy').value,rate:r,unit:+document.querySelector('[name=un]:checked').value,round:$('#sd').value};
  if(i)Object.assign(stu(i),o);else S.students.push({id:uid(),archived:false,...o});save('students');log('class',`${i?'Đã sửa':'Đã thêm'} học viên ${n}`,i);closeSh();render();toast(i?'Đã lưu học viên':'Đã thêm học viên')},
 arcs:i=>sh('Lưu trữ học viên',`<p><b>${e(stu(i).name)}</b></p><p>Học viên này sẽ được ẩn khỏi danh sách chính.<br>Lịch học, điểm danh và học phí cũ vẫn được giữ lại.</p><div class="grid"><button class="btn" data-a="x">Hủy</button><button class="btn p" data-a="darc" data-i="${i}">Lưu trữ</button></div>`),
 darc:i=>{stu(i).archived=true;save('students');log('archive',`Đã lưu trữ học viên ${stu(i).name}`,i);closeSh();render();toast('Đã lưu trữ học viên')},
 restS:i=>{stu(i).archived=false;save('students');log('archive',`Đã khôi phục học viên ${stu(i).name}`,i);closeSh();render();toast('Đã khôi phục')},
 arcS:()=>{H.arc=!H.arc;render()},
 bm:i=>{const y=+B.from.slice(0,4),m=+B.from.slice(5,7)-1+ +i,d=new Date(y,m,1);[B.from,B.to]=mr(d.getFullYear(),d.getMonth());render()},bf:i=>{B.f=i;render()},
 calc:()=>sh('Tính học phí',`<label>Tháng</label><input type="month" id="cm" value="${B.from.slice(0,7)}" data-c="cm"><label>Học viên</label><select id="cs"><option value="">Tất cả học viên</option>${act().map(s=>`<option value="${s.id}" ${B.sid==s.id?'selected':''}>${e(nm(s))}</option>`).join('')}</select><div class="grid"><div><label>Từ ngày</label><input type="date" id="cf" value="${B.from}"></div><div><label>Đến ngày</label><input type="date" id="ct" value="${B.to}"></div></div><button class="btn p w mt" data-a="rc">Xem trước học phí</button>`),
 rc:()=>{const f=$('#cf').value,t=$('#ct').value;if(!f||!t)return err('Vui lòng chọn ngày.');if(t<f)return err('Ngày kết thúc phải sau ngày bắt đầu.');B.from=f;B.to=t;B.sid=$('#cs').value;B.f='all';closeSh();render()},
 vp:viewPrev,cf:confirmClose,
 dc:i=>{const s=stu(i),l=prev(s,B.from,B.to);if(S.billing.some(b=>b.studentId==i&&b.from==B.from&&b.to==B.to))return toast('Kỳ này đã chốt rồi');
  const b={id:uid(),studentId:i,name:s.name,currency:s.currency,rate:s.rate,unit:s.unit,round:s.round||'exact',from:B.from,to:B.to,lines:l,adjust:[],createdAt:new Date().toISOString()};S.billing.push(b);save('billing');
  log('billing',`💰 Đã chốt học phí\n${s.name} · ${fd(B.from)}→${fd(B.to)}\n${money(tot(b),b.currency)}`,i);closeSh();render();toast('Đã chốt học phí')},
 vb:viewBill,
 pay:i=>{const b=S.billing.find(x=>x.id==i),r=tot(b)-paid(b);sh('Ghi nhận thanh toán',`<div class="card">Tổng: ${money(tot(b),b.currency)}<br>Còn thiếu: <b>${money(r,b.currency)}</b></div><label>Số tiền đã trả</label><input type="number" id="pa" min="0" value="${r}"><label>Ngày trả</label><input type="date" id="pd" value="${TD}"><button class="btn p w mt" data-a="spy" data-i="${i}">Lưu</button>`)},
 spy:i=>{const b=S.billing.find(x=>x.id==i),r=tot(b)-paid(b),a=+$('#pa').value,d=$('#pd').value;if(!d)return err('Vui lòng chọn ngày.');if(!(a>0))return err('Số tiền phải lớn hơn 0.');if(a>r)return err('Số tiền trả không được lớn hơn số còn thiếu.');
  S.payments.push({id:uid(),billId:i,amount:a,date:d});save('payments');log('payment',`💵 Đã ghi nhận thanh toán\n${b.name} · ${money(a,b.currency)}`,b.studentId);viewBill(i);render();toast('Đã ghi nhận thanh toán')},
 adj:i=>sh('Tạo điều chỉnh',`<p class="sm mut">Bản chốt cũ được giữ nguyên. Nhập số dương để thêm, số âm để giảm.</p><label>Số tiền</label><input type="number" id="aa"><label>Lý do</label><input type="text" id="an" placeholder="Ví dụ: thiếu một buổi"><button class="btn p w mt" data-a="sad" data-i="${i}">Lưu</button>`),
 sad:i=>{const b=S.billing.find(x=>x.id==i),a=+$('#aa').value,n=$('#an').value.trim();if(!a)return err('Vui lòng nhập số tiền khác 0.');if(!n)return err('Vui lòng nhập lý do.');if(tot(b)+a<paid(b))return err('Tổng sau điều chỉnh không được nhỏ hơn số tiền đã trả.');
  b.adjust.push({id:uid(),amount:a,note:n,date:TD});save('billing');log('billing',`Điều chỉnh học phí\n${b.name} · ${a>0?'+':''}${money(a,b.currency)} · ${n}`,b.studentId);viewBill(i);render();toast('Đã lưu điều chỉnh')},
 hf:i=>{H.f=i;render()},
 search:()=>{sh('Tìm kiếm','<input type="search" id="sq" data-c="sq" placeholder="Tên, HSK, ngày, ghi chú, học phí…"><div id="sr2" class="mt"></div>');$('#sq').focus()},
 settings,th:i=>{S.settings.theme=i;save('settings');theme()},
 bk:()=>{const o={app:'classflow',date:new Date().toISOString()};K.forEach(k=>o[k]=S[k]);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,1)],{type:'application/json'}));a.download=`classflow-${TD}.json`;a.click();toast('Đã tải bản sao lưu')},
 rok:()=>{K.filter(k=>k!='settings').forEach(k=>{const ids=new Set(S[k].map(x=>x.id));(pend[k]||[]).forEach(x=>{if(x&&x.id&&!ids.has(x.id))S[k].push(x)})});K.forEach(k=>save(k));log('class','Đã khôi phục dữ liệu từ bản sao lưu');pend=null;closeSh();render();toast('Đã khôi phục dữ liệu')},
 cdm:()=>sh('Xóa dữ liệu mẫu','<p>Học viên, buổi học và học phí mẫu sẽ bị gỡ. Nhật ký vẫn được giữ lại.</p><div class="grid"><button class="btn" data-a="x">Hủy</button><button class="btn p" data-a="dcd">Xóa</button></div>'),
 dcd:()=>{const d=x=>!String(x.id).startsWith('demo_');S.students=S.students.filter(d);S.classes=S.classes.filter(d);S.attendance=S.attendance.filter(a=>!String(a.classId).startsWith('demo_'));S.billing=S.billing.filter(d);S.payments=S.payments.filter(p=>!String(p.billId).startsWith('demo_'));K.forEach(k=>save(k));log('archive','Đã xóa dữ liệu mẫu');closeSh();render();toast('Đã xóa dữ liệu mẫu')},
 rst:()=>sh('Xóa dữ liệu đang dùng','<p><b>Dữ liệu đang dùng sẽ được làm mới.</b><br>Lịch sử và các kỳ học phí đã chốt vẫn được giữ lại.</p><div class="grid"><button class="btn" data-a="x">Hủy</button><button class="btn d" data-a="rst2">Tiếp tục</button></div>'),
 rst2:()=>sh('Xác nhận lần 2','<p>Gõ <b>LÀM MỚI</b> để xác nhận.</p><input type="text" id="rt"><button class="btn d w mt" data-a="rst3">Làm mới dữ liệu</button>'),
 rst3:()=>{if($('#rt').value.trim()!='LÀM MỚI')return err('Bạn chưa gõ đúng chữ LÀM MỚI.');S.students=[];S.classes=[];S.attendance=[];save('students','classes','attendance');log('archive','Đã làm mới dữ liệu đang dùng (giữ lại lịch sử và học phí đã chốt)');closeSh();render();toast('Đã làm mới dữ liệu')}
};
const CH={
 du:duShow,hq:el=>{H.q=el.value;$('#hl').innerHTML=hl()},
 cm:el=>{if(!el.value)return;const[y,m]=el.value.split('-');[$('#cf').value,$('#ct').value]=mr(+y,+m-1)},
 mn:(el,i)=>{const[c,s]=i.split('|'),a=att(c,s),mx=cd(S.classes.find(x=>x.id==c)),v=+el.value;if(el.value===''||v<0)return toast('Số phút không được âm'),viewClass(c);if(v>mx)return toast('Thời gian học không được lớn hơn thời lượng buổi học'),viewClass(c);a.minutes=v;save('attendance');toast('Đã lưu điểm danh');render()},
 ch:(el,i)=>{const[c,s]=i.split('|');att(c,s).charge=el.checked;save('attendance');toast('Đã lưu điểm danh');render()},
 rf:el=>{const f=el.files[0];if(!f)return;f.text().then(t=>{try{const o=JSON.parse(t);if(o.app!='classflow')throw 0;pend=o;sh('Khôi phục dữ liệu',`<p>Dữ liệu trong file sẽ được <b>thêm vào</b> dữ liệu hiện tại. Dữ liệu hiện tại không bị xóa.</p><div class="card sm">${(o.students||[]).length} học viên · ${(o.classes||[]).length} buổi học · ${(o.billing||[]).length} kỳ học phí</div><div class="grid"><button class="btn" data-a="x">Hủy</button><button class="btn p" data-a="rok">Khôi phục</button></div>`)}catch(x){toast('File sao lưu không hợp lệ')}})},
 sq:el=>{const q=el.value.trim().toLowerCase();if(!q){$('#sr2').innerHTML='';return}const R=[];
  S.students.forEach(s=>{if([s.name,s.nick,s.level,s.contact,s.note].join(' ').toLowerCase().includes(q))R.push(`<div class="card" data-a="vs" data-i="${s.id}">👥 ${e(nm(s))} <span class="tag">${e(s.level||'')}</span></div>`)});
  S.classes.forEach(c=>{if([fd(c.date),c.note,c.studentIds.map(i=>stu(i).name).join(' ')].join(' ').toLowerCase().includes(q))R.push(`<div class="card" data-a="vc" data-i="${c.id}">📅 ${fd(c.date)} ${c.start} ${e(c.note)}</div>`)});
  S.billing.forEach(b=>{if([b.name,monthLabel(b.from.slice(0,7)),String(tot(b))].join(' ').toLowerCase().includes(q))R.push(`<div class="card" data-a="vb" data-i="${b.id}">💰 ${e(b.name)} · ${money(tot(b),b.currency)}</div>`)});
  S.history.filter(h=>h.text.toLowerCase().includes(q)).slice(-5).forEach(h=>R.push(`<div class="card sm">🕘 ${e(h.text).replace(/\n/g,' · ')}</div>`));
  $('#sr2').innerHTML=R.slice(0,30).join('')||'<p class="mut">Không tìm thấy.</p>'}
};
document.addEventListener('click',ev=>{if(ev.target.id=='ov')return closeSh();const t=ev.target.closest('[data-a]');if(t&&A[t.dataset.a])A[t.dataset.a](t.dataset.i,t)});
document.addEventListener('input',ev=>{const t=ev.target;if(t.dataset.c=='hq'||t.dataset.c=='sq'||t.dataset.c=='du')CH[t.dataset.c](t,t.dataset.i)});
document.addEventListener('change',ev=>{const t=ev.target;if(t.dataset.c&&!['hq','sq','du'].includes(t.dataset.c))CH[t.dataset.c](t,t.dataset.i)});
document.addEventListener('keydown',ev=>{if(ev.key=='Escape')closeSh()});
H.arc=false;if(!S.settings.seeded&&!S.students.length)seed();theme();render();

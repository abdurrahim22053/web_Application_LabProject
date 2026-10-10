/* Tuition Management demo application.
   Uses localStorage for a front-end prototype. Do not use this as production authentication/storage. */
const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "tuitionflow_demo_v1";
let currentUser = null;
let db = { tuitions: [], sessions: [], payments: [], reminders: [], expenses: [] };
let authMode = "signin";
let modalConfig = null;
let editingId = null;
let toastTimer = null;

const todayISO = () => {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const monthISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
const money = (n) => "৳" + Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });
const escapeHTML = (value="") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const niceDate = (iso) => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—";
const niceTime = (time) => {
  if (!time) return "—";
  const [h,m] = time.split(":").map(Number);
  return new Date(2000,0,1,h,m).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
};
const monthName = (month) => {
  if (!month) return "—";
  const [y,m] = month.split("-").map(Number);
  return new Date(y,m-1,1).toLocaleDateString("en-US",{month:"short",year:"numeric"});
};
const isSameMonth = (date, month=monthISO()) => (date || "").slice(0,7) === month;
const tuitionById = id => db.tuitions.find(t => t.id === id);
const tuitionName = id => tuitionById(id)?.studentName || "Archived tuition";
const activeTuitions = () => db.tuitions.filter(t => t.status === "active");
const expectedForMonth = (month=monthISO()) => activeTuitions().reduce((sum,t) => {
  // A tuition contributes from its start month onwards.
  return (!t.startDate || t.startDate.slice(0,7) <= month) ? sum + Number(t.monthlyFee || 0) : sum;
},0);
const receivedForMonth = (month=monthISO()) => db.payments.filter(p => p.status === "received" && isSameMonth(p.date,month)).reduce((s,p)=>s+Number(p.amount||0),0);
const outstandingForMonth = (month=monthISO()) => Math.max(0, expectedForMonth(month) - receivedForMonth(month));
function loadDB() {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    db = all[currentUser.id] || { tuitions: [], sessions: [], payments: [], reminders: [], expenses: [] };
  } catch { db = { tuitions: [], sessions: [], payments: [], reminders: [], expenses: [] }; }
}
function saveDB() {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch {}
  all[currentUser.id] = db;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
function showToast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove("show"),2700);
}
function setAuthMode(mode) {
  authMode = mode;
  $("signInTab").classList.toggle("active",mode==="signin");
  $("signUpTab").classList.toggle("active",mode==="signup");
  $("nameField").classList.toggle("hidden",mode!=="signup");
  $("authTitle").textContent = mode==="signup" ? "Create your account" : "Welcome back";
  $("authSubtitle").textContent = mode==="signup" ? "Start organizing your teaching in one place." : "Sign in to manage your tuitions, classes, and income.";
  $("authSubmit").textContent = mode==="signup" ? "Create account" : "Sign in";
  $("authPassword").autocomplete = mode==="signup" ? "new-password" : "current-password";
  $("authError").textContent = "";
}
function getAccounts() { try { return JSON.parse(localStorage.getItem("tuitionflow_accounts") || "[]"); } catch { return []; } }
function setAccounts(accounts) { localStorage.setItem("tuitionflow_accounts",JSON.stringify(accounts)); }
function enterApp(user) {
  currentUser = user; loadDB();
  $("authView").classList.add("hidden"); $("appView").classList.remove("hidden");
  $("sidebarUserName").textContent = user.name || "Tutor";
  $("sidebarUserEmail").textContent = user.email;
  $("userAvatar").textContent = (user.name || user.email || "T").trim().charAt(0).toUpperCase();
  $("welcomeHeading").textContent = `Hello, ${(user.name || "Tutor").split(" ")[0]}!`;
  $("todayLabel").textContent = new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
  $("profileName").value = user.name || ""; $("profileEmail").value = user.email || ""; $("profilePhone").value = user.phone || "";
  $("scheduleDate").value = todayISO(); $("paymentMonthFilter").value = monthISO();
  renderAll();
}
function leaveApp() {
  currentUser = null; $("appView").classList.add("hidden"); $("authView").classList.remove("hidden");
  $("authForm").reset(); setAuthMode("signin");
}
$("signInTab").addEventListener("click",()=>setAuthMode("signin"));
$("signUpTab").addEventListener("click",()=>setAuthMode("signup"));
$("authForm").addEventListener("submit",e=>{
  e.preventDefault(); const email=$("authEmail").value.trim().toLowerCase(), password=$("authPassword").value, name=$("authName").value.trim();
  const accounts=getAccounts(); const error=$("authError");
  if(authMode==="signup"){
    if(!name){error.textContent="Please enter your full name.";return;}
    if(accounts.some(a=>a.email===email)){error.textContent="An account with this email already exists.";return;}
    const user={id:uid(),name,email,password,phone:""};
    accounts.push(user);setAccounts(accounts);showToast("Account created. Welcome to Tuition Management!");enterApp(user);
  } else {
    const user=accounts.find(a=>a.email===email && a.password===password);
    if(!user){error.textContent="Email or password is incorrect. Create an account first if this is your first visit.";return;}
    enterApp(user);
  }
});
$("signOutBtn").addEventListener("click",leaveApp);
document.querySelectorAll(".nav-link[data-page]").forEach(btn=>btn.addEventListener("click",()=>goPage(btn.dataset.page)));
document.querySelectorAll("[data-go-page]").forEach(btn=>btn.addEventListener("click",()=>goPage(btn.dataset.goPage)));
function goPage(page) {
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
  document.querySelectorAll(".nav-link[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  const labels={dashboard:"Dashboard",tuitions:"My Tuitions",schedule:"Schedule",payments:"Income & Payments",attendance:"Attendance & Classes",reports:"Reports",reminders:"Reminders",settings:"Profile & Settings"};
  $("currentPageLabel").textContent=labels[page]||"Dashboard"; $("sidebar").classList.remove("open");
  renderAll();
}
$("mobileMenuBtn").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
document.querySelectorAll("[data-open-tuition]").forEach(b=>b.addEventListener("click",()=>openTuitionModal()));
$("addSessionBtn").addEventListener("click",()=>openSessionModal());
$("attendanceAddBtn").addEventListener("click",()=>openSessionModal());
$("addPaymentBtn").addEventListener("click",()=>openPaymentModal());
$("addReminderBtn").addEventListener("click",()=>openReminderModal());
$("quickReminderBtn").addEventListener("click",()=>openReminderModal());
$("addExpenseBtn").addEventListener("click",()=>openExpenseModal());
$("tuitionSearch").addEventListener("input",renderTuitions);
$("tuitionStatusFilter").addEventListener("change",renderTuitions);
$("scheduleDate").addEventListener("change",renderSchedule);
$("scheduleFilter").addEventListener("change",renderSchedule);
$("paymentSearch").addEventListener("input",renderPayments);
$("paymentMonthFilter").addEventListener("change",renderPayments);
$("paymentStatusFilter").addEventListener("change",renderPayments);
$("modalClose").addEventListener("click",closeModal); $("modalCancel").addEventListener("click",closeModal);
$("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});

function openModal({title,eyebrow="WORKSPACE",submit="Save record",fields,onSave,id=null}) {
  modalConfig={onSave}; editingId=id;
  $("modalTitle").textContent=title; $("modalEyebrow").textContent=eyebrow; $("modalSubmit").textContent=submit; $("modalError").textContent="";
  $("modalFields").innerHTML=fields.map(f=>{
    const full=f.full?" full":"";
    let control="";
    if(f.type==="select") control=`<select id="mf_${f.name}" ${f.required?"required":""}>${(f.options||[]).map(o=>`<option value="${escapeHTML(o.value)}" ${String(o.value)===String(f.value??"")?"selected":""}>${escapeHTML(o.label)}</option>`).join("")}</select>`;
    else if(f.type==="textarea") control=`<textarea id="mf_${f.name}" ${f.required?"required":""} placeholder="${escapeHTML(f.placeholder||"")}">${escapeHTML(f.value??"")}</textarea>`;
    else control=`<input id="mf_${f.name}" type="${f.type||"text"}" value="${escapeHTML(f.value??"")}" ${f.required?"required":""} ${f.min!==undefined?`min="${f.min}"`:""} ${f.step?`step="${f.step}"`:""} placeholder="${escapeHTML(f.placeholder||"")}" ${f.readonly?"readonly":""}/>`;
    return `<div class="field${full}"><label for="mf_${f.name}">${escapeHTML(f.label)}${f.required?' *':''}</label>${control}</div>`;
  }).join("");
  $("modalBackdrop").classList.remove("hidden");
  setTimeout(()=>{$("modalFields").querySelector("input,select,textarea")?.focus();},30);
}
function closeModal(){ $("modalBackdrop").classList.add("hidden"); $("modalForm").reset(); modalConfig=null; editingId=null; }
$("modalForm").addEventListener("submit",e=>{
  e.preventDefault(); if(!modalConfig)return;
  const data={}; $("modalFields").querySelectorAll("input,select,textarea").forEach(el=>data[el.id.replace("mf_","")]=el.value.trim());
  try { modalConfig.onSave(data,editingId); closeModal(); renderAll(); }
  catch(err){ $("modalError").textContent=err.message||"Please check the information and try again."; }
});
function openTuitionModal(tuition=null) {
  const t=tuition||{};
  openModal({title:tuition?"Edit tuition":"Add a tuition",eyebrow:"MY TUITIONS",submit:tuition?"Save changes":"Add tuition",id:t.id,fields:[
    {name:"studentName",label:"Student name",value:t.studentName,required:true,full:true,placeholder:"Student's full name"},
    {name:"classLevel",label:"Class / grade",value:t.classLevel,required:true,placeholder:"e.g. Class 9"},
    {name:"school",label:"School / college",value:t.school,placeholder:"Institution name"},
    {name:"subjects",label:"Subjects",value:t.subjects,required:true,placeholder:"e.g. Math, Physics",full:true},
    {name:"guardianPhone",label:"Student / guardian phone",value:t.guardianPhone,placeholder:"01XXXXXXXXX"},
    {name:"location",label:"Tuition location",value:t.location,placeholder:"Area or address"},
    {name:"monthlyFee",label:"Monthly fee (৳)",type:"number",value:t.monthlyFee??"",required:true,min:"0",step:"1"},
    {name:"paymentDay",label:"Expected payment day (1–31)",type:"number",value:t.paymentDay||"5",min:"1",max:"31"},
    {name:"startDate",label:"Start date",type:"date",value:t.startDate||todayISO(),required:true},
    {name:"status",label:"Status",type:"select",value:t.status||"active",options:[{value:"active",label:"Active"},{value:"paused",label:"Paused"},{value:"archived",label:"Archived"}]},
    {name:"notes",label:"Notes",type:"textarea",value:t.notes,full:true,placeholder:"Any teaching notes or special instructions"}
  ],onSave:(d,id)=>{
    if(Number(d.monthlyFee)<0)throw Error("Monthly fee cannot be negative.");
    const record={...d,id:id||uid(),monthlyFee:Number(d.monthlyFee),paymentDay:Math.min(31,Math.max(1,Number(d.paymentDay)||5)),createdAt:t.createdAt||new Date().toISOString()};
    if(id)db.tuitions=db.tuitions.map(x=>x.id===id?record:x);else db.tuitions.unshift(record);
    saveDB();showToast(id?"Tuition updated.":"Tuition added successfully.");
  }});
}
function openSessionModal(session=null) {
  const s=session||{};
  const options=activeTuitions().map(t=>({value:t.id,label:`${t.studentName} — ${t.subjects}`}));
  if(!options.length){showToast("Add an active tuition first.");openTuitionModal();return;}
  openModal({title:session?"Edit class session":"Add class session",eyebrow:"SCHEDULE",submit:session?"Save changes":"Add session",id:s.id,fields:[
    {name:"tuitionId",label:"Tuition / student",type:"select",value:s.tuitionId||options[0].value,options},
    {name:"date",label:"Class date",type:"date",value:s.date||$("scheduleDate").value||todayISO(),required:true},
    {name:"startTime",label:"Start time",type:"time",value:s.startTime||"16:00",required:true},
    {name:"endTime",label:"End time",type:"time",value:s.endTime||"17:00",required:true},
    {name:"status",label:"Class status",type:"select",value:s.status||"scheduled",options:[{value:"scheduled",label:"Scheduled"},{value:"completed",label:"Completed"},{value:"cancelled",label:"Cancelled"}]},
    {name:"attendance",label:"Attendance",type:"select",value:s.attendance||"not_marked",options:[{value:"not_marked",label:"Not marked"},{value:"present",label:"Present"},{value:"absent",label:"Absent"}]},
    {name:"topic",label:"Lesson / topic",value:s.topic,full:true,placeholder:"e.g. Algebra: quadratic equations"},
    {name:"notes",label:"Class notes",type:"textarea",value:s.notes,full:true,placeholder:"Progress, homework, or rescheduling details"}
  ],onSave:(d,id)=>{
    if(d.endTime<=d.startTime)throw Error("End time must be later than start time.");
    const record={...d,id:id||uid()};
    if(id)db.sessions=db.sessions.map(x=>x.id===id?record:x);else db.sessions.push(record);
    saveDB();showToast(id?"Class session updated.":"Class session added.");
  }});
}
function openPaymentModal(payment=null) {
  const p=payment||{}; const options=db.tuitions.map(t=>({value:t.id,label:`${t.studentName} — ${money(t.monthlyFee)}/month`}));
  if(!options.length){showToast("Add a tuition before recording payments.");openTuitionModal();return;}
  openModal({title:payment?"Edit payment":"Record a payment",eyebrow:"INCOME & PAYMENTS",submit:payment?"Save changes":"Record payment",id:p.id,fields:[
    {name:"tuitionId",label:"Tuition / student",type:"select",value:p.tuitionId||options[0].value,options},
    {name:"amount",label:"Amount received (৳)",type:"number",value:p.amount??"",required:true,min:"1",step:"1"},
    {name:"date",label:"Payment date",type:"date",value:p.date||todayISO(),required:true},
    {name:"method",label:"Payment method",type:"select",value:p.method||"cash",options:[{value:"cash",label:"Cash"},{value:"bkash",label:"bKash"},{value:"nagad",label:"Nagad"},{value:"bank",label:"Bank transfer"},{value:"other",label:"Other"}]},
    {name:"month",label:"Fee month",type:"month",value:p.month||monthISO(),required:true},
    {name:"reference",label:"Transaction reference",value:p.reference,placeholder:"Optional transaction ID"},
    {name:"note",label:"Note",type:"textarea",value:p.note,full:true,placeholder:"Optional payment note"}
  ],onSave:(d,id)=>{
    if(Number(d.amount)<=0)throw Error("Payment amount must be greater than zero.");
    const record={...d,id:id||uid(),amount:Number(d.amount),status:"received"};
    if(id)db.payments=db.payments.map(x=>x.id===id?record:x);else db.payments.unshift(record);
    saveDB();showToast(id?"Payment updated.":"Payment recorded.");
  }});
}
function openReminderModal(reminder=null) {
  const r=reminder||{};
  openModal({title:reminder?"Edit reminder":"Add reminder",eyebrow:"REMINDERS",submit:reminder?"Save changes":"Add reminder",id:r.id,fields:[
    {name:"title",label:"Reminder title",value:r.title,required:true,full:true,placeholder:"e.g. Collect Student A's monthly fee"},
    {name:"date",label:"Reminder date",type:"date",value:r.date||todayISO(),required:true},
    {name:"type",label:"Category",type:"select",value:r.type||"general",options:[{value:"general",label:"General"},{value:"payment",label:"Payment"},{value:"class",label:"Class"},{value:"personal",label:"Personal"}]},
    {name:"details",label:"Details",type:"textarea",value:r.details,full:true,placeholder:"Additional details"},
    {name:"done",label:"Completed?",type:"select",value:String(!!r.done),options:[{value:"false",label:"Not completed"},{value:"true",label:"Completed"}]}
  ],onSave:(d,id)=>{
    const record={...d,id:id||uid(),done:d.done==="true"};
    if(id)db.reminders=db.reminders.map(x=>x.id===id?record:x);else db.reminders.unshift(record);
    saveDB();showToast(id?"Reminder updated.":"Reminder added.");
  }});
}
function openExpenseModal(expense=null) {
  const x=expense||{};
  openModal({title:expense?"Edit expense":"Add expense",eyebrow:"REPORTS",submit:expense?"Save changes":"Add expense",id:x.id,fields:[
    {name:"title",label:"Expense name",value:x.title,required:true,full:true,placeholder:"e.g. Transport to tuition"},
    {name:"amount",label:"Amount (৳)",type:"number",value:x.amount??"",required:true,min:"1",step:"1"},
    {name:"date",label:"Expense date",type:"date",value:x.date||todayISO(),required:true},
    {name:"category",label:"Category",type:"select",value:x.category||"transport",options:[{value:"transport",label:"Transport"},{value:"materials",label:"Teaching materials"},{value:"internet",label:"Internet / phone"},{value:"other",label:"Other"}]},
    {name:"note",label:"Note",type:"textarea",value:x.note,full:true,placeholder:"Optional details"}
  ],onSave:(d,id)=>{
    if(Number(d.amount)<=0)throw Error("Expense amount must be greater than zero.");
    const record={...d,id:id||uid(),amount:Number(d.amount)};
    if(id)db.expenses=db.expenses.map(a=>a.id===id?record:a);else db.expenses.unshift(record);
    saveDB();showToast(id?"Expense updated.":"Expense added.");
  }});
}
function emptyState(title,desc){return `<div class="empty-state"><div class="empty-icon">◇</div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(desc)}</p></div>`;}
function studentCell(t){return `<div class="student-cell"><div class="student-avatar">${escapeHTML((t.studentName||"?").charAt(0).toUpperCase())}</div><div><strong>${escapeHTML(t.studentName)}</strong><small>${escapeHTML(t.classLevel||"Class not set")} · ${escapeHTML(t.subjects||"No subjects")}</small></div></div>`;}
function statusPill(status){const s=status||"unknown";return `<span class="status-pill ${escapeHTML(s)}">${escapeHTML(s.replace("_"," "))}</span>`;}
function tableOrEmpty(headers,rows,title,desc){return rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`:emptyState(title,desc);}
function renderAll(){if(!currentUser)return;renderDashboard();renderTuitions();renderSchedule();renderPayments();renderAttendance();renderReports();renderReminders();}
function renderDashboard(){
  const active=activeTuitions(),today=todayISO(),todaySessions=db.sessions.filter(s=>s.date===today&&s.status!=="cancelled").sort((a,b)=>a.startTime.localeCompare(b.startTime));
  $("statTuitions").textContent=active.length;
  $("statClasses").textContent=todaySessions.filter(s=>s.status==="scheduled").length;
  $("statExpected").textContent=money(expectedForMonth());
  $("statOutstanding").textContent=money(outstandingForMonth());
  $("receivedThisMonth").textContent=money(receivedForMonth());
  const expected=expectedForMonth(),received=receivedForMonth(),pct=expected?Math.min(100,Math.round(received/expected*100)):0;
  $("incomeProgress").style.width=pct+"%";$("incomeProgressText").textContent=`${pct}% of expected income received`;
  $("paymentCount").textContent=db.payments.filter(p=>isSameMonth(p.month||p.date)).length;
  $("reminderCount").textContent=db.reminders.filter(r=>!r.done&&r.date>=today).length;
  $("todaySchedule").innerHTML=todaySessions.length?todaySessions.map(s=>`<div class="schedule-item"><div class="time-chip">${escapeHTML(niceTime(s.startTime))}</div><div class="schedule-info"><strong>${escapeHTML(tuitionName(s.tuitionId))}</strong><small>${escapeHTML(tuitionById(s.tuitionId)?.subjects||"Tuition")} · ${escapeHTML(s.topic||"Class session")}</small></div>${statusPill(s.status)}</div>`).join(""):emptyState("No classes scheduled today","Add a class session to organize your timetable.");
  const rows=active.slice(0,5).map(t=>`<tr><td>${studentCell(t)}</td><td>${escapeHTML(t.location||"—")}</td><td><strong>${money(t.monthlyFee)}</strong></td><td>${statusPill(t.status)}</td><td><div class="table-actions"><button data-action="edit-tuition" data-id="${t.id}">Edit</button></div></td></tr>`);
  $("dashboardTuitions").innerHTML=tableOrEmpty(["Student","Location","Monthly fee","Status","Action"],rows,"No active tuitions yet","Add your first tuition to start building your dashboard.");
}
function renderTuitions(){
  const q=($("tuitionSearch")?.value||"").toLowerCase(),filter=$("tuitionStatusFilter")?.value||"all";
  const list=db.tuitions.filter(t=>(filter==="all"||t.status===filter)&&[t.studentName,t.subjects,t.location,t.classLevel,t.school].join(" ").toLowerCase().includes(q));
  const rows=list.map(t=>`<tr><td>${studentCell(t)}</td><td>${escapeHTML(t.school||"—")}</td><td>${escapeHTML(t.location||"—")}</td><td>${money(t.monthlyFee)}</td><td>${escapeHTML(t.startDate?niceDate(t.startDate):"—")}</td><td>${statusPill(t.status)}</td><td><div class="table-actions"><button data-action="edit-tuition" data-id="${t.id}">Edit</button><button data-action="archive-tuition" data-id="${t.id}">${t.status==="archived"?"Restore":"Archive"}</button><button data-action="delete-tuition" data-id="${t.id}">Delete</button></div></td></tr>`);
  $("tuitionsTable").innerHTML=tableOrEmpty(["Student","School / college","Location","Monthly fee","Start date","Status","Actions"],rows,"No tuitions found","Add a tuition or change your search/filter.");
}
function renderSchedule(){
  const date=$("scheduleDate")?.value||todayISO(),filter=$("scheduleFilter")?.value||"all";
  const today=todayISO(),weekEnd=new Date(`${today}T12:00:00`);
  weekEnd.setDate(weekEnd.getDate()+6);
  const weekEndISO=`${weekEnd.getFullYear()}-${String(weekEnd.getMonth()+1).padStart(2,"0")}-${String(weekEnd.getDate()).padStart(2,"0")}`;
  const upcoming=db.sessions.filter(s=>s.status==="scheduled"&&s.date>=today&&s.date<=weekEndISO).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
  $("upcomingScheduleCount").textContent=`${upcoming.length} ${upcoming.length===1?"class":"classes"}`;
  $("upcomingScheduleList").innerHTML=upcoming.length?upcoming.map(s=>{
    const sessionDate=new Date(`${s.date}T12:00:00`);
    const weekday=sessionDate.toLocaleDateString("en-US",{weekday:"short"});
    const day=sessionDate.toLocaleDateString("en-US",{day:"numeric"});
    const fullDate=sessionDate.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});
    const tuition=tuitionById(s.tuitionId);
    const time=s.endTime?`${niceTime(s.startTime)} – ${niceTime(s.endTime)}`:niceTime(s.startTime);
    return `<article class="upcoming-item"><div class="upcoming-date"><strong>${escapeHTML(weekday)}</strong><span>${escapeHTML(day)}</span></div><div class="upcoming-body"><div class="upcoming-title-row"><strong>${escapeHTML(tuitionName(s.tuitionId))}</strong><time datetime="${escapeHTML(s.date)}">${escapeHTML(fullDate)} · ${escapeHTML(time)}</time></div><p>${escapeHTML(tuition?.subjects||"Tuition")}${s.topic?` · ${escapeHTML(s.topic)}`:""}</p></div><span class="upcoming-badge">Upcoming</span></article>`;
  }).join(""):emptyState("No upcoming classes this week","Scheduled classes for the next 7 days will appear here.");
  const list=db.sessions.filter(s=>(!date||s.date===date)&&(filter==="all"||s.status===filter)).sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
  const rows=list.map(s=>`<tr><td>${escapeHTML(niceDate(s.date))}</td><td><strong>${escapeHTML(tuitionName(s.tuitionId))}</strong><small class="muted" style="display:block;margin-top:4px">${escapeHTML(tuitionById(s.tuitionId)?.subjects||"")}</small></td><td>${escapeHTML(niceTime(s.startTime))} – ${escapeHTML(niceTime(s.endTime))}</td><td>${escapeHTML(s.topic||"—")}</td><td>${statusPill(s.status)}</td><td>${s.attendance==="not_marked"?"—":statusPill(s.attendance)}</td><td><div class="table-actions"><button data-action="edit-session" data-id="${s.id}">Edit</button><button data-action="delete-session" data-id="${s.id}">Delete</button></div></td></tr>`);
  $("scheduleList").innerHTML=tableOrEmpty(["Date","Student","Time","Lesson / topic","Status","Attendance","Actions"],rows,"No class sessions","Choose another date or add a new class session.");
}
function paymentStatusForTuition(t,month){
  const due=Number(t.monthlyFee||0),paid=db.payments.filter(p=>p.tuitionId===t.id&&(p.month||p.date?.slice(0,7))===month&&p.status==="received").reduce((s,p)=>s+Number(p.amount||0),0);
  return {due,paid,status:paid>=due&&due>0?"received":paid>0?"partial":"due"};
}
function renderPayments(){
  const month=$("paymentMonthFilter")?.value||monthISO(),q=($("paymentSearch")?.value||"").toLowerCase(),statusFilter=$("paymentStatusFilter")?.value||"all";
  const exp=expectedForMonth(month),rec=receivedForMonth(month),out=Math.max(0,exp-rec);
  $("paymentExpected").textContent=money(exp);$("paymentReceived").textContent=money(rec);$("paymentOutstanding").textContent=money(out);
  let rows=[];
  db.tuitions.filter(t=>t.status!=="archived"&&(!t.startDate||t.startDate.slice(0,7)<=month)).forEach(t=>{
    const st=paymentStatusForTuition(t,month);
    if(statusFilter==="all"||statusFilter===({received:"received",partial:"partial",due:"due"}[st.status])){
      if([t.studentName,t.subjects,t.location].join(" ").toLowerCase().includes(q))rows.push({kind:"summary",t,st,month});
    }
  });
  db.payments.filter(p=>(p.month||p.date?.slice(0,7))===month&&[tuitionName(p.tuitionId),p.note,p.reference].join(" ").toLowerCase().includes(q)).forEach(p=>{
    if(statusFilter==="all"||statusFilter==="received")rows.push({kind:"payment",p});
  });
  rows.sort((a,b)=>(a.kind==="summary"?a.t.studentName:tuitionName(a.p.tuitionId)).localeCompare(b.kind==="summary"?b.t.studentName:tuitionName(b.p.tuitionId)));
  const trs=rows.map(r=>r.kind==="summary"?`<tr><td>${studentCell(r.t)}</td><td>${escapeHTML(monthName(month))}</td><td>${money(r.st.due)}</td><td>${money(r.st.paid)}</td><td>${money(Math.max(0,r.st.due-r.st.paid))}</td><td>${statusPill(r.st.status)}</td><td><div class="table-actions"><button data-action="add-payment-for" data-id="${r.t.id}">Record</button></div></td></tr>`:`<tr><td>${studentCell(tuitionById(r.p.tuitionId)||{studentName:tuitionName(r.p.tuitionId),classLevel:"",subjects:""})}</td><td>${escapeHTML(niceDate(r.p.date))}<small class="muted" style="display:block;margin-top:4px">${escapeHTML(r.p.method||"")}</small></td><td>${money(r.p.amount)}</td><td>${escapeHTML(r.p.note||r.p.reference||"Payment received")}</td><td>${statusPill("received")}</td><td>${escapeHTML(monthName(r.p.month||r.p.date.slice(0,7)))}</td><td><div class="table-actions"><button data-action="edit-payment" data-id="${r.p.id}">Edit</button><button data-action="delete-payment" data-id="${r.p.id}">Delete</button></div></td></tr>`);
  const headers=rows.some(r=>r.kind==="payment")?["Student","Date / method","Amount","Note","Status","Fee month","Actions"]:["Student","Fee month","Expected","Received","Outstanding","Status","Action"];
  $("paymentsTable").innerHTML=tableOrEmpty(headers,trs,"No payment records for this filter","Try another month or record a payment.");
}
function renderAttendance(){
  $("completedCount").textContent=db.sessions.filter(s=>s.status==="completed").length;
  $("scheduledCount").textContent=db.sessions.filter(s=>s.status==="scheduled").length;
  $("cancelledCount").textContent=db.sessions.filter(s=>s.status==="cancelled").length;
  const tuitionCounts=db.tuitions.map(t=>{
    const sessions=db.sessions.filter(s=>s.tuitionId===t.id);
    return {tuition:t,total:sessions.length,completed:sessions.filter(s=>s.status==="completed").length,scheduled:sessions.filter(s=>s.status==="scheduled").length,cancelled:sessions.filter(s=>s.status==="cancelled").length};
  });
  $("tuitionClassCounts").innerHTML=tuitionCounts.length?tuitionCounts.map(({tuition,total,completed,scheduled,cancelled})=>`<article class="tuition-count-card"><div class="tuition-count-heading"><div><strong>${escapeHTML(tuition.studentName)}</strong><small>${escapeHTML(tuition.classLevel||"Class not set")}</small></div>${statusPill(tuition.status)}</div><div class="tuition-total-count"><strong>${total}</strong><span>Total classes</span></div><div class="tuition-count-breakdown"><div><strong>${completed}</strong><span>Completed</span></div><div><strong>${scheduled}</strong><span>Scheduled</span></div><div><strong>${cancelled}</strong><span>Cancelled</span></div></div></article>`).join(""):emptyState("No tuition records yet","Add a tuition to see its class count here.");
  const list=[...db.sessions].sort((a,b)=>b.date.localeCompare(a.date)||b.startTime.localeCompare(a.startTime));
  const rows=list.map(s=>`<tr><td>${escapeHTML(niceDate(s.date))}</td><td><strong>${escapeHTML(tuitionName(s.tuitionId))}</strong><small class="muted" style="display:block;margin-top:4px">${escapeHTML(tuitionById(s.tuitionId)?.subjects||"")}</small></td><td>${escapeHTML(s.topic||"—")}</td><td>${statusPill(s.status)}</td><td>${s.attendance==="not_marked"?"—":statusPill(s.attendance)}</td><td>${escapeHTML(s.notes||"—")}</td><td><div class="table-actions"><button data-action="edit-session" data-id="${s.id}">Edit</button></div></td></tr>`);
  $("attendanceTable").innerHTML=tableOrEmpty(["Date","Student","Topic","Class status","Attendance","Notes","Action"],rows,"No class history yet","Add a class session to start tracking attendance.");
}
function renderReports(){
  $("reportActive").textContent=activeTuitions().length;
  $("reportReceived").textContent=money(db.payments.filter(p=>p.status==="received").reduce((s,p)=>s+Number(p.amount||0),0));
  $("reportCompleted").textContent=db.sessions.filter(s=>s.status==="completed").length;
  $("reportExpenses").textContent=money(db.expenses.reduce((s,x)=>s+Number(x.amount||0),0));
  const now=new Date(),months=[];
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(monthISO(d));}
  const vals=months.map(m=>db.payments.filter(p=>p.status==="received"&&isSameMonth(p.date,m)).reduce((s,p)=>s+Number(p.amount||0),0)),max=Math.max(1,...vals);
  $("incomeChart").innerHTML=months.map((m,i)=>`<div class="bar-column"><span class="bar-value">${vals[i]?money(vals[i]):"৳0"}</span><div class="bar" style="height:${Math.max(2,vals[i]/max*145)}px"></div><span class="bar-label">${escapeHTML(new Date(Number(m.slice(0,4)),Number(m.slice(5))-1,1).toLocaleDateString("en-US",{month:"short"}))}</span></div>`).join("");
  const tuitions=activeTuitions().sort((a,b)=>b.monthlyFee-a.monthlyFee),maxFee=Math.max(1,...tuitions.map(t=>Number(t.monthlyFee||0)));
  $("tuitionBreakdown").innerHTML=tuitions.length?tuitions.map(t=>`<div class="breakdown-item"><span>${escapeHTML(t.studentName)}</span><div class="breakdown-track"><div class="breakdown-fill" style="width:${Number(t.monthlyFee||0)/maxFee*100}%"></div></div><strong>${money(t.monthlyFee)}</strong></div>`).join(""):emptyState("No active tuitions","Add tuition records to see the breakdown.");
  const rows=db.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td><strong>${escapeHTML(x.title)}</strong><small class="muted" style="display:block;margin-top:4px">${escapeHTML(x.category||"other")}</small></td><td>${escapeHTML(niceDate(x.date))}</td><td>${money(x.amount)}</td><td>${escapeHTML(x.note||"—")}</td><td><div class="table-actions"><button data-action="edit-expense" data-id="${x.id}">Edit</button><button data-action="delete-expense" data-id="${x.id}">Delete</button></div></td></tr>`);
  $("expensesTable").innerHTML=tableOrEmpty(["Expense","Date","Amount","Note","Actions"],rows,"No expenses recorded","Add transport, materials, or other teaching expenses.");
}
function renderReminders(){
  const list=[...db.reminders].sort((a,b)=>Number(a.done)-Number(b.done)||a.date.localeCompare(b.date));
  $("remindersList").innerHTML=list.length?list.map(r=>`<article class="reminder-card ${r.done?"done":""}"><div class="reminder-symbol">${r.done?"✓":"♧"}</div><div class="reminder-content"><strong>${escapeHTML(r.title)}</strong><p>${escapeHTML(r.details||"No extra details.")}</p><div class="reminder-meta"><small>${escapeHTML(niceDate(r.date))} · ${escapeHTML(r.type||"general")}</small><div class="reminder-actions"><button data-action="toggle-reminder" data-id="${r.id}">${r.done?"Undo":"Complete"}</button><button data-action="edit-reminder" data-id="${r.id}">Edit</button><button data-action="delete-reminder" data-id="${r.id}">Delete</button></div></div></div></article>`).join(""):emptyState("No reminders yet","Add a reminder for a fee due date, class, or personal task.");
}
document.addEventListener("click",e=>{
  const actionBtn=e.target.closest("[data-action]");if(!actionBtn)return;
  const {action,id}=actionBtn.dataset;
  const t=db.tuitions.find(x=>x.id===id),s=db.sessions.find(x=>x.id===id),p=db.payments.find(x=>x.id===id),r=db.reminders.find(x=>x.id===id),x=db.expenses.find(x=>x.id===id);
  if(action==="edit-tuition"&&t)openTuitionModal(t);
  if(action==="archive-tuition"&&t){t.status=t.status==="archived"?"active":"archived";saveDB();renderAll();showToast(t.status==="archived"?"Tuition archived.":"Tuition restored.");}
  if(action==="delete-tuition"&&t&&confirm(`Delete tuition for ${t.studentName}? Related sessions and payments will remain in history.`)){db.tuitions=db.tuitions.filter(a=>a.id!==id);saveDB();renderAll();showToast("Tuition deleted.");}
  if(action==="edit-session"&&s)openSessionModal(s);
  if(action==="delete-session"&&s&&confirm("Delete this class session?")){db.sessions=db.sessions.filter(a=>a.id!==id);saveDB();renderAll();showToast("Class session deleted.");}
  if(action==="add-payment-for"&&t)openPaymentModal({tuitionId:t.id,month:$("paymentMonthFilter").value||monthISO(),date:todayISO()});
  if(action==="edit-payment"&&p)openPaymentModal(p);
  if(action==="delete-payment"&&p&&confirm("Delete this payment record?")){db.payments=db.payments.filter(a=>a.id!==id);saveDB();renderAll();showToast("Payment record deleted.");}
  if(action==="toggle-reminder"&&r){r.done=!r.done;saveDB();renderAll();showToast(r.done?"Reminder completed.":"Reminder reopened.");}
  if(action==="edit-reminder"&&r)openReminderModal(r);
  if(action==="delete-reminder"&&r&&confirm("Delete this reminder?")){db.reminders=db.reminders.filter(a=>a.id!==id);saveDB();renderAll();showToast("Reminder deleted.");}
  if(action==="edit-expense"&&x)openExpenseModal(x);
  if(action==="delete-expense"&&x&&confirm("Delete this expense?")){db.expenses=db.expenses.filter(a=>a.id!==id);saveDB();renderAll();showToast("Expense deleted.");}
});
$("profileForm").addEventListener("submit",e=>{
  e.preventDefault();const name=$("profileName").value.trim(),email=$("profileEmail").value.trim().toLowerCase(),phone=$("profilePhone").value.trim();
  const accounts=getAccounts();if(accounts.some(a=>a.email===email&&a.id!==currentUser.id)){showToast("That email is already used by another account.");return;}
  const index=accounts.findIndex(a=>a.id===currentUser.id);if(index<0)return;
  accounts[index]={...accounts[index],name,email,phone};setAccounts(accounts);currentUser=accounts[index];
  $("sidebarUserName").textContent=name;$("sidebarUserEmail").textContent=email;$("userAvatar").textContent=name.charAt(0).toUpperCase();$("welcomeHeading").textContent=`Hello, ${name.split(" ")[0]}!`;
  showToast("Profile updated.");
});
$("backupBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),user:{name:currentUser.name,email:currentUser.email},data:db},null,2)],{type:"application/json"});
  downloadBlob(blob,`tuitionflow-backup-${todayISO()}.json`);showToast("Backup downloaded.");
});
$("exportCsvBtn").addEventListener("click",()=>{
  const lines=[["Student","Class","Subjects","Location","Monthly fee","Status","Start date"],...db.tuitions.map(t=>[t.studentName,t.classLevel,t.subjects,t.location,t.monthlyFee,t.status,t.startDate])];
  const csv=lines.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  downloadBlob(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),`tuitionflow-tuitions-${todayISO()}.csv`);showToast("CSV exported.");
});
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
$("sampleDataBtn").addEventListener("click",()=>{
  if(db.tuitions.length&&!confirm("This will add sample records to your current workspace. Continue?"))return;
  const a={id:uid(),studentName:"Student A",classLevel:"Class 10",school:"Model High School",subjects:"Mathematics, Physics",guardianPhone:"01700000001",location:"Santosh, Tangail",monthlyFee:5000,paymentDay:5,startDate:todayISO(),status:"active",notes:"Focus on algebra and mechanics."};
  const b={id:uid(),studentName:"Student B",classLevel:"Class 8",school:"City School",subjects:"Science, Mathematics",guardianPhone:"01700000002",location:"Tangail Sadar",monthlyFee:4000,paymentDay:10,startDate:todayISO(),status:"active",notes:"Weekly homework review."};
  const c={id:uid(),studentName:"Student C",classLevel:"Class 7",school:"Public School",subjects:"English",guardianPhone:"01700000003",location:"Near campus",monthlyFee:3000,paymentDay:7,startDate:todayISO(),status:"active",notes:"Improve grammar and writing."};
  db.tuitions.push(a,b,c);
  const times=[["16:00","17:00"],["18:00","19:00"],["19:30","20:30"]];
  [a,b,c].forEach((t,i)=>db.sessions.push({id:uid(),tuitionId:t.id,date:todayISO(),startTime:times[i][0],endTime:times[i][1],status:i===0?"completed":"scheduled",attendance:i===0?"present":"not_marked",topic:["Algebra practice","Force and motion","Grammar basics"][i],notes:"Sample session"}));
  db.payments.push({id:uid(),tuitionId:a.id,amount:5000,date:todayISO(),month:monthISO(),method:"bkash",status:"received",note:"Monthly tuition fee"},{id:uid(),tuitionId:c.id,amount:1500,date:todayISO(),month:monthISO(),method:"cash",status:"received",note:"Partial fee"});
  db.reminders.push({id:uid(),title:"Collect Student B's tuition fee",date:todayISO(),type:"payment",details:"Follow up with guardian.",done:false});
  db.expenses.push({id:uid(),title:"Transport",amount:250,date:todayISO(),category:"transport",note:"Travel to tuition"});
  saveDB();renderAll();showToast("Sample records added.");
});
$("clearDataBtn").addEventListener("click",()=>{
  if(!confirm("Clear all tuition, schedule, payment, reminder, and expense records for this account? This cannot be undone."))return;
  db={tuitions:[],sessions:[],payments:[],reminders:[],expenses:[]};saveDB();renderAll();showToast("Workspace data cleared.");
});

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────
const SUPABASE_URL = 'https://dydkcromilomebqpdpid.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZGtjcm9taWxvbWVicXBkcGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDg4MjcsImV4cCI6MjA5MDMyNDgyN30.Nf_gF6wnmQFdatzdPPCkYkIMNViVsdapZM28LztQfY8';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Current logged-in user
let CURRENT_USER = null;
let CURRENT_PROFILE = null;


const S = {
  role:'admin', page:'dashboard',
  quiz:{q:0,sel:null,answered:false,score:0,done:false}, // legacy, kept for saveProgress compat
  quizStates:{}, // per-module quiz state, keyed by "courseId_modIdx"
  activeQuizKey:null, // tracks which quiz is currently open (for pickAns/retakeQuiz)
  videoWatched:false,
  progress:35,
  signedOff:false,
  activeCourseId:1,
  quizReady:false,
  dismissedAnnouncements:[],
  acknowledgedAnnouncements:[],
  courseProgress:{},
  completedModules:{},
  completedCourses:{},
  uploads:{},
  formResponses:{},
  courseDrafts:{},
  dismissedNotifs:[]
};

// Returns (creating if needed) the quiz state for a specific module
function getModQuizState(courseId, modIdx){
  const key = courseId+'_'+modIdx;
  if(!S.quizStates[key]){
    S.quizStates[key]={q:0,sel:null,answered:false,score:0,done:false,ready:false};
  }
  return S.quizStates[key];
}

// Hardcoded role overrides — these take priority over whatever is in Supabase.
// Use this to ensure admins always get the right role even if their profile row got corrupted.
const ROLE_OVERRIDES = {
  'eleni@theabscompany.com': 'admin',
};

const USERS = {
  admin:{name:'Eleni Gagnon',initials:'EG',role:'Admin',avBg:'#dbeafe',avCol:'#1a4fa0'},
  manager:{name:'Sean Kirby',initials:'SK',role:'VP of Sales',avBg:'#faeeda',avCol:'#8a5a00'},
  learner:{name:'Kristin Harrington',initials:'KH',role:'Sales Manager',avBg:'#fef3dc',avCol:'#8a5a00'},
  executive:{name:'Michael Ritter',initials:'MR',role:'President',avBg:'#fce4ec',avCol:'#c62828'},
};

const COURSES = [
  {id:1, emoji:'🏢',title:'Who We Are, What We Do & How We Do It', cat:'Onboarding',color:'#dbeafe',mods:7,dur:'45 minutes',enrolled:18,completed:0,dueDate:'2026-03-20'},
  {id:2, emoji:'⭐',title:'Core Values',                    cat:'Onboarding',color:'#fef3dc',mods:3,dur:'15 minutes',enrolled:18,completed:0},
  {id:5, emoji:'🗓️',title:'Your First Week',               cat:'Onboarding',color:'#e1f5ee',mods:4,dur:'25 minutes',enrolled:18,completed:0,dueDate:'2026-04-15'},
  {id:6, emoji:'🛠️',title:'Tools We Use',                  cat:'Onboarding',color:'#faeeda',mods:3,dur:'20 minutes',enrolled:18,completed:0},
  {id:7, emoji:'📋',title:'Policies & Expectations',       cat:'Onboarding',color:'#fdeaea',mods:4,dur:'30 minutes',enrolled:18,completed:0,dueDate:'2026-04-04'},
  {id:8, emoji:'💰',title:'Compensation & Benefits',       cat:'Onboarding',color:'#e8f0fd',mods:4,dur:'25 minutes',enrolled:18,completed:0},
  {id:9, emoji:'🎯',title:'Your Role & Goals',             cat:'Onboarding',color:'#eaf3de',mods:3,dur:'20 minutes',enrolled:18,completed:0},
  {id:1774657566975,emoji:'📚',title:'Products',           cat:'Sales',     color:'#dbeafe',mods:1,dur:'30 minutes',enrolled:0,completed:0},
];


const LEARNERS = [
  {name:'Eleni Gagnon',ini:'EG',bg:'#dbeafe',tc:'#1a4fa0',dept:'Operations',title:'COO',email:'eleni@theabscompany.com',manager:'Sean Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9],role:'admin'},
  {name:'Sean Gagnon',ini:'SG',bg:'#e8f5e3',tc:'#2d6a1f',dept:'Sales',title:'CEO',email:'sean@theabscompany.com',manager:'Sean Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Joyce Granville',ini:'JG',bg:'#f0edfe',tc:'#4a38b0',dept:'Operations',title:'Operations Specialist',email:'joyce@theabscompany.com',manager:'Eleni Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Kristin Harrington',ini:'KH',bg:'#fef3dc',tc:'#8a5a00',dept:'Sales',title:'Sales Manager',email:'kristin@theabscompany.com',manager:'Sean Kirby',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Kim Healey',ini:'KH',bg:'#fdeaea',tc:'#8a1f1f',dept:'Operations',title:'Vice President',email:'kim@theabscompany.com',manager:'Eleni Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Ryan Healey',ini:'RH',bg:'#e1f5ee',tc:'#0f6e56',dept:'Sales',title:'Director of Key Accounts',email:'ryan@theabscompany.com',manager:'Sean Kirby',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'DJ Hoffman',ini:'DH',bg:'#e8f0fd',tc:'#185FA5',dept:'Operations',title:'Customer Experience Manager',email:'dj@theabscompany.com',manager:'Eleni Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Sean Kirby',ini:'SK',bg:'#faeeda',tc:'#8a5a00',dept:'Sales',title:'VP of Sales',email:'skirby@theabscompany.com',manager:'Sean Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Alexia Petrakos',ini:'AP',bg:'#eaf3de',tc:'#3b6d11',dept:'Marketing',title:'Digital Operations Manager',email:'alexia@theabscompany.com',manager:'Cynthia Ramos',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Cynthia Ramos',ini:'CR',bg:'#faece7',tc:'#993c1d',dept:'Marketing',title:'VP of Marketing',email:'cindy@theabscompany.com',manager:'Sean Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Joseph Ramos',ini:'JR',bg:'#f0ede8',tc:'#5a4a3a',dept:'Marketing',title:'Graphic Designer',email:'joseph@theabscompany.com',manager:'Cynthia Ramos',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Kevin Ramos',ini:'KR',bg:'#e8eaf6',tc:'#3949ab',dept:'Marketing',title:'Director of E-Commerce',email:'kevin@theabscompany.com',manager:'Cynthia Ramos',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Michael Ritter',ini:'MR',bg:'#fce4ec',tc:'#c62828',dept:'Sales',title:'President',email:'michael@theabscompany.com',manager:'Sean Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Josh Brand',ini:'JB',bg:'#e0f7fa',tc:'#00838f',dept:'Sales',title:'Director of International Sales',email:'josh@theabscompany.com',manager:'Sean Kirby',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Racquel Pagaduan',ini:'RP',bg:'#f3e5f5',tc:'#7b1fa2',dept:'Operations',title:'Operations Coordinator',email:'racquel@theabscompany.com',manager:'Eleni Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Madelyn Racraquin',ini:'MR',bg:'#fff8e1',tc:'#b45309',dept:'Operations',title:'Sales Coordinator',email:'madelyn@theabscompany.com',manager:'Eleni Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Denise Grace Hernandez',ini:'DH',bg:'#e8f5e9',tc:'#2e7d32',dept:'Operations',title:'Operations Coordinator',email:'denise@theabscompany.com',manager:'Eleni Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
  {name:'Jhoysan Semilla',ini:'JS',bg:'#fbe9e7',tc:'#bf360c',dept:'Operations',title:'Sales Coordinator',email:'jhoysan@theabscompany.com',manager:'Eleni Gagnon',start:'Apr 1, 2026',prog:0,overdue:0,status:'not-started',account:'active',assignedCourses:[1,2,5,6,7,8,9]},
];

const QUIZ = [
  {q:"What is the primary purpose of the company's Code of Conduct?",
   opts:["To outline employee benefits","To define acceptable behavior and ethical standards","To describe IT security protocols","To list product features"],correct:1},
  {q:"How quickly must a potential data breach be reported to IT Security?",
   opts:["Within 24 hours","Within 1 week","Immediately upon discovery","At the next team meeting"],correct:2},
  {q:"Which of the following is a valid use of company resources?",
   opts:["Running a personal side business","Sharing login credentials with a colleague","Using work devices for approved job tasks","Downloading unlicensed software"],correct:2},
  {q:"Who should you contact first if you witness workplace misconduct?",
   opts:["Your direct manager or HR","A colleague you trust","Company legal team","External media"],correct:0},
];

const CATS = [
  {name:'Onboarding',          desc:'Everything a new team member needs to get up to speed at The Abs Company.'},
  {name:'Sales',               desc:'Sales process, outreach strategies, tools, and closing techniques.'},
  {name:'Human Resources',     desc:'Policies, benefits, performance expectations, and employee resources.'},
  {name:'Operations',          desc:'Workflows, processes, systems, and how we keep things running smoothly.'},
  {name:'Customer Experience', desc:'How we serve our customers, handle inquiries, and build lasting relationships.'},
  {name:'Marketing',           desc:'Brand guidelines, campaigns, content strategy, and digital marketing.'},
];


const NAV = {
  admin:[
    {icon:'📊',label:'Dashboard',page:'dashboard'},
    {icon:'📢',label:'Announcements',page:'announcements'},
    {icon:'🗂️',label:'Course Library',page:'courses'},
    {icon:'➕',label:'Create Course',page:'create',sub:true},
    {icon:'👤',label:'People',page:'people'},
    {icon:'📈',label:'Reports',page:'reports'},
    {icon:'📧',label:'EOD Report',page:'eod',sub:true},
  ],
  manager:[
    {icon:'📊',label:'Dashboard',page:'dashboard'},
    {icon:'👤',label:'My Team',page:'people'},
    {icon:'📈',label:'Team Reports',page:'reports'},
    {icon:'📧',label:'EOD Report',page:'eod',sub:true},
    {icon:'📢',label:'Announcements',page:'announcements'},
    {divider:'My Learning'},
    {icon:'📚',label:'My Courses',page:'my-courses'},
    {icon:'📖',label:'Policies & Processes',page:'playbook'},
    {icon:'🏆',label:'Completed',page:'completed'},
  ],
  learner:[
    {icon:'🏠',label:'My Dashboard',page:'dashboard'},
    {icon:'📚',label:'My Courses',page:'my-courses'},
    {icon:'📖',label:'Policies & Processes',page:'playbook'},
    {icon:'🏆',label:'Completed',page:'completed'},
  ],
  executive:[
    {icon:'📊',label:'Overview',page:'dashboard'},
    {icon:'📈',label:'Reports',page:'reports'},
    {icon:'👥',label:'Team Roster',page:'learners'},
  ]
};

// ─── DARK MODE ─────────────────────────────────────────────────────────────
function toggleDark(){
  document.body.classList.toggle('dark');
  const isDark=document.body.classList.contains('dark');
  document.getElementById('darkBtn').textContent=isDark?'☀️':'🌙';
  localStorage.setItem('tac-dark',isDark?'1':'0');
}
// restore preference
if(localStorage.getItem('tac-dark')==='1'){
  document.body.classList.add('dark');
  document.getElementById('darkBtn').textContent='☀️';
}

// ─── MOBILE SIDEBAR ────────────────────────────────────────────────────────
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
// Static admin/manager notifications
const NOTIFICATIONS = [
  {id:2,icon:'⚠️',text:'Sofia Marin is overdue on 2 courses',time:'1 hour ago',unread:true,action:'people'},
  {id:3,icon:'📋',text:'Code of Conduct was updated — 3 team members yet to acknowledge',time:'2 hours ago',unread:true,action:'playbook'},
  {id:4,icon:'👤',text:'Lei Zhang is overdue on Compliance & Ethics',time:'Yesterday',unread:false,action:'people'},
  {id:5,icon:'🏆',text:'Marcus Webb completed all assigned courses',time:'Yesterday',unread:false,action:'people'},
];

// Dynamically build learner notifications from live state
function getLearnerNotifs(){
  const learner=LEARNERS.find(l=>l.name===USERS[S.role].name)||LEARNERS[0];
  const assignedIds=learner?.assignedCourses||[];
  const today=new Date(); today.setHours(0,0,0,0);
  const dismissed=S.dismissedNotifs||[];
  const notifs=[];

  assignedIds.forEach(id=>{
    const co=COURSES.find(c=>c.id===id);
    if(!co) return;
    const pct=getCoursePct(id);
    const isCompleted=!!(S.completedCourses?.[id]);

    // Overdue course
    if(co.dueDate && !isCompleted){
      const due=new Date(co.dueDate); due.setHours(0,0,0,0);
      const diffDays=Math.round((due-today)/(1000*60*60*24));
      if(diffDays<0){
        const nid=`overdue_${id}`;
        notifs.push({id:nid,icon:'🚨',text:`"${co.title}" is overdue`,
          time:`${Math.abs(diffDays)} day${Math.abs(diffDays)!==1?'s':''} past due`,
          unread:!dismissed.includes(nid),action:'my-courses',priority:0});
        return; // skip lower-priority checks for this course
      }
      // Due within 7 days
      if(diffDays<=7){
        const nid=`duesoon_${id}`;
        notifs.push({id:nid,icon:'⏰',text:`"${co.title}" is due in ${diffDays} day${diffDays!==1?'s':''}`,
          time:'Coming up',unread:!dismissed.includes(nid),action:'my-courses',priority:1});
        return;
      }
    }

    // Completed
    if(isCompleted){
      const nid=`done_${id}`;
      notifs.push({id:nid,icon:'🏆',text:`You completed "${co.title}"`,
        time:'Completed',unread:false,action:'completed',priority:4});
      return;
    }

    // In progress
    if(pct>0){
      const nid=`inprogress_${id}`;
      notifs.push({id:nid,icon:'▶️',text:`Continue "${co.title}" — ${pct}% done`,
        time:'In progress',unread:false,action:'my-courses',priority:2});
      return;
    }

    // Not started
    const nid=`notstarted_${id}`;
    notifs.push({id:nid,icon:'📚',text:`"${co.title}" hasn't been started yet`,
      time:'Not started',unread:false,action:'my-courses',priority:3});
  });

  notifs.sort((a,b)=>a.priority-b.priority);
  return notifs;
}

function renderNotifPanel(){
  const notifs=(S.role==='learner'||S.role==='manager')?getLearnerNotifs():NOTIFICATIONS;
  const unread=notifs.filter(n=>n.unread).length;
  const dot=document.getElementById('bellDot');
  if(dot) dot.style.display=unread>0?'block':'none';
  const list=document.getElementById('notifList');
  if(!list) return;
  list.innerHTML=notifs.map(n=>`
    <div class="notif-item ${n.unread?'unread':''}" onclick="clickNotif('${n.id}','${n.action}')">
      <div style="font-size:18px;flex-shrink:0">${n.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;line-height:1.4;color:var(--text)">${n.text}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${n.time}</div>
      </div>
      ${n.unread?`<div class="notif-dot"></div>`:''}
    </div>`).join('')||`<div style="padding:20px;text-align:center;font-size:13px;color:var(--text3)">All caught up! 🎉</div>`;
}

function toggleNotifPanel(){
  const panel=document.getElementById('notifPanel');
  panel.classList.toggle('open');
  if(panel.classList.contains('open')) renderNotifPanel();
  setTimeout(()=>{
    document.addEventListener('click',closeNotifOnOutside,{once:true});
  },0);
}

function closeNotifOnOutside(e){
  const panel=document.getElementById('notifPanel');
  const bell=document.getElementById('bellBtn');
  if(panel&&!panel.contains(e.target)&&!bell.contains(e.target)){
    panel.classList.remove('open');
  }
}

function clickNotif(id,action){
  if(S.role==='learner'||S.role==='manager'){
    if(!S.dismissedNotifs.includes(id)) S.dismissedNotifs.push(id);
  } else {
    const n=NOTIFICATIONS.find(x=>x.id===parseInt(id));
    if(n) n.unread=false;
  }
  renderNotifPanel();
  document.getElementById('notifPanel').classList.remove('open');
  go(action||'my-courses');
}

function markAllRead(){
  if(S.role==='learner'||S.role==='manager'){
    getLearnerNotifs().forEach(n=>{if(!S.dismissedNotifs.includes(n.id))S.dismissedNotifs.push(n.id);});
  } else {
    NOTIFICATIONS.forEach(n=>n.unread=false);
  }
  renderNotifPanel();
}

// init bell dot on load
setTimeout(renderNotifPanel,100);

function switchRole(role){
  S.role=role;
  const u=USERS[role];
  document.getElementById('sidebarAv').textContent=u.initials;
  document.getElementById('sidebarAv').style.background=u.avBg;
  document.getElementById('sidebarAv').style.color=u.avCol;
  document.getElementById('sidebarName').textContent=u.name;
  document.getElementById('sidebarRole').textContent=u.role;
  // Always sync the dropdown so browser form-restore can't override it
  const sel=document.getElementById('roleSelect');
  if(sel && sel.value!==role) sel.value=role;
  renderNav();
  go('dashboard');
}

function renderNav(){
  // Role switcher is only for users whose actual Supabase role is admin
  // Use S.actualRole so it stays visible even when previewing as Learner
  const rs=document.getElementById('roleSwitcher');
  if(rs) rs.style.display=(S.actualRole||S.role)==='admin'?'':'none';

  const el=document.getElementById('sidebarNav');
  const items=NAV[S.role];
  // track collapsed state
  if(S.navCollapsed===undefined) S.navCollapsed={};

  el.innerHTML=items.map(n=>{
    if(n.divider) return `<div class="nav-section-label" style="margin-top:10px;border-top:1px solid #1a1a1a;padding-top:10px">${n.divider}</div>`;
    if(n.sub){
      // find if parent is collapsed
      const parentPage=items[items.indexOf(n)-1]?.page;
      if(S.navCollapsed[parentPage]) return '';
      return `<div class="nav-item nav-sub${S.page===n.page?' active':''}" onclick="go('${n.page}')">
        <span style="width:18px;flex-shrink:0"></span>
        <span style="font-size:12px;color:inherit">${n.label}</span>
        ${n.badge?`<span class="nav-badge${n.badgeRed?' red':''}">${n.badge}</span>`:''}
      </div>`;
    }
    // check if this item has sub-children
    const hasSubs=items[items.indexOf(n)+1]?.sub;
    const isCollapsed=S.navCollapsed[n.page];
    return `<div class="nav-item${S.page===n.page?' active':''}" onclick="${hasSubs?`toggleNavGroup('${n.page}');`:``}go('${n.page}')">
      <span class="nav-icon">${n.icon}</span>
      <span style="flex:1">${n.label}</span>
      ${hasSubs?`<span style="font-size:10px;color:var(--text3);transition:transform 0.2s;display:inline-block;transform:rotate(${isCollapsed?'0':'90'}deg)">▶</span>`:''}
      ${n.badge?`<span class="nav-badge${n.badgeRed?' red':''}">${n.badge}</span>`:''}
    </div>`;
  }).join('');
}

function toggleNavGroup(page){
  if(S.navCollapsed===undefined) S.navCollapsed={};
  S.navCollapsed[page]=!S.navCollapsed[page];
  renderNav();
}

function go(page){
  S.page=page;
  if(page!=='reports'){_rptTab='overview';_rptCourse=null;_rptLearner=null;}
  closeSidebar();
  renderNav();
  const titles={
    dashboard:'Dashboard',
    courses:'Course Library',
    create:'Create Course',
    people:S.role==='manager'?'My Team':'People',
    announcements:'Announcements',
    eod:'EOD Report',
    signoffs:'EOD Report',
    policies:'Policies & Processes',
    playbook:(S.role==='learner'||S.role==='manager')?'Policies & Processes':'Course Library',
    'playbook-create':'Add Subject',
    reports:'Reports & Analytics',
    'my-courses':'My Courses','course-detail':'Continue Learning',completed:'Completed Courses'
  };
  document.getElementById('pageTitle').textContent=titles[page]||page;
  document.getElementById('pageCrumb').textContent='Home / '+(titles[page]||page);
  document.getElementById('topbarRight').innerHTML='';
  const c=document.getElementById('mainContent');
  ({
    dashboard:()=>renderDashboard(c),
    content:()=>renderContentLibrary(c),
    courses:()=>renderContentLibrary(c),
    create:()=>renderCreate(c),
    people:()=>renderPeople(c),
    learners:()=>renderPeople(c),
    users:()=>renderPeople(c),
    announcements:()=>renderAnnouncements(c),
    policies:()=>renderPolicies(c),
    playbook:()=>renderPlaybook(c),
    'playbook-create':()=>renderPlaybookCreate(c),
    eod:()=>renderEODReport(c),
    signoffs:()=>renderEODReport(c),
    reports:()=>renderReports(c),
    'my-courses':()=>renderMyCourses(c),
    'course-detail':()=>renderCourseDetail(c),
    completed:()=>renderCompleted(c),
  }[page]||function(){c.innerHTML=`<div class="empty"><div class="empty-icon">🚧</div><div class="empty-title">Coming Soon</div></div>`})();
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
function renderDashboard(c){
  if(S.role==='learner'){
    const u=USERS[S.role];
    const firstName=u.name.split(' ')[0];
    const learner=LEARNERS.find(l=>l.name===u.name)||LEARNERS[0];
    const assignedIds=learner?.assignedCourses||[];
    const assignedCourses=COURSES.filter(co=>assignedIds.includes(co.id));
    const completedCount=Object.keys(S.completedCourses||{}).length;
    const totalModules=assignedCourses.reduce((sum,co)=>{
      const mods=(COURSE_MODULES[co.id]||[]).filter(m=>m.status==='published'||!m.status);
      return sum+mods.length;
    },0);
    const doneModules=assignedCourses.reduce((sum,co)=>{
      const mods=(COURSE_MODULES[co.id]||[]).filter(m=>m.status==='published'||!m.status);
      const done=(S.completedModules?.[co.id]||[]).length;
      return sum+Math.min(done,mods.length);
    },0);
    const overallPct=totalModules?Math.round(doneModules/totalModules*100):0;

    c.innerHTML=`
    <div style="margin-bottom:20px">
      <div style="font-size:22px;font-weight:600">Welcome, ${firstName}! 👋</div>
      <div style="font-size:13px;color:var(--text2);margin-top:3px">Here's where you left off.</div>
    </div>
    <div class="grid4 section-gap">
      <div class="metric-card"><div class="metric-label">Assigned</div><div class="metric-value">${assignedCourses.length}</div></div>
      <div class="metric-card"><div class="metric-label">Completed</div><div class="metric-value" style="color:var(--success)">${completedCount}</div></div>
      <div class="metric-card"><div class="metric-label">In Progress</div><div class="metric-value" style="color:var(--accent)">${assignedCourses.length-completedCount}</div></div>
      <div class="metric-card"><div class="metric-label">Overall Progress</div><div class="metric-value">${overallPct}%</div></div>
    </div>

    <!-- Full-width overall progress bar -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:13px;font-weight:600">Overall Progress</div>
        <div style="font-size:13px;font-weight:600;color:var(--accent)">${overallPct}%</div>
      </div>
      <div style="height:12px;background:var(--bg);border-radius:6px;overflow:hidden;width:100%">
        <div style="height:100%;border-radius:6px;background:linear-gradient(90deg,var(--brand-gold),#52a83a);width:${overallPct}%;transition:width 0.5s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <span style="font-size:11px;color:var(--text3)">Keep going, ${firstName}!</span>
        <span style="font-size:11px;color:var(--text3)">${doneModules} of ${totalModules} modules complete</span>
      </div>
    </div>

    <!-- Announcements feed -->
    ${(()=>{
      const visible=ANNOUNCEMENTS.filter(a=>!S.dismissedAnnouncements?.includes(a.id));
      if(!visible.length) return '';
      return `<div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">📢 Announcements</div>
        ${visible.map(a=>`
        <div id="anno-${a.id}" style="display:flex;align-items:start;gap:12px;padding:14px 16px;background:var(--surface);border:1px solid ${a.pinned?'var(--brand-gold)':'var(--border)'};border-radius:var(--radius-lg);margin-bottom:8px;${a.pinned?'border-left:3px solid var(--brand-gold)':''}">
          <div style="font-size:22px;flex-shrink:0">${a.emoji}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;margin-bottom:3px">${a.title}</div>
            <div style="font-size:12px;color:var(--text2);line-height:1.6">${a.body}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:5px">${a.author} · ${a.date}</div>
            <label style="display:flex;align-items:center;gap:7px;margin-top:10px;cursor:pointer;font-size:12px;color:var(--text2);user-select:none">
              <input type="checkbox" id="ack-${a.id}" ${S.acknowledgedAnnouncements?.includes(a.id)?'checked':''} onchange="acknowledgeAnnouncement(${a.id},this)" style="width:auto;accent-color:var(--brand-gold)">
              <span id="ack-label-${a.id}" style="color:${S.acknowledgedAnnouncements?.includes(a.id)?'var(--success)':'var(--text3)'}">
                ${S.acknowledgedAnnouncements?.includes(a.id)?'✓ Acknowledged':'I have read and understood this announcement'}
              </span>
            </label>
          </div>
          <button onclick="dismissAnnouncement(${a.id})" style="flex-shrink:0;background:none;border:none;cursor:pointer;color:var(--text3);font-size:16px;padding:2px 4px;line-height:1;border-radius:4px" title="Dismiss">✕</button>
        </div>`).join('')}
      </div>`;
    })()}
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="card-title" style="margin:0">My Courses</div>
        <button class="btn btn-primary btn-sm" onclick="go('my-courses')">View All →</button>
      </div>
      <div class="table-wrap">
        <table id="dashCourseTable">
          <thead>
            <tr>
              <th onclick="sortDashTable(0)" style="cursor:pointer;width:40%">Course <span id="sort0">↕</span></th>
              <th onclick="sortDashTable(1)" style="cursor:pointer;width:20%">Category <span id="sort1">↕</span></th>
              <th onclick="sortDashTable(2)" style="cursor:pointer;width:20%">Progress <span id="sort2">↕</span></th>
              <th onclick="sortDashTable(3)" style="cursor:pointer;width:20%">Status <span id="sort3">↕</span></th>
            </tr>
          </thead>
          <tbody id="dashCourseBody">
            ${(()=>{
              const learner=LEARNERS.find(l=>l.name===USERS[S.role].name)||LEARNERS[0];
              const assignedIds=learner?.assignedCourses||COURSES.map(co=>co.id);
              const allOrdered=CATS.flatMap(cat=>getOrderedCourses(cat.name));
              const myCourses=allOrdered.filter(co=>assignedIds.includes(co.id));
              return myCourses.map(co=>{
                const pct=getCoursePct(co.id);
                const status=pct===100?'Done':pct>0?'In Progress':'Not Started';
                const statusBadge=pct===100?'badge-success':pct>0?'badge-blue':'badge-gray';
                return `<tr onclick="openLearnerCourse(${co.id})" style="cursor:pointer">
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:28px;height:28px;border-radius:6px;background:${co.color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${co.emoji}</div>
                      <span style="font-weight:500">${co.title}</span>
                    </div>
                  </td>
                  <td><span class="badge badge-gray">${co.cat}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:6px">
                      <div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden;min-width:60px">
                        <div style="height:100%;border-radius:3px;background:${pct===100?'var(--success)':'var(--brand-gold)'};width:${pct}%"></div>
                      </div>
                      <span style="font-size:11px;color:var(--text3);min-width:28px">${pct}%</span>
                    </div>
                  </td>
                  <td><span class="badge ${statusBadge}">${status}</span></td>
                </tr>`;
              }).join('');
            })()}
          </tbody>
        </table>
      </div>
    </div>`;
  } else if(S.role==='executive'){
    const total=LEARNERS.length;
    const completed=LEARNERS.filter(l=>l.status==='complete').length;
    const compRate=total?Math.round(completed/total*100):0;
    const overdue=LEARNERS.filter(l=>l.overdue>0).length;
    c.innerHTML=`
    <div class="grid4 section-gap">
      <div class="metric-card"><div class="metric-label">Total Learners</div><div class="metric-value">${total}</div></div>
      <div class="metric-card"><div class="metric-label">Completion Rate</div><div class="metric-value">${compRate}%</div></div>
      <div class="metric-card"><div class="metric-label">Active Courses</div><div class="metric-value">${COURSES.length}</div><div class="metric-delta">${CATS.filter(cat=>(COURSE_MODULES[cat.name]||[]).length>0||COURSES.some(c=>c.cat===cat.name)).length} categories</div></div>
      <div class="metric-card"><div class="metric-label">Overdue Learners</div><div class="metric-value" style="color:${overdue?'var(--danger)':'var(--success)'}">${overdue}</div><div class="metric-delta ${overdue?'down':'up'}">${overdue?'Need follow-up':'All on track ✓'}</div></div>
    </div>
    <div class="card">
      <div class="card-title">Completion by Course</div>
      ${COURSES.map(co=>{
        const enrolled=LEARNERS.filter(l=>l.assignedCourses?.includes(co.id)).length;
        const done=LEARNERS.filter(l=>l.assignedCourses?.includes(co.id)&&l.status==='complete').length;
        const pct=enrolled?Math.round(done/enrolled*100):0;
        return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:13px">
          <div style="font-size:20px;width:28px;text-align:center">${co.emoji}</div>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
              <span style="font-weight:500">${co.title}</span>
              <span style="color:var(--text2)">${done}/${enrolled} (${pct}%)</span>
            </div>
            <div class="progress-bar" style="margin:0"><div class="progress-fill ${pct>70?'green':pct>40?'':'amber'}" style="width:${pct}%"></div></div>
          </div>
          <span class="badge ${pct>=80?'badge-success':pct>=50?'badge-blue':'badge-warn'}">${pct}%</span>
        </div>`;
      }).join('')}
    </div>`;
  } else {
    // Admin + Manager dashboard
    const isAdmin=S.role==='admin';
    const u=USERS[S.role];
    const team=isAdmin?LEARNERS:LEARNERS.filter(l=>l.manager===u.name);
    const total=team.length;
    const completed=team.filter(l=>l.status==='complete').length;
    const compRate=total?Math.round(completed/total*100):0;
    const overdue=team.filter(l=>l.overdue>0).length;
    const inProgress=team.filter(l=>l.status==='in-progress').length;

    // dept breakdown from real team
    const deptMap={};
    team.forEach(l=>{
      if(!deptMap[l.dept]) deptMap[l.dept]=[];
      deptMap[l.dept].push(l);
    });

    c.innerHTML=`
    <div class="grid4 section-gap">
      <div class="metric-card"><div class="metric-label">${isAdmin?'Total Learners':'My Team'}</div><div class="metric-value">${total}</div></div>
      <div class="metric-card"><div class="metric-label">Completion Rate</div><div class="metric-value" style="color:${compRate>70?'var(--success)':compRate>40?'var(--accent)':'var(--danger)'}">${compRate}%</div></div>
      <div class="metric-card"><div class="metric-label">In Progress</div><div class="metric-value" style="color:var(--accent)">${inProgress}</div></div>
      <div class="metric-card"><div class="metric-label">Overdue</div><div class="metric-value" style="color:${overdue?'var(--danger)':'var(--success)'}">${overdue}</div><div class="metric-delta ${overdue?'down':'up'}">${overdue?'Need follow-up':'All on track ✓'}</div></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-title">Team Progress</div>
        ${Object.entries(deptMap).map(([dept,members])=>{
          const avgProg=Math.round(members.reduce((s,l)=>s+l.prog,0)/members.length);
          return `
          <div style="margin-bottom:14px">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:6px">
              <span style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em">${dept}</span>
              <span style="font-size:11px;color:var(--text2)">${members.length} member${members.length>1?'s':''} · avg ${avgProg}%</span>
            </div>
            ${members.map(l=>`
            <div class="learner-row" style="padding:7px 0">
              <div class="av av-md" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                  <span style="font-size:13px;font-weight:500">${l.name}</span>
                  <span style="font-size:11px;color:var(--text3)">${l.prog}%</span>
                </div>
                <div class="progress-bar" style="margin:0 0 2px"><div class="progress-fill ${l.prog===100?'green':l.prog>60?'':'amber'}" style="width:${l.prog}%"></div></div>
                ${l.overdue>0?`<div style="font-size:10px;color:var(--danger)">${l.overdue} overdue</div>`:''}
              </div>
              <span class="badge ${l.status==='complete'?'badge-success':l.overdue>0?'badge-danger':'badge-warn'}">${l.status==='complete'?'Done':l.overdue>0?'Overdue':'Active'}</span>
            </div>`).join('')}
          </div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="card-title">Course Overview</div>
        ${COURSES.map(co=>{
          const pct=Math.round(co.completed/co.enrolled*100);
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:11px">
            <div style="font-size:18px">${co.emoji}</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:500;margin-bottom:3px">${co.title}</div>
              <div class="progress-bar" style="margin:0"><div class="progress-fill green" style="width:${pct}%"></div></div>
            </div>
            <span style="font-size:11px;color:var(--text2)">${co.completed}/${co.enrolled}</span>
          </div>`;
        }).join('')}
        <button class="btn btn-sm" style="width:100%;margin-top:8px" onclick="go('reports')">View Full Reports →</button>
      </div>
    </div>
    ${S.role==='manager'?(()=>{
      const learner=LEARNERS.find(l=>l.name===u.name)||LEARNERS[0];
      const assignedIds=learner?.assignedCourses||[];
      const assignedCourses=COURSES.filter(co=>assignedIds.includes(co.id));
      const overallPct=assignedCourses.length?(()=>{
        const total=assignedCourses.reduce((s,co)=>{
          return s+(COURSE_MODULES[co.id]||[]).filter(m=>m.status==='published'||!m.status).length;
        },0);
        const done=assignedCourses.reduce((s,co)=>{
          return s+(S.completedModules?.[co.id]||[]).length;
        },0);
        return total?Math.round(done/total*100):0;
      })():0;
      return `
      <div class="card" style="margin-top:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div class="card-title" style="margin:0">My Learning</div>
          <button class="btn btn-sm" onclick="go('my-courses')">View All →</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surface2);border-radius:var(--radius-lg);margin-bottom:14px">
          <div style="flex:1">
            <div style="font-size:12px;color:var(--text3);margin-bottom:4px">Overall Progress</div>
            <div class="progress-bar" style="margin:0"><div class="progress-fill ${overallPct===100?'green':''}" style="width:${overallPct}%;background:${overallPct===100?'var(--success)':'var(--brand-gold)'}"></div></div>
          </div>
          <div style="font-size:18px;font-weight:700;color:var(--accent);min-width:40px;text-align:right">${overallPct}%</div>
        </div>
        ${assignedCourses.slice(0,4).map(co=>{
          const pct=getCoursePct(co.id);
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer" onclick="openLearnerCourse(${co.id})">
            <div style="width:28px;height:28px;border-radius:6px;background:${co.color};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${co.emoji}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:500;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${co.title}</div>
              <div class="progress-bar" style="margin:0;height:4px"><div class="progress-fill" style="width:${pct}%;height:4px;background:${pct===100?'var(--success)':'var(--brand-gold)'}"></div></div>
            </div>
            <span style="font-size:11px;color:var(--text2);min-width:28px;text-align:right">${pct}%</span>
          </div>`;
        }).join('')}
      </div>`;
    })():''}
    `;
  }
}

// track course order per category
const CAT_ORDER = {
  Onboarding:[1,2,5,6,7,8,9],
  Sales:[1774657566975],
  'Human Resources':[],
  Operations:[],
  'Customer Experience':[],
  Marketing:[]
};
CATS.forEach(cat=>{
  CAT_ORDER[cat.name] = COURSES.filter(co=>co.cat===cat.name).map(co=>co.id);
});

// ─── CONTENT LIBRARY (unified courses + SOPs) ──────────────────────────────
function renderContentLibrary(c){
  const tr=document.getElementById('topbarRight');
  tr.innerHTML=`
    <button class="btn btn-sm" onclick="go('create')">+ New Course</button>
    <button class="btn btn-primary btn-sm" onclick="openCreateDoc()">+ New Document</button>`;

  // render shell with tabs, content filled by tab switch
  c.innerHTML=`
    <div class="tab-bar" id="contentTabBar">
      <div class="tab active" onclick="switchContentTab(this,'cl-courses')">📚 Courses</div>
      <div class="tab" onclick="switchContentTab(this,'cl-docs')">📋 SOPs & Docs</div>
    </div>
    <div id="cl-courses"></div>
    <div id="cl-docs" style="display:none"></div>`;

  // populate both tabs
  renderCoursesTab(document.getElementById('cl-courses'));
  renderDocsTab(document.getElementById('cl-docs'));
}

function switchContentTab(el, id){
  el.closest('.tab-bar').querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  ['cl-courses','cl-docs'].forEach(tid=>{
    const el2=document.getElementById(tid);
    if(el2) el2.style.display=tid===id?'block':'none';
  });
}

function renderCoursesTab(container){
  if(!container) return;
  renderCourseLibrary(container);
}

function renderDocsTab(container){
  if(!container) return;
  const docs=PLAYBOOK_DOCS;
  const isAdmin=S.role==='admin';
  const cats=[...new Set(docs.map(d=>d.category))].sort();

  container.innerHTML=`
  <div class="search-bar">
    <div class="search-input" style="max-width:260px"><input type="text" placeholder="Search documents..." oninput="filterDocsTab(this.value)"></div>
    <select style="width:auto" id="docTabCatFilter" onchange="filterDocsTab()">
      <option value="">All Categories</option>
      ${cats.map(c=>`<option>${c}</option>`).join('')}
    </select>
    <select style="width:auto" id="docTabStatusFilter" onchange="filterDocsTab()">
      <option value="">All Status</option>
      <option>published</option><option>draft</option>
    </select>
  </div>
  <div class="grid4 section-gap">
    <div class="metric-card"><div class="metric-label">Total Docs</div><div class="metric-value">${docs.filter(d=>d.status==='published').length}</div></div>
    <div class="metric-card"><div class="metric-label">Drafts</div><div class="metric-value" style="color:var(--text3)">${docs.filter(d=>d.status==='draft').length}</div></div>
    <div class="metric-card"><div class="metric-label">Delegated</div><div class="metric-value" style="color:var(--warn)">${docs.filter(d=>d.delegatedTo).length}</div></div>
    <div class="metric-card"><div class="metric-label">Categories</div><div class="metric-value">${cats.length}</div></div>
  </div>
  <div id="docTabList">${renderDocRows(docs)}</div>`;
}

function filterDocsTab(val){
  const search=(val||document.querySelector('#docTabList')?.dataset?.search||'').toLowerCase();
  const cat=document.getElementById('docTabCatFilter')?.value||'';
  const status=document.getElementById('docTabStatusFilter')?.value||'';
  const filtered=PLAYBOOK_DOCS.filter(d=>{
    const matchS=!search||d.title.toLowerCase().includes(search)||d.category.toLowerCase().includes(search);
    const matchC=!cat||d.category===cat;
    const matchSt=!status||d.status===status;
    return matchS&&matchC&&matchSt;
  });
  const el=document.getElementById('docTabList');
  if(el) el.innerHTML=renderDocRows(filtered);
}


function renderCourseLibrary(c){
  c.innerHTML=`
  <div class="search-bar">
    <div class="search-input" style="max-width:280px"><input type="text" placeholder="Search courses..." oninput="filterCourses(this.value)"></div>
    <select style="width:auto" id="catSelect" onchange="filterCourses('',this.value)">
      <option value="">All Categories</option>
      ${CATS.map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}
    </select>
  </div>
  <div id="catView">
    ${CATS.map(cat=>{
      const catCourses=getOrderedCourses(cat.name);
      return `<div class="cat-section" data-cat="${cat.name}" style="margin-bottom:28px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
          <div style="display:flex;align-items:baseline;gap:10px">
            <div style="font-size:14px;font-weight:600">${cat.name}</div>
            <div style="font-size:12px;color:var(--text3)">${catCourses.length} course${catCourses.length!==1?'s':''}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" onclick="openReorderModal('${cat.name.replace(/'/g,"\\'")}')">⇅ Reorder</button>
            <button class="btn btn-sm" onclick="openAssignModal('${cat.name.replace(/'/g,"\\'")}')">👥 Assign</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:12px">${cat.desc}</div>
        ${catCourses.length?`<div class="grid3" id="catgrid-${cat.name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'')}">${catCourses.map(co=>courseCardHTML(co)).join('')}
            <div class="course-card-add" onclick="openAddCourseToCat('${cat.name.replace(/'/g,"\\'")}')">
              <div style="font-size:22px;margin-bottom:8px;color:var(--border2)">+</div>
              <div style="font-size:12px;font-weight:500;color:var(--text3)">Add Course</div>
            </div>
          </div>`
        :`<div class="empty-state">
            <div class="empty-state-icon">🗂️</div>
            <div class="empty-state-title">No courses in ${cat.name} yet</div>
            <div class="empty-state-sub">Add your first course to this category to get your team learning.</div>
            <button class="btn btn-primary btn-sm" onclick="openAddCourseToCat('${cat.name.replace(/'/g,"\\'")}')">+ Add Course</button>
          </div>`}
      </div>`;
    }).join('')}
  </div>`;
}

function getOrderedCourses(catName){
  const order=CAT_ORDER[catName]||[];
  const catCourses=COURSES.filter(co=>co.cat===catName);
  if(!order.length) return catCourses;
  return [...catCourses].sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
}

function openAddCourseToCat(catName){
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:17px;font-weight:600">Add Course</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">Category: ${catName}</div>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group"><label class="form-label">Course Title</label><input type="text" id="newCourseTitle" placeholder="e.g. Brand Story & History"></div>
    <div class="form-group"><label class="form-label">Description</label><textarea id="newCourseDesc" rows="2" placeholder="What will learners gain?"></textarea></div>
    <div class="grid2">
      <div class="form-group"><label class="form-label">Duration</label>
        <select id="newCourseDur">
          <option>5 minutes</option><option>10 minutes</option><option selected>30 minutes</option><option>45 minutes</option><option>60 minutes</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Course Icon</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${['📚','⚖️','🔒','📋','💡','🎯','🤝','🛡️','📊','🏆','🧪','🌐','🏢','👋','🎓'].map(e=>`
          <button class="btn" style="font-size:16px;padding:4px 8px" onclick="selectNewEmoji(this,'${e}')">${e}</button>`).join('')}
        </div>
      </div>
    </div>
<hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveNewCourse('${catName.replace(/'/g,"\\'")}')">Add Course</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

let _selectedEmoji='📚';
function selectNewEmoji(btn, emoji){
  _selectedEmoji=emoji;
  btn.closest('div').querySelectorAll('.btn').forEach(b=>b.style.background='');
  btn.style.background='var(--accent-bg)';
}

function saveNewCourse(catName){
  const title=document.getElementById('newCourseTitle')?.value.trim();
  if(!title){toast('Please enter a course title.');return;}
  const dur=document.getElementById('newCourseDur')?.value||'30 minutes';
  const newId=Date.now();
  const colors=['#dbeafe','#e8f0fd','#fef3dc','#e8f5e3','#f0edfe','#fdeaea','#e1f5ee'];
  const color=colors[COURSES.length%colors.length];
  COURSES.push({id:newId,emoji:_selectedEmoji,title,cat:catName,color,mods:1,dur,enrolled:0,completed:0});
  if(!CAT_ORDER[catName]) CAT_ORDER[catName]=[];
  CAT_ORDER[catName].push(newId);
  // initialize empty modules and quiz for the new course
  COURSE_MODULES[newId]=[
    {t:'Module 1',type:'doc',status:'draft',blocks:[]},
  ];
  COURSE_QUIZZES[newId]=[{q:'',opts:['','','',''],correct:0}];
  SOP_UPDATES[newId]=[];
  lsSave();
  toast(`"${title}" added to ${catName}!`);
  closeModal();
  renderContentLibrary(document.getElementById('mainContent'));
}

function openReorderModal(catName){
  const courses=getOrderedCourses(catName);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:17px;font-weight:600">Reorder Courses</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${catName}</div>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Drag the rows to set the order learners will see them.</div>
    <div id="reorderList">
      ${courses.map((co,i)=>`
      <div class="module-row" draggable="true" data-id="${co.id}"
        ondragstart="roDragStart(event)" ondragover="roDragOver(event)" ondrop="roDrop(event,'${catName.replace(/'/g,"\\'")}')">
        <div style="cursor:grab;color:var(--text3);font-size:18px;padding:0 6px;user-select:none">⠿</div>
        <div style="width:28px;height:28px;border-radius:6px;background:${co.color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${co.emoji}</div>
        <div style="flex:1;font-size:13px;font-weight:500">${co.title}</div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm" onclick="roMove(${i},-1,'${catName.replace(/'/g,"\\'")}')">↑</button>
          <button class="btn btn-sm" onclick="roMove(${i},1,'${catName.replace(/'/g,"\\'")}')">↓</button>
        </div>
      </div>`).join('')}
    </div>
    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="lsSave();toast('Order saved!');closeModal();renderContentLibrary(document.getElementById('mainContent'))">Save Order</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

let _roDragId=null;
function roDragStart(e){_roDragId=e.currentTarget.dataset.id;}
function roDragOver(e){e.preventDefault();e.currentTarget.style.background='var(--accent-bg)';}
function roDrop(e,catName){
  e.preventDefault();
  e.currentTarget.style.background='';
  const toId=parseInt(e.currentTarget.dataset.id);
  const fromId=parseInt(_roDragId);
  if(fromId===toId) return;
  const order=CAT_ORDER[catName];
  const fi=order.indexOf(fromId), ti=order.indexOf(toId);
  if(fi<0||ti<0) return;
  order.splice(fi,1); order.splice(ti,0,fromId);
  openReorderModal(catName);
}
function roMove(idx,dir,catName){
  const order=CAT_ORDER[catName];
  const ni=idx+dir;
  if(ni<0||ni>=order.length) return;
  [order[idx],order[ni]]=[order[ni],order[idx]];
  openReorderModal(catName);
}

function openAssignModal(catName){
  const courses=getOrderedCourses(catName);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <div style="font-size:17px;font-weight:600">Assign Courses</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${catName}</div>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div style="font-size:13px;font-weight:500;margin-bottom:10px">Select courses to assign:</div>
    ${courses.map(co=>`
    <label style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer">
      <input type="checkbox" class="assign-course-cb" data-id="${co.id}" checked>
      <div style="width:28px;height:28px;border-radius:6px;background:${co.color};display:flex;align-items:center;justify-content:center;font-size:14px">${co.emoji}</div>
      <div style="flex:1"><div style="font-size:13px;font-weight:500">${co.title}</div><div style="font-size:11px;color:var(--text3)">${co.dur}</div></div>
    </label>`).join('')}
    <div style="font-size:13px;font-weight:500;margin:16px 0 10px">Assign to team members:</div>
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="toggleAllAssign(true)">Select All</button>
      <button class="btn btn-sm" onclick="toggleAllAssign(false)">Deselect All</button>
    </div>
    <div id="assignLearnerList">
      ${LEARNERS.map(l=>`
      <label class="assign-learner-row" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <input type="checkbox" class="assign-cb" checked>
        <div class="av av-sm" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
        <div style="flex:1"><div style="font-size:13px;font-weight:500">${l.name}</div><div style="font-size:11px;color:var(--text3)">${l.title} · ${l.dept}</div></div>
        <div>
          <label style="font-size:11px;color:var(--text3);margin-bottom:2px;display:block">Due date</label>
          <input type="date" style="font-size:11px;padding:3px 6px;width:130px">
        </div>
      </label>`).join('')}
    </div>
    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveAssignments('${catName.replace(/'/g,"\\'")}')">Save Assignments</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function toggleAllAssign(checked){
  document.querySelectorAll('.assign-cb').forEach(cb=>cb.checked=checked);
}

function saveAssignments(catName){
  // get checked course ids
  const checkedCourseIds=[...document.querySelectorAll('.assign-course-cb:checked')].map(cb=>parseInt(cb.dataset.id));

  if(!checkedCourseIds.length){
    toast('No courses selected.');return;
  }

  // update each checked learner
  const learnerRows=[...document.querySelectorAll('.assign-learner-row')];
  let count=0;
  learnerRows.forEach(row=>{
    const cb=row.querySelector('.assign-cb');
    if(!cb?.checked) return;
    const name=row.querySelector('div > div:first-child')?.textContent.trim();
    const learner=LEARNERS.find(l=>l.name===name);
    if(!learner) return;
    checkedCourseIds.forEach(id=>{
      if(!learner.assignedCourses.includes(id)) learner.assignedCourses.push(id);
    });
    count++;
  });

  lsSave();
  toast(`✓ ${checkedCourseIds.length} course${checkedCourseIds.length!==1?'s':''} assigned to ${count} team member${count!==1?'s':''}!`);
  closeModal();
}



function filterCourses(search='', cat=''){
  const s=(search||'').toLowerCase();
  const selCat=cat||document.getElementById('catSelect')?.value||'';
  const sections=document.querySelectorAll('.cat-section');
  let totalVisible=0;
  sections.forEach(sec=>{
    const secCat=sec.dataset.cat;
    if(selCat && secCat!==selCat){sec.style.display='none';return;}
    const cards=sec.querySelectorAll('.course-card');
    let anyVisible=false;
    cards.forEach(card=>{
      const title=card.querySelector('.course-title')?.textContent.toLowerCase()||'';
      const show=!s||title.includes(s)||secCat.toLowerCase().includes(s);
      card.style.display=show?'':'none';
      if(show) anyVisible=true;
    });
    sec.style.display=anyVisible?'':'none';
    if(anyVisible) totalVisible++;
  });
  // show/hide no-results message
  let noResults=document.getElementById('courseNoResults');
  if(!noResults){
    noResults=document.createElement('div');
    noResults.id='courseNoResults';
    noResults.className='empty-state';
    noResults.style.marginTop='8px';
    document.getElementById('catView')?.after(noResults);
  }
  if(totalVisible===0 && s){
    noResults.innerHTML=`<div class="empty-state-icon">🔍</div>
      <div class="empty-state-title">No courses match "${search}"</div>
      <div class="empty-state-sub">Try a different keyword or <span style="color:var(--accent);cursor:pointer;font-weight:500" onclick="document.querySelector('.search-input input').value='';filterCourses('')">clear the search</span>.</div>`;
    noResults.style.display='';
  } else {
    noResults.style.display='none';
  }
}

function getCoursePct(courseId){
  const mods=(COURSE_MODULES[courseId]||[]).filter(m=>m.status==='published'||!m.status);
  if(!mods.length) return 0;
  const done=(S.completedModules?.[courseId]||[]).length;
  return Math.round(done/mods.length*100);
}

// Cache of all learners' progress loaded from Supabase: email → { courseId: completedModuleIndices[] }
const LEARNER_PROGRESS_BY_EMAIL = {};

function getPersonCoursePct(email, courseId){
  const done=(LEARNER_PROGRESS_BY_EMAIL[email]?.[courseId]||[]).length;
  const mods=(COURSE_MODULES[courseId]||[]).filter(m=>m.status==='published'||!m.status);
  return mods.length?Math.round(done/mods.length*100):0;
}

function getPersonOverallPct(learner){
  const ids=learner.assignedCourses||[];
  if(!ids.length) return 0;
  const total=ids.reduce((sum,id)=>{
    return sum+(COURSE_MODULES[id]||[]).filter(m=>m.status==='published'||!m.status).length;
  },0);
  if(!total) return 0;
  const done=ids.reduce((sum,id)=>{
    return sum+(LEARNER_PROGRESS_BY_EMAIL[learner.email]?.[id]||[]).length;
  },0);
  return Math.round(done/total*100);
}

function courseCardHTML(co){
  const enrolled=co.enrolled||0;
  const completed=co.completed||0;
  const pct=enrolled?Math.round(completed/enrolled*100):0;
  const quizCount=(COURSE_MODULES[co.id]||[]).filter(m=>m.type==='quiz').length;
  const publishedMods=(COURSE_MODULES[co.id]||[]).filter(m=>m.status==='published'||!m.status).length;

  // pick progress bar color
  const barColor=pct===100?'var(--success)':pct>=50?'var(--brand-gold)':'var(--brand-gold)';

  return `<div class="course-card" onclick="openCourseModal(${co.id})">

    <!-- Thumbnail -->
    <div class="course-thumb" style="background:${co.color}">
      ${co.thumbnail
        ? `<img src="${convertImageUrl(co.thumbnail)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
        : `<div class="course-thumb-emoji">${co.emoji}</div>`}
      <div class="course-thumb-bar"><div class="course-thumb-bar-fill" style="width:${pct}%"></div></div>
    </div>

    <!-- Body -->
    <div class="course-body">

      <!-- Category pill + quiz badge -->
      <div class="course-meta" style="margin-bottom:8px">
        <span class="badge badge-gray">${co.cat}</span>
        ${quizCount?`<span class="badge badge-blue">📝 ${quizCount} quiz${quizCount!==1?'zes':''}</span>`:''}
      </div>

      <div class="course-title">${co.title}</div>

      <!-- Module/duration meta -->
      <div style="display:flex;align-items:center;gap:12px;font-size:11px;color:var(--text3)">
        <span>📋 ${publishedMods} module${publishedMods!==1?'s':''}</span>
        <span>⏱ ${co.dur}</span>
      </div>

      <!-- Progress footer -->
      <div class="course-footer">
        <div class="course-progress-label">
          <span>${completed} of ${enrolled} completed</span>
          <strong>${pct}%</strong>
        </div>
        <div class="progress-bar" style="height:7px">
          <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
      </div>

    </div>
  </div>`;
}

const SOP_UPDATES = {};

const COURSE_MODULES = {
  1:[ // Who We Are, What We Do & How We Do It
    {t:'Our Story',type:'doc',status:'published',attachments:[]},
    {t:'Mission & Vision',type:'video',status:'published',attachments:[]},
    {t:'Our Products & Services',type:'doc',status:'published',attachments:[]},
    {t:'Who We Serve',type:'doc',status:'published',attachments:[]},
    {t:'Our Process & Approach',type:'doc',status:'published',attachments:[]},
    {t:'What Makes Us Different',type:'video',status:'published',attachments:[]},
    {t:'Knowledge Check',type:'quiz',status:'published',attachments:[]},
  ],
  2:[ // Core Values
    {t:'Our Core Values',type:'doc',status:'published',attachments:[]},
    {t:'Values in Action — Real Examples',type:'video',status:'published',attachments:[]},
    {t:'Knowledge Check',type:'quiz',status:'published',attachments:[]},
  ],
  5:[ // Your First Week
    {t:'Before Day 1 — What to Prepare',type:'doc',status:'published',attachments:[]},
    {t:'Day 1 Checklist',type:'doc',status:'published',attachments:[]},
    {t:'Who to Go to For What',type:'doc',status:'published',attachments:[]},
    {t:'Knowledge Check',type:'quiz',status:'published',attachments:[]},
  ],
  6:[ // Tools We Use
    {t:'Communication Tools',type:'doc',status:'published',attachments:[]},
    {t:'Project & Task Management',type:'doc',status:'published',attachments:[]},
    {t:'Knowledge Check',type:'quiz',status:'published',attachments:[]},
  ],
  7:[ // Policies & Expectations
    {t:'Code of Conduct',type:'doc',status:'published',attachments:[]},
    {t:'Work Hours & Remote Policy',type:'doc',status:'published',attachments:[]},
    {t:'Confidentiality & Data Privacy',type:'doc',status:'published',attachments:[]},
    {t:'Knowledge Check',type:'quiz',status:'published',attachments:[]},
  ],
  8:[ // Compensation & Benefits
    {t:'Your Pay — Schedule & Structure',type:'doc',status:'published',attachments:[]},
    {t:'Health, Dental & Vision',type:'doc',status:'published',attachments:[]},
    {t:'401k, PTO & Wellness',type:'doc',status:'published',attachments:[]},
    {t:'Knowledge Check',type:'quiz',status:'published',attachments:[]},
  ],
  9:[ // Your Role & Goals
    {t:'Understanding Your Job Description',type:'doc',status:'published',attachments:[]},
    {t:'How Success is Measured',type:'doc',status:'published',attachments:[]},
    {t:'Your 30/60/90 Day Plan',type:'video',status:'published',attachments:[]},
    {t:'Knowledge Check',type:'quiz',status:'published',attachments:[]},
  ],
};

function openCourseModal(id){
  const co=COURSES.find(c=>c.id===id);
  if(!COURSE_MODULES[id]) COURSE_MODULES[id]=[
    {t:'Module 1',type:'doc',status:'draft',blocks:[]},
  ];
  if(!SOP_UPDATES[id]) SOP_UPDATES[id]=[];
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:32px">${co.emoji}</div>
        <div>
          <div style="font-size:17px;font-weight:600">${co.title}</div>
          <span class="badge badge-blue">${co.cat}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
        <button class="expand-btn" id="modalExpandBtn" onclick="toggleModalExpand(this)">⤢ Expand</button>
        <button class="btn btn-sm" onclick="closeModal()">✕</button>
      </div>
    </div>
    <div class="grid2 section-gap" style="margin-bottom:16px">
      <div class="metric-card"><div class="metric-label">Enrolled</div><div class="metric-value">${co.enrolled}</div></div>
      <div class="metric-card"><div class="metric-label">Completed</div><div class="metric-value">${co.completed}</div></div>
    </div>
    <div class="tab-bar">
      <div class="tab active" onclick="switchTab(this,'cm-info')">Course Info</div>
      <div class="tab" onclick="switchTab(this,'cm-mods')">Modules</div>
      <div class="tab" onclick="switchTab(this,'cm-sop')">SOP Updates <span class="badge badge-warn" style="margin-left:4px">${SOP_UPDATES[id].length}</span></div>
    </div>

    <div id="cm-info">
      <div class="form-group"><label class="form-label">Course Title</label><input type="text" id="cmTitle" value="${co.title}"></div>
      <div class="grid2">
        <div class="form-group"><label class="form-label">Category</label>
          <select id="cmCat">${CATS.map(c=>`<option${c.name===co.cat?' selected':''}>${c.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Duration</label>
          <select id="cmDur">
            ${['5 minutes','10 minutes','30 minutes','45 minutes','60 minutes'].map(d=>`<option${d===co.dur?' selected':''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Thumbnail editor -->
      <div class="form-group">
        <label class="form-label">Thumbnail Image</label>
        <div style="display:flex;gap:14px;align-items:flex-start">

          <!-- Preview box -->
          <div id="thumbPreview" style="width:100px;height:70px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border2);flex-shrink:0;background:${co.color};display:flex;align-items:center;justify-content:center;font-size:26px;position:relative">
            ${co.thumbnail
              ? `<img id="thumbPreviewImg" src="${convertImageUrl(co.thumbnail)}" style="width:100%;height:100%;object-fit:cover">`
              : `<span id="thumbPreviewEmoji">${co.emoji}</span>`}
          </div>

          <div style="flex:1">
            <!-- URL input -->
            <input type="text" id="thumbUrl" placeholder="Paste image URL (or Google Drive link)…"
              value="${co.thumbnail||''}"
              oninput="previewThumb(this.value)"
              style="margin-bottom:8px">

            <!-- File upload -->
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <label class="btn btn-sm" style="cursor:pointer;margin:0">
                📁 Upload Image
                <input type="file" accept="image/*" style="display:none" onchange="handleThumbFile(this,${id})">
              </label>
              ${co.thumbnail?`<button class="btn btn-sm btn-danger" onclick="clearThumb(${id})">✕ Remove</button>`:''}
            </div>
            <div style="font-size:11px;color:var(--text3);margin-top:6px">Supports JPG, PNG, WebP · Google Drive links auto-converted</div>
          </div>
        </div>
      </div>
    </div>

    <div id="cm-mods" style="display:none">
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Drag ⠿ to reorder. Click a module to expand and edit content.</div>
      <div id="cm-modList">
        ${COURSE_MODULES[id].map((m,i)=>cmModRowHTML(id,m,i)).join('')}
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="openModuleWizard(${id})">+ Add Module</button>
    </div>

    <div id="cm-quiz" style="display:none">
      <div style="font-size:12px;color:var(--text2);margin-bottom:16px">Build the quiz learners will take after completing this course. Mark the correct answer with the radio button.</div>
      <div id="cm-questionList">
        ${(COURSE_QUIZZES[id]||[{q:'',opts:['','','',''],correct:0}]).map((q,qi)=>cmQuizRowHTML(id,q,qi)).join('')}
      </div>
      <button class="btn" style="margin-top:4px" onclick="cmAddQuestion(${id})">+ Add Question</button>
      <div style="margin-top:14px;padding:12px 14px;background:var(--surface2);border-radius:var(--radius);font-size:12px;color:var(--text2)">
        💡 Tip: Aim for 3–5 questions. Keep them focused on key points from the course content.
      </div>
    </div>

    <div id="cm-sop" style="display:none">
      ${renderSOPTab(id)}
    </div>

    <hr class="divider">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="saveCourseChanges(${id})">Save Changes</button>
      <button class="btn" onclick="toast('Course duplicated!')">Duplicate</button>
      <button class="btn btn-danger" onclick="toast('Course archived.');closeModal()">Archive</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function cmModRowHTML(courseId, m, i){
  const uid='cm_'+courseId+'_'+i;
  const icons={doc:'📄',video:'▶️',quiz:'📝'};
  const blocks=(m.blocks||[]);
  const blocksHTML=blocks.map((b,bi)=>cmBlockHTML(uid,b,bi)).join('');

  return `<div class="mod-block" draggable="true" data-uid="${uid}"
    ondragstart="modDragStart(event)" ondragover="modDragOver(event)" ondrop="modDrop(event)" ondragleave="modDragLeave(event)" ondragend="modDragEnd(event)"
    style="border:1px solid var(--border);border-radius:var(--radius-lg);margin-bottom:10px;overflow:hidden">

    <!-- Header row -->
    <div style="padding:10px 12px;background:var(--surface)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div data-drag-handle style="cursor:grab;color:var(--text3);font-size:16px;padding:0 4px;flex-shrink:0" title="Drag to reorder">⠿</div>
        <div class="module-icon ${m.type}" style="flex-shrink:0">${icons[m.type]||'📄'}</div>
        <input type="text" value="${m.t}" class="mod-title-input"
          style="border:none;background:transparent;font-size:13px;padding:0;font-family:inherit;flex:1;outline:none;font-weight:500;min-width:0"
          placeholder="Module title...">
        <span style="font-size:12px;color:var(--text3);flex-shrink:0;cursor:pointer;padding:4px 6px;border-radius:4px;user-select:none" id="expand-arrow-${uid}" onclick="toggleModExpand('${uid}')">▼</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;padding-left:52px">
        <select style="width:auto;font-size:11px" onchange="updateModBlockIcon(this)">
          <option ${m.type==='doc'?'selected':''} value="doc">📄 Document</option>
          <option ${m.type==='video'?'selected':''} value="video">▶️ Video</option>
          <option ${m.type==='quiz'?'selected':''} value="quiz">📝 Quiz</option>
        </select>
        <span class="badge ${m.status==='published'?'badge-success':'badge-warn'}" onclick="toggleModStatus(this)" style="cursor:pointer;user-select:none" title="Click to toggle Published/Draft">${m.status==='published'?'✅ Published':'⚠️ Draft — click to publish'}</span>
        <button class="btn btn-sm btn-danger" style="margin-left:auto" onclick="this.closest('.mod-block').remove()">Remove</button>
      </div>
    </div>

    <!-- Expanded content editor -->
    <div id="mod-expand-${uid}" style="display:none;border-top:1px solid var(--border);padding:16px;background:var(--surface2)">

      <!-- Content blocks -->
      <div id="blocks-${uid}" style="margin-bottom:12px">${blocksHTML}</div>

      <!-- Add content buttons -->
      <div style="border:1px dashed var(--border2);border-radius:var(--radius);padding:12px;background:var(--surface)">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Add Content</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="addModBlock('${uid}','text')">✏️ Write Text</button>
          <button class="btn btn-sm" onclick="addModBlock('${uid}','video')">▶️ Embed Video</button>
          <button class="btn btn-sm" onclick="addModBlock('${uid}','link')">🔗 Link / Button</button>
          <button class="btn btn-sm" onclick="addModBlock('${uid}','file')">📎 Upload File</button>
          <button class="btn btn-sm" onclick="addModBlock('${uid}','image')">🖼️ Image</button>
          <button class="btn btn-sm" style="border-color:var(--brand-gold);color:var(--accent)" onclick="addModBlock('${uid}','upload')">📤 Learner Upload</button>
          <button class="btn btn-sm" style="border-color:var(--brand-gold);color:var(--accent)" onclick="addModBlock('${uid}','form')">📝 Form</button>
        </div>
      </div>
    </div>
  </div>`;
}

function cmBlockHTML(uid, b, bi){
  if(b.type==='text') return `
    <div class="cm-block" data-type="text" style="margin-bottom:10px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <div style="background:var(--surface);padding:6px 10px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text3)">✏️ Text</span>
        <button class="btn btn-sm btn-danger" style="margin-left:auto;padding:2px 8px;font-size:11px" onclick="this.closest('.cm-block').remove()">✕</button>
      </div>
      <textarea rows="5" placeholder="Write your module content here. You can include instructions, explanations, background info, and anything else you want your team to read..." style="border:none;border-radius:0;background:var(--surface);resize:vertical;font-size:13px;line-height:1.7">${b.val||''}</textarea>
    </div>`;

  if(b.type==='video') return `
    <div class="cm-block" data-type="video" style="margin-bottom:10px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <div style="background:var(--surface);padding:6px 10px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text3)">▶️ Video</span>
        <button class="btn btn-sm btn-danger" style="margin-left:auto;padding:2px 8px;font-size:11px" onclick="this.closest('.cm-block').remove()">✕</button>
      </div>
      <div style="padding:10px;background:var(--surface)">
        <input type="text" value="${b.val||''}" placeholder="Paste a YouTube or Vimeo URL — e.g. https://youtube.com/watch?v=..." style="font-size:12px">
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Supports YouTube, Vimeo, Loom, and direct video links.</div>
      </div>
    </div>`;

  if(b.type==='link') return `
    <div class="cm-block" data-type="link" style="margin-bottom:10px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <div style="background:var(--surface);padding:6px 10px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text3)">🔗 Link / Button</span>
        <button class="btn btn-sm btn-danger" style="margin-left:auto;padding:2px 8px;font-size:11px" onclick="this.closest('.cm-block').remove()">✕</button>
      </div>
      <div style="padding:10px;background:var(--surface);display:flex;flex-direction:column;gap:8px">
        <input type="text" value="${b.label||''}" placeholder="Button label — e.g. Fill Out Team Favorites Form" style="font-size:12px">
        <input type="text" value="${b.val||''}" placeholder="URL — e.g. https://forms.google.com/..." style="font-size:12px">
        <div style="font-size:11px;color:var(--text3)">This will appear as a clickable button for the learner.</div>
      </div>
    </div>`;

  if(b.type==='file') return `
    <div class="cm-block" data-type="file" style="margin-bottom:10px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <div style="background:var(--surface);padding:6px 10px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text3)">📎 File</span>
        <button class="btn btn-sm btn-danger" style="margin-left:auto;padding:2px 8px;font-size:11px" onclick="this.closest('.cm-block').remove()">✕</button>
      </div>
      <div style="padding:10px;background:var(--surface);display:flex;flex-direction:column;gap:8px">
        <input type="text" value="${b.label||''}" placeholder="File label — e.g. Download Onboarding Checklist" style="font-size:12px">
        <input type="text" value="${b.val||''}" placeholder="File URL or paste a Google Drive share link" style="font-size:12px">
        <div style="font-size:11px;color:var(--text3)">Paste a shareable link to your file (Google Drive, Dropbox, etc.)</div>
      </div>
    </div>`;

  if(b.type==='image') return `
    <div class="cm-block" data-type="image" style="margin-bottom:10px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <div style="background:var(--surface);padding:6px 10px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;color:var(--text3)">🖼️ Image</span>
        <button class="btn btn-sm btn-danger" style="margin-left:auto;padding:2px 8px;font-size:11px" onclick="this.closest('.cm-block').remove()">✕</button>
      </div>
      <div style="padding:10px;background:var(--surface)">
        <input type="text" value="${b.val||''}" placeholder="Paste image URL (https://...) or Google Drive share link" style="font-size:12px;margin-bottom:8px" oninput="previewImg(this)">
        ${b.val?`<img src="${b.val}" style="max-width:100%;border-radius:var(--radius-sm);display:block" onerror="this.style.display='none'" id="imgPreview">`:
        `<div style="height:80px;background:var(--surface2);border:1px dashed var(--border2);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text3)" id="imgPreview">Image preview will appear here</div>`}
        <div style="font-size:11px;color:var(--text3);margin-top:6px">💡 For Google Drive: File → Share → Copy link, then paste here. Make sure sharing is set to "Anyone with the link".</div>
      </div>
    </div>`;

  if(b.type==='upload') return `
    <div class="cm-block" data-type="upload" style="margin-bottom:10px;border:1px solid var(--brand-gold);border-radius:var(--radius);overflow:hidden">
      <div style="background:var(--accent-bg);padding:6px 10px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--brand-gold)">
        <span style="font-size:12px;color:var(--accent)">📤 Learner Upload (Required)</span>
        <button class="btn btn-sm btn-danger" style="margin-left:auto;padding:2px 8px;font-size:11px" onclick="this.closest('.cm-block').remove()">✕</button>
      </div>
      <div style="padding:10px;background:var(--surface);display:flex;flex-direction:column;gap:8px">
        <input type="text" value="${b.label||''}" placeholder="Upload label — e.g. Upload a copy of your license" style="font-size:12px">
        <input type="text" value="${b.instructions||''}" placeholder="Instructions — e.g. Must be a clear photo or scanned PDF" style="font-size:12px">
        <div style="font-size:11px;color:var(--text3)">⚠️ This will be a <strong>required</strong> upload. Learner cannot complete the module without uploading. Manager will be notified when submitted.</div>
      </div>
    </div>`;

  if(b.type==='form') return `
    <div class="cm-block" data-type="form" style="margin-bottom:10px;border:1px solid var(--brand-gold);border-radius:var(--radius);overflow:hidden">
      <div style="background:var(--accent-bg);padding:6px 10px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--brand-gold)">
        <span style="font-size:12px;color:var(--accent)">📝 Form</span>
        <button class="btn btn-sm btn-danger" style="margin-left:auto;padding:2px 8px;font-size:11px" onclick="this.closest('.cm-block').remove()">✕</button>
      </div>
      <div style="padding:12px;background:var(--surface)">
        <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:8px">Form Fields</div>
        <div id="formFields_${b._uid||Date.now()}">
          ${(b.fields||[{type:'text',label:'',placeholder:''}]).map((f,fi)=>`
          <div class="form-field-row" style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <select style="width:110px;font-size:11px">
              <option ${f.type==='text'?'selected':''}>text</option>
              <option ${f.type==='date'?'selected':''}>date</option>
              <option ${f.type==='textarea'?'selected':''}>textarea</option>
              <option ${f.type==='select'?'selected':''}>select</option>
              <option ${f.type==='checkbox'?'selected':''}>checkbox</option>
            </select>
            <input type="text" value="${f.label||''}" placeholder="Field label" style="flex:1;font-size:12px">
            <input type="text" value="${f.placeholder||''}" placeholder="Placeholder / options" style="flex:1;font-size:12px">
            <button class="btn btn-sm btn-danger" style="padding:2px 7px;font-size:11px" onclick="this.closest('.form-field-row').remove()">✕</button>
          </div>`).join('')}
        </div>
        <button class="btn btn-sm" onclick="addFormField(this)" style="margin-top:4px;font-size:11px">+ Add Field</button>
        <div style="font-size:11px;color:var(--text3);margin-top:8px">Learner must submit the form to complete this module.</div>
      </div>
    </div>`;

  return '';
}

function previewImg(input){
  const preview=input.nextElementSibling;
  if(!preview) return;
  const url=convertImageUrl(input.value.trim());
  if(url){
    preview.outerHTML=`<img src="${url}" style="max-width:100%;border-radius:var(--radius-sm);display:block;margin-top:4px" onerror="this.style.display='none'" id="imgPreview">`;
  }
}

// ─── THUMBNAIL HELPERS ────────────────────────────────────────────────────
function previewThumb(url){
  const src=convertImageUrl(url.trim());
  const preview=document.getElementById('thumbPreview');
  if(!preview) return;
  let img=document.getElementById('thumbPreviewImg');
  const emoji=document.getElementById('thumbPreviewEmoji');
  if(src){
    if(emoji) emoji.style.display='none';
    if(!img){
      img=document.createElement('img');
      img.id='thumbPreviewImg';
      img.style.cssText='width:100%;height:100%;object-fit:cover;position:absolute;inset:0';
      preview.appendChild(img);
    }
    img.src=src;
    img.style.display='block';
  } else {
    if(img) img.style.display='none';
    if(emoji) emoji.style.display='';
  }
}

function handleThumbFile(input, courseId){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const dataUrl=e.target.result;
    const urlField=document.getElementById('thumbUrl');
    if(urlField) urlField.value=dataUrl;
    previewThumb(dataUrl);
  };
  reader.readAsDataURL(file);
}

function clearThumb(courseId){
  const urlField=document.getElementById('thumbUrl');
  if(urlField) urlField.value='';
  previewThumb('');
  const co=COURSES.find(c=>c.id===courseId);
  if(co) co.thumbnail=null;
}

function convertImageUrl(url){
  if(!url) return '';
  // Convert Google Drive share link to direct image URL
  const gdMatch=url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if(gdMatch) return `https://drive.google.com/uc?export=view&id=${gdMatch[1]}`;
  // Convert Google Drive open link
  const gdMatch2=url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if(gdMatch2) return `https://drive.google.com/uc?export=view&id=${gdMatch2[1]}`;
  return url;
}

function addFormField(btn){
  const container=btn.previousElementSibling;
  if(!container) return;
  const row=document.createElement('div');
  row.className='form-field-row';
  row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:6px';
  row.innerHTML=`
    <select style="width:110px;font-size:11px">
      <option>text</option><option>date</option><option>textarea</option><option>select</option><option>checkbox</option>
    </select>
    <input type="text" placeholder="Field label" style="flex:1;font-size:12px">
    <input type="text" placeholder="Placeholder / options" style="flex:1;font-size:12px">
    <button class="btn btn-sm btn-danger" style="padding:2px 7px;font-size:11px" onclick="this.closest('.form-field-row').remove()">✕</button>`;
  container.appendChild(row);
}

function addModBlock(uid, type){
  const container=document.getElementById('blocks-'+uid);
  if(!container) return;
  const bi=container.querySelectorAll('.cm-block').length;
  const tmp=document.createElement('div');
  tmp.innerHTML=cmBlockHTML(uid,{type,val:'',label:''},bi);
  container.appendChild(tmp.firstElementChild);
  tmp.firstElementChild?.scrollIntoView({behavior:'smooth',block:'nearest'});
}



function openModuleWizard(courseId){
  let wiz={step:1, title:'', type:'doc', blocks:[], status:'published'};

  function render(){
    const mc=document.getElementById('modalContent');
    if(wiz.step===1){
      mc.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <div style="font-size:17px;font-weight:600">Add New Module</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">Step 1 of 3 — Name & Type</div>
          </div>
          <button class="btn btn-sm" onclick="closeModal()">✕</button>
        </div>
        ${wizSteps()}
        <div class="form-group" style="margin-bottom:20px">
          <label class="form-label">Module Name</label>
          <input type="text" id="wizTitle" value="${wiz.title}" placeholder="e.g. Our Core Values, Day 1 Checklist..." style="font-size:14px">
        </div>
        <div class="form-label" style="margin-bottom:10px">Module Type</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:24px">
          ${[
            {t:'doc',icon:'📄',label:'Reading',desc:'Text, links, images, forms'},
            {t:'video',icon:'▶️',label:'Video',desc:'Embed a video'},
            {t:'quiz',icon:'📝',label:'Quiz',desc:'Knowledge check'},
          ].map(opt=>`
          <div onclick="document.querySelectorAll('.wiz-type').forEach(e=>{e.style.borderColor='var(--border)';e.style.background='var(--surface)'});this.style.borderColor='var(--brand-gold)';this.style.background='var(--accent-bg)';_wiz.type='${opt.t}'"
            class="wiz-type" style="border:2px solid ${wiz.type===opt.t?'var(--brand-gold)':'var(--border)'};border-radius:var(--radius-lg);padding:14px;text-align:center;cursor:pointer;transition:all 0.15s">
            <div style="font-size:24px;margin-bottom:6px">${opt.icon}</div>
            <div style="font-size:13px;font-weight:600">${opt.label}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:3px">${opt.desc}</div>
          </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="wizNext1(${courseId})">Next: Add Content →</button>
          <button class="btn" onclick="closeModal()">Cancel</button>
        </div>`;
    } else if(wiz.step===2){
      const pendingForm=window.wizPendingBlock?wizInlineForm(window.wizPendingBlock):'';
      mc.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <div style="font-size:17px;font-weight:600">${wiz.title}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">Step 2 of 3 — Add Content</div>
          </div>
          <button class="btn btn-sm" onclick="closeModal()">✕</button>
        </div>
        ${wizSteps()}
        ${wiz.type==='quiz'?`
        <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Add your quiz questions below. Learners must score 75% to pass.</div>
        <div id="wizQuizQuestions">
          ${(wiz.quizQuestions||[]).map((q,qi)=>`
          <div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px;margin-bottom:10px;background:var(--surface)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <span style="font-size:12px;font-weight:600;color:var(--text3)">Question ${qi+1}</span>
              <button class="btn btn-sm btn-danger" style="padding:2px 7px;font-size:11px" onclick="_wiz.quizQuestions.splice(${qi},1);_wizRender()">✕</button>
            </div>
            <input type="text" value="${q.q}" placeholder="Question text..." style="font-size:13px;margin-bottom:10px" oninput="_wiz.quizQuestions[${qi}].q=this.value">
            ${q.opts.map((o,oi)=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:6px 8px;border-radius:var(--radius);border:1px solid ${q.correct===oi?'var(--success)':'var(--border)'};background:${q.correct===oi?'var(--success-bg)':'transparent'}">
              <input type="radio" name="wqCorrect${qi}" ${q.correct===oi?'checked':''} onchange="_wiz.quizQuestions[${qi}].correct=${oi};_wizRender()" style="flex-shrink:0;width:auto;cursor:pointer">
              <span style="font-size:11px;font-weight:600;color:var(--text3);width:14px">${String.fromCharCode(65+oi)}</span>
              <input type="text" value="${o}" placeholder="Option ${String.fromCharCode(65+oi)}..." style="flex:1;font-size:12px;background:transparent;border:none;padding:0" oninput="_wiz.quizQuestions[${qi}].opts[${oi}]=this.value">
              ${q.correct===oi?'<span style="font-size:10px;color:var(--success);font-weight:600">✓ Correct</span>':''}
            </div>`).join('')}
            <div style="font-size:11px;color:var(--text3);margin-top:4px">● Select the correct answer using the radio button</div>
          </div>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" style="margin-bottom:16px;width:100%" onclick="if(!_wiz.quizQuestions)_wiz.quizQuestions=[];_wiz.quizQuestions.push({q:'',opts:['','','',''],correct:0});_wizRender()">+ Add Question</button>
        `:wiz.type==='video'?`
        <div class="form-group">
          <label class="form-label">Video URL</label>
          <input type="text" id="wizVideoUrl" value="${wiz.blocks[0]?.val||''}" placeholder="Paste YouTube, Vimeo, or Loom URL..." style="font-size:13px">
          <div style="font-size:11px;color:var(--text3);margin-top:5px">Supports YouTube, Vimeo, and Loom links.</div>
        </div>
        `:`
        ${wiz.blocks.length?`<div style="margin-bottom:12px">
          ${wiz.blocks.map((b,bi)=>wizBlockPreview(b,bi)).join('')}
        </div>`:''}
        ${pendingForm?pendingForm:`
        <div style="border:1px dashed var(--border2);border-radius:var(--radius);padding:12px;background:var(--surface2);margin-bottom:16px">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Add a content block</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm" onclick="wizAddBlock('text')">✏️ Write Text</button>
            <button class="btn btn-sm" onclick="wizAddBlock('link')">🔗 Link / Button</button>
            <button class="btn btn-sm" onclick="wizAddBlock('image')">🖼️ Image</button>
            <button class="btn btn-sm" onclick="wizAddBlock('file')">📎 File</button>
            <button class="btn btn-sm" onclick="wizAddBlock('form')">📝 Form</button>
            <button class="btn btn-sm" style="border-color:var(--brand-gold);color:var(--accent)" onclick="wizAddBlock('upload')">📤 Upload</button>
          </div>
        </div>`}
        `}
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-primary" onclick="wizNext2(${courseId})">Next: Review →</button>
          <button class="btn" onclick="_wiz.step=1;wizPendingBlock=null;_wizRender()">← Back</button>
        </div>`;
    } else {
      // Step 3 — Review
      mc.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div>
            <div style="font-size:17px;font-weight:600">Review & Save</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">Step 3 of 3</div>
          </div>
          <button class="btn btn-sm" onclick="closeModal()">✕</button>
        </div>
        ${wizSteps()}
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div style="font-size:24px">${{doc:'📄',video:'▶️',quiz:'📝'}[wiz.type]}</div>
            <div>
              <div style="font-size:15px;font-weight:600">${wiz.title}</div>
              <div style="font-size:12px;color:var(--text3)">${{doc:'Reading',video:'Video',quiz:'Quiz'}[wiz.type]} module</div>
            </div>
          </div>
          ${wiz.blocks.length?`
          <div style="font-size:12px;color:var(--text2)">
            ${wiz.blocks.map(b=>`<div style="padding:4px 0;border-bottom:1px solid var(--border)">
              ${{text:'✏️ Text block',link:'🔗 Link: '+b.label,image:'🖼️ Image',file:'📎 File: '+b.label,form:'📝 Form ('+((b.fields||[]).length)+' fields)',upload:'📤 Upload: '+b.label}[b.type]||b.type}
            </div>`).join('')}
          </div>`:wiz.type==='quiz'?`<div style="font-size:12px;color:var(--text2)">📝 ${(wiz.quizQuestions||[]).filter(q=>q.q.trim()).length} question${(wiz.quizQuestions||[]).filter(q=>q.q.trim()).length!==1?'s':''} added</div>`:`<div style="font-size:12px;color:var(--text3);font-style:italic">No content blocks — you can add them later by editing the module.</div>`}
        </div>
        <div class="form-group">
          <label class="form-label">Visibility</label>
          <div style="display:flex;gap:10px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="radio" name="wizStatus" value="published" checked> Publish immediately</label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="radio" name="wizStatus" value="draft"> Save as draft</label>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="wizSave(${courseId})">✓ Save Module</button>
          <button class="btn" onclick="_wiz.step=2;_wizRender()">← Back</button>
        </div>`;
    }
    document.getElementById('modalBg').classList.add('open');
  }

  function wizSteps(){
    return `<div style="display:flex;align-items:center;gap:0;margin-bottom:20px">
      ${[1,2,3].map(s=>`
      <div style="display:flex;align-items:center;flex:1">
        <div style="width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;
          background:${s<=wiz.step?'var(--brand-gold)':'var(--border)'};color:${s<=wiz.step?'#000':'var(--text3)'}">
          ${s<wiz.step?'✓':s}
        </div>
        <div style="font-size:11px;margin-left:6px;color:${s===wiz.step?'var(--text)':'var(--text3)'};font-weight:${s===wiz.step?'600':'400'}">
          ${['Name & Type','Add Content','Review'][s-1]}
        </div>
        ${s<3?`<div style="flex:1;height:1px;background:${s<wiz.step?'var(--brand-gold)':'var(--border)'};margin:0 10px"></div>`:''}
      </div>`).join('')}
    </div>`;
  }

  let wizType=wiz.type;
  window.wizPendingBlock=null;
  window._wiz=wiz;
  window._wizRender=function(){render();};

  window.wizNext1=function(courseId){
    const title=document.getElementById('wizTitle')?.value.trim();
    if(!title){toast('Please enter a module name.');return;}
    wiz.title=title;
    wiz.type=_wiz.type||'doc';
    wiz.step=2;
    render();
  };

  window.wizNext2=function(courseId){
    if(wiz.type==='video'){
      const url=document.getElementById('wizVideoUrl')?.value.trim();
      if(url) wiz.blocks=[{type:'video',val:url}];
    }
    wiz.step=3;
    render();
  };

  function wizInlineForm(type){
    const forms={
      text:`<div style="border:1px solid var(--brand-gold);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px;background:var(--accent-bg)">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">✏️ Write Text</div>
        <textarea id="wbVal" rows="5" placeholder="Write your content here..." style="font-size:13px;line-height:1.7"></textarea>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="wizConfirmBlock('text')">Add Block</button>
          <button class="btn btn-sm" onclick="wizPendingBlock=null;render()">Cancel</button>
        </div></div>`,
      link:`<div style="border:1px solid var(--brand-gold);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px;background:var(--accent-bg)">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">🔗 Link / Button</div>
        <input type="text" id="wbLabel" placeholder="Button label — e.g. Fill Out Team Form" style="margin-bottom:8px;font-size:12px">
        <input type="text" id="wbVal" placeholder="URL — e.g. https://forms.google.com/..." style="font-size:12px">
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="wizConfirmBlock('link')">Add Block</button>
          <button class="btn btn-sm" onclick="wizPendingBlock=null;render()">Cancel</button>
        </div></div>`,
      image:`<div style="border:1px solid var(--brand-gold);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px;background:var(--accent-bg)">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">🖼️ Image</div>
        <input type="text" id="wbVal" placeholder="Paste image URL — e.g. https://..." style="font-size:12px">
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="wizConfirmBlock('image')">Add Block</button>
          <button class="btn btn-sm" onclick="wizPendingBlock=null;render()">Cancel</button>
        </div></div>`,
      file:`<div style="border:1px solid var(--brand-gold);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px;background:var(--accent-bg)">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">📎 File</div>
        <input type="text" id="wbLabel" placeholder="File label — e.g. Download Handbook" style="margin-bottom:8px;font-size:12px">
        <input type="text" id="wbVal" placeholder="File URL or Google Drive share link" style="font-size:12px">
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="wizConfirmBlock('file')">Add Block</button>
          <button class="btn btn-sm" onclick="wizPendingBlock=null;render()">Cancel</button>
        </div></div>`,
      upload:`<div style="border:1px solid var(--brand-gold);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px;background:var(--accent-bg)">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">📤 Learner Upload</div>
        <input type="text" id="wbLabel" placeholder="Upload label — e.g. Upload a copy of your license" style="margin-bottom:8px;font-size:12px">
        <input type="text" id="wbVal" placeholder="Instructions (optional)" style="font-size:12px">
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="wizConfirmBlock('upload')">Add Block</button>
          <button class="btn btn-sm" onclick="wizPendingBlock=null;render()">Cancel</button>
        </div></div>`,
      form:`<div style="border:1px solid var(--brand-gold);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px;background:var(--accent-bg)">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">📝 Form</div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:8px">Add fields to your form:</div>
        <div id="wbFormFields">
          <div class="wb-field-row" style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
            <select style="width:90px;font-size:11px"><option>text</option><option>date</option><option>textarea</option><option>select</option><option>checkbox</option></select>
            <input type="text" placeholder="Field label" style="flex:1;font-size:12px">
            <input type="text" placeholder="Placeholder / options" style="flex:1;font-size:12px">
          </div>
        </div>
        <button class="btn btn-sm" onclick="addWbField()" style="margin-top:6px;font-size:11px">+ Add Field</button>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="wizConfirmBlock('form')">Add Form</button>
          <button class="btn btn-sm" onclick="wizPendingBlock=null;render()">Cancel</button>
        </div></div>`,
    };
    return forms[type]||'';
  }

  window.wizAddBlock=function(type){
    window.wizPendingBlock=type;
    render();
  };

  window.addWbField=function(){
    const container=document.getElementById('wbFormFields');
    if(!container) return;
    const row=document.createElement('div');
    row.className='wb-field-row';
    row.style.cssText='display:flex;gap:6px;margin-bottom:6px;align-items:center';
    row.innerHTML=`<select style="width:90px;font-size:11px"><option>text</option><option>date</option><option>textarea</option><option>select</option><option>checkbox</option></select>
      <input type="text" placeholder="Field label" style="flex:1;font-size:12px">
      <input type="text" placeholder="Placeholder / options" style="flex:1;font-size:12px">
      <button class="btn btn-sm btn-danger" style="padding:2px 7px" onclick="this.closest('.wb-field-row').remove()">✕</button>`;
    container.appendChild(row);
  };

  window.wizConfirmBlock=function(type){
    let block=null;
    const val=document.getElementById('wbVal')?.value.trim();
    const label=document.getElementById('wbLabel')?.value.trim();
    if(type==='text'){
      if(!val){toast('Please write some content.');return;}
      block={type:'text',val};
    } else if(type==='link'){
      if(!label||!val){toast('Please fill in both the label and URL.');return;}
      block={type:'link',label,val};
    } else if(type==='image'){
      if(!val){toast('Please paste an image URL.');return;}
      block={type:'image',val};
    } else if(type==='file'){
      if(!label||!val){toast('Please fill in both the label and URL.');return;}
      block={type:'file',label,val};
    } else if(type==='upload'){
      if(!label){toast('Please enter an upload label.');return;}
      block={type:'upload',label,instructions:val||''};
    } else if(type==='form'){
      const rows=[...document.querySelectorAll('.wb-field-row')];
      const fields=rows.map(r=>{
        const inputs=r.querySelectorAll('input[type=text]');
        const sel=r.querySelector('select');
        return {type:sel?.value||'text',label:inputs[0]?.value.trim()||'',placeholder:inputs[1]?.value.trim()||''};
      }).filter(f=>f.label);
      if(!fields.length){toast('Please add at least one field with a label.');return;}
      block={type:'form',fields};
    }
    if(block){
      wiz.blocks.push(block);
      window.wizPendingBlock=null;
      render();
    }
  };

  window.wizBlockPreview=function(b,bi){
    const labels={text:'✏️ Text block',link:'🔗 '+b.label,image:'🖼️ Image',file:'📎 '+b.label,form:'📝 Form',upload:'📤 '+b.label};
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface2);border-radius:var(--radius);margin-bottom:6px">
      <span style="font-size:13px;flex:1">${labels[b.type]||b.type}</span>
      <button class="btn btn-sm btn-danger" style="padding:2px 7px" onclick="_wiz.blocks.splice(${bi},1);render()">✕</button>
    </div>`;
  };

  window.wizSave=function(courseId){
    const status=[...document.querySelectorAll('input[name=wizStatus]')].find(r=>r.checked)?.value||'published';
    const newMod={t:wiz.title,type:wiz.type,status,blocks:wiz.blocks};
    if(!COURSE_MODULES[courseId]) COURSE_MODULES[courseId]=[];
    COURSE_MODULES[courseId].push(newMod);
    const co=COURSES.find(c=>c.id===courseId);
    if(co) co.mods=COURSE_MODULES[courseId].length;
    // save quiz questions if it's a quiz module
    if(wiz.type==='quiz'&&wiz.quizQuestions?.length){
      if(!COURSE_QUIZZES[courseId]) COURSE_QUIZZES[courseId]=[];
      // replace course quiz with these questions
      COURSE_QUIZZES[courseId]=wiz.quizQuestions.filter(q=>q.q.trim());
    }
    lsSave();
    toast(`✓ "${wiz.title}" module added!`);
    closeModal();
    openCourseModal(courseId);
  };

  render();
}

function cmAddMod(courseId){
  const list=document.getElementById('cm-modList');
  if(!list) return;
  const idx=list.querySelectorAll('.mod-block').length;
  const tmp=document.createElement('div');
  const newMod={t:'New Module',type:'doc',status:'draft',blocks:[]};
  tmp.innerHTML=cmModRowHTML(courseId,newMod,idx+'_new');
  list.appendChild(tmp.firstElementChild);
}


function toggleModStatus(badge){
  const isPub=badge.textContent.includes('Published');
  badge.textContent=isPub?'⚠️ Draft — click to publish':'✅ Published';
  badge.className='badge '+(isPub?'badge-warn':'badge-success');
}


function saveCourseChanges(id){
  const co=COURSES.find(c=>c.id===id);

  // Save Course Info tab fields
  if(co){
    const titleInput=document.getElementById('cmTitle');
    const catSelect=document.getElementById('cmCat');
    const durSelect=document.getElementById('cmDur');
    const thumbInput=document.getElementById('thumbUrl');
    if(titleInput?.value.trim()) co.title=titleInput.value.trim();
    if(catSelect?.value) co.cat=catSelect.value;
    if(durSelect?.value) co.dur=durSelect.value;
    // thumbnail: use URL field (may have been set by file upload too)
    const thumbVal=thumbInput?.value.trim()||'';
    co.thumbnail=thumbVal||null;
  }

  // Save modules from DOM
  const modList=document.getElementById('cm-modList');
  if(modList){
    const blocks=modList.querySelectorAll('.mod-block');
    COURSE_MODULES[id]=[...blocks].map(block=>{
      const title=block.querySelector('.mod-title-input')?.value||'Untitled Module';
      const typeSelect=block.querySelector('select');
      const type=typeSelect?.value||'doc';
      const statusBadge=block.querySelector('.badge');
      const status=statusBadge?.textContent.includes('Published')?'published':'draft';

      const contentBlocks=[];
      block.querySelectorAll('.cm-block').forEach(cb=>{
        const btype=cb.dataset.type;
        const inputs=cb.querySelectorAll('input[type=text]');
        const textarea=cb.querySelector('textarea');
        if(btype==='text') contentBlocks.push({type:'text',val:textarea?.value||''});
        else if(btype==='video') contentBlocks.push({type:'video',val:inputs[0]?.value||''});
        else if(btype==='link') contentBlocks.push({type:'link',label:inputs[0]?.value||'',val:inputs[1]?.value||''});
        else if(btype==='file') contentBlocks.push({type:'file',label:inputs[0]?.value||'',val:inputs[1]?.value||''});
        else if(btype==='image') contentBlocks.push({type:'image',val:inputs[0]?.value||''});
        else if(btype==='upload') contentBlocks.push({type:'upload',label:inputs[0]?.value||'Upload Required Document',instructions:inputs[1]?.value||''});
        else if(btype==='form'){
          const fields=[...cb.querySelectorAll('.form-field-row')].map(row=>{
            const selects=row.querySelectorAll('select');
            const ins=row.querySelectorAll('input[type=text]');
            return {type:selects[0]?.value||'text',label:ins[0]?.value||'',placeholder:ins[1]?.value||''};
          }).filter(f=>f.label);
          contentBlocks.push({type:'form',fields});
        }
      });

      return {t:title,type,status,blocks:contentBlocks};
    });

    if(co) co.mods=COURSE_MODULES[id].length;
  }

  lsSave();
  toast('Course saved!');
  closeModal();
  renderContentLibrary(document.getElementById('mainContent'));
}

function renderSOPTab(id){
  const updates=SOP_UPDATES[id]||[];
  if(!updates.length) return `
    <div class="empty" style="padding:30px 0">
      <div class="empty-icon">📋</div>
      <div class="empty-title">No SOP updates yet</div>
      <div style="font-size:13px;margin-bottom:14px">When you save changes to this course, you can notify your team and track re-completion.</div>
    </div>`;
  return updates.map((u,ui)=>{
    const done=u.completions.filter(c=>c.done).length;
    const total=u.completions.length;
    const pct=Math.round(done/total*100);
    const overdue=u.completions.filter(c=>!c.done);
    return `
    <div style="border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:14px">
      <div style="padding:12px 14px;background:var(--surface2);display:flex;align-items:start;justify-content:space-between;gap:12px">
        <div>
          <div style="font-size:13px;font-weight:600;margin-bottom:3px">Update — ${u.date}</div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:5px">${u.note}</div>
          <div style="font-size:11px;color:var(--text3)">Published by ${u.by} · Deadline: <strong>${u.due}</strong></div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:18px;font-weight:700;color:${pct===100?'var(--success)':pct>60?'var(--warn)':'var(--danger)'}">${pct}%</div>
          <div style="font-size:11px;color:var(--text3)">${done}/${total} complete</div>
        </div>
      </div>
      <div class="progress-bar" style="height:4px;margin:0;border-radius:0"><div class="progress-fill ${pct===100?'green':pct>60?'':'amber'}" style="width:${pct}%"></div></div>
      <div style="padding:10px 14px">
        ${u.completions.map(c=>`
        <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
          <div class="av av-sm" style="background:${c.bg};color:${c.tc}">${c.ini}</div>
          <div style="flex:1;font-size:13px">${c.name}</div>
          ${c.done
            ?`<span class="badge badge-success">✓ Done ${c.doneDate}</span>`
            :`<div style="display:flex;align-items:center;gap:6px">
                <span class="badge badge-danger">Incomplete</span>
                <button class="btn btn-sm" onclick="toast('Reminder sent to ${c.name}!')">Remind</button>
              </div>`}
        </div>`).join('')}
        ${overdue.length?`
        <div style="margin-top:10px">
          <button class="btn btn-sm" onclick="toast('Reminders sent to all ${overdue.length} incomplete team members!')">
            📧 Remind All Incomplete (${overdue.length})
          </button>
        </div>`:''}
      </div>
    </div>`;
  }).join('');
}

function openSOPNotifyPrompt(id){
  const co=COURSES.find(c=>c.id===id);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="font-size:17px;font-weight:600">Save & Notify Team?</div>
      <button class="btn btn-sm" onclick="openCourseModal(${id})">← Back</button>
    </div>
    <div class="callout callout-blue" style="margin-bottom:18px">
      Changes to <strong>${co.title}</strong> will be saved. Do you want to notify your team and require them to re-complete this course?
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      <label style="display:flex;align-items:start;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-lg);cursor:pointer" onclick="selectNotifyOpt(this,'yes')">
        <input type="radio" name="notifyOpt" style="width:auto;margin-top:2px">
        <div>
          <div style="font-size:13px;font-weight:500">Yes — notify team & require re-completion</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">Team members will receive a notification and must re-complete the course by the deadline.</div>
        </div>
      </label>
      <label style="display:flex;align-items:start;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-lg);cursor:pointer" onclick="selectNotifyOpt(this,'no')">
        <input type="radio" name="notifyOpt" style="width:auto;margin-top:2px">
        <div>
          <div style="font-size:13px;font-weight:500">No — save quietly</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">Changes save without notifying anyone. Existing completions remain unchanged.</div>
        </div>
      </label>
    </div>
    <div id="sop-notify-details" style="display:none">
      <div class="form-group"><label class="form-label">What changed? (shown in notification)</label>
        <textarea id="sopUpdateNote" rows="2" placeholder="e.g. Updated section 2 — revised safety procedures effective immediately."></textarea>
      </div>
      <div class="form-group"><label class="form-label">Re-completion deadline</label>
        <input type="date" id="sopDueDate" style="cursor:pointer">
      </div>
      <div class="form-group">
        <label class="form-label">Notify which team members?</label>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button class="btn btn-sm" onclick="toggleAllAssign(true)">Select All</button>
          <button class="btn btn-sm" onclick="toggleAllAssign(false)">Deselect All</button>
        </div>
        ${LEARNERS.filter(l=>l.account==='active').map(l=>`
        <label style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer">
          <input type="checkbox" class="assign-cb" checked>
          <div class="av av-sm" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
          <div style="font-size:13px">${l.name} <span style="color:var(--text3);font-size:11px">· ${l.dept}</span></div>
        </label>`).join('')}
      </div>
    </div>
    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="finalSaveCourse(${id})">Save Course</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function selectNotifyOpt(label, val){
  label.closest('div').querySelectorAll('label').forEach(l=>l.style.borderColor='var(--border)');
  label.style.borderColor='var(--accent-mid)';
  const details=document.getElementById('sop-notify-details');
  if(details) details.style.display=val==='yes'?'block':'none';
  label.querySelector('input[type=radio]').checked=true;
}

function finalSaveCourse(id){
  const notifyYes=document.querySelector('input[name=notifyOpt]:checked');
  const isNotify=notifyYes&&notifyYes.closest('label').querySelector('.btn')==null&&
    document.getElementById('sop-notify-details')?.style.display!=='none';
  const note=document.getElementById('sopUpdateNote')?.value||'Course content updated.';
  const due=document.getElementById('sopDueDate')?.value;
  const dueFormatted=due?new Date(due).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'TBD';
  const checked=document.querySelectorAll('.assign-cb:checked').length;
  if(document.getElementById('sop-notify-details')?.style.display==='block'){
    if(!SOP_UPDATES[id]) SOP_UPDATES[id]=[];
    SOP_UPDATES[id].unshift({
      date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      note:note||'Course content updated.',
      by:'Eleni Gagnon',
      due:dueFormatted,
      completions:LEARNERS.filter(l=>l.account==='active').map(l=>({
        name:l.name,ini:l.ini,bg:l.bg,tc:l.tc,done:false,doneDate:null
      }))
    });
    toast(`✓ Saved! Notifications sent to ${checked} team members. Re-completion deadline: ${dueFormatted}`);
  } else {
    toast('✓ Course saved quietly. No notifications sent.');
  }
  closeModal();
  renderContentLibrary(document.getElementById('mainContent'));
}

// ─── CREATE COURSE ─────────────────────────────────────────────────────────
function renderCreate(c){
  c.innerHTML=`
  <div class="card" style="max-width:700px">
    <div class="tab-bar">
      <div class="tab active" onclick="switchTab(this,'tc-info')">1. Course Info</div>
      <div class="tab" onclick="switchTab(this,'tc-mods')">2. Modules</div>
      <div class="tab" onclick="switchTab(this,'tc-assign')">4. Assign Learners</div>
    </div>
    <div id="tc-info">
      <div class="grid2">
        <div class="form-group"><label class="form-label">Course Title</label><input type="text" placeholder="e.g. Security Fundamentals"></div>
        <div class="form-group"><label class="form-label">Category</label>
          <select onchange="showCatDesc(this.value)" id="newCourseCat">
            ${CATS.map(c=>`<option value="${c.name}">${c.name}</option>`).join('')}
          </select>
          <div id="catDescPreview" style="margin-top:6px;font-size:12px;color:var(--text2);padding:7px 10px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border)">${CATS[0].desc}</div>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Description</label><textarea placeholder="What will learners gain from this course?"></textarea></div>
      <div class="grid2">
        <div class="form-group">
          <label class="form-label">Estimated Duration</label>
          <select>
            <option value="">Select duration...</option>
            <option>5 minutes</option>
            <option>10 minutes</option>
            <option>30 minutes</option>
            <option>45 minutes</option>
            <option>60 minutes</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Due Date</label>
          <div style="font-size:12px;color:var(--text2);padding:8px 11px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);line-height:1.5">
            📅 Due dates are assigned per user in <span style="color:var(--accent);cursor:pointer;font-weight:500" onclick="go('users')">User Management</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Course Icon</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${['📚','⚖️','🔒','📋','💡','🎯','🤝','🛡️','📊','🏆','🧪','🌐'].map(e=>`
          <button class="btn" style="font-size:20px;padding:6px 10px" onclick="this.parentElement.querySelectorAll('.btn').forEach(b=>b.style.background='');this.style.background='var(--accent-bg)'">${e}</button>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Requires manager sign-off to complete?</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
          <input type="checkbox" checked> Yes — learner must be approved by their manager
        </label>
      </div>
    </div>
    <div id="tc-mods" style="display:none">
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Drag ⠿ to reorder modules. Click a module to expand and add attachments.</div>
      <div id="modList">
        ${[{t:'Introduction & Welcome',type:'doc'},{t:'Core Training Video',type:'video'},{t:'Knowledge Check Quiz',type:'quiz'},{t:'Manager Sign-Off',type:'signoff'}].map((m,i)=>modRowHTML(m.t,m.type,i)).join('')}
      </div>
      <button class="btn" style="margin-top:12px" onclick="addMod()">+ Add Module</button>
    </div>
    <div id="tc-quiz" style="display:none">
      <div id="questionList">
        ${QUIZ.slice(0,2).map((q,qi)=>`
        <div class="card" style="margin-bottom:14px;padding:14px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span class="badge badge-blue">Question ${qi+1}</span>
            <button class="btn btn-sm btn-danger" onclick="this.closest('.card').remove()">Remove</button>
          </div>
          <div class="form-group" style="margin-bottom:10px"><input type="text" value="${q.q}" placeholder="Question text"></div>
          ${q.opts.map((o,oi)=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <input type="radio" name="correct_${qi}" ${oi===q.correct?'checked':''}>
            <input type="text" value="${o}" style="flex:1" placeholder="Answer option">
          </div>`).join('')}
        </div>`).join('')}
      </div>
      <button class="btn" onclick="addQuestion()">+ Add Question</button>
      <div style="margin-top:12px;font-size:12px;color:var(--text3)">Select the radio button next to the correct answer for each question.</div>
    </div>
    <div id="tc-assign" style="display:none">
      <div class="form-group"><label class="form-label">Assign to department</label>
        <select><option>All New Hires</option><option>Finance</option><option>Human Resources</option><option>Marketing</option><option>Operations</option><option>Sales</option></select>
      </div>
      <div class="card-title" style="margin-top:8px">Individual Learners</div>
      ${LEARNERS.map(l=>`
      <label style="display:flex;align-items:center;gap:10px;padding:9px 0;cursor:pointer;border-bottom:1px solid var(--border)">
        <input type="checkbox" checked>
        <div class="av av-sm" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
        <div><div style="font-size:13px;font-weight:500">${l.name}</div><div style="font-size:11px;color:var(--text3)">${l.dept}</div></div>
        <span class="badge badge-gray" style="margin-left:auto">${l.status==='complete'?'All done':'Active'}</span>
      </label>`).join('')}
    </div>
    <hr class="divider">
    <div style="display:flex;gap:10px">
      <button class="btn btn-primary" onclick="toast('Course published! Learners have been notified.')">Publish Course</button>
      <button class="btn" onclick="toast('Draft saved.')">Save Draft</button>
    </div>
  </div>`;
}

function switchTab(el,id){
  const container=el.closest('.card')||el.closest('.modal')||el.closest('#modalContent');
  if(container) container.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  ['tc-info','tc-mods','tc-assign','cm-info','cm-mods','cm-sop','pm-progress','pm-profile','pm-activity','pm-access','eu-info','eu-courses','eu-access'].forEach(tid=>{
    const el2=document.getElementById(tid);
    if(el2) el2.style.display=tid===id?'block':'none';
  });
}

function modRowHTML(title, type, idx){
  const icons={doc:'📄',video:'▶️',quiz:'📝'};
  const uid='mod_'+Date.now()+'_'+idx;
  return `<div class="mod-block" draggable="true" data-uid="${uid}"
    ondragstart="modDragStart(event)" ondragover="modDragOver(event)" ondrop="modDrop(event)" ondragleave="modDragLeave(event)" ondragend="modDragEnd(event)"
    style="border:1px solid var(--border);border-radius:var(--radius-lg);margin-bottom:10px;overflow:hidden">
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface)">
      <div data-drag-handle style="cursor:grab;color:var(--text3);font-size:16px;padding:0 4px" title="Drag to reorder">⠿</div>
      <div class="module-icon doc" style="flex-shrink:0" id="icon-${uid}">${icons[type]||'📄'}</div>
      <input type="text" value="${title}" class="mod-title-input"
        style="border:none;background:transparent;font-size:13px;padding:0;font-family:inherit;flex:1;outline:none;font-weight:500;min-width:0">
      <select style="width:auto;font-size:12px" onchange="updateModBlockIcon(this)">
        <option ${type==='doc'?'selected':''} value="doc">📄 Document</option>
        <option ${type==='video'?'selected':''} value="video">▶️ Video</option>
        <option ${type==='quiz'?'selected':''} value="quiz">📝 Quiz</option>
      </select>
      <span style="font-size:11px;color:var(--text3);padding:4px 6px;cursor:pointer;border-radius:4px;user-select:none" id="expand-arrow-${uid}" onclick="toggleModExpand('${uid}')">▼</span>
      <button class="btn btn-sm btn-danger" onclick="this.closest('.mod-block').remove()">Remove</button>
    </div>
    <div id="mod-expand-${uid}" style="display:none;border-top:1px solid var(--border);padding:16px;background:var(--surface2)">
      <div id="blocks-${uid}" style="margin-bottom:12px"></div>
      <div style="border:1px dashed var(--border2);border-radius:var(--radius);padding:12px;background:var(--surface)">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Add Content</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="addModBlock('${uid}','text')">✏️ Write Text</button>
          <button class="btn btn-sm" onclick="addModBlock('${uid}','video')">▶️ Embed Video</button>
          <button class="btn btn-sm" onclick="addModBlock('${uid}','link')">🔗 Link / Button</button>
          <button class="btn btn-sm" onclick="addModBlock('${uid}','file')">📎 Upload File</button>
          <button class="btn btn-sm" onclick="addModBlock('${uid}','image')">🖼️ Image</button>
          <button class="btn btn-sm" style="border-color:var(--brand-gold);color:var(--accent)" onclick="addModBlock('${uid}','upload')">📤 Learner Upload</button>
          <button class="btn btn-sm" style="border-color:var(--brand-gold);color:var(--accent)" onclick="addModBlock('${uid}','form')">📝 Form</button>
        </div>
      </div>
    </div>
  </div>`;
}

function toggleModExpand(uid){
  const panel=document.getElementById('mod-expand-'+uid);
  const arrow=document.getElementById('expand-arrow-'+uid);
  if(!panel) return;
  const open=panel.style.display==='none';
  panel.style.display=open?'block':'none';
  if(arrow) arrow.textContent=open?'▲':'▼';
}

function updateModBlockIcon(sel){
  const icons={doc:'📄',video:'▶️',quiz:'📝'};
  const classes={doc:'doc',video:'video',quiz:'quiz'};
  const row=sel.closest('.mod-block');
  const icon=row.querySelector('.module-icon');
  if(icon){icon.textContent=icons[sel.value]||'📄';icon.className='module-icon '+(classes[sel.value]||'doc');}
}

// drag reorder for modules
let _modDragEl=null;
function modDragStart(e){
  _modDragEl=e.currentTarget;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain','');
  setTimeout(()=>_modDragEl&&(_modDragEl.style.opacity='0.4'),0);
}
function modDragEnd(e){
  if(_modDragEl){_modDragEl.style.opacity='1';_modDragEl=null;}
  // reset all border colors
  document.querySelectorAll('.mod-block').forEach(b=>b.style.borderColor='');
}
function modDragOver(e){
  e.preventDefault();
  const target=e.currentTarget;
  if(target!==_modDragEl) target.style.borderColor='var(--brand-gold)';
}
function modDragLeave(e){e.currentTarget.style.borderColor='';}
function modDrop(e){
  e.preventDefault();
  const target=e.currentTarget;
  target.style.borderColor='';
  if(!_modDragEl||target===_modDragEl) return;
  const list=_modDragEl.parentElement;
  if(!list) return;
  const nodes=[...list.querySelectorAll(':scope > .mod-block')];
  const fromIdx=nodes.indexOf(_modDragEl);
  const toIdx=nodes.indexOf(target);
  if(fromIdx<0||toIdx<0) return;
  if(fromIdx<toIdx) target.after(_modDragEl);
  else target.before(_modDragEl);
  _modDragEl.style.opacity='1';
  _modDragEl=null;
}

// attachments
function addAttach(uid, kind){
  const list=document.getElementById('attach-list-'+uid);
  if(!list) return;
  const d=document.createElement('div');
  d.style.cssText='display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px';
  const kindIcons={video:'▶️',file:'📎',photo:'🖼️',link:'🔗'};
  const kindLabels={video:'Video URL or embed',file:'File name / upload',photo:'Image URL or upload',link:'Paste URL'};
  const kindHints={video:'e.g. https://youtube.com/watch?v=...',file:'e.g. Employee_Handbook.pdf',photo:'e.g. https://... or upload',link:'e.g. https://company.com/policy'};
  d.innerHTML=`
    <span style="font-size:16px;flex-shrink:0">${kindIcons[kind]}</span>
    <input type="text" placeholder="${kindHints[kind]}" style="flex:1;font-size:12px;padding:5px 8px">
    ${kind==='file'||kind==='photo'?`<label class="btn btn-sm" style="cursor:pointer;font-size:11px">
      Upload <input type="file" style="display:none" ${kind==='photo'?'accept="image/*"':''} onchange="handleUpload(this)">
    </label>`:''}
    <button class="btn btn-sm btn-danger" style="flex-shrink:0" onclick="this.closest('div').remove()">✕</button>`;
  list.appendChild(d);
}

function handleUpload(input){
  if(input.files&&input.files[0]){
    const name=input.files[0].name;
    const textInput=input.closest('div').querySelector('input[type=text]');
    if(textInput) textInput.value=name;
    toast(`"${name}" attached!`);
  }
}




function addQuestion(){
  const ql=document.getElementById('questionList');
  const n=ql.querySelectorAll('.card').length+1;
  const d=document.createElement('div');
  d.className='card';d.style.marginBottom='14px';d.style.padding='14px 16px';
  d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span class="badge badge-blue">Question ${n}</span>
    <button class="btn btn-sm btn-danger" onclick="this.closest('.card').remove()">Remove</button>
  </div>
  <div class="form-group" style="margin-bottom:10px"><input type="text" placeholder="Enter your question here..."></div>
  ${['A','B','C','D'].map((l,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
    <input type="radio" name="correct_new${n}">
    <input type="text" placeholder="Answer option ${l}" style="flex:1">
  </div>`).join('')}`;
  ql.appendChild(d);
}

// ─── PEOPLE (unified Learners + User Management) ───────────────────────────
function renderPeople(c){
  document.getElementById('topbarRight').innerHTML='';

  const activeCount=LEARNERS.filter(l=>l.account==='active').length;
  const completeCount=LEARNERS.filter(l=>l.status==='complete').length;
  const overdueCount=LEARNERS.filter(l=>l.overdue>0).length;

  c.innerHTML=`
  <div class="grid4 section-gap">
    <div class="metric-card"><div class="metric-label">Total People</div><div class="metric-value">${LEARNERS.length}</div></div>
    <div class="metric-card"><div class="metric-label">Active</div><div class="metric-value" style="color:var(--success)">${activeCount}</div></div>
    <div class="metric-card"><div class="metric-label">All Courses Done</div><div class="metric-value" style="color:var(--accent)">${completeCount}</div></div>
    <div class="metric-card"><div class="metric-label">Overdue</div><div class="metric-value" style="color:var(--danger)">${overdueCount}</div></div>
  </div>

  <div class="search-bar">
    <div class="search-input" style="max-width:260px"><input type="text" placeholder="Search by name or email..." id="peopleSearch" oninput="filterPeople()"></div>
    <select style="width:auto" id="peopleDeptFilter" onchange="filterPeople()">
      <option value="">All Departments</option>
      <option>Finance</option><option>Human Resources</option><option>Marketing</option><option>Operations</option><option>Sales</option>
    </select>
    <select style="width:auto" id="peopleStatusFilter" onchange="filterPeople()">
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
    ${S.role==='admin'?`<button class="btn btn-primary btn-sm" onclick="openAddUserModal()" style="margin-left:auto">+ Add Person</button>`:''}
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Person</th>
          <th>Dept</th>
          <th>Manager</th>
          <th>Start Date</th>
          <th style="min-width:140px">LMS Progress</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="peopleTableBody">
        ${renderPeopleRows(LEARNERS)}
      </tbody>
    </table>
  </div>`;
}

function renderPeopleRows(list){
  return list.map(l=>{
    const pct=getPersonOverallPct(l);
    return `
  <tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="av av-md" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
        <div>
          <div style="font-weight:500;font-size:13px">${l.name}</div>
          <div style="font-size:11px;color:var(--text2)">${l.title}</div>
          <div style="font-size:11px;color:var(--text3)">${l.email}</div>
        </div>
      </div>
    </td>
    <td><span class="badge badge-gray">${l.dept}</span></td>
    <td style="font-size:13px;color:var(--text2)">${l.manager}</td>
    <td style="font-size:12px;color:var(--text3);white-space:nowrap">${l.start}</td>
    <td style="min-width:140px">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="progress-bar" style="flex:1;height:6px;margin:0;min-width:60px">
          <div class="progress-fill ${pct===100?'green':''}" style="width:${pct}%;height:6px;background:${pct===100?'var(--success)':pct>0?'var(--accent)':'var(--border)'}"></div>
        </div>
        <span style="font-size:11px;color:var(--text2);min-width:30px;text-align:right">${pct}%</span>
      </div>
    </td>
    <td><span class="badge ${pct===100?'badge-success':pct>0?'badge-blue':'badge-gray'}">${pct===100?'Complete':pct>0?'In Progress':'Not Started'}</span></td>
    <td>
      <div style="display:flex;gap:5px">
        <button class="btn btn-sm" onclick="openPersonModal('${l.name}')">Edit</button>
        <button class="btn btn-sm" onclick="toast('Reminder sent to ${l.name}!')">Remind</button>
      </div>
    </td>
  </tr>`;
  }).join('');
}

function filterPeople(){
  const search=(document.getElementById('peopleSearch')?.value||'').toLowerCase();
  const dept=document.getElementById('peopleDeptFilter')?.value||'';
  const status=document.getElementById('peopleStatusFilter')?.value||'';
  const filtered=LEARNERS.filter(l=>{
    const matchS=!search||l.name.toLowerCase().includes(search)||l.email.toLowerCase().includes(search);
    const matchD=!dept||l.dept===dept;
    const matchSt=!status||l.account===status;
    return matchS&&matchD&&matchSt;
  });
  const tbody=document.getElementById('peopleTableBody');
  if(tbody) tbody.innerHTML=renderPeopleRows(filtered);
}

// unified person modal — combines learner progress + user profile + access
function openPersonModal(name){
  const l=LEARNERS.find(x=>x.name===name);
  if(!l) return;
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
      <div style="display:flex;gap:12px;align-items:center">
        <div class="av av-lg" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
        <div>
          <div style="font-size:17px;font-weight:600">${l.name}</div>
          <div style="font-size:13px;color:var(--text2)">${l.title} · ${l.dept}</div>
          ${(()=>{
            const pct=getPersonOverallPct(l);
            return `<div style="display:flex;gap:6px;margin-top:5px">
              <span class="badge ${l.account==='active'?'badge-success':'badge-gray'}">${l.account==='active'?'Active':'Inactive'}</span>
              <span class="badge ${pct===100?'badge-success':'badge-warn'}">${pct===100?'All Done':pct+'% Complete'}</span>
            </div>`;
          })()}
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="expand-btn" onclick="toggleModalExpand(this)">⤢ Expand</button>
        <button class="btn btn-sm" onclick="closeModal()">✕</button>
      </div>
    </div>

    <div class="tab-bar">
      <div class="tab active" onclick="switchTab(this,'pm-progress')">Learning Progress</div>
      <div class="tab" onclick="switchTab(this,'pm-profile')">Profile</div>
      <div class="tab" onclick="switchTab(this,'pm-activity')">Activity Log</div>
      <div class="tab" onclick="switchTab(this,'pm-access')">Access & Security</div>
    </div>

    <div id="pm-progress">
      ${(()=>{
        const overallPct=getPersonOverallPct(l);
        const assignedCourses=COURSES.filter(co=>(l.assignedCourses||[]).includes(co.id));
        const completedCount=assignedCourses.filter(co=>getPersonCoursePct(l.email,co.id)===100).length;
        return `
        <div class="grid2 section-gap" style="margin-bottom:16px">
          <div class="metric-card"><div class="metric-label">Overall Progress</div><div class="metric-value">${overallPct}%</div></div>
          <div class="metric-card"><div class="metric-label">Courses Completed</div><div class="metric-value" style="color:var(--success)">${completedCount} / ${assignedCourses.length}</div></div>
        </div>
        <div class="card-title">Course Progress</div>
        ${assignedCourses.map(co=>{
          const pct=getPersonCoursePct(l.email,co.id);
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:11px">
            <div style="font-size:18px">${co.emoji}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500;margin-bottom:3px">${co.title}</div>
              <div class="progress-bar" style="margin:0"><div class="progress-fill ${pct===100?'green':''}" style="width:${pct}%"></div></div>
            </div>
            <span style="font-size:12px;color:var(--text2);min-width:32px;text-align:right">${pct}%</span>
          </div>`;
        }).join('')}
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-sm" onclick="toast('Reminder sent to ${l.name}!')">📧 Send Reminder</button>
          <button class="btn btn-sm" onclick="toast('Progress report exported.')">↓ Export Report</button>
        </div>`;
      })()}
    </div>

    <div id="pm-profile" style="display:none">
      <div class="grid2">
        <div class="form-group"><label class="form-label">Full Name</label><input id="pm-name" type="text" value="${l.name}"></div>
        <div class="form-group"><label class="form-label">Email Address</label><input id="pm-email" type="email" value="${l.email}"></div>
      </div>
      <div class="grid2">
        <div class="form-group"><label class="form-label">Job Title</label><input id="pm-title" type="text" value="${l.title}"></div>
        <div class="form-group"><label class="form-label">Department</label>
          <select id="pm-dept">${['Finance', 'Human Resources', 'Marketing', 'Operations', 'Sales'].map(d=>`<option${d===l.dept?' selected':''}>${d}</option>`).join('')}</select>
        </div>
      </div>
      <div class="grid2">
        <div class="form-group"><label class="form-label">Assigned Manager</label>
          <select id="pm-manager">${['Eleni Gagnon','Sean Gagnon','Sean Kirby','Cynthia Ramos'].map(m=>`<option${m===l.manager?' selected':''}>${m}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Start / Hire Date</label>
          <input id="pm-start" type="date" value="${toDateInput(l.start)}" style="cursor:pointer">
        </div>
      </div>
      <div class="form-group"><label class="form-label">System Role</label>
        <select id="pm-role"><option${l.role==='learner'||!l.role?' selected':''}>Learner</option><option${l.role==='manager'?' selected':''}>Manager</option><option${l.role==='admin'?' selected':''}>Admin</option><option${l.role==='executive'?' selected':''}>Executive</option></select>
      </div>
      <div class="form-group">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <label class="form-label" style="margin:0">Assigned Courses</label>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" onclick="document.querySelectorAll('.course-assign-cb').forEach(cb=>cb.checked=true)" style="font-size:11px;padding:3px 10px">Select All</button>
            <button class="btn btn-sm" onclick="document.querySelectorAll('.course-assign-cb').forEach(cb=>cb.checked=false)" style="font-size:11px;padding:3px 10px">Clear All</button>
          </div>
        </div>
        ${COURSES.map(co=>`
        <label style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;border-bottom:1px solid var(--border)">
          <input type="checkbox" class="course-assign-cb" data-id="${co.id}" ${l.assignedCourses&&l.assignedCourses.includes(co.id)?'checked':''}>
          <div style="font-size:16px">${co.emoji}</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:500">${co.title}</div><div style="font-size:11px;color:var(--text3)">${co.cat}</div></div>
          <input type="date" style="font-size:11px;padding:3px 6px;width:130px" placeholder="Due date">
        </label>`).join('')}
      </div>
    </div>

    <div id="pm-activity" style="display:none">
      ${(()=>{
        const activity = getPersonActivity(l.name);
        if(!activity.length) return `<div class="empty-state" style="margin-top:8px">
          <div class="empty-state-icon">🕐</div>
          <div class="empty-state-title">No activity yet</div>
          <div class="empty-state-sub">Activity will appear here once ${l.name.split(' ')[0]} starts a course.</div>
        </div>`;
        return activity.map(a=>`
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:18px;flex-shrink:0">${a.icon}</div>
          <div style="flex:1">
            <div style="font-size:13px;color:var(--text)">${a.text}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">${a.date}</div>
          </div>
        </div>`).join('');
      })()}
    </div>

    <div id="pm-access" style="display:none">
      <div class="callout callout-blue" style="margin-bottom:16px">
        Last login: <strong>Mar 26, 2026 at 9:14 AM</strong>
      </div>
      <div class="form-group"><label class="form-label">Account Status</label>
        <select>
          <option ${l.account==='active'?'selected':''}>Active</option>
          <option ${l.account==='inactive'?'selected':''}>Inactive</option>
          <option>Suspended</option>
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
        <button class="btn" onclick="toast('Password reset email sent to ${l.email}!')">📧 Send Password Reset</button>
        <button class="btn" onclick="toast('Login invitation resent to ${l.email}!')">🔁 Resend Login Invite</button>
        <button class="btn btn-danger" onclick="toast('${l.name} has been deactivated.');closeModal()">🚫 Deactivate Account</button>
      </div>
    </div>

    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="savePersonModal('${l.name}')">Save Changes</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

// ─── ACTIVITY LOG ──────────────────────────────────────────────────────────
const ACTIVITY_LOG = [];

function logActivity(learnerName, icon, text){
  const date = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  ACTIVITY_LOG.unshift({learner:learnerName, icon, text, date});
}

function getPersonActivity(name){
  return ACTIVITY_LOG.filter(a=>a.learner===name);
}

async function savePersonModal(name){
  const l=LEARNERS.find(x=>x.name===name);
  if(!l) return;

  // Read all profile fields
  const newName=document.getElementById('pm-name')?.value.trim()||l.name;
  const newEmail=document.getElementById('pm-email')?.value.trim()||l.email;
  const newTitle=document.getElementById('pm-title')?.value.trim()||l.title;
  const newDept=document.getElementById('pm-dept')?.value||l.dept;
  const newManager=document.getElementById('pm-manager')?.value||l.manager;
  const newStart=document.getElementById('pm-start')?.value||'';
  const newRole=(document.getElementById('pm-role')?.value||'Learner').toLowerCase();
  const cbs=document.querySelectorAll('.course-assign-cb');
  const newCourses=cbs.length?[...cbs].filter(cb=>cb.checked).map(cb=>parseInt(cb.dataset.id)):l.assignedCourses;

  // Capture original email before mutating (used as lookup key)
  const originalEmail=l.email;

  // Update in-memory LEARNERS record
  l.name=newName; l.email=newEmail; l.title=newTitle;
  l.dept=newDept; l.manager=newManager; l.role=newRole;
  l.assignedCourses=newCourses;
  if(newStart) l.start=new Date(newStart).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  // Persist to Supabase profiles table
  if(sb){
    const {error}=await sb.from('profiles').update({
      name:newName, email:newEmail, title:newTitle,
      dept:newDept, manager:newManager, role:newRole,
      start_date:newStart||null,
      assigned_courses:newCourses
    }).eq('email',originalEmail);
    if(error) console.warn('Profile save error:',error);
  }

  lsSave();
  toast('Changes saved for '+newName+'!');
  closeModal();
  renderPeople(document.getElementById('mainContent'));
}



function openLearnerModal(name){
  const l=LEARNERS.find(x=>x.name===name);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:18px">
      <div style="display:flex;gap:12px;align-items:center">
        <div class="av av-lg" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
        <div><div style="font-size:17px;font-weight:600;margin-bottom:3px">${l.name}</div>
          <div style="font-size:13px;color:var(--text2)">${l.dept}</div>
          <span class="badge ${l.status==='complete'?'badge-success':l.overdue>0?'badge-danger':'badge-warn'}" style="margin-top:4px">${l.status==='complete'?'Complete':l.overdue>0?'Overdue':'Active'}</span>
        </div>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="grid2 section-gap">
      <div class="metric-card"><div class="metric-label">Overall Progress</div><div class="metric-value">${l.prog}%</div></div>
      <div class="metric-card"><div class="metric-label">Overdue</div><div class="metric-value" style="color:${l.overdue?'var(--danger)':'var(--text)'}">${l.overdue}</div></div>
    </div>
    <div class="card-title">Course Progress</div>
    ${COURSES.slice(0,4).map((co,i)=>{
      const pcts=[35,80,0,60];
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:11px">
        <div style="font-size:18px">${co.emoji}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500;margin-bottom:3px">${co.title}</div>
          <div class="progress-bar" style="margin:0"><div class="progress-fill ${pcts[i]===100?'green':''}" style="width:${pcts[i]}%"></div></div>
        </div>
        <span style="font-size:12px;color:var(--text2)">${pcts[i]}%</span>
      </div>`;
    }).join('')}
    <hr class="divider">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" onclick="toast('Reminder sent to ${l.name}!');closeModal()">Send Reminder</button>
      <button class="btn" onclick="toast('Progress report exported.')">Export Report</button>
      <button class="btn" onclick="toast('Reassigned course list updated.')">Manage Courses</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function openInviteModal(){
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
      <div style="font-size:17px;font-weight:600">Invite New Learner</div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group"><label class="form-label">Full Name</label><input type="text" placeholder="e.g. Jamie Torres"></div>
    <div class="form-group"><label class="form-label">Email Address</label><input type="email" placeholder="jamie@company.com"></div>
    <div class="form-group"><label class="form-label">Department</label><select><option>Finance</option><option>Human Resources</option><option>Marketing</option><option>Operations</option><option>Sales</option></select></div>
    <div class="form-group"><label class="form-label">Manager</label><select><option>Eleni Gagnon</option><option>Sean Gagnon</option><option>Sean Kirby</option><option>Cynthia Ramos</option></select></div>
    <div class="form-group"><label class="form-label">Assign Onboarding Track</label>
      ${COURSES.slice(0,3).map(co=>`
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;font-size:13px">
        <input type="checkbox" checked> ${co.emoji} ${co.title}
      </label>`).join('')}
    </div>
    <button class="btn btn-primary" onclick="toast('Invitation sent! Learner will receive an email.');closeModal()">Send Invitation</button>`;
  document.getElementById('modalBg').classList.add('open');
}

// ─── SIGN-OFFS ─────────────────────────────────────────────────────────────
function renderSignoffs(c){
  const pending=[
    {name:'Kristin Harrington',ini:'AC',bg:'#dbeafe',tc:'#1a4fa0',course:'Security Fundamentals',date:'Mar 25',score:88},
    {name:'Lei Zhang',ini:'LZ',bg:'#e1f5ee',tc:'#0f6e56',course:'Compliance & Ethics',date:'Mar 24',score:95},
    {name:'Sofia Marin',ini:'SM',bg:'#fef3dc',tc:'#8a5a00',course:'HR Policies & Benefits',date:'Mar 22',score:72},
  ];
  const approved=[
    {name:'Priya Patel',ini:'PP',bg:'#f0edfe',tc:'#4a38b0',course:'Security Fundamentals',approvedDate:'Mar 20',by:'Sean Kirby'},
    {name:'Marcus Webb',ini:'MW',bg:'#e8f5e3',tc:'#2d6a1f',course:'Compliance & Ethics',approvedDate:'Mar 19',by:'Sean Kirby'},
    {name:'Marcus Webb',ini:'MW',bg:'#e8f5e3',tc:'#2d6a1f',course:'HR Policies & Benefits',approvedDate:'Mar 17',by:'Eleni Gagnon'},
  ];
  c.innerHTML=`
  <div class="tab-bar">
    <div class="tab active" onclick="swSOTab(this,'so-pend')">Pending <span class="badge badge-warn" style="margin-left:6px">${pending.length}</span></div>
    <div class="tab" onclick="swSOTab(this,'so-appr')">Approved (${approved.length})</div>
  </div>
  <div id="so-pend">
    ${pending.map((s,i)=>`
    <div class="card section-gap" id="so-${i}">
      <div style="display:flex;align-items:start;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="av av-md" style="background:${s.bg};color:${s.tc}">${s.ini}</div>
          <div>
            <div style="font-size:14px;font-weight:600">${s.name}</div>
            <div style="font-size:12px;color:var(--text2)">Completed: ${s.course}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">Submitted ${s.date} · Quiz score: <strong style="color:${s.score>=80?'var(--success)':'var(--warn)'}">${s.score}%</strong></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="toast('Opening ${s.name}\'s submissions...')">Review Work</button>
          <button class="btn btn-sm btn-success" onclick="approveSO(${i},'${s.name}')">✓ Approve</button>
          <button class="btn btn-sm btn-danger" onclick="toast('Sent back to ${s.name} with revision request.')">Request Revision</button>
        </div>
      </div>
      <div style="margin-top:12px">
        <label class="form-label">Sign-off notes (optional)</label>
        <textarea rows="2" placeholder="Add feedback or notes for the learner's record..."></textarea>
      </div>
    </div>`).join('')}
  </div>
  <div id="so-appr" style="display:none">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Learner</th><th>Course</th><th>Approved Date</th><th>Approved By</th><th>Certificate</th></tr></thead>
        <tbody>
          ${approved.map(a=>`<tr>
            <td><div style="display:flex;align-items:center;gap:8px"><div class="av av-sm" style="background:${a.bg};color:${a.tc}">${a.ini}</div>${a.name}</div></td>
            <td>${a.course}</td>
            <td>${a.approvedDate}</td>
            <td>${a.by}</td>
            <td><button class="btn btn-sm" onclick="toast('Certificate downloaded.')">📄 Download</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function approveSO(i,name){
  const el=document.getElementById(`so-${i}`);
  el.style.opacity='0.4';el.style.pointerEvents='none';
  toast(`✓ Sign-off approved for ${name}. They have been notified.`);
}

function swSOTab(el,id){
  el.closest('.tab-bar').querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  ['so-pend','so-appr'].forEach(tid=>{
    const e2=document.getElementById(tid);
    if(e2) e2.style.display=tid===id?'block':'none';
  });
}

// ─── REPORTS ───────────────────────────────────────────────────────────────
let _rptTab='overview', _rptCourse=null, _rptLearner=null;

function getPersonOverdueCourses(l,today){
  const t=today||(()=>{const d=new Date();d.setHours(0,0,0,0);return d;})();
  return (l.assignedCourses||[]).flatMap(id=>{
    const co=COURSES.find(c=>c.id===id);
    if(!co?.dueDate) return [];
    const due=new Date(co.dueDate); due.setHours(0,0,0,0);
    const pct=getPersonCoursePct(l.email,id);
    if(due>=t||pct===100) return [];
    return [{id,co,daysOverdue:Math.round((t-due)/(1000*60*60*24)),pct}];
  });
}

function goReport(tab,extra){
  _rptTab=tab;
  if(extra?.course!=null) _rptCourse=extra.course;
  if(extra?.learner!=null) _rptLearner=extra.learner;
  renderReports(document.getElementById('mainContent'));
}

function exportReportCSV(){
  const isAdmin=S.role==='admin';
  const u=USERS[S.role];
  const team=isAdmin?LEARNERS:LEARNERS.filter(l=>l.manager===u.name);
  const today=new Date(); today.setHours(0,0,0,0);
  const activeCourses=COURSES.filter(co=>team.some(l=>l.assignedCourses?.includes(co.id)));
  const headers=['Name','Email','Department','Title','Overall %',...activeCourses.map(co=>co.title),'Overdue Courses'];
  const rows=team.map(l=>{
    const overall=getPersonOverallPct(l);
    const overdue=getPersonOverdueCourses(l,today);
    const coursePcts=activeCourses.map(co=>l.assignedCourses?.includes(co.id)?getPersonCoursePct(l.email,co.id)+'%':'N/A');
    return [l.name,l.email,l.dept,l.title,overall+'%',...coursePcts,overdue.map(x=>x.co.title).join('; ')];
  });
  const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download='abs-lms-report-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast('CSV exported!');
}

function renderReports(c){
  const tr=document.getElementById('topbarRight');
  tr.innerHTML=`<button class="btn btn-sm" onclick="exportReportCSV()">↓ Export CSV</button>`;
  const isAdmin=S.role==='admin';
  const u=USERS[S.role];
  const team=isAdmin?LEARNERS:LEARNERS.filter(l=>l.manager===u.name);
  const today=new Date(); today.setHours(0,0,0,0);
  const enriched=team.map(l=>({...l,pct:getPersonOverallPct(l),overdueCourses:getPersonOverdueCourses(l,today)}));
  const totalOverdue=enriched.reduce((s,l)=>s+l.overdueCourses.length,0);

  const tabs=[
    {id:'overview',label:'Overview'},
    {id:'overdue',label:'Overdue'+(totalOverdue?` (${totalOverdue})`:'')},
    {id:'course',label:'By Course'},
    {id:'learner',label:'By Learner'},
  ];
  const tabBar=`<div style="display:flex;gap:2px;background:var(--surface2);border-radius:var(--radius-lg);padding:4px;margin-bottom:20px">
    ${tabs.map(t=>`<button onclick="goReport('${t.id}')" style="flex:1;padding:7px 10px;border-radius:var(--radius);border:none;cursor:pointer;font-size:13px;font-weight:${_rptTab===t.id?'600':'400'};transition:all 0.15s;background:${_rptTab===t.id?'var(--surface)':'transparent'};color:${_rptTab===t.id?(t.id==='overdue'&&totalOverdue?'var(--danger)':'var(--text)'):'var(--text2)'};box-shadow:${_rptTab===t.id?'0 1px 3px rgba(0,0,0,0.1)':'none'}">${t.label}</button>`).join('')}
  </div>`;

  let content='';
  if(_rptTab==='overview') content=_rptOverview(enriched);
  else if(_rptTab==='overdue') content=_rptOverdue(enriched);
  else if(_rptTab==='course') content=_rptCourseView(_rptCourse,enriched);
  else if(_rptTab==='learner') content=_rptLearnerView(_rptLearner,enriched);
  c.innerHTML=tabBar+content;
}

function _rptOverview(enriched){
  const total=enriched.length;
  const done=enriched.filter(l=>l.pct===100).length;
  const inProg=enriched.filter(l=>l.pct>0&&l.pct<100).length;
  const notStarted=enriched.filter(l=>l.pct===0).length;
  const overdueCount=enriched.filter(l=>l.overdueCourses.length>0).length;

  const depts={};
  enriched.forEach(l=>{
    if(!depts[l.dept]) depts[l.dept]={total:0,done:0};
    depts[l.dept].total++;
    if(l.pct===100) depts[l.dept].done++;
  });

  const courseData=COURSES.map(co=>{
    const assigned=enriched.filter(l=>l.assignedCourses?.includes(co.id));
    const completed=assigned.filter(l=>getPersonCoursePct(l.email,co.id)===100).length;
    const pct=assigned.length?Math.round(completed/assigned.length*100):0;
    return {co,assigned:assigned.length,completed,pct};
  }).filter(x=>x.assigned>0);

  return `
  <div class="grid4 section-gap">
    <div class="metric-card"><div class="metric-label">Total Learners</div><div class="metric-value">${total}</div></div>
    <div class="metric-card"><div class="metric-label">Completed All</div><div class="metric-value" style="color:var(--success)">${done}</div><div class="metric-delta up">${total?Math.round(done/total*100):0}% of team</div></div>
    <div class="metric-card"><div class="metric-label">In Progress</div><div class="metric-value" style="color:var(--accent)">${inProg}</div><div class="metric-delta">${notStarted} not started</div></div>
    <div class="metric-card"><div class="metric-label">Overdue</div><div class="metric-value" style="color:${overdueCount?'var(--danger)':'var(--success)'}">${overdueCount}</div><div class="metric-delta ${overdueCount?'down':'up'}">${overdueCount?'Need follow-up':'All on track ✓'}</div></div>
  </div>

  <div class="card section-gap">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="card-title" style="margin:0">All Learners</div>
      <div style="font-size:12px;color:var(--text3)">Click a row to see full breakdown</div>
    </div>
    <div class="table-wrap"><table><thead><tr>
      <th>Name</th><th>Department</th><th>Progress</th><th>Overdue</th><th>Status</th>
    </tr></thead><tbody>
      ${[...enriched].sort((a,b)=>b.pct-a.pct).map(l=>{
        const status=l.pct===100?'complete':l.overdueCourses.length?'overdue':l.pct>0?'in-progress':'not-started';
        return `<tr onclick="goReport('learner',{learner:'${l.email}'})" style="cursor:pointer">
          <td><div style="display:flex;align-items:center;gap:8px">
            <div class="av av-sm" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
            <div><div style="font-weight:500">${l.name}</div><div style="font-size:11px;color:var(--text3)">${l.title}</div></div>
          </div></td>
          <td>${l.dept}</td>
          <td><div style="display:flex;align-items:center;gap:8px">
            <div style="width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;flex-shrink:0">
              <div style="height:100%;background:${l.pct===100?'var(--success)':'var(--brand-gold)'};width:${l.pct}%"></div>
            </div>
            <span style="font-size:12px;color:var(--text2)">${l.pct}%</span>
          </div></td>
          <td>${l.overdueCourses.length?`<span class="badge badge-danger">${l.overdueCourses.length} overdue</span>`:`<span style="font-size:12px;color:var(--text3)">—</span>`}</td>
          <td><span class="badge ${status==='complete'?'badge-success':status==='overdue'?'badge-danger':status==='not-started'?'badge-gray':'badge-warn'}">${status==='complete'?'✓ Done':status==='overdue'?'Overdue':status==='not-started'?'Not Started':'In Progress'}</span></td>
        </tr>`;
      }).join('')}
    </tbody></table></div>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="card-title">By Department</div>
      ${Object.entries(depts).sort((a,b)=>b[1].total-a[1].total).map(([dept,d])=>{
        const pct=Math.round(d.done/d.total*100);
        return `<div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
            <span style="font-weight:500">${dept}</span><span style="color:var(--text2)">${d.done}/${d.total} · ${pct}%</span>
          </div>
          <div class="progress-bar" style="height:8px;margin:0"><div class="progress-fill ${pct===100?'green':''}" style="width:${pct}%"></div></div>
        </div>`;
      }).join('')}
    </div>
    <div class="card">
      <div class="card-title">By Course</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px">Click to drill down</div>
      ${courseData.map(({co,assigned,completed,pct})=>`
        <div onclick="goReport('course',{course:${co.id}})" style="display:flex;align-items:center;gap:10px;margin-bottom:12px;cursor:pointer;padding:6px 8px;border-radius:var(--radius);transition:background 0.1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="font-size:20px;flex-shrink:0">${co.emoji}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px">${co.title}</span>
              <span style="color:var(--text2);flex-shrink:0;margin-left:6px">${completed}/${assigned} · ${pct}%</span>
            </div>
            <div class="progress-bar" style="height:6px;margin:0"><div class="progress-fill ${pct===100?'green':''}" style="width:${pct}%"></div></div>
          </div>
        </div>`).join('')}
    </div>
  </div>`;
}

function _rptOverdue(enriched){
  const items=[];
  enriched.forEach(l=>l.overdueCourses.forEach(od=>items.push({l,...od})));
  items.sort((a,b)=>b.daysOverdue-a.daysOverdue);

  if(!items.length) return `<div class="empty-state" style="margin-top:32px">
    <div class="empty-state-icon">✅</div>
    <div class="empty-state-title">No overdue items</div>
    <div class="empty-state-sub">All learners are on track with their due dates.</div>
  </div>`;

  return `<div class="card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div class="card-title" style="margin:0">Overdue Items</div>
      <span class="badge badge-danger">${items.length} total</span>
    </div>
    <div class="table-wrap"><table><thead><tr>
      <th>Learner</th><th>Course</th><th>Due Date</th><th>Days Overdue</th><th>Progress</th>
    </tr></thead><tbody>
      ${items.map(({l,co,daysOverdue,pct})=>`
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div class="av av-sm" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
          <div><div style="font-weight:500">${l.name}</div><div style="font-size:11px;color:var(--text3)">${l.title}</div></div>
        </div></td>
        <td><div style="display:flex;align-items:center;gap:6px"><span>${co.emoji}</span><span style="font-size:13px">${co.title}</span></div></td>
        <td style="font-size:12px;color:var(--text2)">${co.dueDate}</td>
        <td><span class="badge badge-danger">${daysOverdue}d overdue</span></td>
        <td><div style="display:flex;align-items:center;gap:8px">
          <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;background:var(--danger);width:${pct}%"></div>
          </div>
          <span style="font-size:12px;color:var(--text2)">${pct}%</span>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

function _rptCourseView(courseId,enriched){
  if(courseId==null){
    const courseData=COURSES.map(co=>{
      const assigned=enriched.filter(l=>l.assignedCourses?.includes(co.id));
      const done=assigned.filter(l=>getPersonCoursePct(l.email,co.id)===100).length;
      const pct=assigned.length?Math.round(done/assigned.length*100):0;
      return {co,assigned:assigned.length,done,pct};
    }).filter(x=>x.assigned>0);
    return `<div class="card">
      <div class="card-title" style="margin-bottom:16px">Select a Course to Drill Down</div>
      <div class="grid2">
        ${courseData.map(({co,assigned,done,pct})=>`
          <div onclick="goReport('course',{course:${co.id}})" style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;cursor:pointer;transition:border-color 0.15s" onmouseover="this.style.borderColor='var(--brand-gold)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <div style="width:36px;height:36px;border-radius:8px;background:${co.color};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${co.emoji}</div>
              <div style="font-size:13px;font-weight:600;line-height:1.3">${co.title}</div>
            </div>
            <div class="progress-bar" style="margin:0 0 6px"><div class="progress-fill ${pct===100?'green':''}" style="width:${pct}%"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3)">
              <span>${done}/${assigned} completed</span><span>${pct}%</span>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  const co=COURSES.find(c=>c.id===courseId);
  if(!co) return '';
  const assigned=enriched.filter(l=>l.assignedCourses?.includes(co.id));
  const mods=(COURSE_MODULES[co.id]||[]).filter(m=>m.status==='published'||!m.status);
  const totalDone=assigned.filter(l=>getPersonCoursePct(l.email,co.id)===100).length;
  const avgPct=assigned.length?Math.round(assigned.reduce((s,l)=>s+getPersonCoursePct(l.email,co.id),0)/assigned.length):0;

  return `
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
    <button class="btn btn-sm" onclick="goReport('course',{course:null})" style="flex-shrink:0">← Back</button>
    <div style="width:36px;height:36px;border-radius:8px;background:${co.color};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${co.emoji}</div>
    <div><div style="font-size:16px;font-weight:700">${co.title}</div><div style="font-size:12px;color:var(--text3)">${co.cat} · ${mods.length} modules</div></div>
  </div>
  <div class="grid4 section-gap" style="margin-bottom:20px">
    <div class="metric-card"><div class="metric-label">Assigned</div><div class="metric-value">${assigned.length}</div></div>
    <div class="metric-card"><div class="metric-label">Completed</div><div class="metric-value" style="color:var(--success)">${totalDone}</div></div>
    <div class="metric-card"><div class="metric-label">Avg Progress</div><div class="metric-value" style="color:var(--accent)">${avgPct}%</div></div>
    <div class="metric-card"><div class="metric-label">Not Started</div><div class="metric-value">${assigned.filter(l=>getPersonCoursePct(l.email,co.id)===0).length}</div></div>
  </div>
  <div class="card">
    <div class="card-title" style="margin-bottom:14px">Learner Breakdown</div>
    <div class="table-wrap"><table><thead><tr>
      <th>Learner</th><th>Department</th><th>Progress</th><th>Modules Done</th><th>Status</th>
    </tr></thead><tbody>
      ${[...assigned].sort((a,b)=>getPersonCoursePct(b.email,co.id)-getPersonCoursePct(a.email,co.id)).map(l=>{
        const pct=getPersonCoursePct(l.email,co.id);
        const modsDone=(LEARNER_PROGRESS_BY_EMAIL[l.email]?.[co.id]||[]).length;
        const isOverdue=l.overdueCourses.some(od=>od.id===co.id);
        const status=pct===100?'complete':isOverdue?'overdue':pct>0?'in-progress':'not-started';
        return `<tr onclick="goReport('learner',{learner:'${l.email}'})" style="cursor:pointer">
          <td><div style="display:flex;align-items:center;gap:8px">
            <div class="av av-sm" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
            <div><div style="font-weight:500">${l.name}</div><div style="font-size:11px;color:var(--text3)">${l.title}</div></div>
          </div></td>
          <td>${l.dept}</td>
          <td><div style="display:flex;align-items:center;gap:8px">
            <div style="width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;flex-shrink:0">
              <div style="height:100%;background:${pct===100?'var(--success)':'var(--brand-gold)'};width:${pct}%"></div>
            </div>
            <span style="font-size:12px;color:var(--text2)">${pct}%</span>
          </div></td>
          <td style="font-size:12px;color:var(--text2)">${modsDone} / ${mods.length}</td>
          <td><span class="badge ${status==='complete'?'badge-success':status==='overdue'?'badge-danger':status==='not-started'?'badge-gray':'badge-warn'}">${status==='complete'?'✓ Done':status==='overdue'?'Overdue':status==='not-started'?'Not Started':'In Progress'}</span></td>
        </tr>`;
      }).join('')}
    </tbody></table></div>
  </div>`;
}

function _rptLearnerView(email,enriched){
  if(email==null){
    return `<div class="card">
      <div class="card-title" style="margin-bottom:16px">Select a Learner to Drill Down</div>
      ${[...enriched].sort((a,b)=>a.name.localeCompare(b.name)).map(l=>`
        <div onclick="goReport('learner',{learner:'${l.email}'})" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius);cursor:pointer;transition:background 0.1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div class="av av-sm" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
          <div style="flex:1"><div style="font-size:13px;font-weight:500">${l.name}</div><div style="font-size:11px;color:var(--text3)">${l.title} · ${l.dept}</div></div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="height:100%;background:${l.pct===100?'var(--success)':'var(--brand-gold)'};width:${l.pct}%"></div>
            </div>
            <span style="font-size:12px;color:var(--text2);width:30px;text-align:right">${l.pct}%</span>
          </div>
          ${l.overdueCourses.length?`<span class="badge badge-danger">${l.overdueCourses.length} overdue</span>`:''}
        </div>`).join('')}
    </div>`;
  }

  const l=enriched.find(x=>x.email===email);
  if(!l) return '';
  const assigned=(l.assignedCourses||[]).map(id=>COURSES.find(c=>c.id===id)).filter(Boolean);

  return `
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
    <button class="btn btn-sm" onclick="goReport('learner',{learner:null})" style="flex-shrink:0">← Back</button>
    <div class="av" style="background:${l.bg};color:${l.tc};width:40px;height:40px;font-size:14px;flex-shrink:0">${l.ini}</div>
    <div><div style="font-size:16px;font-weight:700">${l.name}</div><div style="font-size:12px;color:var(--text3)">${l.title} · ${l.dept}</div></div>
    ${l.overdueCourses.length?`<span class="badge badge-danger" style="margin-left:auto">${l.overdueCourses.length} overdue</span>`:'<span class="badge badge-success" style="margin-left:auto">On track ✓</span>'}
  </div>
  <div class="grid4 section-gap" style="margin-bottom:20px">
    <div class="metric-card"><div class="metric-label">Courses Assigned</div><div class="metric-value">${assigned.length}</div></div>
    <div class="metric-card"><div class="metric-label">Completed</div><div class="metric-value" style="color:var(--success)">${assigned.filter(co=>getPersonCoursePct(l.email,co.id)===100).length}</div></div>
    <div class="metric-card"><div class="metric-label">Overall Progress</div><div class="metric-value" style="color:var(--accent)">${l.pct}%</div></div>
    <div class="metric-card"><div class="metric-label">Overdue</div><div class="metric-value" style="color:${l.overdueCourses.length?'var(--danger)':'var(--success)'}">${l.overdueCourses.length}</div></div>
  </div>
  <div class="card">
    <div class="card-title" style="margin-bottom:14px">Course Breakdown</div>
    <div class="table-wrap"><table><thead><tr>
      <th>Course</th><th>Progress</th><th>Modules</th><th>Due Date</th><th>Status</th>
    </tr></thead><tbody>
      ${assigned.map(co=>{
        const pct=getPersonCoursePct(l.email,co.id);
        const mods=(COURSE_MODULES[co.id]||[]).filter(m=>m.status==='published'||!m.status);
        const modsDone=(LEARNER_PROGRESS_BY_EMAIL[l.email]?.[co.id]||[]).length;
        const od=l.overdueCourses.find(x=>x.id===co.id);
        const status=pct===100?'complete':od?'overdue':pct>0?'in-progress':'not-started';
        return `<tr>
          <td><div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:6px;background:${co.color};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${co.emoji}</div>
            <span style="font-size:13px;font-weight:500">${co.title}</span>
          </div></td>
          <td><div style="display:flex;align-items:center;gap:8px">
            <div style="width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;flex-shrink:0">
              <div style="height:100%;background:${pct===100?'var(--success)':'var(--brand-gold)'};width:${pct}%"></div>
            </div>
            <span style="font-size:12px;color:var(--text2)">${pct}%</span>
          </div></td>
          <td style="font-size:12px;color:var(--text2)">${modsDone} / ${mods.length}</td>
          <td style="font-size:12px;color:${od?'var(--danger)':'var(--text2)'}">${co.dueDate?co.dueDate+(od?` (+${od.daysOverdue}d)`:''):'—'}</td>
          <td><span class="badge ${status==='complete'?'badge-success':status==='overdue'?'badge-danger':status==='not-started'?'badge-gray':'badge-warn'}">${status==='complete'?'✓ Done':status==='overdue'?'Overdue':status==='not-started'?'Not Started':'In Progress'}</span></td>
        </tr>`;
      }).join('')}
    </tbody></table></div>
  </div>`;
}

function renderMyCourses(c){
  const learner=LEARNERS.find(l=>l.name===USERS[S.role].name)||LEARNERS[0];
  const assignedIds=learner?.assignedCourses||COURSES.map(co=>co.id);

  // get all courses in admin-defined order, filtered to assigned only
  const allOrdered=CATS.flatMap(cat=>getOrderedCourses(cat.name));
  const myCourses=allOrdered.filter(co=>assignedIds.includes(co.id));

  if(!myCourses.length){
    c.innerHTML=`<div class="empty-state" style="margin-top:32px">
      <div class="empty-state-icon">📚</div>
      <div class="empty-state-title">No courses assigned yet</div>
      <div class="empty-state-sub">Your manager will assign courses to you soon. Check back here to start learning!</div>
    </div>`;
    return;
  }

  // group by category, preserving order
  const byCat={};
  myCourses.forEach(co=>{
    if(!byCat[co.cat]) byCat[co.cat]=[];
    byCat[co.cat].push(co);
  });

  c.innerHTML=Object.entries(byCat).map(([cat,courses])=>`
    <div style="margin-bottom:32px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="font-size:15px;font-weight:600">${cat}</div>
        <div style="font-size:12px;color:var(--text3)">${courses.length} course${courses.length!==1?'s':''}</div>
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>
      <div class="grid3">
        ${courses.map(co=>{
          const pct=getCoursePct(co.id);
          return `<div class="course-card" onclick="openLearnerCourse(${co.id})">
            <div class="course-thumb" style="background:${co.color}">${co.emoji}</div>
            <div class="course-body">
              <div class="course-title">${co.title}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap">
                <span style="font-size:11px;color:var(--text3)">${co.mods} modules</span>
                ${(()=>{
                  const qs=COURSE_QUIZZES[co.id]||[];
                  const hasQ=qs.length&&qs[0].q;
                  const modQs=(COURSE_MODULES[co.id]||[]).filter(m=>m.type==='quiz').length;
                  const total=modQs+(hasQ?1:0);
                  return total?`<span style="font-size:11px;color:var(--accent)">📝 ${total} quiz${total!==1?'zes':''}</span>`:'';
                })()}
              </div>
              <div class="progress-bar" style="margin-top:8px"><div class="progress-fill ${pct===100?'green':''}" style="width:${pct}%"></div></div>
              <div style="display:flex;justify-content:space-between;margin-top:4px">
                <span style="font-size:11px;color:var(--text3)">${pct}% done</span>
                <span style="font-size:11px;color:var(--text3)">${co.dur}</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

function submitLearnerForm(fid, courseId, modIdx){
  const inputs=[...document.querySelectorAll(`[id^="${fid}_"]`)];
  const responses={};
  let allFilled=true;

  // reset highlights
  inputs.forEach(el=>{el.style.borderColor='';el.style.boxShadow='';});

  inputs.forEach(el=>{
    const label=el.closest('.form-group')?.querySelector('label')?.textContent||el.id;
    const val=el.type==='checkbox'?el.checked:(el.value||'').trim();
    const isEmpty=!val&&el.type!=='checkbox';
    if(isEmpty){
      allFilled=false;
      el.style.borderColor='var(--danger)';
      el.style.boxShadow='0 0 0 3px rgba(224,64,64,0.15)';
      el.addEventListener('input',()=>{el.style.borderColor='';el.style.boxShadow='';},{once:true});
    }
    responses[label]=val;
  });

  if(!allFilled){toast('⚠️ Please fill in all highlighted fields.');return;}

  if(!S.formResponses) S.formResponses={};
  S.formResponses[courseId+'_'+modIdx]={responses,submittedAt:new Date().toLocaleString(),learner:USERS[S.role].name};
  if(!S.completedModules) S.completedModules={};
  if(!S.completedModules[courseId]) S.completedModules[courseId]=[];
  if(!S.completedModules[courseId].includes(modIdx)) S.completedModules[courseId].push(modIdx);
  const modName=COURSE_MODULES[courseId]?.[modIdx]?.t||'a module';
  const courseName=COURSES.find(c=>c.id===courseId)?.title||'a course';
  logActivity(USERS[S.role].name,'📝',`Submitted form in "${modName}" — ${courseName}`);
  NOTIFICATIONS.unshift({id:Date.now(),icon:'📝',text:`${USERS[S.role].name} submitted a form in module ${modIdx+1}`,time:'Just now',unread:true,action:'people'});
  renderNotifPanel();
  toast('✓ Form submitted! Module marked complete.');
  const mods=COURSE_MODULES[courseId]||[];
  const next=mods.findIndex((_,i)=>i>modIdx&&!S.completedModules[courseId].includes(i));
  S.activeModuleIdx[courseId]=next>=0?next:null;
  renderCourseDetail(document.getElementById('mainContent'));
}

function handleLearnerUpload(uploadId, input){
  const file=input.files[0];
  if(!file) return;
  const status=document.getElementById(uploadId+'_status');
  if(status){
    status.textContent=`✓ ${file.name} (${(file.size/1024).toFixed(0)}KB)`;
    status.style.color='var(--success)';
  }
  // store upload record
  if(!S.uploads) S.uploads={};
  S.uploads[uploadId]={name:file.name,size:file.size,date:new Date().toLocaleDateString()};
  // notify manager
  toast(`✓ "${file.name}" uploaded! Your manager has been notified.`);
  // add to notifications
  NOTIFICATIONS.unshift({
    id:Date.now(),icon:'📤',
    text:`${USERS[S.role].name} uploaded "${file.name}" — please review`,
    time:'Just now',unread:true,action:'people'
  });
  renderNotifPanel();
}

let _dashSortCol=-1, _dashSortAsc=true;
function sortDashTable(col){
  const body=document.getElementById('dashCourseBody');
  if(!body) return;
  _dashSortAsc = _dashSortCol===col ? !_dashSortAsc : true;
  _dashSortCol=col;

  // update sort indicators
  [0,1,2,3].forEach(i=>{
    const el=document.getElementById('sort'+i);
    if(el) el.textContent = i===col ? (_dashSortAsc?'↑':'↓') : '↕';
  });

  const rows=[...body.querySelectorAll('tr')];
  rows.sort((a,b)=>{
    const aCell=a.cells[col]?.textContent.trim()||'';
    const bCell=b.cells[col]?.textContent.trim()||'';
    // sort progress numerically
    if(col===2){
      return (_dashSortAsc?1:-1)*(parseInt(aCell)-parseInt(bCell));
    }
    return (_dashSortAsc?1:-1)*aCell.localeCompare(bCell);
  });
  rows.forEach(r=>body.appendChild(r));
}

function openLearnerCourse(id){
  S.activeCourseId=id;
  S.videoWatched=false;
  S.quizReady=false;
  VID.playing=false; VID.elapsed=0;
  clearInterval(VID.timer);
  go('course-detail');
}

// ─── COURSE DETAIL ─────────────────────────────────────────────────────────
function renderCourseDetail(c){
  const co=COURSES.find(x=>x.id===S.activeCourseId)||COURSES[0];
  const qs=S.quiz; // legacy ref kept for safety
  const mods=(COURSE_MODULES[co.id]||[]).filter(m=>m.status==='published'||!m.status);
  const totalMods=mods.length;
  if(!S.activeModuleIdx) S.activeModuleIdx={};
  if(!S.completedModules) S.completedModules={};
  if(!S.completedModules[co.id]) S.completedModules[co.id]=[];

  // Single source of truth: completedModules for all module types
  const completedCount=mods.filter((_,i)=>S.completedModules[co.id].includes(i)).length;
  const pct=totalMods?Math.round(completedCount/totalMods*100):0;

  document.getElementById('pageTitle').textContent='';
  document.getElementById('pageCrumb').textContent='My Courses / '+co.title;
  document.getElementById('topbarRight').innerHTML=`<button class="btn btn-sm" onclick="go('my-courses')">← Back</button>`;

  function renderBlock(b, modIdx){
    if(!b) return '';
    if(b.type==='text') return `<div style="font-size:13px;line-height:1.9;color:var(--text);white-space:pre-line;margin-bottom:14px">${b.val||''}</div>`;
    if(b.type==='video'){
      const url=b.val||'';
      const yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      const vm=url.match(/vimeo\.com\/(\d+)/);
      if(yt) return `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:var(--radius);overflow:hidden;margin-bottom:14px"><iframe src="https://www.youtube.com/embed/${yt[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe></div>`;
      if(vm) return `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:var(--radius);overflow:hidden;margin-bottom:14px"><iframe src="https://player.vimeo.com/video/${vm[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe></div>`;
      return url?`<a href="${url}" target="_blank" class="btn btn-sm" style="margin-bottom:14px">▶️ Watch Video</a>`:'';
    }
    if(b.type==='link') return b.val?`<div style="margin-bottom:14px"><a href="${b.val}" target="_blank" class="btn btn-primary btn-sm">🔗 ${b.label||'Open Link'}</a></div>`:'';
    if(b.type==='file') return b.val?`<div style="margin-bottom:14px"><a href="${b.val}" target="_blank" class="btn btn-sm">📎 ${b.label||'Download File'}</a></div>`:'';
    if(b.type==='image'){
      if(!b.val) return '';
      const src=convertImageUrl(b.val);
      const isImg=/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(src)||src.includes('drive.google.com/uc');
      if(!isImg) return `<div style="margin-bottom:14px"><a href="${b.val}" target="_blank" class="btn btn-primary btn-sm">🔗 ${b.label||'Open Link'}</a></div>`;
      return `<div style="margin-bottom:14px"><img src="${src}" style="max-width:100%;border-radius:var(--radius);display:block" onerror="this.parentElement.innerHTML='<div style=\\'padding:12px;background:var(--surface2);border-radius:var(--radius);font-size:12px;color:var(--text3)\\'>⚠️ Image could not load. Check the URL or sharing settings.</div>'"></div>`;
    }    if(b.type==='upload'){
      const uid='upload_'+co.id+'_'+modIdx+'_'+Math.random().toString(36).slice(2,6);
      return `<div style="border:1px solid var(--brand-gold);border-radius:var(--radius);padding:14px 16px;margin-bottom:14px;background:var(--accent-bg)">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px">📤 ${b.label||'Upload Required Document'}</div>
        ${b.instructions?`<div style="font-size:12px;color:var(--text2);margin-bottom:10px">${b.instructions}</div>`:''}
        <div style="font-size:11px;color:var(--danger);font-weight:500;margin-bottom:10px">⚠️ Required to complete this module</div>
        <input type="file" id="${uid}" accept="*/*" onchange="handleLearnerUpload('${uid}',this)" style="display:none">
        <label for="${uid}" class="btn btn-primary btn-sm" style="cursor:pointer;display:inline-flex">📎 Choose File</label>
        <span id="${uid}_status" style="font-size:12px;color:var(--text2);margin-left:10px">No file chosen</span>
      </div>`;
    }
    if(b.type==='form'&&b.fields?.length){
      const fid='form_'+co.id+'_'+modIdx+'_'+Math.random().toString(36).slice(2,5);
      const fieldHTML=b.fields.map((f,fi)=>{
        const inputId=fid+'_'+fi;
        if(f.type==='textarea') return `<div class="form-group"><label class="form-label">${f.label}</label><textarea id="${inputId}" placeholder="${f.placeholder||''}" rows="3"></textarea></div>`;
        if(f.type==='date') return `<div class="form-group"><label class="form-label">${f.label}</label><input type="date" id="${inputId}" style="cursor:pointer"></div>`;
        if(f.type==='select'){
          const opts=(f.placeholder||'').split(',').map(o=>o.trim()).filter(Boolean);
          return `<div class="form-group"><label class="form-label">${f.label}</label><select id="${inputId}"><option value="">Select...</option>${opts.map(o=>`<option>${o}</option>`).join('')}</select></div>`;
        }
        if(f.type==='checkbox') return `<div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="${inputId}"> ${f.label}</label></div>`;
        return `<div class="form-group"><label class="form-label">${f.label}</label><input type="text" id="${inputId}" placeholder="${f.placeholder||''}"></div>`;
      }).join('');
      return `<div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 18px;margin-bottom:14px;background:var(--surface)">
        <div style="font-size:13px;font-weight:600;margin-bottom:14px">📝 Please fill out the form below</div>
        ${fieldHTML}
        <button class="btn btn-primary" onclick="submitLearnerForm('${fid}',${co.id},${modIdx})">Submit →</button>
      </div>`;
    }
    return '';
  }

  c.innerHTML=`
  <div style="max-width:680px;margin:0 auto">
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div style="font-size:36px">${co.emoji}</div>
        <div>
          <div style="font-size:18px;font-weight:600">${co.title}</div>
          <div style="font-size:12px;color:var(--text3)">${co.cat} · ${co.dur} · ${totalMods} module${totalMods!==1?'s':''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;border-radius:4px;background:var(--brand-gold);width:${pct}%;transition:width 0.4s ease"></div>
        </div>
        <span style="font-size:12px;font-weight:600;color:var(--accent);min-width:36px;text-align:right">${pct}%</span>
      </div>
    </div>

    ${mods.map((m,i)=>{
      const isQuiz=m.type==='quiz';
      // Lock a quiz until ALL modules above it (including earlier quizzes) are done
      const allBeforeDone=mods.slice(0,i).every((_,j)=>S.completedModules[co.id].includes(j));
      const quizLocked=isQuiz&&!allBeforeDone;
      // Single source of truth: completedModules
      const isDone=S.completedModules[co.id].includes(i);
      const isActive=S.activeModuleIdx[co.id]===i&&!quizLocked;
      return `
      <div style="margin-bottom:8px;border:1px solid ${isActive?'var(--brand-gold)':isDone?'var(--success-border)':'var(--border)'};border-radius:var(--radius-lg);overflow:hidden;transition:all 0.15s">
        <div onclick="${quizLocked?`toast('Complete all modules before taking the quiz.')`:`toggleLearnerModule(${co.id},${i})`}"
          style="display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:${quizLocked?'not-allowed':'pointer'};background:${isActive?'var(--accent-bg)':isDone?'var(--success-bg)':quizLocked?'var(--surface2)':'var(--surface)'}">
          <div style="width:28px;height:28px;border-radius:50%;border:2px solid ${isDone?'var(--success)':isActive?'var(--brand-gold)':quizLocked?'var(--border2)':'var(--border2)'};
            background:${isDone?'var(--success)':isActive?'var(--brand-gold)':'transparent'};
            display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;
            color:${isDone||isActive?'#fff':'var(--text3)'}">
            ${isDone?'✓':quizLocked?'🔒':i+1}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:${isDone?'var(--success)':isActive?'var(--accent)':quizLocked?'var(--text3)':'var(--text)'}">${m.t}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:1px">${{doc:'Reading',video:'Video',quiz:'Quiz',upload:'Upload'}[m.type]||'Module'}${isDone?' · Completed':quizLocked?' · Complete all modules first':''}</div>
          </div>
          <div style="font-size:12px;color:var(--text3)">${quizLocked?'🔒':isActive?'▲':'▼'}</div>
        </div>
        ${isActive?`
        <div style="border-top:1px solid var(--border);padding:20px;background:var(--surface)">
          ${m.type==='quiz'?
            (()=>{
              const mqs=getModQuizState(co.id,i);
              S.activeQuizKey=co.id+'_'+i;
              if(isDone) return `<div style="text-align:center;padding:16px 0">
                <div style="font-size:32px;margin-bottom:8px">✅</div>
                <div style="font-size:14px;font-weight:600;color:var(--success);margin-bottom:4px">Quiz Completed</div>
                <div style="font-size:12px;color:var(--text3)">You've already passed this quiz.</div>
              </div>`;
              return !mqs.ready?`<div style="text-align:center;padding:12px 0">
              <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Ready to test your knowledge?</div>
              <button class="btn btn-primary" onclick="getModQuizState(${co.id},${i}).ready=true;S.activeQuizKey='${co.id}_${i}';renderCourseDetail(document.getElementById('mainContent'))">Start Quiz →</button>
            </div>`:renderQuiz(co.id,i);
            })()
          :`
            ${(m.blocks||[]).length?(m.blocks||[]).map(b=>renderBlock(b,i)).join(''):`<div style="font-size:13px;color:var(--text3);font-style:italic">Content coming soon.</div>`}
            ${isDone?`<div style="margin-top:12px;font-size:12px;color:var(--success);font-weight:500">✓ Completed</div>`:''}
          `}
        </div>`:''}
      </div>`;
    }).join('')}

    ${pct===100?`
    <div style="margin-top:20px;padding:24px;background:var(--success-bg);border:1px solid var(--success-border);border-radius:var(--radius-lg);text-align:center">
      <div style="font-size:32px;margin-bottom:8px">🏆</div>
      <div style="font-size:15px;font-weight:600;color:var(--success);margin-bottom:8px">Course Complete!</div>
      <button class="btn btn-sm" style="background:var(--success);color:#fff;border-color:var(--success)"
        onclick="openCertificate('${co.title}','${USERS[S.role].name}',new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),'${LEARNERS.find(l=>l.name===USERS[S.role].name)?.manager||'Manager'}','Pass')">
        🏆 View Certificate
      </button>
    </div>`:''}
  </div>`;

  // auto-pop certificate on first completion
  if(pct===100){
    if(!S.completedCourses) S.completedCourses={};
    if(!S.completedCourses[co.id]){
      S.completedCourses[co.id]={
        title:co.title, emoji:co.emoji,
        date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
        manager:LEARNERS.find(l=>l.name===USERS[S.role].name)?.manager||'Manager'
      };
      logActivity(USERS[S.role].name,'🏆',`Completed course: ${co.title}`);
      saveProgressToSupabase(co.id);
      renderNotifPanel(); // move overdue/in-progress notif → completed
      setTimeout(()=>openCertificate(
        co.title, USERS[S.role].name,
        new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
        S.completedCourses[co.id].manager, 'Pass'
      ), 600);
    }
  }
}

function toggleLearnerModule(courseId, idx){
  if(!S.activeModuleIdx) S.activeModuleIdx={};
  if(!S.completedModules) S.completedModules={};
  if(!S.completedModules[courseId]) S.completedModules[courseId]=[];

  const mods=COURSE_MODULES[courseId]||[];
  const m=mods[idx];

  // block quiz if modules BEFORE it aren't done
  if(m?.type==='quiz'){
    const modulesBefore=mods.slice(0,idx).filter(m=>m.type!=='quiz');
    const allDone=modulesBefore.every(bm=>{
      const realIdx=mods.indexOf(bm);
      return S.completedModules[courseId].includes(realIdx);
    });
    if(!allDone){
      toast('🔒 Complete the modules above before taking this quiz.');
      return;
    }
  }

  const isOpening=S.activeModuleIdx[courseId]!==idx;
  S.activeModuleIdx[courseId]=isOpening?idx:null;

  // auto-complete non-quiz, non-form/upload modules on open
  const requiresAction=m&&(m.blocks||[]).some(b=>b.type==='form'||b.type==='upload');
  if(isOpening&&m&&m.type!=='quiz'&&!requiresAction&&!S.completedModules[courseId].includes(idx)){
    S.completedModules[courseId].push(idx);
    const courseName=COURSES.find(c=>c.id===courseId)?.title||'a course';
    logActivity(USERS[S.role].name,'✅',`Completed module: "${m.t}" — ${courseName}`);
  }

  renderCourseDetail(document.getElementById('mainContent'));
}

function completeModule(courseId, idx){
  if(!S.completedModules) S.completedModules={};
  if(!S.completedModules[courseId]) S.completedModules[courseId]=[];
  if(!S.completedModules[courseId].includes(idx)) S.completedModules[courseId].push(idx);
  const mods=COURSE_MODULES[courseId]||[];
  const next=mods.findIndex((_,i)=>i>idx&&!S.completedModules[courseId].includes(i));
  S.activeModuleIdx[courseId]=next>=0?next:null;
  saveProgressToSupabase(courseId);
  renderCourseDetail(document.getElementById('mainContent'));
}

function getActiveQuiz(){
  const co=COURSES.find(x=>x.id===S.activeCourseId);
  if(!co) return QUIZ;
  const qs=COURSE_QUIZZES[co.id];
  return (qs&&qs.length&&qs[0].q)?qs:QUIZ;
}

function renderQuiz(courseId, modIdx){
  S.activeQuizKey=courseId+'_'+modIdx;
  const qs=getModQuizState(courseId, modIdx);
  const ACTIVE_QUIZ=getActiveQuiz();
  if(!ACTIVE_QUIZ||!ACTIVE_QUIZ.length){
    return `<div style="text-align:center;padding:20px 0;color:var(--text3);font-style:italic">No quiz questions added yet. Add a Quiz module using the + Add Module wizard.</div>`;
  }
  const passScore=Math.ceil(ACTIVE_QUIZ.length*0.75);
  if(qs.done){
    const pct=Math.round(qs.score/ACTIVE_QUIZ.length*100);
    const passed=qs.score>=passScore;
    // Ensure module is marked complete on pass (covers page-refresh restore case)
    if(passed&&courseId!=null&&modIdx!=null){
      if(!S.completedModules) S.completedModules={};
      if(!S.completedModules[courseId]) S.completedModules[courseId]=[];
      if(!S.completedModules[courseId].includes(modIdx)){
        S.completedModules[courseId].push(modIdx);
        saveProgressToSupabase(courseId);
      }
    }
    // Inline fallback (shown on revisit/refresh — overlay only fires on live completion)
    return `<div style="text-align:center;padding:28px 0">
      <div style="font-size:40px;margin-bottom:10px">${passed?'🏆':'📚'}</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:4px;color:${passed?'var(--success)':'var(--danger)'}">${passed?'Quiz Passed!':'Not Quite'}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:16px">${qs.score}/${ACTIVE_QUIZ.length} correct · ${pct}%</div>
      ${passed
        ?`<button class="btn btn-primary" onclick="continueFromQuiz(${courseId},${modIdx})">Continue →</button>`
        :`<button class="btn btn-primary" onclick="retakeQuizFromOverlay(${courseId},${modIdx})">↺ Try Again</button>`}
    </div>`;
  }
  const q=ACTIVE_QUIZ[qs.q];
  if(!q) return '';
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:11px;color:var(--text3);font-weight:500">QUESTION ${qs.q+1} OF ${ACTIVE_QUIZ.length}</span>
      <div style="display:flex;gap:4px">${ACTIVE_QUIZ.map((_,i)=>`<div style="width:20px;height:3px;border-radius:2px;background:${i<qs.q?'var(--accent)':i===qs.q?'var(--accent-mid)':'var(--border2)'}"></div>`).join('')}</div>
    </div>
    <div style="font-size:14px;font-weight:500;margin-bottom:16px;line-height:1.5">${q.q}</div>
    ${q.opts.map((o,i)=>`
    <div class="quiz-opt ${qs.answered?(i===q.correct?'correct':qs.sel===i?'wrong':''):(qs.sel===i?'selected':'')}" onclick="pickAns(${i})">
      <div class="quiz-letter">${qs.answered&&i===q.correct?'✓':qs.answered&&qs.sel===i&&i!==q.correct?'✕':String.fromCharCode(65+i)}</div>
      ${o}
    </div>`).join('')}
    ${qs.answered&&qs.q<ACTIVE_QUIZ.length-1?`<button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="nextQ(${courseId??'null'},${modIdx??'null'})">Next Question →</button>`:''}`;
}

function nextQ(courseId, modIdx){
  const ACTIVE_QUIZ=getActiveQuiz();
  const qs=getModQuizState(courseId, modIdx);
  if(qs.q<ACTIVE_QUIZ.length-1){
    qs.q++;
    qs.sel=null;
    qs.answered=false;
  } else {
    qs.done=true;
  }
  renderCourseDetail(document.getElementById('mainContent'));
}

function pickAns(i){
  const qs=S.activeQuizKey?S.quizStates[S.activeQuizKey]:null;
  if(!qs||qs.answered) return;
  qs.sel=i;
  qs.answered=true;
  const ACTIVE_QUIZ=getActiveQuiz();
  if(i===ACTIVE_QUIZ[qs.q].correct) qs.score++;
  const isLastQ=qs.q>=ACTIVE_QUIZ.length-1;
  if(isLastQ) qs.done=true;
  renderCourseDetail(document.getElementById('mainContent'));
  if(isLastQ){
    const parts=S.activeQuizKey.split('_');
    const cId=parseInt(parts[0]);
    const mIdx=parseInt(parts[1]);
    const passScore=Math.ceil(ACTIVE_QUIZ.length*0.75);
    const passed=qs.score>=passScore;
    setTimeout(()=>showQuizResult(passed, qs.score, ACTIVE_QUIZ.length, cId, mIdx), 80);
  }
}
function retakeQuiz(){
  if(S.activeQuizKey) S.quizStates[S.activeQuizKey]={q:0,sel:null,answered:false,score:0,done:false,ready:false};
  renderCourseDetail(document.getElementById('mainContent'));
}

function showQuizResult(passed, score, total, courseId, modIdx){
  const overlay=document.getElementById('quizResultOverlay');
  if(!overlay) return;
  const pct=Math.round(score/total*100);
  const passPct=Math.round(Math.ceil(total*0.75)/total*100);
  const barColor=passed?'var(--success)':'var(--danger)';
  overlay.innerHTML=`
    <div class="quiz-result-card ${passed?'quiz-result-pass':'quiz-result-fail'}">
      ${passed?'<div id="confettiContainer"></div>':''}
      <span class="quiz-result-emoji">${passed?'🏆':'📚'}</span>
      <div class="quiz-result-title">${passed?'Quiz Passed!':'Not Quite!'}</div>
      <div class="quiz-result-score">${score} out of ${total} correct</div>
      <div class="quiz-result-bar">
        <div class="quiz-result-bar-fill" id="qrBarFill" style="width:0%;background:${barColor}"></div>
      </div>
      <div class="quiz-result-pct-label">${pct}%${passed?' — Great work!':` — Need ${passPct}% to pass`}</div>
      ${passed
        ?`<button class="btn btn-primary quiz-result-btn" onclick="continueFromQuiz(${courseId},${modIdx})">Continue →</button>`
        :`<div class="quiz-result-hint">Review the material and give it another shot — you've got this!</div>
          <button class="btn btn-primary quiz-result-btn" onclick="retakeQuizFromOverlay(${courseId},${modIdx})">↺ Try Again</button>`
      }
    </div>`;
  overlay.style.display='flex';
  // Animate the bar fill after a short delay
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const fill=document.getElementById('qrBarFill');
    if(fill) fill.style.width=pct+'%';
  }));
  if(passed) setTimeout(launchConfetti, 200);
}

function launchConfetti(){
  const container=document.getElementById('confettiContainer');
  if(!container) return;
  const colors=['#C9A227','#52a83a','#3b82f6','#ef4444','#8b5cf6','#f59e0b','#10b981','#f472b6'];
  for(let i=0;i<70;i++){
    const p=document.createElement('div');
    p.className='confetti-piece';
    p.style.cssText=`left:${Math.random()*100}%;animation-delay:${Math.random()*0.9}s;animation-duration:${0.7+Math.random()*0.9}s;background:${colors[Math.floor(Math.random()*colors.length)]};width:${5+Math.random()*7}px;height:${5+Math.random()*7}px;border-radius:${Math.random()>0.5?'50%':'2px'};`;
    container.appendChild(p);
  }
}

function continueFromQuiz(courseId, modIdx){
  document.getElementById('quizResultOverlay').style.display='none';
  const mods=COURSE_MODULES[courseId]||[];
  const next=mods.findIndex((_,i)=>i>modIdx&&!S.completedModules[courseId].includes(i));
  S.activeModuleIdx[courseId]=next>=0?next:null;
  renderCourseDetail(document.getElementById('mainContent'));
}

function retakeQuizFromOverlay(courseId, modIdx){
  document.getElementById('quizResultOverlay').style.display='none';
  retakeQuiz();
}

// ─── VIDEO TRACKING ENGINE ─────────────────────────────────────────────────
const VID = { playing:false, elapsed:0, total:1440, timer:null }; // 1440s = 24min

function startVideo(){
  document.getElementById('vidOverlay').style.display='none';
  VID.playing=true;
  VID.timer=setInterval(tickVideo, 1000);
  document.getElementById('vidToggle').textContent='⏸';
  updateVidBadge();
}

function toggleVideoPlay(){
  if(!VID.playing && VID.elapsed===0){ startVideo(); return; }
  VID.playing=!VID.playing;
  if(VID.playing){
    VID.timer=setInterval(tickVideo,1000);
    document.getElementById('vidToggle').textContent='⏸';
  } else {
    clearInterval(VID.timer);
    document.getElementById('vidToggle').textContent='▶';
  }
  updateVidBadge();
}

function tickVideo(){
  if(!VID.playing) return;
  VID.elapsed=Math.min(VID.elapsed+1, VID.total);
  const pct=VID.elapsed/VID.total*100;

  const fill=document.getElementById('vidFill');
  const timeEl=document.getElementById('vidTime');
  if(fill) fill.style.width=pct+'%';
  if(timeEl){
    const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    timeEl.textContent=`${fmt(VID.elapsed)} / 24:00`;
  }
  updateVidBadge();

  // Auto-complete at 90%
  if(pct>=90 && !S.videoWatched){
    clearInterval(VID.timer);
    VID.playing=false;
    S.videoWatched=true;
    S.progress=Math.min(S.progress+15,95);
    toast('✓ Video complete — progress saved automatically!');
    setTimeout(()=>renderCourseDetail(document.getElementById('mainContent')),1200);
  }
}

function updateVidBadge(){
  const badge=document.getElementById('vidBadge');
  const note=document.getElementById('vidNote');
  if(!badge) return;
  const pct=Math.round(VID.elapsed/VID.total*100);
  if(VID.playing){
    badge.textContent=`▶ Watching… ${pct}%`;
    badge.className='badge badge-blue';
    if(note) note.textContent=pct<90?`Need ${90-pct}% more to unlock next module`:'Almost there!';
  } else if(VID.elapsed>0){
    badge.textContent=`⏸ Paused at ${pct}%`;
    badge.className='badge badge-warn';
    if(note) note.textContent='Resume to continue — do not close this page';
  }
}


function reqSignoff(){
  toast('Sign-off request sent to Sean Kirby!');
  setTimeout(()=>{S.signedOff=true;S.progress=100;renderCourseDetail(document.getElementById('mainContent'));toast('✓ Sean Kirby approved your sign-off. Course complete!');},2500);
}

// ─── COMPLETED ─────────────────────────────────────────────────────────────
function renderCompleted(c){
  const done=Object.entries(S.completedCourses||{});
  const learnerName=USERS[S.role].name;

  if(!done.length){
    c.innerHTML=`
    <div class="empty-state" style="margin-top:32px;padding:56px 24px">
      <div class="empty-state-icon">🏆</div>
      <div class="empty-state-title">No certificates earned yet</div>
      <div class="empty-state-sub">Finish your first course to earn a certificate. Your achievements will appear here.</div>
      <button class="btn btn-primary" onclick="go('my-courses')">Go to My Courses →</button>
    </div>`;
    return;
  }

  c.innerHTML=`
  <div class="table-wrap">
    <table>
      <thead><tr><th>Course</th><th>Completed</th><th>Manager</th><th>Certificate</th></tr></thead>
      <tbody>
        ${done.map(([id,info])=>`
        <tr>
          <td><div style="display:flex;align-items:center;gap:8px">
            <span>${info.emoji||'📚'}</span>
            <span style="font-weight:500">${info.title}</span>
          </div></td>
          <td>${info.date}</td>
          <td>${info.manager}</td>
          <td><button class="btn btn-sm btn-primary" onclick="openCertificate('${info.title}','${learnerName}','${info.date}','${info.manager}','Pass')">🏆 View Certificate</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div style="margin-top:16px;text-align:center">
    <button class="btn btn-primary" onclick="go('my-courses')">📚 Back to My Courses</button>
  </div>`;
}

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────
function renderUsers(c){
  const tr=document.getElementById('topbarRight');
  tr.innerHTML=`<button class="btn btn-primary btn-sm" onclick="openAddUserModal()">+ Add User</button>`;
  c.innerHTML=`
  <div class="grid4 section-gap">
    <div class="metric-card"><div class="metric-label">Total Users</div><div class="metric-value">${LEARNERS.length}</div></div>
    <div class="metric-card"><div class="metric-label">Active</div><div class="metric-value" style="color:var(--success)">${LEARNERS.filter(l=>l.account==='active').length}</div></div>
    <div class="metric-card"><div class="metric-label">Inactive</div><div class="metric-value" style="color:var(--text3)">${LEARNERS.filter(l=>l.account==='inactive').length}</div></div>
    <div class="metric-card"><div class="metric-label">Pending Invite</div><div class="metric-value" style="color:var(--warn)">2</div></div>
  </div>

  <div class="search-bar">
    <div class="search-input" style="max-width:260px"><input type="text" placeholder="Search by name or email..." id="userSearch" oninput="filterUsers(this.value)"></div>
    <select style="width:auto" id="deptFilter" onchange="filterUsers()">
      <option value="">All Departments</option>
      <option>Finance</option><option>Human Resources</option><option>Marketing</option><option>Operations</option><option>Sales</option>
    </select>
    <select style="width:auto" id="statusFilter" onchange="filterUsers()">
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>User</th>
          <th>Job Title</th>
          <th>Department</th>
          <th>Manager</th>
          <th>Start Date</th>
          <th>Account</th>
          <th>LMS Progress</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="userTableBody">
        ${renderUserRows(LEARNERS)}
      </tbody>
    </table>
  </div>`;
}

function renderUserRows(list){
  return list.map((l,i)=>`
  <tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="av av-md" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
        <div>
          <div style="font-weight:500">${l.name}</div>
          <div style="font-size:11px;color:var(--text3)">${l.email}</div>
        </div>
      </div>
    </td>
    <td style="color:var(--text2)">${l.title}</td>
    <td><span class="badge badge-gray">${l.dept}</span></td>
    <td style="font-size:13px;color:var(--text2)">${l.manager}</td>
    <td style="font-size:12px;color:var(--text3)">${l.start}</td>
    <td>
      <span class="badge ${l.account==='active'?'badge-success':'badge-gray'}">
        ${l.account==='active'?'Active':'Inactive'}
      </span>
    </td>
    <td style="min-width:120px">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="progress-bar" style="flex:1;margin:0"><div class="progress-fill ${l.prog===100?'green':l.prog>60?'':'amber'}" style="width:${l.prog}%"></div></div>
        <span style="font-size:11px;color:var(--text2);min-width:28px">${l.prog}%</span>
      </div>
    </td>
    <td>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="openUserModal('${l.name}')">Edit</button>
        <button class="btn btn-sm" onclick="toast('Login invite resent to ${l.email}!')">Resend Invite</button>
        <button class="btn btn-sm" style="color:${l.account==='active'?'var(--danger)':'var(--success)'};border-color:${l.account==='active'?'var(--danger-border)':'var(--success-border)'}"
          onclick="toggleAccount('${l.name}',this)">
          ${l.account==='active'?'Deactivate':'Activate'}
        </button>
      </div>
    </td>
  </tr>`).join('');
}

function filterUsers(val){
  const search=(document.getElementById('userSearch')?.value||'').toLowerCase();
  const dept=document.getElementById('deptFilter')?.value||'';
  const status=document.getElementById('statusFilter')?.value||'';
  const filtered=LEARNERS.filter(l=>{
    const matchSearch=!search||l.name.toLowerCase().includes(search)||l.email.toLowerCase().includes(search);
    const matchDept=!dept||l.dept===dept;
    const matchStatus=!status||l.account===status;
    return matchSearch&&matchDept&&matchStatus;
  });
  const tbody=document.getElementById('userTableBody');
  if(tbody) tbody.innerHTML=renderUserRows(filtered);
}

function openUserModal(name){
  const l=LEARNERS.find(x=>x.name===name);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="av av-lg" style="background:${l.bg};color:${l.tc}">${l.ini}</div>
        <div>
          <div style="font-size:17px;font-weight:600">${l.name}</div>
          <span class="badge ${l.account==='active'?'badge-success':'badge-gray'}">${l.account==='active'?'Active':'Inactive'}</span>
        </div>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>

    <div class="tab-bar">
      <div class="tab active" onclick="switchTab(this,'eu-info')">Profile</div>
      <div class="tab" onclick="switchTab(this,'eu-courses')">Assigned Courses</div>
      <div class="tab" onclick="switchTab(this,'eu-access')">Access & Security</div>
    </div>

    <div id="eu-info">
      <div class="grid2">
        <div class="form-group"><label class="form-label">Full Name</label><input type="text" value="${l.name}"></div>
        <div class="form-group"><label class="form-label">Email Address</label><input type="email" value="${l.email}"></div>
      </div>
      <div class="grid2">
        <div class="form-group"><label class="form-label">Job Title</label><input type="text" value="${l.title}"></div>
        <div class="form-group"><label class="form-label">Department</label>
          <select>
            ${['Finance', 'Human Resources', 'Marketing', 'Operations', 'Sales'].map(d=>`<option${d===l.dept?' selected':''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="grid2">
        <div class="form-group"><label class="form-label">Assigned Manager</label>
          <select>
            ${['Eleni Gagnon','Sean Gagnon','Sean Kirby','Cynthia Ramos'].map(m=>`<option${m===l.manager?' selected':''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Start / Hire Date</label><input type="date" value="${toDateInput(l.start)}" style="cursor:pointer"></div>
      </div>
      <div class="form-group"><label class="form-label">System Role</label>
        <select>
          <option>Learner</option>
          <option>Manager</option>
          <option>Admin</option>
          <option>Executive</option>
        </select>
      </div>
    </div>

    <div id="eu-courses" style="display:none">
      <div style="margin-bottom:12px;font-size:13px;color:var(--text2)">Manage which courses are assigned to this user.</div>
      ${COURSES.map((co,i)=>`
      <label style="display:flex;align-items:center;gap:10px;padding:9px 0;cursor:pointer;border-bottom:1px solid var(--border)">
        <input type="checkbox" ${i<3?'checked':''}>
        <div style="font-size:18px">${co.emoji}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${co.title}</div>
          <div style="font-size:11px;color:var(--text3)">${co.cat} · Due ${co.due}</div>
        </div>
        <span class="badge ${i<3?'badge-blue':'badge-gray'}">${i<3?'Assigned':'Not Assigned'}</span>
      </label>`).join('')}
    </div>

    <div id="eu-access" style="display:none">
      <div class="callout callout-blue" style="margin-bottom:16px">
        Last login: <strong>Mar 26, 2026 at 9:14 AM</strong> · IP 192.168.1.42
      </div>
      <div class="form-group">
        <label class="form-label">Account Status</label>
        <select>
          <option ${l.account==='active'?'selected':''}>Active</option>
          <option ${l.account==='inactive'?'selected':''}>Inactive</option>
          <option>Suspended</option>
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
        <button class="btn" onclick="toast('Password reset email sent to ${l.email}!')">📧 Send Password Reset Email</button>
        <button class="btn" onclick="toast('Login invitation resent to ${l.email}!')">🔁 Resend Login Invitation</button>
        <button class="btn btn-danger" onclick="toast('${l.name} has been deactivated.');closeModal()">🚫 Deactivate Account</button>
      </div>
    </div>

    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="savePersonModal('${l.name}')">Save Changes</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function openAddUserModal(){
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="font-size:17px;font-weight:600">Add New User</div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="grid2">
      <div class="form-group"><label class="form-label">First Name</label><input type="text" placeholder="e.g. Jamie"></div>
      <div class="form-group"><label class="form-label">Last Name</label><input type="text" placeholder="e.g. Torres"></div>
    </div>
    <div class="form-group"><label class="form-label">Work Email</label><input type="email" placeholder="jamie.torres@theabscompany.com"></div>
    <div class="grid2">
      <div class="form-group"><label class="form-label">Job Title</label><input type="text" placeholder="e.g. Sales Associate"></div>
      <div class="form-group"><label class="form-label">Department</label>
        <select><option value="">Select...</option>${['Finance', 'Human Resources', 'Marketing', 'Operations', 'Sales'].map(d=>`<option>${d}</option>`).join('')}</select>
      </div>
    </div>
    <div class="grid2">
      <div class="form-group"><label class="form-label">Assigned Manager</label>
        <select><option value="">Select...</option>${['Eleni Gagnon','Sean Gagnon','Sean Kirby','Cynthia Ramos'].map(m=>`<option>${m}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Start / Hire Date</label><input type="date" style="cursor:pointer"></div>
    </div>
    <div class="form-group"><label class="form-label">System Role</label>
      <select><option>Learner</option><option>Manager</option><option>Admin</option><option>Executive</option></select>
    </div>
    <div class="form-group">
      <label class="form-label">Auto-assign onboarding courses</label>
      ${COURSES.slice(0,3).map(co=>`
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;font-size:13px">
        <input type="checkbox" checked> ${co.emoji} ${co.title}
      </label>`).join('')}
    </div>
    <div class="callout callout-blue" style="margin-bottom:16px">
      An email invitation with login instructions will be sent automatically when you save.
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="toast('User added! Invitation sent.');closeModal()">Add User & Send Invite</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function toggleAccount(name, btn){
  const l=LEARNERS.find(x=>x.name===name);
  if(l){
    l.account=l.account==='active'?'inactive':'active';
    toast(`${l.name}'s account has been ${l.account==='active'?'activated':'deactivated'}.`);
    renderPeople(document.getElementById('mainContent'));
  }
}


// ─── PLAYBOOK (flat doc list + quiz to confirm) ────────────────────────────
const PLAYBOOK_DOCS = [
  {id:1, emoji:'🌴', title:'PTO & Leave Policy', category:'Human Resources', updated:'Jan 20, 2026',
   updatedBy:'Eleni Gagnon', assignedTo:'all', status:'published', delegatedTo:null,
   content:`Full-time employees accrue PTO at a rate of 15 days per year in the first two years, increasing to 20 days after year two. PTO requests must be submitted at least one week in advance and approved by your manager. Unused PTO rolls over up to a maximum of 5 days per year.\n\nSick leave: Up to 8 sick days per year at full pay. Sick leave does not roll over. If out sick for more than 3 consecutive days, notify HR and your manager.\n\nParental leave: Primary caregivers receive 12 weeks fully paid. Secondary caregivers receive 4 weeks. Leave must be taken within 12 months of birth, adoption, or foster placement.`,
   quiz:{q:'How far in advance must PTO requests be submitted?',opts:['Same day','At least one week','48 hours','No requirement'],correct:1},
   completedBy:['Marcus Webb']},
  {id:2, emoji:'💊', title:'Benefits Overview', category:'Human Resources', updated:'Feb 1, 2026',
   updatedBy:'Eleni Gagnon', assignedTo:'all', status:'published', delegatedTo:null,
   content:`Health Insurance: The company covers 80% of employee premiums and 50% of dependent premiums. Open enrollment each November, effective January 1st. New hires may enroll within 30 days of start date.\n\n401(k): Company matches 100% of contributions up to 4% of salary. Immediately eligible to contribute; match vests over 3 years. Both traditional and Roth options available.\n\nWellness: $75/month wellness stipend for gym memberships, fitness classes, or wellness apps. Employee Assistance Program (EAP) includes free counseling, legal, and financial planning resources.`,
   quiz:{q:'What percentage of your health insurance premium does the company cover?',opts:['50%','70%','80%','100%'],correct:2},
   completedBy:[]},
  {id:3, emoji:'⚖️', title:'Code of Conduct', category:'Legal & Compliance', updated:'Mar 15, 2026',
   updatedBy:'Eleni Gagnon', assignedTo:'all', status:'published', delegatedTo:null,
   content:`All employees are expected to act with integrity, respect colleagues, and represent the company professionally. This includes honest communication, respecting confidentiality, avoiding conflicts of interest, and complying with all company policies.\n\nAnti-Harassment: Zero tolerance for harassment of any kind — verbal, physical, or digital — toward employees, contractors, clients, or vendors. Report immediately to HR or your manager.\n\nReporting Concerns: Use your direct manager, HR, or the anonymous ethics hotline. All reports are investigated confidentially. Retaliation is strictly prohibited.`,
   quiz:{q:'What is the company\'s policy on workplace harassment?',opts:['Case by case basis','Zero tolerance','Only physical harassment is prohibited','Managers decide'],correct:1},
   completedBy:['Marcus Webb']},
  {id:4, emoji:'💳', title:'Expense Reimbursement', category:'Finance', updated:'Feb 5, 2026',
   updatedBy:'Eleni Gagnon', assignedTo:'all', status:'published', delegatedTo:null,
   content:`Submit all business expenses within 30 days via the expense portal. Attach original receipts for expenses over $25. Approved expenses are processed within 5 business days.\n\nReimbursable: Client meals (up to $75/person), coach class travel for flights under 4 hours, approved software, and business supplies.\n\nNot reimbursable: Personal expenses, alcohol above 20% of a meal receipt, unapproved travel upgrades, or late submissions.`,
   quiz:{q:'What is the maximum reimbursable amount per person for client meals?',opts:['$50','$75','$100','No limit'],correct:1},
   completedBy:[]},
  {id:5, emoji:'🏠', title:'Remote Work Policy', category:'Operations', updated:'Mar 1, 2026',
   updatedBy:'Eleni Gagnon', assignedTo:'all', status:'published', delegatedTo:null,
   content:`Remote work is available for eligible roles with manager approval. Remote employees must be available during core hours (9am–3pm local time) and maintain a professional workspace.\n\nEquipment: The company provides a laptop and necessary peripherals for remote work. Personal equipment must meet security standards.\n\nSecurity: All remote work must use company-approved VPN. Public Wi-Fi is prohibited for accessing sensitive systems without VPN.`,
   quiz:{q:'What are the required core hours for remote employees?',opts:['8am–5pm','9am–3pm','10am–2pm','Flexible — no requirement'],correct:1},
   completedBy:[]},
  {id:6, emoji:'📋', title:'Sales Process SOP', category:'Sales', updated:'Mar 20, 2026',
   updatedBy:null, assignedTo:'Sales', status:'draft', delegatedTo:'Marcus Webb',
   content:'',
   quiz:null,
   completedBy:[]},
];

S.activeDocId = null;
S.docQuizState = {};

function renderPlaybook(c){
  const isAdmin=S.role==='admin';
  const tr=document.getElementById('topbarRight');
  if(isAdmin) tr.innerHTML=`<button class="btn btn-primary btn-sm" onclick="openCreateDoc()">+ New Document</button>`;

  const docs = isAdmin ? PLAYBOOK_DOCS : PLAYBOOK_DOCS.filter(d=>d.status==='published');
  const cats = [...new Set(docs.map(d=>d.category))].sort();
  const myCompleted = docs.filter(d=>d.completedBy.includes('Kristin Harrington'));
  const myPending = docs.filter(d=>!d.completedBy.includes('Kristin Harrington')&&d.status==='published');

  c.innerHTML=`
  <div class="grid4 section-gap">
    <div class="metric-card"><div class="metric-label">Total Docs</div><div class="metric-value">${docs.filter(d=>d.status==='published').length}</div></div>
    <div class="metric-card"><div class="metric-label">Pending</div><div class="metric-value" style="color:var(--warn)">${myPending.length}</div></div>
    <div class="metric-card"><div class="metric-label">Completed</div><div class="metric-value" style="color:var(--success)">${myCompleted.length}</div></div>
    ${isAdmin?`<div class="metric-card"><div class="metric-label">Drafts</div><div class="metric-value" style="color:var(--text3)">${PLAYBOOK_DOCS.filter(d=>d.status==='draft').length}</div></div>`:''}
  </div>

  <div class="search-bar">
    <div class="search-input" style="max-width:280px"><input type="text" placeholder="Search documents..." oninput="filterDocs(this.value)"></div>
    <select style="width:auto" id="docCatFilter" onchange="filterDocs()">
      <option value="">All Categories</option>
      ${cats.map(cat=>`<option>${cat}</option>`).join('')}
    </select>
    ${isAdmin?`<select style="width:auto" id="docStatusFilter" onchange="filterDocs()">
      <option value="">All Status</option><option>published</option><option>draft</option>
    </select>`:''}
  </div>

  <div id="docList">${renderDocRows(docs)}</div>`;
}

function deleteDoc(id){
  const d=PLAYBOOK_DOCS.find(x=>x.id===id);
  if(!d) return;
  // show inline confirmation in the card
  const btn=document.querySelector(`button[onclick="deleteDoc(${id})"]`);
  if(btn&&btn.dataset.confirming!=='true'){
    btn.dataset.confirming='true';
    btn.textContent='⚠️ Confirm Delete';
    btn.style.background='var(--danger)';
    btn.style.color='#fff';
    btn.style.borderColor='var(--danger)';
    setTimeout(()=>{
      btn.dataset.confirming='';
      btn.textContent='🗑️ Delete';
      btn.style.background='';
      btn.style.color='';
      btn.style.borderColor='';
    }, 3000);
    return;
  }
  const idx=PLAYBOOK_DOCS.findIndex(x=>x.id===id);
  if(idx>-1){
    PLAYBOOK_DOCS.splice(idx,1);
    lsSave();
    toast(`"${d.title}" deleted.`);
    renderDocsTab(document.getElementById('cl-docs'));
  }
}

function renderDocRows(docs){
  if(!docs.length) return `<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-title">No documents found</div><div class="empty-state-sub">Try a different search or category filter.</div></div>`;
  const isAdmin=S.role==='admin';
  return docs.map(d=>{
    const done=d.completedBy.includes('Kristin Harrington');
    const isDraft=d.status==='draft';
    return `<div class="card" style="margin-bottom:10px;border-left:3px solid ${done?'var(--success-border)':isDraft?'var(--border2)':'var(--border)'}">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="font-size:24px">${d.emoji}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
            <div style="font-size:14px;font-weight:600">${d.title}</div>
            <span class="badge badge-gray">${d.category}</span>
            ${isDraft?`<span class="badge badge-warn">Draft${d.delegatedTo?' — assigned to '+d.delegatedTo:''}</span>`:''}
            ${done?`<span class="badge badge-success">✓ Completed</span>`:''}
          </div>
          <div style="font-size:11px;color:var(--text3)">Updated ${d.updated}${d.updatedBy?' by '+d.updatedBy:''}${d.delegatedTo&&!d.updatedBy?' · Awaiting content from '+d.delegatedTo:''}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${!isDraft?`<button class="btn btn-sm ${done?'':'btn-primary'}" onclick="openDocReader(${d.id})">${done?'Review':'Read & Complete'}</button>`:''}
          ${isAdmin?`
            <button class="btn btn-sm" onclick="openEditDoc(${d.id})">✏️ Edit</button>
            <button class="btn btn-sm" onclick="openDelegateDoc(${d.id})">👤 Delegate</button>
            <button class="btn btn-sm btn-danger" onclick="deleteDoc(${d.id})" style="padding:4px 10px">🗑️ Delete</button>`:``}
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterDocs(val){
  const search=(val||'').toLowerCase();
  const cat=document.getElementById('docCatFilter')?.value||'';
  const status=document.getElementById('docStatusFilter')?.value||'';
  const isAdmin=S.role==='admin';
  const docs=(isAdmin?PLAYBOOK_DOCS:PLAYBOOK_DOCS.filter(d=>d.status==='published')).filter(d=>{
    const matchS=!search||d.title.toLowerCase().includes(search)||d.category.toLowerCase().includes(search);
    const matchC=!cat||d.category===cat;
    const matchSt=!status||d.status===status;
    return matchS&&matchC&&matchSt;
  });
  const el=document.getElementById('docList');
  if(el) el.innerHTML=renderDocRows(docs);
}

function openDocReader(id){
  const d=PLAYBOOK_DOCS.find(x=>x.id===id);
  if(!d||!d.content) return;
  if(!S.docQuizState[id]) S.docQuizState[id]={answered:false,selected:null,correct:false,attempts:0,ready:false};
  const qs=S.docQuizState[id];
  const done=d.completedBy.includes('Kristin Harrington');
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:28px">${d.emoji}</div>
        <div>
          <div style="font-size:17px;font-weight:600">${d.title}</div>
          <div style="display:flex;gap:6px;margin-top:3px">
            <span class="badge badge-gray">${d.category}</span>
            <span style="font-size:11px;color:var(--text3)">Updated ${d.updated}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="expand-btn" onclick="toggleModalExpand(this)">⤢ Expand</button>
        <button class="btn btn-sm" onclick="closeModal()">✕</button>
      </div>
    </div>

    <!-- Content -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;line-height:1.9;font-size:13px;white-space:pre-line">${d.content}</div>

    <!-- Next button — shows quiz when clicked -->
    ${!qs.ready && !done && d.quiz ? `
    <div style="text-align:center;margin-bottom:16px">
      <button class="btn btn-primary" onclick="revealDocQuiz(${id})">I've read this — Next →</button>
    </div>` : ''}

    <!-- Quiz (hidden until Next is clicked) -->
    <div id="quizSection" style="display:${qs.ready||done?'block':'none'}">
      ${d.quiz ? `
      <div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 18px;margin-bottom:16px">
        <div style="font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Quick Check</div>
        <div style="font-size:14px;font-weight:500;margin-bottom:14px">${d.quiz.q}</div>
        ${d.quiz.opts.map((o,i)=>`
        <div onclick="${qs.correct?'':'selectDocAnswer('+id+','+i+')'}"
          style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid;border-radius:var(--radius);margin-bottom:8px;
          cursor:${qs.correct?'default':'pointer'};transition:all 0.12s;
          border-color:${qs.answered?(i===d.quiz.correct?'var(--success-border)':qs.selected===i?'var(--danger-border)':'var(--border)'):(qs.selected===i?'var(--accent)':'var(--border2)')};
          background:${qs.answered?(i===d.quiz.correct?'var(--success-bg)':qs.selected===i?'var(--danger-bg)':'transparent'):(qs.selected===i?'var(--accent-bg)':'transparent')}">
          <div style="width:22px;height:22px;border-radius:50%;border:1.5px solid;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;
            border-color:${qs.answered?(i===d.quiz.correct?'var(--success)':qs.selected===i?'var(--danger)':'var(--border2)'):'currentColor'};
            color:${qs.answered?(i===d.quiz.correct?'var(--success)':qs.selected===i?'var(--danger)':'var(--text3)'):'inherit'}">
            ${qs.answered&&i===d.quiz.correct?'✓':qs.answered&&qs.selected===i&&i!==d.quiz.correct?'✕':String.fromCharCode(65+i)}
          </div>
          <span style="font-size:13px">${o}</span>
        </div>`).join('')}
        ${qs.answered?`<div class="callout ${qs.correct?'callout-success':'callout-warn'}" style="margin-top:10px">
          ${qs.correct
            ?'✓ Correct! Document marked as complete.'
            :'Not quite — give it another try!'}
        </div>`:''}
        ${qs.answered&&!qs.correct?`<button class="btn btn-sm" style="margin-top:8px" onclick="retryDocQuiz(${id})">↺ Try Again</button>`:''}
      </div>` : ''}
    </div>

    <div style="display:flex;gap:8px">
      <button class="btn" onclick="toast('Downloaded as PDF.')">📄 Download PDF</button>
      <button class="btn" onclick="closeModal()">Close</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function revealDocQuiz(id){
  S.docQuizState[id].ready=true;
  openDocReader(id);
}

function retryDocQuiz(id){
  S.docQuizState[id].answered=false;
  S.docQuizState[id].selected=null;
  openDocReader(id);
}

function selectDocAnswer(docId, idx){
  const d=PLAYBOOK_DOCS.find(x=>x.id===docId);
  if(!d||!d.quiz) return;
  const qs=S.docQuizState[docId];
  if(qs.correct) return;
  const correct=idx===d.quiz.correct;
  qs.answered=true;
  qs.selected=idx;
  qs.correct=correct;
  if(correct&&!d.completedBy.includes('Kristin Harrington')){
    d.completedBy.push('Kristin Harrington');
    setTimeout(()=>{
      toast(`✓ "${d.title}" completed!`);
      closeModal();
      renderPlaybook(document.getElementById('mainContent'));
    },1200);
  }
  openDocReader(docId);
}

function openEditDoc(id){
  const d=PLAYBOOK_DOCS.find(x=>x.id===id);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
      <div style="font-size:17px;font-weight:600">Edit Document</div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="grid2">
      <div class="form-group"><label class="form-label">Title</label><input type="text" id="editDocTitle" value="${d.title}"></div>
      <div class="form-group"><label class="form-label">Category</label>
        <select id="editDocCat">${['Human Resources','Legal & Compliance','Finance','Operations','Sales','Marketing','IT & Security'].map(c=>`<option${c===d.category?' selected':''}>${c}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Content</label>
      <textarea id="editDocContent" rows="10" style="line-height:1.7">${d.content}</textarea>
    </div>
    <div class="form-group"><label class="form-label">Quick Check Question</label>
      <input type="text" id="editDocQ" value="${d.quiz?.q||''}" placeholder="e.g. How many PTO days do you get per year?">
    </div>
    <div class="form-group"><label class="form-label">Answer Options (mark correct with ✓)</label>
      ${(d.quiz?.opts||['','','','']).map((o,i)=>`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <input type="radio" name="editCorrect" ${d.quiz?.correct===i?'checked':''} style="width:auto">
        <input type="text" value="${o}" id="editOpt${i}" placeholder="Option ${String.fromCharCode(65+i)}" style="flex:1">
      </div>`).join('')}
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Select the radio button next to the correct answer.</div>
    </div>
    <div class="form-group"><label class="form-label">Status</label>
      <select id="editDocStatus"><option${d.status==='published'?' selected':''}>published</option><option${d.status==='draft'?' selected':''}>draft</option></select>
    </div>
    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveEditDoc(${id})">Save Changes</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function saveEditDoc(id){
  const d=PLAYBOOK_DOCS.find(x=>x.id===id);
  d.title=document.getElementById('editDocTitle')?.value||d.title;
  d.category=document.getElementById('editDocCat')?.value||d.category;
  d.content=document.getElementById('editDocContent')?.value||d.content;
  d.status=document.getElementById('editDocStatus')?.value||d.status;
  const q=document.getElementById('editDocQ')?.value;
  const opts=[0,1,2,3].map(i=>document.getElementById('editOpt'+i)?.value||'');
  const correct=[...document.querySelectorAll('input[name=editCorrect]')].findIndex(r=>r.checked);
  if(q&&opts.every(o=>o)) d.quiz={q,opts,correct:correct>=0?correct:0};
  d.updated=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  d.updatedBy='Eleni Gagnon';
  d.delegatedTo=null;
  lsSave();toast('Document saved!');
  closeModal();
  renderPlaybook(document.getElementById('mainContent'));
}

function openDelegateDoc(id){
  const d=PLAYBOOK_DOCS.find(x=>x.id===id);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
      <div>
        <div style="font-size:17px;font-weight:600">Delegate Document</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${d.title}</div>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="callout callout-blue" style="margin-bottom:16px">
      Assign this document to a team member to write the content. They will receive a notification with instructions.
    </div>
    <div class="form-group"><label class="form-label">Assign to</label>
      <select id="delegateTo">
        <option value="">Select a team member...</option>
        ${LEARNERS.filter(l=>l.account==='active').map(l=>`<option value="${l.name}">${l.name} — ${l.title}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Instructions (optional)</label>
      <textarea rows="3" placeholder="e.g. Please write the SOP for our sales outreach process. Include steps, tools used, and tips for new reps."></textarea>
    </div>
    <div class="form-group"><label class="form-label">Due Date</label>
      <input type="date" style="cursor:pointer">
    </div>
    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveDelegate(${id})">Assign & Notify</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function saveDelegate(id){
  const d=PLAYBOOK_DOCS.find(x=>x.id===id);
  const person=document.getElementById('delegateTo')?.value;
  if(!person){toast('Please select a team member.');return;}
  d.delegatedTo=person;
  d.status='draft';
  toast(`✓ Assigned to ${person}. They've been notified to write this document.`);
  closeModal();
  renderPlaybook(document.getElementById('mainContent'));
}

function openCreateDoc(){
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
      <div style="font-size:17px;font-weight:600">New Document</div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="grid2">
      <div class="form-group"><label class="form-label">Title</label><input type="text" id="newDocTitle" placeholder="e.g. Onboarding Checklist"></div>
      <div class="form-group"><label class="form-label">Category</label>
        <select id="newDocCat">${['Human Resources','Legal & Compliance','Finance','Operations','Sales','Marketing','IT & Security'].map(c=>`<option>${c}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Icon</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="docEmojiPicker">
        ${['📋','🌴','💊','⚖️','💳','🏠','🛡️','📊','🎯','🤝','💡','📖'].map(e=>`
        <button class="btn" style="font-size:18px;padding:5px 9px" onclick="pickDocEmoji(this,'${e}')">${e}</button>`).join('')}
      </div>
    </div>
    <div class="form-group"><label class="form-label">Write content or delegate?</label>
      <div style="display:flex;gap:10px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="radio" name="docMode" value="write" checked onchange="toggleDocMode(this.value)"> Write now</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="radio" name="docMode" value="delegate" onchange="toggleDocMode(this.value)"> Delegate to someone</label>
      </div>
    </div>
    <div id="docWriteMode">
      <div class="form-group"><label class="form-label">Content</label><textarea id="newDocContent" rows="8" placeholder="Write the document content here..."></textarea></div>
      <div class="form-group"><label class="form-label">Quick Check Question</label><input type="text" id="newDocQ" placeholder="e.g. What is the PTO accrual rate?"></div>
      ${['A','B','C','D'].map((l,i)=>`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <input type="radio" name="newCorrect" style="width:auto">
        <input type="text" id="newOpt${i}" placeholder="Answer ${l}" style="flex:1">
      </div>`).join('')}
      <div style="font-size:11px;color:var(--text3);margin-bottom:12px">Select the radio button next to the correct answer.</div>
    </div>
    <div id="docDelegateMode" style="display:none">
      <div class="form-group"><label class="form-label">Assign to</label>
        <select id="newDelegateTo"><option value="">Select...</option>
          ${LEARNERS.filter(l=>l.account==='active').map(l=>`<option>${l.name} — ${l.title}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Instructions</label><textarea rows="3" placeholder="Describe what they should write..."></textarea></div>
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" style="cursor:pointer"></div>
    </div>
    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveNewDoc()">Publish</button>
      <button class="btn" onclick="saveNewDocDraft()">Save Draft</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

let _docEmoji='📋';
function pickDocEmoji(btn,e){
  _docEmoji=e;
  btn.closest('#docEmojiPicker').querySelectorAll('.btn').forEach(b=>b.style.background='');
  btn.style.background='var(--accent-bg)';
}
function toggleDocMode(val){
  document.getElementById('docWriteMode').style.display=val==='write'?'block':'none';
  document.getElementById('docDelegateMode').style.display=val==='delegate'?'block':'none';
}
function saveNewDoc(){
  const title=document.getElementById('newDocTitle')?.value.trim();
  if(!title){toast('Please enter a title.');return;}
  const opts=[0,1,2,3].map(i=>document.getElementById('newOpt'+i)?.value||'Option '+(i+1));
  const correct=[...document.querySelectorAll('input[name=newCorrect]')].findIndex(r=>r.checked);
  const q=document.getElementById('newDocQ')?.value;
  PLAYBOOK_DOCS.push({
    id:Date.now(),emoji:_docEmoji,title,
    category:document.getElementById('newDocCat')?.value||'General',
    updated:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
    updatedBy:'Eleni Gagnon',assignedTo:'all',status:'published',delegatedTo:null,
    content:document.getElementById('newDocContent')?.value||'',
    quiz:q?{q,opts,correct:correct>=0?correct:0}:null,
    completedBy:[]
  });
  lsSave();toast('Document published!');
  closeModal();
  renderPlaybook(document.getElementById('mainContent'));
}
function saveNewDocDraft(){
  toast('Saved as draft.');
  closeModal();
}

function renderPlaybookCreate(c){ go('playbook'); }
function addTopicBuilder(){}



const POLICIES = [
  {id:1, title:'PTO & Leave Policy', category:'Human Resources', updated:'Jan 20, 2026',
   icon:'🌴', summary:'Vacation, sick days, parental leave, bereavement, and how to request time off.',
   tags:['PTO','Leave','Vacation','Time Off']},
  {id:2, title:'Benefits Overview', category:'Human Resources', updated:'Feb 1, 2026',
   icon:'💊', summary:'Health, dental, vision, 401k, wellness stipend, and employee assistance program details.',
   tags:['Benefits','Health','Insurance','401k']},
  {id:3, title:'Code of Conduct', category:'Legal & Compliance', updated:'Mar 15, 2026',
   icon:'⚖️', summary:'Expected workplace behavior, ethical standards, and how to report concerns.',
   tags:['Conduct','Ethics','Compliance']},
  {id:4, title:'Expense Reimbursement', category:'Finance', updated:'Feb 5, 2026',
   icon:'💳', summary:'How to submit business expenses, approval process, and reimbursement timelines.',
   tags:['Expenses','Reimbursement','Finance']},
  {id:5, title:'Remote Work Policy', category:'Operations', updated:'Mar 1, 2026',
   icon:'🏠', summary:'Guidelines for working remotely, equipment, availability expectations, and home office setup.',
   tags:['Remote','WFH','Work From Home']},
  {id:6, title:'Health & Safety', category:'Operations', updated:'Dec 10, 2025',
   icon:'🛡️', summary:'Workplace safety procedures, emergency protocols, and incident reporting.',
   tags:['Safety','Emergency','Health']},
  {id:7, title:'Data Privacy Policy', category:'IT & Security', updated:'Mar 10, 2026',
   icon:'🔒', summary:'How to handle employee and customer data, device usage, and breach reporting.',
   tags:['Privacy','Data','Security']},
  {id:8, title:'Performance Review Process', category:'Human Resources', updated:'Jan 5, 2026',
   icon:'📊', summary:'Review cycles, how you are evaluated, goal setting, and promotion criteria.',
   tags:['Performance','Reviews','Goals']},
];

function renderPolicies(c){
  c.innerHTML=`
  <div class="search-bar" style="margin-bottom:20px">
    <div class="search-input" style="max-width:280px">
      <input type="text" placeholder="Search policies..." id="policySearch" oninput="filterPolicies(this.value)">
    </div>
    <select style="width:auto" id="policyCatFilter" onchange="filterPolicies()">
      <option value="">All Categories</option>
      <option>Human Resources</option>
      <option>Legal & Compliance</option>
      <option>Finance</option>
      <option>Operations</option>
      <option>IT & Security</option>
    </select>
  </div>
  <div id="policyGrid">
    ${renderPolicyCards(POLICIES)}
  </div>`;
}

function renderPolicyCards(list){
  if(!list.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">No policies match your search</div><div class="empty-state-sub">Try a different keyword or clear the search.</div></div>`;
  // group by category
  const cats=[...new Set(list.map(p=>p.category))].sort();
  return cats.map(cat=>{
    const items=list.filter(p=>p.category===cat);
    return `<div style="margin-bottom:24px">
      <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">${cat}</div>
      <div class="grid2">
        ${items.map(p=>`
        <div class="card" style="cursor:pointer;transition:all 0.15s" onclick="openPolicyView(${p.id})"
          onmouseover="this.style.borderColor='var(--border2)';this.style.transform='translateY(-1px)'"
          onmouseout="this.style.borderColor='var(--border)';this.style.transform='none'">
          <div style="display:flex;align-items:start;gap:12px">
            <div style="font-size:24px;flex-shrink:0">${p.icon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;margin-bottom:3px">${p.title}</div>
              <div style="font-size:12px;color:var(--text2);margin-bottom:8px;line-height:1.5">${p.summary}</div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="font-size:11px;color:var(--text3)">Updated ${p.updated}</span>
                <span style="font-size:11px;color:var(--accent);font-weight:500">View →</span>
              </div>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function filterPolicies(val){
  const search=(val||document.getElementById('policySearch')?.value||'').toLowerCase();
  const cat=document.getElementById('policyCatFilter')?.value||'';
  const filtered=POLICIES.filter(p=>{
    const matchS=!search||p.title.toLowerCase().includes(search)||p.summary.toLowerCase().includes(search)||p.tags.some(t=>t.toLowerCase().includes(search));
    const matchC=!cat||p.category===cat;
    return matchS&&matchC;
  });
  const grid=document.getElementById('policyGrid');
  if(grid) grid.innerHTML=renderPolicyCards(filtered);
}

function openPolicyView(id){
  const p=POLICIES.find(x=>x.id===id);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:32px">${p.icon}</div>
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:3px">${p.title}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="badge badge-gray">${p.category}</span>
            <span style="font-size:11px;color:var(--text3);display:flex;align-items:center">Updated ${p.updated}</span>
          </div>
        </div>
      </div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;min-height:200px">
      <div style="font-size:13px;font-weight:500;color:var(--text2);margin-bottom:10px">Summary</div>
      <p style="font-size:13px;line-height:1.8;margin-bottom:12px">${p.summary}</p>
      <p style="font-size:13px;color:var(--text2);line-height:1.8">Full policy content, detailed guidelines, and any attachments will appear here in the live version. Contact HR if you have any questions about this policy.</p>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" onclick="toast('Policy downloaded as PDF.')">📄 Download PDF</button>
      <button class="btn" onclick="toast('Link copied to clipboard!')">🔗 Copy Link</button>
      <button class="btn" onclick="closeModal()">Close</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}



// ─── COURSE QUIZ BUILDER ───────────────────────────────────────────────────
const COURSE_QUIZZES = {
  1:[{q:'[Add your question about Who We Are]',opts:['Option A','Option B','Option C','Option D'],correct:0}],
  2:[{q:'[Add your question about Core Values]',opts:['Option A','Option B','Option C','Option D'],correct:0}],
  5:[{q:'[Add your question about Your First Week]',opts:['Option A','Option B','Option C','Option D'],correct:0}],
  6:[{q:'[Add your question about Tools We Use]',opts:['Option A','Option B','Option C','Option D'],correct:0}],
  7:[{q:'[Add your question about Policies & Expectations]',opts:['Option A','Option B','Option C','Option D'],correct:0}],
  8:[{q:'[Add your question about Compensation & Benefits]',opts:['Option A','Option B','Option C','Option D'],correct:0}],
  9:[{q:'[Add your question about Your Role & Goals]',opts:['Option A','Option B','Option C','Option D'],correct:0}],
};

function cmQuizRowHTML(courseId, q, qi){
  return `<div class="card" style="margin-bottom:12px;padding:14px 16px" id="cm-q-${courseId}-${qi}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="badge badge-blue">Question ${qi+1}</span>
      <button class="btn btn-sm btn-danger" onclick="this.closest('.card').remove()">Remove</button>
    </div>
    <div class="form-group" style="margin-bottom:10px">
      <input type="text" value="${q.q||''}" placeholder="Enter your question here..." class="cm-q-text">
    </div>
    ${(q.opts||['','','','']).map((o,oi)=>`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
      <input type="radio" name="cm-correct-${courseId}-${qi}" ${oi===q.correct?'checked':''} style="width:auto;flex-shrink:0">
      <input type="text" value="${o}" placeholder="Answer option ${String.fromCharCode(65+oi)}" style="flex:1" class="cm-opt-text">
    </div>`).join('')}
    <div style="font-size:11px;color:var(--text3);margin-top:4px">● Select the radio button next to the correct answer</div>
  </div>`;
}

function cmAddQuestion(courseId){
  const list=document.getElementById('cm-questionList');
  if(!list) return;
  const qi=list.querySelectorAll('.card').length;
  const tmp=document.createElement('div');
  tmp.innerHTML=cmQuizRowHTML(courseId,{q:'',opts:['','','',''],correct:0},qi);
  list.appendChild(tmp.firstElementChild);
}

function saveCourseQuiz(courseId){
  const list=document.getElementById('cm-questionList');
  if(!list) return;
  const cards=[...list.querySelectorAll('.card')];
  COURSE_QUIZZES[courseId]=cards.map((card,qi)=>{
    const q=card.querySelector('.cm-q-text')?.value||'';
    const opts=[...card.querySelectorAll('.cm-opt-text')].map(i=>i.value||'');
    const radios=[...card.querySelectorAll(`input[type=radio]`)];
    const correct=radios.findIndex(r=>r.checked);
    return {q,opts,correct:correct>=0?correct:0};
  }).filter(q=>q.q.trim());
}

// ─── CERTIFICATE GENERATOR ─────────────────────────────────────────────────
function openCertificate(courseName, learnerName, completedDate, manager, score){
  const certNum='TAC-'+Date.now().toString().slice(-6);
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:16px;font-weight:600">Certificate of Completion</div>
      <div style="display:flex;gap:8px">
        <button class="expand-btn" onclick="toggleModalExpand(this)">⤢ Expand</button>
        <button class="btn btn-sm" onclick="closeModal()">✕</button>
      </div>
    </div>

    <!-- Certificate Preview -->
    <div id="certPreview" style="background:#000;border-radius:var(--radius-lg);padding:40px 48px;text-align:center;position:relative;overflow:hidden;margin-bottom:16px">
      <!-- Gold border frame -->
      <div style="position:absolute;inset:8px;border:2px solid var(--brand-gold);border-radius:10px;pointer-events:none;opacity:0.6"></div>
      <div style="position:absolute;inset:12px;border:1px solid var(--brand-gold);border-radius:8px;pointer-events:none;opacity:0.3"></div>

      <!-- Logo -->
      <img src="${document.querySelector('.logo img')?.src||''}" style="width:80px;height:80px;object-fit:contain;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto">

      <!-- Certificate text -->
      <div style="font-size:11px;color:var(--brand-gold);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px;font-family:'DM Sans',sans-serif">Certificate of Completion</div>
      <div style="font-size:11px;color:#888;margin-bottom:20px;font-family:'DM Sans',sans-serif">This certifies that</div>

      <div style="font-size:28px;font-weight:700;color:#fff;font-family:'DM Sans',sans-serif;margin-bottom:8px;letter-spacing:-0.01em">${learnerName}</div>
      <div style="width:160px;height:1px;background:var(--brand-gold);margin:0 auto 20px;opacity:0.6"></div>

      <div style="font-size:12px;color:#aaa;margin-bottom:6px;font-family:'DM Sans',sans-serif">has successfully completed</div>
      <div style="font-size:18px;font-weight:600;color:var(--brand-gold);margin-bottom:20px;font-family:'DM Sans',sans-serif">${courseName}</div>

      <div style="display:flex;justify-content:center;gap:40px;margin-bottom:24px">
        <div style="text-align:center">
          <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Completed</div>
          <div style="font-size:13px;color:#ccc;font-weight:500">${completedDate}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Score</div>
          <div style="font-size:13px;color:#ccc;font-weight:500">${score}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Approved By</div>
          <div style="font-size:13px;color:#ccc;font-weight:500">${manager}</div>
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:center;gap:8px">
        <div style="height:1px;width:60px;background:var(--brand-gold);opacity:0.4"></div>
        <div style="font-size:10px;color:#555;letter-spacing:0.1em">CERT NO. ${certNum}</div>
        <div style="height:1px;width:60px;background:var(--brand-gold);opacity:0.4"></div>
      </div>

      <div style="margin-top:16px;font-size:10px;color:#444;font-style:italic">We Change Lives from the Core®</div>
    </div>

    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="printCertificate()">🖨️ Print / Save as PDF</button>
      <button class="btn" onclick="closeModal()">Close</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

function printCertificate(){
  const cert=document.getElementById('certPreview');
  if(!cert) return;
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Certificate</title>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>body{margin:0;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh}
    @media print{body{background:#000}@page{margin:0;size:landscape}}</style>
    </head><body>${cert.outerHTML}
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
  win.document.close();
}

// ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  {id:1,title:'Welcome to the new LMS! 🎉',body:'We\'ve launched The Abs Company Learning Management System. All team members are required to complete their assigned courses within 30 days. Reach out to Eleni Gagnon in HR with any questions.',author:'Eleni Gagnon',role:'Admin',date:'Mar 27, 2026',pinned:true,emoji:'📢'},
  {id:2,title:'Q2 Training Deadline Reminder',body:'Please ensure all compliance and security courses are completed by April 15th. Managers will be following up with anyone who has not completed their required training.',author:'Sean Kirby',role:'Team Manager',date:'Mar 25, 2026',pinned:false,emoji:'⏰'},
  {id:3,title:'New Course Added: Leadership Foundations',body:'We\'ve added a new Leadership Foundations course to the library. This course is recommended for all team leads and managers. It covers communication, delegation, and team motivation.',author:'Eleni Gagnon',role:'Admin',date:'Mar 20, 2026',pinned:false,emoji:'🎯'},
];

function renderAnnouncements(c){
  const canPost=S.role==='admin';
  const tr=document.getElementById('topbarRight');
  if(canPost) tr.innerHTML=`<button class="btn btn-primary btn-sm" onclick="openNewAnnouncement()">+ Post Announcement</button>`;

  const pinned=ANNOUNCEMENTS.filter(a=>a.pinned);
  const rest=ANNOUNCEMENTS.filter(a=>!a.pinned);

  c.innerHTML=`
  ${pinned.length?`
  <div style="margin-bottom:20px">
    ${pinned.map(a=>announcementCardHTML(a,canPost)).join('')}
  </div>`:''}
  <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">All Announcements</div>
  ${rest.map(a=>announcementCardHTML(a,canPost)).join('')}
  ${!ANNOUNCEMENTS.length?`<div class="empty-state" style="margin-top:8px">
    <div class="empty-state-icon">📢</div>
    <div class="empty-state-title">Nothing posted yet</div>
    <div class="empty-state-sub">Announcements you post will appear here for your whole team.</div>
    ${['admin','manager'].includes(S.role)?`<button class="btn btn-primary btn-sm" onclick="openNewAnnouncement()">+ Post Announcement</button>`:''}
  </div>`:''}`;
}

function announcementCardHTML(a, canPost){
  return `<div class="card" style="margin-bottom:12px;${a.pinned?'border-left:3px solid var(--brand-gold)':''}">
    <div style="display:flex;align-items:start;gap:14px">
      <div style="font-size:28px;flex-shrink:0">${a.emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <div style="font-size:14px;font-weight:600">${a.title}</div>
          ${a.pinned?`<span class="badge" style="background:#2a1f00;color:var(--brand-gold);border-color:var(--brand-gold)">📌 Pinned</span>`:''}
        </div>
        <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:10px">${a.body}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div style="font-size:11px;color:var(--text3)">${a.author} · ${a.role} · ${a.date}</div>
          ${canPost?`<div style="display:flex;gap:6px">
            <button class="btn btn-sm" onclick="togglePin(${a.id})">${a.pinned?'Unpin':'📌 Pin'}</button>
            <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement(${a.id})">Delete</button>
          </div>`:''}
        </div>
      </div>
    </div>
  </div>`;
}

function openNewAnnouncement(){
  const mc=document.getElementById('modalContent');
  mc.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
      <div style="font-size:17px;font-weight:600">New Announcement</div>
      <button class="btn btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Icon</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="annoEmojis">
        ${['📢','⏰','🎯','🏆','📋','💡','🎉','⚠️','✅','📚'].map(e=>`
        <button class="btn" style="font-size:18px;padding:5px 9px" onclick="pickAnnoEmoji(this,'${e}')">${e}</button>`).join('')}
      </div>
    </div>
    <div class="form-group"><label class="form-label">Title</label><input type="text" id="annoTitle" placeholder="e.g. Important Policy Update"></div>
    <div class="form-group"><label class="form-label">Message</label><textarea id="annoBody" rows="4" placeholder="Write your announcement here..."></textarea></div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="annoPinned"> Pin to top of announcements
      </label>
    </div>
    <hr class="divider">
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="saveAnnouncement()">Post Announcement</button>
      <button class="btn" onclick="closeModal()">Cancel</button>
    </div>`;
  document.getElementById('modalBg').classList.add('open');
}

let _annoEmoji='📢';
function pickAnnoEmoji(btn,e){
  _annoEmoji=e;
  btn.closest('#annoEmojis').querySelectorAll('.btn').forEach(b=>b.style.background='');
  btn.style.background='var(--accent-bg)';
}
function saveAnnouncement(){
  const title=document.getElementById('annoTitle')?.value.trim();
  const body=document.getElementById('annoBody')?.value.trim();
  if(!title||!body){toast('Please fill in title and message.');return;}
  const u=USERS[S.role];
  ANNOUNCEMENTS.unshift({
    id:Date.now(),title,body,emoji:_annoEmoji,
    author:u.name,role:u.role,
    date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
    pinned:document.getElementById('annoPinned')?.checked||false,
  });
  lsSave();toast('Announcement posted!');
  closeModal();
  renderAnnouncements(document.getElementById('mainContent'));
}
function acknowledgeAnnouncement(id, cb){
  if(!S.acknowledgedAnnouncements) S.acknowledgedAnnouncements=[];
  if(cb.checked){
    if(!S.acknowledgedAnnouncements.includes(id)) S.acknowledgedAnnouncements.push(id);
    const ann=ANNOUNCEMENTS.find(a=>a.id===id);
    if(ann) logActivity(USERS[S.role].name,'📢',`Acknowledged announcement: "${ann.title}"`);
  } else {
    S.acknowledgedAnnouncements=S.acknowledgedAnnouncements.filter(x=>x!==id);
  }
  const label=document.getElementById('ack-label-'+id);
  if(label){
    label.textContent=cb.checked?'✓ Acknowledged':'I have read and understood this announcement';
    label.style.color=cb.checked?'var(--success)':'var(--text3)';
  }
}

function dismissAnnouncement(id){
  if(!S.dismissedAnnouncements) S.dismissedAnnouncements=[];
  S.dismissedAnnouncements.push(id);
  const el=document.getElementById('anno-'+id);
  if(el){el.style.opacity='0';el.style.transition='opacity 0.2s';setTimeout(()=>{el.remove();},200);}
}

function togglePin(id){
  const a=ANNOUNCEMENTS.find(x=>x.id===id);
  if(a){a.pinned=!a.pinned;renderAnnouncements(document.getElementById('mainContent'));}
}
function deleteAnnouncement(id){
  const idx=ANNOUNCEMENTS.findIndex(x=>x.id===id);
  if(idx>=0){ANNOUNCEMENTS.splice(idx,1);renderAnnouncements(document.getElementById('mainContent'));toast('Announcement deleted.');}
}

// ─── EOD REPORT ────────────────────────────────────────────────────────────
function renderEODReport(c){
  const isAdmin=S.role==='admin';
  const today=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const u=USERS[S.role];

  const teamMembers=isAdmin?LEARNERS:LEARNERS.filter(l=>l.manager===u.name);
  const completed=teamMembers.filter(l=>l.status==='complete');
  const overdue=teamMembers.filter(l=>l.overdue>0);

  const tr=document.getElementById('topbarRight');
  tr.innerHTML=`
    <button class="btn btn-sm" onclick="openScheduleModal()">⏰ Schedule</button>
    <button class="btn btn-primary btn-sm" onclick="sendEODReport()">📧 Send Now</button>`;

  c.innerHTML=`
  <div class="grid2 section-gap" style="max-width:480px">
    <div class="metric-card"><div class="metric-label">Completed Today</div><div class="metric-value" style="color:var(--success)">${completed.length}</div><div class="metric-delta">${completed.length===teamMembers.length?'🎉 Whole team done!':'of '+teamMembers.length+' team members'}</div></div>
    <div class="metric-card"><div class="metric-label">Overdue</div><div class="metric-value" style="color:${overdue.length?'var(--danger)':'var(--success)'}">${overdue.length}</div><div class="metric-delta ${overdue.length?'down':'up'}">${overdue.length?'Need follow-up':'All on track ✓'}</div></div>
  </div>

  <div class="grid2" style="align-items:start">
    <!-- Settings -->
    <div class="card">
      <div class="card-title">Report Settings</div>
      <div class="form-group">
        <label class="form-label">Send time</label>
        <select><option>5:00 PM daily</option><option>4:00 PM daily</option><option>6:00 PM daily</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">Frequency</label>
        <select><option>Weekdays only (Mon–Fri)</option><option>Every day</option><option>Weekly (Fridays only)</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">Recipients</label>
        ${[...new Set(LEARNERS.map(l=>l.manager))].map(m=>`
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;margin-bottom:6px">
          <input type="checkbox" checked> ${m}
          ${m==='Eleni Gagnon'?'<span class="badge badge-blue">Admin</span>':'<span class="badge badge-gray">Manager</span>'}
        </label>`).join('')}
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="toast('Settings saved!')">Save Settings</button>
    </div>

    <!-- Email preview -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="card-title" style="margin:0">Email Preview</div>
        <span class="badge badge-gray">${today}</span>
      </div>
      <div style="border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
        <div style="background:#000;padding:16px 20px;text-align:center">
          <img src="${document.querySelector('.logo img')?.src||''}" style="width:50px;height:50px;object-fit:contain;display:block;margin:0 auto 6px">
          <div style="color:var(--brand-gold);font-size:10px;letter-spacing:0.12em;text-transform:uppercase">Daily Training Report</div>
        </div>
        <div style="padding:18px">
          <div style="font-size:13px;margin-bottom:5px;font-weight:500">Hi ${isAdmin?'Eleni':'Manager'},</div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.6">
            Here's today's training update for your team at <strong>The Abs Company</strong>.
            ${overdue.length?`<span style="color:var(--danger);font-weight:500"> ${overdue.length} member${overdue.length>1?'s':''} need${overdue.length===1?'s':''} follow-up.</span>`:'Everyone is on track!'}
          </div>

          ${completed.length?`
          <div style="margin-bottom:14px">
            <div style="font-size:10px;font-weight:600;color:var(--success);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">✓ Completed</div>
            ${completed.map(l=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--success-bg);border-radius:var(--radius-sm);margin-bottom:5px">
              <div class="av av-sm" style="background:${l.bg};color:${l.tc};width:24px;height:24px;font-size:9px">${l.ini}</div>
              <div style="flex:1;font-size:12px;font-weight:500">${l.name}</div>
              <span style="font-size:11px;color:var(--success);font-weight:600">100% ✓</span>
            </div>`).join('')}
          </div>`:`<div style="padding:10px;background:var(--surface2);border-radius:var(--radius-sm);font-size:12px;color:var(--text3);margin-bottom:14px;text-align:center">No completions today yet.</div>`}

          ${overdue.length?`
          <div style="margin-bottom:14px">
            <div style="font-size:10px;font-weight:600;color:var(--danger);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">⚠️ Overdue</div>
            ${overdue.map(l=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:var(--radius-sm);margin-bottom:5px">
              <div class="av av-sm" style="background:${l.bg};color:${l.tc};width:24px;height:24px;font-size:9px">${l.ini}</div>
              <div style="flex:1;font-size:12px;font-weight:500">${l.name}</div>
              <span style="font-size:11px;color:var(--danger);font-weight:600">${l.overdue} overdue</span>
            </div>`).join('')}
          </div>`:''}

          <div style="border-top:1px solid var(--border);padding-top:12px;font-size:10px;color:var(--text3);text-align:center">
            Automated report · The Abs Company LMS
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function sendEODReport(){
  toast('📧 EOD Report sent to all managers!');
}

function openScheduleModal(){
  toast('⏰ Report scheduled for 5:00 PM weekdays.');
}

function toast(msg){
  const n=document.getElementById('notif');
  n.textContent=msg;n.className='notif-ok';n.style.display='block';
  setTimeout(()=>n.style.display='none',3200);
}
function closeModal(){document.getElementById('modalBg').classList.remove('open')}
document.getElementById('modalBg').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal()});

function toggleModalExpand(btn){
  const modal=document.getElementById('modalContent');
  const isExpanded=modal.classList.toggle('expanded');
  btn.textContent=isExpanded?'⤡ Collapse':'⤢ Expand';
}

function showCatDesc(name){
  const cat=CATS.find(c=>c.name===name);
  const el=document.getElementById('catDescPreview');
  if(el&&cat) el.textContent=cat.desc;
}

function toDateInput(str){
  // Convert "Mar 10, 2026" → "2026-03-10" for input[type=date]
  if(!str) return '';
  const d=new Date(str);
  if(isNaN(d)) return '';
  return d.toISOString().split('T')[0];
}

// Style date inputs to match the rest of the form
const dateStyle=document.createElement('style');
dateStyle.textContent=`
  input[type=date]{color-scheme:light;cursor:pointer}
  input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.6;margin-left:4px}
  input[type=date]::-webkit-calendar-picker-indicator:hover{opacity:1}
`;
document.head.appendChild(dateStyle);

// ─── COLUMN RESIZE ENGINE ──────────────────────────────────────────────────
function makeTableResizable(table){
  if(!table) return;
  const ths=table.querySelectorAll('th');
  // set initial widths from rendered layout
  ths.forEach(th=>{
    if(!th.style.width) th.style.width=th.offsetWidth+'px';
    // remove existing handles
    th.querySelectorAll('.col-resize').forEach(h=>h.remove());
    // add handle
    const handle=document.createElement('div');
    handle.className='col-resize';
    handle.addEventListener('mousedown', startResize);
    th.appendChild(handle);
  });
}

let _resizeTh=null, _resizeStartX=0, _resizeStartW=0;

function startResize(e){
  e.preventDefault();
  e.stopPropagation();
  _resizeTh=e.target.closest('th');
  _resizeStartX=e.clientX;
  _resizeStartW=_resizeTh.offsetWidth;
  _resizeTh.classList.add('resizing');
  e.target.classList.add('dragging');
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
}

function doResize(e){
  if(!_resizeTh) return;
  const newW=Math.max(60, _resizeStartW+(e.clientX-_resizeStartX));
  _resizeTh.style.width=newW+'px';
}

function stopResize(){
  if(_resizeTh){
    _resizeTh.classList.remove('resizing');
    _resizeTh.querySelectorAll('.col-resize').forEach(h=>h.classList.remove('dragging'));
    _resizeTh=null;
  }
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
}

// auto-apply resizable to any table after render
const _origGo=go;
function initResizableTables(){
  setTimeout(()=>{
    document.querySelectorAll('table').forEach(makeTableResizable);
  }, 50);
}

// patch renderPeople, renderReports to init resize after render
const _origRenderPeople=renderPeople;
renderPeople=function(c){_origRenderPeople(c);initResizableTables();};
const _origRenderReports=renderReports;
renderReports=function(c){_origRenderReports(c);initResizableTables();};
const _origRenderCompleted=renderCompleted;
renderCompleted=function(c){_origRenderCompleted(c);initResizableTables();};

// ─── LOCALSTORAGE PERSISTENCE ──────────────────────────────────────────────
const LS_KEY = 'tac_lms_v1';

function lsSave(){
  try {
    const data = {
      COURSES,
      COURSE_MODULES,
      COURSE_QUIZZES,
      CAT_ORDER,
      CATS,
      PLAYBOOK_DOCS,
      ANNOUNCEMENTS,
      LEARNERS: LEARNERS.map(l=>({...l})),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e){ console.warn('localStorage save failed', e); }
}

function lsLoad(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(data.COURSES?.length) COURSES.splice(0, COURSES.length, ...data.COURSES);
    if(data.CATS?.length) CATS.splice(0, CATS.length, ...data.CATS);
    if(data.COURSE_MODULES){
      // migrate old attachments format to blocks
      Object.keys(data.COURSE_MODULES).forEach(cid=>{
        data.COURSE_MODULES[cid]=data.COURSE_MODULES[cid].map(m=>{
          if(!m.blocks&&m.attachments) m.blocks=m.attachments;
          if(!m.blocks) m.blocks=[];
          return m;
        });
      });
      Object.assign(COURSE_MODULES, data.COURSE_MODULES);
    }
    if(data.COURSE_QUIZZES) Object.assign(COURSE_QUIZZES, data.COURSE_QUIZZES);
    if(data.CAT_ORDER) Object.assign(CAT_ORDER, data.CAT_ORDER);
    if(data.PLAYBOOK_DOCS?.length) PLAYBOOK_DOCS.splice(0, PLAYBOOK_DOCS.length, ...data.PLAYBOOK_DOCS);
    if(data.ANNOUNCEMENTS?.length) ANNOUNCEMENTS.splice(0, ANNOUNCEMENTS.length, ...data.ANNOUNCEMENTS);
    if(data.LEARNERS?.length) LEARNERS.splice(0, LEARNERS.length, ...data.LEARNERS);
    console.log('✅ Loaded saved data from localStorage');
  } catch(e){ console.warn('localStorage load failed', e); }
}

function lsClear(){
  localStorage.removeItem(LS_KEY);
  toast('🗑️ Saved data cleared — refreshing...');
  setTimeout(()=>location.reload(), 1200);
}

// ── SEED DATA (baked in from last saved session) ──────────────────────────
const _SEED = {"COURSES":[{"id":1,"emoji":"🏢","title":"Who We Are, What We Do & How We Do It","cat":"Onboarding","color":"#dbeafe","mods":7,"dur":"45 minutes","enrolled":18,"completed":0},{"id":2,"emoji":"⭐","title":"Core Values","cat":"Onboarding","color":"#fef3dc","mods":3,"dur":"15 minutes","enrolled":18,"completed":0},{"id":5,"emoji":"🗓️","title":"Your First Week","cat":"Onboarding","color":"#e1f5ee","mods":4,"dur":"25 minutes","enrolled":18,"completed":0},{"id":6,"emoji":"🛠️","title":"Tools We Use","cat":"Onboarding","color":"#faeeda","mods":3,"dur":"20 minutes","enrolled":18,"completed":0},{"id":7,"emoji":"📋","title":"Policies & Expectations","cat":"Onboarding","color":"#fdeaea","mods":4,"dur":"30 minutes","enrolled":18,"completed":0},{"id":8,"emoji":"💰","title":"Compensation & Benefits","cat":"Onboarding","color":"#e8f0fd","mods":4,"dur":"25 minutes","enrolled":18,"completed":0},{"id":9,"emoji":"🎯","title":"Your Role & Goals","cat":"Onboarding","color":"#eaf3de","mods":3,"dur":"20 minutes","enrolled":18,"completed":0},{"id":1774657566975,"emoji":"📚","title":"Products","cat":"Sales","color":"#dbeafe","mods":1,"dur":"30 minutes","enrolled":0,"completed":0}],"COURSE_MODULES":{"1":[{"t":"Our Story","type":"doc","status":"published","blocks":[]},{"t":"Mission & Vision","type":"video","status":"published","blocks":[]},{"t":"Our Products & Services","type":"doc","status":"published","blocks":[]},{"t":"Who We Serve","type":"doc","status":"published","blocks":[]},{"t":"Our Process & Approach","type":"doc","status":"published","blocks":[]},{"t":"What Makes Us Different","type":"video","status":"published","blocks":[]},{"t":"Knowledge Check","type":"quiz","status":"published","blocks":[]}],"2":[{"t":"Our Core Values","type":"doc","status":"published","blocks":[]},{"t":"Values in Action — Real Examples","type":"video","status":"published","blocks":[]},{"t":"Knowledge Check","type":"quiz","status":"published","blocks":[]}],"5":[{"t":"Before Day 1 — What to Prepare","type":"doc","status":"published","blocks":[]},{"t":"Day 1 Checklist","type":"doc","status":"published","blocks":[]},{"t":"Who to Go to For What","type":"doc","status":"published","blocks":[]},{"t":"Knowledge Check","type":"quiz","status":"published","blocks":[]}],"6":[{"t":"Communication Tools","type":"doc","status":"published","blocks":[]},{"t":"Project & Task Management","type":"doc","status":"published","blocks":[]},{"t":"Knowledge Check","type":"quiz","status":"published","blocks":[]}],"7":[{"t":"Code of Conduct","type":"doc","status":"published","blocks":[]},{"t":"Work Hours & Remote Policy","type":"doc","status":"published","blocks":[]},{"t":"Confidentiality & Data Privacy","type":"doc","status":"published","blocks":[]},{"t":"Knowledge Check","type":"quiz","status":"published","blocks":[]}],"8":[{"t":"Your Pay — Schedule & Structure","type":"doc","status":"published","blocks":[]},{"t":"Health, Dental & Vision","type":"doc","status":"published","blocks":[]},{"t":"401k, PTO & Wellness","type":"doc","status":"published","blocks":[]},{"t":"Knowledge Check","type":"quiz","status":"published","blocks":[]}],"9":[{"t":"Understanding Your Job Description","type":"doc","status":"published","blocks":[]},{"t":"How Success is Measured","type":"doc","status":"published","blocks":[]},{"t":"Your 30/60/90 Day Plan","type":"video","status":"published","blocks":[]},{"t":"Knowledge Check","type":"quiz","status":"published","blocks":[]}],"1774657566975":[{"t":"Ab Coaster","type":"doc","status":"published","blocks":[{"type":"text","val":"Learn about the Ab Coaster and various models"}]}]},"COURSE_QUIZZES":{"1":[{"q":"[Add your question about Who We Are]","opts":["Option A","Option B","Option C","Option D"],"correct":0}],"2":[{"q":"[Add your question about Core Values]","opts":["Option A","Option B","Option C","Option D"],"correct":0}],"5":[{"q":"[Add your question about Your First Week]","opts":["Option A","Option B","Option C","Option D"],"correct":0}],"6":[{"q":"[Add your question about Tools We Use]","opts":["Option A","Option B","Option C","Option D"],"correct":0}],"7":[{"q":"[Add your question about Policies & Expectations]","opts":["Option A","Option B","Option C","Option D"],"correct":0}],"8":[{"q":"[Add your question about Compensation & Benefits]","opts":["Option A","Option B","Option C","Option D"],"correct":0}],"9":[{"q":"[Add your question about Your Role & Goals]","opts":["Option A","Option B","Option C","Option D"],"correct":0}],"1774657566975":[]},"CAT_ORDER":{"Onboarding":[1,2,5,6,7,8,9],"Sales":[1774657566975],"Human Resources":[],"Operations":[],"Customer Experience":[],"Marketing":[]},"CATS":[{"name":"Onboarding","desc":"Everything a new team member needs to get up to speed at The Abs Company."},{"name":"Sales","desc":"Sales process, outreach strategies, tools, and closing techniques."},{"name":"Human Resources","desc":"Policies, benefits, performance expectations, and employee resources."},{"name":"Operations","desc":"Workflows, processes, systems, and how we keep things running smoothly."},{"name":"Customer Experience","desc":"How we serve our customers, handle inquiries, and build lasting relationships."},{"name":"Marketing","desc":"Brand guidelines, campaigns, content strategy, and digital marketing."}]};
function seedIfEmpty(){
  // Only seed if localStorage has nothing yet
  if(localStorage.getItem('tac_lms_v1')) return;
  if(_SEED.COURSES?.length) COURSES.splice(0,COURSES.length,..._SEED.COURSES);
  if(_SEED.CATS?.length) CATS.splice(0,CATS.length,..._SEED.CATS);
  if(_SEED.COURSE_MODULES) Object.assign(COURSE_MODULES,_SEED.COURSE_MODULES);
  if(_SEED.COURSE_QUIZZES) Object.assign(COURSE_QUIZZES,_SEED.COURSE_QUIZZES);
  if(_SEED.CAT_ORDER) Object.assign(CAT_ORDER,_SEED.CAT_ORDER);
  console.log('✅ Seeded from baked-in data');
}

// Load saved data before rendering
seedIfEmpty();
lsLoad();

// Auth initialized in second script block below

let currentUser = null;
let currentProfile = null;

// ── INIT: check session on load ─────────────────────────────────────────
async function initAuth(){
  const { data: { session } } = await sb.auth.getSession();
  if(session){
    currentUser = session.user;
    await loadProfile(currentUser);
  } else {
    showLogin();
  }
}

function showLogin(){
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('app').style.display='none';
}

function hideLogin(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').style.display='flex';
}

async function doGoogleLogin(){
  const {error}=await sb.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:'https://abs-lms.vercel.app'}
  });
  if(error) showLoginError('Google sign in failed: '+error.message);
}

function showLoginError(msg){
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}

async function loadProfile(user){
  // First check by user ID (returning user)
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();

  if(profile){
    currentProfile = profile;
    applyProfile(profile);
    return;
  }

  // Check if their email is in the invited profiles list (first-time Google login)
  const { data: emailProfile } = await sb.from('profiles').select('*').eq('email', user.email).single();

  if(emailProfile){
    // Link their auth ID to the existing profile row
    await sb.from('profiles').update({ id: user.id }).eq('email', user.email);
    emailProfile.id = user.id;
    currentProfile = emailProfile;
    applyProfile(emailProfile);
    return;
  }

  // Not invited — sign them out and show an error
  await sb.auth.signOut();
  showLogin();
  showLoginError('Access denied. You have not been invited to this platform. Please contact your administrator.');
}



function applyProfile(profile){
  // Hardcoded overrides take priority over Supabase role field
  const role = ROLE_OVERRIDES[profile.email] || profile.role || 'learner';
  // If Supabase has the wrong value, fix it in the background
  if(ROLE_OVERRIDES[profile.email] && profile.role !== role){
    sb.from('profiles').update({role}).eq('email', profile.email).then(()=>
      console.log('✅ Fixed Supabase role for', profile.email, '→', role)
    );
  }

  // Override USERS with real profile data
  USERS[role] = {
    name: profile.name,
    initials: profile.ini || profile.name.slice(0,2).toUpperCase(),
    role: profile.title || role,
    avBg: profile.bg || '#dbeafe',
    avCol: profile.tc || '#1a4fa0'
  };

  // Update LEARNERS with real assigned courses
  const learnerIdx = LEARNERS.findIndex(l => l.email === profile.email);
  if(learnerIdx > -1){
    LEARNERS[learnerIdx].assignedCourses = profile.assigned_courses || [1,2,5,6,7,8,9];
  }

  S.actualRole = role; // permanent record of the user's real Supabase role
  hideLogin();
  switchRole(role);
  loadSupabaseData();

  // Show "Preview as Me" button if logged-in user has admin/manager role
  // so they can instantly toggle into their own learner view
  const previewBtn = document.getElementById('previewLearnerBtn');
  if(previewBtn){
    if(role === 'admin' || role === 'manager'){
      previewBtn.style.display = 'block';
    } else {
      previewBtn.style.display = 'none';
    }
  }
}

// ── PREVIEW AS ME (LEARNER) ───────────────────────────────────────────────
let _previewingAsLearner = false;
let _adminRoleBeforePreview = null;

function togglePreviewAsMe(){
  const btn = document.getElementById('previewMeToggle');
  const roleSelect = document.getElementById('roleSelect');

  if(!_previewingAsLearner){
    _adminRoleBeforePreview = S.role;
    _previewingAsLearner = true;

    // Set USERS.learner to Eleni's (logged-in admin's) real profile data
    const me = currentProfile || {};
    // Also pull from LEARNERS array for full data
    const myLearnerData = LEARNERS.find(l => l.email === (me.email || 'eleni@theabscompany.com'));
    USERS.learner = {
      name: me.name || myLearnerData?.name || 'Eleni Gagnon',
      initials: me.ini || myLearnerData?.ini || (me.name||'EG').slice(0,2).toUpperCase(),
      role: me.title || myLearnerData?.title || 'COO',
      avBg: me.bg || myLearnerData?.bg || '#dbeafe',
      avCol: me.tc || myLearnerData?.tc || '#1a4fa0'
    };
    // Make sure assigned courses are correct for this learner
    if(myLearnerData) myLearnerData.assignedCourses = me.assigned_courses || myLearnerData.assignedCourses || [1,2,5,6,7,8,9];

    roleSelect.value = 'learner';
    switchRole('learner');
    if(btn){
      btn.innerHTML = '&#10006; Exit Learner Preview';
      btn.style.borderColor = '#e04040';
      btn.style.color = '#e04040';
      btn.style.background = '#2a0a0a';
      btn.onmouseover = function(){ this.style.background='#3a0f0f'; };
      btn.onmouseout  = function(){ this.style.background='#2a0a0a'; };
    }
  } else {
    _previewingAsLearner = false;
    const restoreRole = _adminRoleBeforePreview || 'admin';
    // Restore USERS.learner to default learner (Kristin)
    USERS.learner = {name:'Kristin Harrington',initials:'KH',role:'Sales Manager',avBg:'#fef3dc',avCol:'#8a5a00'};
    roleSelect.value = restoreRole;
    switchRole(restoreRole);
    if(btn){
      btn.innerHTML = '&#128065; Preview as Me (Learner)';
      btn.style.borderColor = '#C9A227';
      btn.style.color = '#C9A227';
      btn.style.background = '#2a2210';
      btn.onmouseover = function(){ this.style.background='#3a3010'; };
      btn.onmouseout  = function(){ this.style.background='#2a2210'; };
    }
  }
}

// ── LOAD DATA FROM SUPABASE ──────────────────────────────────────────────
async function loadSupabaseData(){
  try {
    // Load courses
    const { data: courses } = await sb.from('courses').select('*').order('sort_order');
    if(courses?.length){
      COURSES.splice(0, COURSES.length, ...courses.map(c=>({
        id:c.id, emoji:c.emoji, title:c.title, cat:c.cat,
        color:c.color, mods:c.mods, dur:c.dur,
        enrolled:c.enrolled, completed:c.completed
      })));
    }

    // Load course modules
    const { data: modules } = await sb.from('course_modules').select('*').order('sort_order');
    if(modules?.length){
      const grouped = {};
      modules.forEach(m=>{
        if(!grouped[m.course_id]) grouped[m.course_id]=[];
        grouped[m.course_id].push({
          t:m.title, type:m.type, status:m.status,
          blocks:m.blocks||[], id:m.id
        });
      });
      Object.assign(COURSE_MODULES, grouped);
    }

    // Load quizzes
    const { data: quizzes } = await sb.from('course_quizzes').select('*');
    if(quizzes?.length){
      quizzes.forEach(q=>{
        COURSE_QUIZZES[q.course_id] = q.questions||[];
      });
    }

    // Load cat order
    const { data: catOrder } = await sb.from('cat_order').select('*');
    if(catOrder?.length){
      catOrder.forEach(c=>{ CAT_ORDER[c.cat_name]=c.course_ids||[]; });
    }

    // Load announcements
    const { data: announcements } = await sb.from('announcements').select('*').order('created_at', {ascending:false});
    if(announcements?.length){
      ANNOUNCEMENTS.splice(0, ANNOUNCEMENTS.length, ...announcements.map(a=>({
        id:a.id, title:a.title, body:a.body,
        author:a.author, role:a.author_role,
        date:new Date(a.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
        pinned:a.pinned, emoji:a.emoji
      })));
    }

    // Load all profiles (for People page)
    const { data: profiles } = await sb.from('profiles').select('*');
    if(profiles?.length){
      LEARNERS.splice(0, LEARNERS.length, ...profiles.map(p=>({
        name:p.name, ini:p.ini||p.name.slice(0,2).toUpperCase(),
        bg:p.bg||'#dbeafe', tc:p.tc||'#1a4fa0',
        dept:p.dept||'', title:p.title||'',
        email:p.email, manager:p.manager||'',
        role:p.role||'learner',
        start:p.start_date||'', prog:p.prog||0,
        overdue:p.overdue||0, status:p.status||'not-started',
        account:p.account||'active',
        assignedCourses:p.assigned_courses||[1,2,5,6,7,8,9]
      })));
    }

    // Load ALL learners' progress for admin People view
    const { data: allProgress } = await sb.from('learner_progress').select('*');
    if(allProgress?.length){
      // Build id→email map from the profiles we just loaded
      const emailById={};
      profiles?.forEach(p=>{ if(p.id) emailById[p.id]=p.email; });
      allProgress.forEach(p=>{
        const email=emailById[p.user_id];
        if(!email) return;
        if(!LEARNER_PROGRESS_BY_EMAIL[email]) LEARNER_PROGRESS_BY_EMAIL[email]={};
        LEARNER_PROGRESS_BY_EMAIL[email][p.course_id]=p.completed_modules||[];
      });
    }

    // Load learner progress AFTER course data is ready (so module types are known)
    await loadProgressFromSupabase();

    // Re-render current page with fresh data + progress
    // Recover role if Supabase profile has wrong 'learner' value for an admin/manager
    if(currentProfile && currentProfile.role === 'learner'){
      const myLearner = LEARNERS.find(l=>l.email===currentProfile.email);
      if(myLearner && myLearner.role && myLearner.role !== 'learner'){
        currentProfile.role = myLearner.role;
        S.actualRole = myLearner.role; // fix in-memory so switcher shows immediately
        await sb.from('profiles').update({role: myLearner.role}).eq('email', currentProfile.email);
        console.log('✅ Restored role to', myLearner.role);
        renderNav(); // re-evaluate switcher visibility with corrected role
      }
    }

    // Re-render the current page with fresh data — do NOT call switchRole here
    // to avoid overriding a role the user manually selected via the dropdown
    const mainContent = document.getElementById('mainContent');
    if(mainContent) go(S.page);
    renderNotifPanel(); // refresh bell count with real progress
    console.log('✅ Supabase data loaded');
  } catch(e){
    console.warn('Supabase data load error:', e);
  }
}

// ── SIGN OUT ────────────────────────────────────────────────────────────
async function signOut(){
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showLogin();
}

// ── SAVE PROGRESS TO SUPABASE ────────────────────────────────────────────
async function saveProgressToSupabase(courseId){
  if(!currentUser) return;
  const completed = S.completedModules?.[courseId] || [];
  const courseDone = !!S.completedCourses?.[courseId];
  const { error } = await sb.from('learner_progress').upsert({
    user_id: currentUser.id,
    course_id: courseId,
    completed_modules: completed,
    course_completed: courseDone,
    completed_at: courseDone ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,course_id' });
  if(error) console.warn('Progress save error:', error);
}

// ── LOAD PROGRESS FROM SUPABASE ──────────────────────────────────────────
async function loadProgressFromSupabase(){
  if(!currentUser) return;
  const { data, error } = await sb.from('learner_progress').select('*').eq('user_id', currentUser.id);
  if(error){ console.warn('Progress load error:', error); return; }
  if(!data?.length) return;

  data.forEach(p=>{
    if(!S.completedModules) S.completedModules={};
    S.completedModules[p.course_id] = p.completed_modules || [];

    // Restore quiz states: any completed module that is a quiz type → mark as done
    const mods = COURSE_MODULES[p.course_id] || [];
    (p.completed_modules || []).forEach(idx=>{
      if(mods[idx]?.type === 'quiz'){
        const key = p.course_id + '_' + idx;
        S.quizStates[key] = {q:0, sel:null, answered:false, score:0, done:true, ready:true};
      }
    });

    // Restore completed courses
    if(p.course_completed && !S.completedCourses?.[p.course_id]){
      if(!S.completedCourses) S.completedCourses={};
      const course = COURSES.find(c=>c.id===p.course_id);
      if(course) S.completedCourses[p.course_id] = {
        title:course.title, emoji:course.emoji,
        date: p.completed_at
          ? new Date(p.completed_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
          : new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
        manager: currentProfile?.manager || 'Manager'
      };
    }
  });
}

// ── INIT ON PAGE LOAD ────────────────────────────────────────────────────
// Hide app until auth is confirmed
document.getElementById('app').style.display = 'none';
initAuth();

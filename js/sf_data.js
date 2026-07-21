
/**
 * sf_data.js
 * Centralised demo dataset for the YourLand Sales Dashboard.
 * All pages import window.SF_DATA and call sfRender() to react to filter changes.
 *
 * Data is pre-aggregated per project and per time period.
 * render() functions aggregate across projects when filter = "All".
 */

const SF_DATA = (function(){

  const PROJECTS = ['Officer Central','Society 1056','Wedge Road','Officer Fields','Seventh Bend','Marran Run','Elmwood'];

  // Weeks labels (last 13 weeks ending 19 Jul 2026)
  const WEEK_LABELS = ['26/4','3/5','10/5','17/5','24/5','31/5','7/6','14/6','21/6','28/6','5/7','12/7','19/7'];

  // Monthly labels (last 7 months)
  const MONTH_LABELS = ['Jan 26','Feb 26','Mar 26','Apr 26','May 26','Jun 26','Jul 26'];

  // ── Weekly series per project ────────────────────────────────────────────
  // Shape: { leads, deposits, contracts }  — 13 values each
  const WEEKLY = {
    'Officer Central': {
      leads:     [108,88,90,102,75,80,74,80,100,90,102,92,41],
      deposits:  [8,5,4,6,5,15,4,11,6,7,4,4,4],
      contracts: [4,5,9,20,4,5,7,4,4,3,5,5,3],
    },
    'Society 1056': {
      leads:     [60,49,52,58,43,46,42,46,57,51,58,52,23],
      deposits:  [5,2,2,3,2,8,2,6,3,4,2,2,2],
      contracts: [2,3,5,12,2,3,4,2,2,2,3,3,2],
    },
    'Wedge Road': {
      leads:     [45,36,38,44,32,34,31,34,43,38,43,39,17],
      deposits:  [3,2,1,2,2,5,1,4,2,3,1,1,1],
      contracts: [1,2,3,8,1,2,3,1,1,1,2,2,1],
    },
    'Officer Fields': {
      leads:     [36,29,30,35,26,27,25,27,34,30,35,31,14],
      deposits:  [3,1,1,2,1,4,1,3,1,2,1,1,1],
      contracts: [1,2,3,6,1,2,2,1,1,1,1,2,1],
    },
    'Seventh Bend': {
      leads:     [24,19,20,23,17,18,17,18,23,20,23,21,9],
      deposits:  [2,1,1,1,1,3,1,2,1,1,1,1,1],
      contracts: [1,1,2,4,1,1,1,1,1,1,1,1,0],
    },
    'Marran Run': {
      leads:     [18,14,15,17,13,14,12,14,17,15,17,16,7],
      deposits:  [1,1,1,1,1,2,1,1,1,1,0,1,1],
      contracts: [0,1,1,2,1,0,1,0,1,0,0,1,0],
    },
    'Elmwood': {
      leads:     [11,8,11,12,7,9,8,8,10,9,10,8,4],
      deposits:  [1,0,0,1,0,0,0,1,0,0,1,0,0],
      contracts: [0,0,1,0,0,0,0,0,0,0,0,0,1],
    },
  };

  // ── Monthly series per project ───────────────────────────────────────────
  const MONTHLY = {
    'Officer Central': {
      leads:     [140,560,490,385,350,332,210],
      deposits:  [14,22,22,23,28,25,9],
      contracts: [7,17,24,11,35,13,13],
    },
    'Society 1056': {
      leads:     [80,320,280,220,200,190,120],
      deposits:  [8,13,13,13,16,14,5],
      contracts: [4,10,14,6,20,7,8],
    },
    'Wedge Road': {
      leads:     [60,240,210,165,150,143,90],
      deposits:  [6,10,10,10,12,11,4],
      contracts: [3,7,10,5,15,6,5],
    },
    'Officer Fields': {
      leads:     [48,192,168,132,120,114,72],
      deposits:  [5,8,8,8,10,9,3],
      contracts: [2,6,8,4,12,5,4],
    },
    'Seventh Bend': {
      leads:     [32,128,112,88,80,76,48],
      deposits:  [3,5,5,5,6,6,2],
      contracts: [2,4,5,3,8,3,3],
    },
    'Marran Run': {
      leads:     [24,96,84,66,60,57,36],
      deposits:  [2,4,4,4,5,4,2],
      contracts: [1,3,4,2,6,2,2],
    },
    'Elmwood': {
      leads:     [16,64,56,44,40,38,24],
      deposits:  [1,2,1,2,2,3,1],
      contracts: [2,1,4,0,4,1,3],
    },
  };

  // ── Buyer type per project ───────────────────────────────────────────────
  const BUYER_TYPE = {
    'Officer Central': {'Owner Occupier':8240,'Investor':2940,'Builder':357,'Unknown':12572},
    'Society 1056':    {'Owner Occupier':4120,'Investor':1470,'Builder':178,'Unknown':7909},
    'Wedge Road':      {'Owner Occupier':3090,'Investor':1100,'Builder':134,'Unknown':5509},
    'Officer Fields':  {'Owner Occupier':2472,'Investor':882,'Builder':107,'Unknown':4805},
    'Seventh Bend':    {'Owner Occupier':1648,'Investor':588,'Builder':71,'Unknown':3204},
    'Marran Run':      {'Owner Occupier':1236,'Investor':441,'Builder':54,'Unknown':1713},
    'Elmwood':         {'Owner Occupier':794,'Investor':328,'Builder':31,'Unknown':2331},
  };

  // ── Lead status per project ──────────────────────────────────────────────
  const LEAD_STATUS = {
    'Officer Central': {'Contacted':6550,'New':5904,'Qualified':5438,'Contact Attempt':3806,'Unqualified':2399,'Converted':12},
    'Society 1056':    {'Contacted':3742,'New':3374,'Qualified':3107,'Contact Attempt':2175,'Unqualified':1371,'Converted':8},
    'Wedge Road':      {'Contacted':2807,'New':2531,'Qualified':2330,'Contact Attempt':1631,'Unqualified':1028,'Converted':6},
    'Officer Fields':  {'Contacted':2245,'New':2025,'Qualified':1863,'Contact Attempt':1305,'Unqualified':822,'Converted':5},
    'Seventh Bend':    {'Contacted':1497,'New':1350,'Qualified':1242,'Contact Attempt':870,'Unqualified':548,'Converted':4},
    'Marran Run':      {'Contacted':1123,'New':1012,'Qualified':932,'Contact Attempt':653,'Unqualified':411,'Converted':2},
    'Elmwood':         {'Contacted':748,'New':671,'Qualified':626,'Contact Attempt':434,'Unqualified':276,'Converted':1},
  };

  // ── Lead source per project (top 7) ─────────────────────────────────────
  const LEAD_SOURCE_WEEK = {
    'Officer Central': {'Meta':25,'OpenLot':5,'Realestate.com.au':4,'Project Website':4,'Google':2,'Builder Referral':1,'Other':0},
    'Society 1056':    {'Meta':14,'OpenLot':3,'Realestate.com.au':2,'Project Website':2,'Google':1,'Builder Referral':1,'Other':0},
    'Wedge Road':      {'Meta':11,'OpenLot':2,'Realestate.com.au':2,'Project Website':1,'Google':1,'Builder Referral':0,'Other':0},
    'Officer Fields':  {'Meta':9,'OpenLot':2,'Realestate.com.au':1,'Project Website':1,'Google':0,'Builder Referral':0,'Other':1},
    'Seventh Bend':    {'Meta':6,'OpenLot':2,'Realestate.com.au':1,'Project Website':1,'Google':0,'Builder Referral':0,'Other':0},
    'Marran Run':      {'Meta':4,'OpenLot':1,'Realestate.com.au':1,'Project Website':1,'Google':0,'Builder Referral':0,'Other':0},
    'Elmwood':         {'Meta':2,'OpenLot':0,'Realestate.com.au':0,'Project Website':0,'Google':1,'Builder Referral':0,'Other':1},
  };

  const LEAD_SOURCE_MONTH = {
    'Officer Central': {'Meta':126,'OpenLot':25,'Realestate.com.au':28,'Project Website':17,'Google':6,'Builder Referral':4,'Other':4},
    'Society 1056':    {'Meta':72,'OpenLot':14,'Realestate.com.au':16,'Project Website':10,'Google':3,'Builder Referral':2,'Other':3},
    'Wedge Road':      {'Meta':54,'OpenLot':11,'Realestate.com.au':12,'Project Website':7,'Google':2,'Builder Referral':2,'Other':2},
    'Officer Fields':  {'Meta':43,'OpenLot':8,'Realestate.com.au':9,'Project Website':6,'Google':2,'Builder Referral':1,'Other':1},
    'Seventh Bend':    {'Meta':29,'OpenLot':6,'Realestate.com.au':6,'Project Website':4,'Google':1,'Builder Referral':1,'Other':1},
    'Marran Run':      {'Meta':22,'OpenLot':4,'Realestate.com.au':4,'Project Website':3,'Google':1,'Builder Referral':0,'Other':1},
    'Elmwood':         {'Meta':13,'OpenLot':4,'Realestate.com.au':4,'Project Website':2,'Google':2,'Builder Referral':0,'Other':1},
  };

  // ── Timeframe to purchase (normalised) ──────────────────────────────────
  const TIMEFRAME = {
    'Officer Central': {'Unknown':11100,'1-3 Months':4256,'3-6 Months':2400,'6-12 Months':2275,'12+ Months':1521,'Researching':2557},
    'Society 1056':    {'Unknown':6343,'1-3 Months':2432,'3-6 Months':1371,'6-12 Months':1300,'12+ Months':869,'Researching':1462},
    'Wedge Road':      {'Unknown':4757,'1-3 Months':1824,'3-6 Months':1028,'6-12 Months':975,'12+ Months':652,'Researching':1097},
    'Officer Fields':  {'Unknown':3806,'1-3 Months':1460,'3-6 Months':822,'6-12 Months':780,'12+ Months':521,'Researching':877},
    'Seventh Bend':    {'Unknown':2537,'1-3 Months':973,'3-6 Months':548,'6-12 Months':520,'12+ Months':348,'Researching':585},
    'Marran Run':      {'Unknown':1903,'1-3 Months':730,'3-6 Months':411,'6-12 Months':390,'12+ Months':261,'Researching':439},
    'Elmwood':         {'Unknown':978,'1-3 Months':370,'3-6 Months':219,'6-12 Months':197,'12+ Months':174,'Researching':546},
  };

  // ── Lead rating per project ──────────────────────────────────────────────
  const RATING = {
    'Officer Central': {'Hot':777,'Warm':1642,'Cold':6461,'Dormant':11,'Unknown':15218},
    'Society 1056':    {'Hot':444,'Warm':938,'Cold':3692,'Dormant':6,'Unknown':8697},
    'Wedge Road':      {'Hot':333,'Warm':703,'Cold':2769,'Dormant':5,'Unknown':6523},
    'Officer Fields':  {'Hot':266,'Warm':563,'Cold':2215,'Dormant':3,'Unknown':5219},
    'Seventh Bend':    {'Hot':178,'Warm':375,'Cold':1477,'Dormant':3,'Unknown':3478},
    'Marran Run':      {'Hot':133,'Warm':281,'Cold':1108,'Dormant':1,'Unknown':1921},
    'Elmwood':         {'Hot':88,'Warm':189,'Cold':738,'Dormant':1,'Unknown':1467},
  };

  // ── Opt-out flags per project ────────────────────────────────────────────
  const OPTOUTS = {
    'Officer Central': {'do_not_call':1103,'do_not_sms':1126,'opted_out_email':3880},
    'Society 1056':    {'do_not_call':631,'do_not_sms':644,'opted_out_email':2217},
    'Wedge Road':      {'do_not_call':473,'do_not_sms':483,'opted_out_email':1663},
    'Officer Fields':  {'do_not_call':378,'do_not_sms':386,'opted_out_email':1330},
    'Seventh Bend':    {'do_not_call':252,'do_not_sms':258,'opted_out_email':887},
    'Marran Run':      {'do_not_call':189,'do_not_sms':193,'opted_out_email':665},
    'Elmwood':         {'do_not_call':128,'do_not_sms':128,'opted_out_email':444},
  };

  // ── Deposit titled split per project ────────────────────────────────────
  const DEP_TITLED = {
    'Officer Central': {titled:437,untitled:238,unknown:158},
    'Society 1056':    {titled:187,untitled:86,unknown:39},
    'Wedge Road':      {titled:140,untitled:71,unknown:39},
    'Officer Fields':  {titled:137,untitled:71,unknown:42},
    'Seventh Bend':    {titled:93,untitled:48,unknown:26},
    'Marran Run':      {titled:62,untitled:47,unknown:58},
    'Elmwood':         {titled:38,untitled:27,unknown:39},
  };

  const CON_TITLED = {
    'Officer Central': {titled:371,untitled:196,unknown:35},
    'Society 1056':    {titled:148,untitled:73,unknown:37},
    'Wedge Road':      {titled:112,untitled:58,unknown:2},
    'Officer Fields':  {titled:109,untitled:63,unknown:35},
    'Seventh Bend':    {titled:83,untitled:43,unknown:81},
    'Marran Run':      {titled:59,untitled:44,unknown:69},
    'Elmwood':         {titled:98,untitled:95,unknown:10},
  };

  // ── Helper: sum an object key across all projects ─────────────────────────
  function sumAll(obj, key){
    return PROJECTS.reduce((s,p)=>s+(obj[p]?obj[p][key]||0:0),0);
  }

  function sumObjAll(obj){
    const out={};
    PROJECTS.forEach(p=>{
      Object.entries(obj[p]||{}).forEach(([k,v])=>{ out[k]=(out[k]||0)+v; });
    });
    return out;
  }

  function sumSeriesAll(series, key){
    return PROJECTS.reduce((acc,p)=>{
      const s=series[p]?series[p][key]:null;
      if(!s)return acc;
      return acc.map((v,i)=>v+s[i]);
    }, new Array(key==='leads'?WEEK_LABELS.length:WEEK_LABELS.length).fill(0));
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function get(project, grain){
    const isAll=(project==='All'||!project);
    const src = grain==='monthly'?MONTHLY:WEEKLY;
    const labels = grain==='monthly'?MONTH_LABELS:WEEK_LABELS;
    const n = labels.length;

    function series(key){
      if(isAll) return PROJECTS.reduce((acc,p)=>{
        const s=src[p]?src[p][key]:null;
        return s?acc.map((v,i)=>v+(s[i]||0)):acc;
      }, new Array(n).fill(0));
      return (src[project]&&src[project][key])||new Array(n).fill(0);
    }

    function buyerType(){
      if(isAll) return sumObjAll(BUYER_TYPE);
      return BUYER_TYPE[project]||{};
    }

    function leadStatus(){
      if(isAll) return sumObjAll(LEAD_STATUS);
      return LEAD_STATUS[project]||{};
    }

    function leadSourceWeek(){
      if(isAll) return sumObjAll(LEAD_SOURCE_WEEK);
      return LEAD_SOURCE_WEEK[project]||{};
    }

    function leadSourceMonth(){
      if(isAll) return sumObjAll(LEAD_SOURCE_MONTH);
      return LEAD_SOURCE_MONTH[project]||{};
    }

    function timeframe(){
      if(isAll) return sumObjAll(TIMEFRAME);
      return TIMEFRAME[project]||{};
    }

    function rating(){
      if(isAll) return sumObjAll(RATING);
      return RATING[project]||{};
    }

    function optouts(){
      if(isAll){
        return {
          do_not_call:  sumAll(OPTOUTS,'do_not_call'),
          do_not_sms:   sumAll(OPTOUTS,'do_not_sms'),
          opted_out_email: sumAll(OPTOUTS,'opted_out_email'),
        };
      }
      return OPTOUTS[project]||{};
    }

    function depTitled(){
      if(isAll){
        return {
          titled:  sumAll(DEP_TITLED,'titled'),
          untitled:sumAll(DEP_TITLED,'untitled'),
          unknown: sumAll(DEP_TITLED,'unknown'),
        };
      }
      return DEP_TITLED[project]||{};
    }

    function conTitled(){
      if(isAll){
        return {
          titled:  sumAll(CON_TITLED,'titled'),
          untitled:sumAll(CON_TITLED,'untitled'),
          unknown: sumAll(CON_TITLED,'unknown'),
        };
      }
      return CON_TITLED[project]||{};
    }

    function depositsByProject(){
      return PROJECTS.map(p=>{
        const s=src[p]&&src[p]['deposits']?src[p]['deposits']:[];
        return {project:p, count:s.reduce((a,b)=>a+b,0)};
      }).sort((a,b)=>b.count-a.count);
    }

    function contractsByProject(){
      return PROJECTS.map(p=>{
        const s=src[p]&&src[p]['contracts']?src[p]['contracts']:[];
        return {project:p, count:s.reduce((a,b)=>a+b,0)};
      }).sort((a,b)=>b.count-a.count);
    }

    const leads     = series('leads');
    const deposits  = series('deposits');
    const contracts = series('contracts');
    const totalLeads     = leads.reduce((a,b)=>a+b,0);
    const totalDeposits  = deposits.reduce((a,b)=>a+b,0);
    const totalContracts = contracts.reduce((a,b)=>a+b,0);
    const totalOpps      = Math.round(totalLeads * 0.0068);

    return {
      labels, leads, deposits, contracts,
      totalLeads, totalDeposits, totalContracts, totalOpps,
      buyerType: buyerType(),
      leadStatus: leadStatus(),
      leadSourceWeek: leadSourceWeek(),
      leadSourceMonth: leadSourceMonth(),
      timeframe: timeframe(),
      rating: rating(),
      optouts: optouts(),
      depTitled: depTitled(),
      conTitled: conTitled(),
      depositsByProject: depositsByProject(),
      contractsByProject: contractsByProject(),
    };
  }

  return { PROJECTS, WEEK_LABELS, MONTH_LABELS, get };
})();

window.SF_DATA = SF_DATA;

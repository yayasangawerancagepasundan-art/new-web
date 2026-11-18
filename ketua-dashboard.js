/* Dashboard Ketua Yayasan - frontend visual tahap beta.
 * Tidak menampilkan angka/transaksi rekaan. Kontrak API akan dipetakan ke elemen data-value.
 */
(() => {
  "use strict";
  const API_CONFIG = {
    baseUrl: "https://sppg-keuangan-dev.yayasangawerancepasundan.workers.dev",
    endpoints: { dashboard: null, approvals: null, foundationFinance: null, kitchenFinance: null, personalBalance: null, withdrawals: null, notifications: null },
    authTokenKey: "sppg_auth_token"
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const currency = n => n === null || n === undefined || n === "" ? "—" : 
    new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n));
  const showToast = msg => { 
    const el=$("#toast"); 
    el.textContent=msg; 
    el.classList.add("show"); 
    clearTimeout(showToast.timer); 
    showToast.timer=setTimeout(()=>el.classList.remove("show"),2600); };

  function initDate(){
    const now=new Date();
    $("#currentDate").textContent=
      new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(now);
    $("#yearNow").textContent=now.getFullYear();
  }
  function setValue(key,value,kind="currency"){
    $$(`[data-value="${key}"]`).forEach(el=>el.textContent=value===
      null||value===undefined?"—":kind==="currency"?currency(value):String(value));
  }
  function renderKitchenRows(rows){
    const body=$("#kitchenCashRows");
    if(!Array.isArray(rows)||!rows.length)
    {body.innerHTML='<tr><td colspan="4" class="empty-cell">Data dapur belum tersedia</td></tr>';
     return;
    }
    body.replaceChildren(...rows.map(row=>{
      const tr=document.createElement("tr");
      [row.kitchen_name,
       currency(row.income),
       currency(row.expense),
       currency(row.balance)].forEach((v,i)=>{
         const td=document.createElement("td");td.textContent=v??"—";
         if(i===0){
           const dot=document.createElement("span");
           dot.className="kitchen-dot";
           td.prepend(dot);}
         tr.append(td);});r
        eturn tr;
    }
                                    ));
  }
  function renderApprovalRows(rows){
    const body=$("#approvalRows");
    if(!Array.isArray(rows)||!rows.length){
      body.innerHTML='<tr><td colspan="6" class="empty-cell">Belum ada permohonan yang dapat ditampilkan</td></tr>';
      return;
    }
    body.replaceChildren(...rows.map((row,index)=>{
      const tr=document.createElement("tr");
      [index+1,
       row.date||"—",
       row.title||
       row.request_type||"—",
       row.source||"—",
       row.amount===
       null||
       row.amount===undefined?"—":
       new Intl.NumberFormat("id-ID").format(row.amount),
       row.status||"Menunggu"].forEach((v,i)=>{
         const td=document.createElement("td");td.textContent=v;
         if(i===5)td.className="status-pending";tr.append(td);});
      return 
        tr;
    }
                                    ));
  }
  function renderFundRequestRows(rows){
    const body=$("#fundRequestRows");
    if(!Array.isArray(rows)||!rows.length){
      body.innerHTML='<tr><td colspan="7" class="empty-cell">Belum ada data permohonan pemakaian dana yayasan</td></tr>';
      return;
    }
    body.replaceChildren(...rows.map((row,index)=>{
      const tr=document.createElement("tr");
      const amount=row.amount===null||
        row.amount===undefined?"—":
        new Intl.NumberFormat("id-ID").format(Number(row.amount));
      const values=[index+1,
                    row.date||
                    row.submitted_at||"—",
                    row.requester_name||
                    row.requested_by_name||"—",
                    row.purpose||
                    row.request_title||
                    row.description||"—",
                    row.fund_source||
                    row.source||"—",
                    amount,row.status_label||
                    row.status||"Menunggu"];
      values.forEach((value,i)=>{
        const td=document.createElement("td");td.textContent=String(value);
        if(i===6){const status=String(
          row.status||""
        )
          .toUpperCase();
                  td.className=
                    status.includes("APPROV")?"status-approved":
                    status.includes("REJECT")?"status-rejected":"status-pending";}
        tr.append
          (td);
      }
                    );
      return tr;
    }));
  }
  function renderKitchenLegend(rows){
    const legend=$("#kitchenLegend");
    if(!Array.isArray(rows)||!rows.length){
      legend.innerHTML="<p>Data dapur belum tersedia</p>";$("#kitchenDonut").style.background="#e8edf4";
      return;
    }
    const colors=["#16ad4a","#0873ed","#f6a000","#8b5cf6"];
    const total=rows.reduce((s,r)=>s+Math.max(0,Number(r.balance)||0),0);
    let cursor=0;
    const stops=rows.map((r,i)=>{
      const share=total?Math.max(0,Number(r.balance)||0)/total*100:0;
      const start=cursor;cursor+=share;
      return
        `${colors[i%colors.length]}
        ${start}%
        ${cursor}%`;
    }
                        );
    $("#kitchenDonut").style.background=total?`
    conic-gradient(${stops.join(",")})`:"#e8edf4";
    legend.replaceChildren(...rows.map((r,i)=>{
      const p=document.createElement("p");
      const dot=document.createElement("i");dot.style.background=colors[i%colors.length];
      const span=document.createElement("span");span.textContent=
        `${r.kitchen_name||"Dapur"} · 
        ${currency(r.balance)}
        ${total?` 
        (${(Number(r.balance||0)/total*100).toFixed(1).replace(".",",")}%)`:""}`;
      p.append(dot,span);
      return
        p;
    }
                                      ));
  }
  function renderCashflowChart(series){
    const canvas=$("#cashflowChart"),
      ctx=canvas.getContext("2d");
    const rect=canvas.getBoundingClientRect(),
      dpr=window.devicePixelRatio||1;
    canvas.
      width=Math.
      max(1,Math.round(rect.width*dpr));canvas.
      height=Math.max(1,Math.round(rect.height*dpr));
    ctx.scale(dpr,dpr);
    const w=rect.
      width,h=rect.
      height,
      left=31,
      right=5,
      top=8,
      bottom=22,
      plotH=h-top-bottom,
      plotW=w-left-right;
    ctx.clearRect(0,0,w,h);
    ctx.font="11px Arial";
    ctx.fillStyle="#111827";
    ctx.strokeStyle="#dce3ec";
    ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y=top+plotH*i/4;
      ctx.beginPath();
      ctx.moveTo(left,y);
      ctx.lineTo(w-right,y);
      ctx.stroke();
      ctx.fillText(series?.axisLabels?.[i]||"",1,y+4);}
    const labels=Array.isArray(series?.labels)?series.labels:[];
    if(!labels.length){
      ctx.fillStyle="#8794a7";
      ctx.textAlign="center";
      ctx.fillText("Belum ada data arus kas",left+plotW/2,top+plotH/2);
      ctx.textAlign="left";
      return;
    }
    const max=Math.max(1,...(series.income||[]),...(series.expense||[]),...(series.balance||[]));
    const y=v=>top+plotH-(Number(v||0)/max)*plotH,slot=plotW/labels.length,bw=Math.min(22,slot*.28);
    labels.forEach((label,i)=>{
      const x=left+slot*i+slot/2;
      ctx.fillStyle="#0875ed";
      ctx.fillRect(x-bw-1,y(series.income?.[i]),bw,top+plotH-y(series.income?.[i]));
      ctx.fillStyle="#fa5959";
      ctx.fillRect(x+1,y(series.expense?.[i]),bw,top+plotH-y(series.expense?.[i]));
      ctx.fillStyle="#182238";ctx.textAlign="center";
      ctx.fillText(label,x,h-5);});
    if(Array.isArray(series.balance)){
      ctx.beginPath();series.balance.forEach((v,i)=>{
        const x=left+slot*i+slot/2;
        if(i===0)ctx.moveTo(x,y(v));
        else 
          ctx.lineTo(x,y(v));});
      ctx.strokeStyle="#16a34a";
      ctx.lineWidth=2;
      ctx.stroke();}
    ctx.textAlign="left";
  }
  function applyDashboardData(payload){
    const d=payload?.data||payload||{};
    const map={pendingApprovals:
      d.pending_approvals,approvedThisMonth:
      d.approved_this_month,rejectedThisMonth:
      d.rejected_this_month,totalRequests:
      d.total_requests,foundationIncome:
      d.foundation?.income,foundationExpense:
      d.foundation?.expense,foundationBalance:
      d.foundation?.balance,personalBalance:
      d.personal_balance,withdrawLimit:
      d.withdraw_limit,kitchenIncome:
      d.kitchens_summary?.income,kitchenExpense:
      d.kitchens_summary?.expense,kitchenBalance:
      d.kitchens_summary?.balance};
    Object.entries(map).forEach(([k,v])=>setValue(k,v,k.includes("Approvals")||k.includes("Month")||k==="totalRequests"?"number":"currency"));
    const kitchens=
      d.kitchens||[];renderKitchenRows(kitchens);renderKitchenLegend(kitchens);
    setValue("kitchenBalanceShort",
             d.kitchens_summary?.balance===undefined?null:
             `${(Number(d.kitchens_summary.balance)/1000000).toLocaleString("id-ID",{maximumFractionDigits:1})} jt`,"text");
    renderApprovalRows(d.pending_approval_items||[]);
    renderFundRequestRows(d.foundation_fund_requests||[]);
    renderCashflowChart(d.cashflow||null);
    if(d.user?.name)$("#topUserName").textContent=d.user.name;
    if(Number.isFinite(d.pending_approvals))$("#approvalCount").textContent=d.pending_approvals;
    if(Number.isFinite(d.unread_notifications))$("#topNotificationDot").hidden=d.unread_notifications===0;
    $("#connectionText").textContent="Terhubung ke database";
  }
  async function apiRequest(key,options={}){
    const path=API_CONFIG.endpoints[key];
    if(!path)
      throw new Error("Endpoint API belum ditetapkan.");
    const token=localStorage.getItem(API_CONFIG.authTokenKey)||
      sessionStorage.getItem(API_CONFIG.authTokenKey);
    const headers={"Content-Type":"application/json",...(options.headers||{})};
    if(token)headers.Authorization=`Bearer ${token}`;
    const response=await 
      fetch(API_CONFIG.baseUrl+path,{...options,headers,credentials:"omit"});
    const body=await 
      response.json().catch(()=>({}));
    if(!response.ok||body.success===false)
      throw new Error(body.message||`Permintaan gagal (${response.status})`);
    return 
      body;
  }
  function navigate(page){
    const names={
      overview:"Dashboard Ketua Yayasan",
      approvals:"Persetujuan",
      "approval-history":"Riwayat Persetujuan",
      "foundation-finance":"Arus Kas Yayasan",
      "kitchen-finance":"Arus Kas Dapur",
      account:"Keamanan Akun",
      notifications:"Notifikasi",
      withdrawals:"Withdraw"};
    if(page==="overview"){
      $("#overview").hidden=false;
      $(".top-panels").hidden=false;
      $(".middle-grid").hidden=false;
      $("#fundRequestsPanel").hidden=false;
      $(".bottom-grid").hidden=false;
      $("#secondaryPages").hidden=true;}
    else{
      $("#overview").hidden=true;
      $(".top-panels").hidden=true;
      $(".middle-grid").hidden=true;
      $("#fundRequestsPanel").hidden=true;
      $(".bottom-grid").hidden=true;
      $("#secondaryPages").hidden=false;
      $("#secondaryTitle").textContent=names[page]||"Informasi";
      $("#secondaryMessage").textContent="Bagian ini akan menampilkan data aktual sesuai hak akses akun Ketua setelah endpoint backend tersedia.";}
    $("#pageTitle").textContent=names[page]||names.overview;
    $$('.nav-item[data-page]').forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    closeSidebar();
  }
  function openSidebar(){
    $("#sidebar").classList.add("open");
    $("#sidebarBackdrop").classList.add("show");}
  function closeSidebar(){
    $("#sidebar").classList.remove("open");
    $("#sidebarBackdrop").classList.remove("show");}
  function init(){
    initDate();renderCashflowChart(null);
    renderKitchenLegend([]);
    renderFundRequestRows([]);
    $$('[data-page]').forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
    $("#menuToggle").addEventListener("click",openSidebar);
    $("#sidebarBackdrop").addEventListener("click",closeSidebar);
    $("#backDashboard").addEventListener("click",()=>navigate("overview"));
    $("#fullscreenButton").addEventListener("click",()=>{
      if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();});
    $("#withdrawButton").addEventListener("click",()=>navigate("withdrawals"));
    $("#topUpButton").addEventListener("click",()=>showToast("Fitur Top Up akan dihubungkan setelah alur backend ditetapkan."));
    window.addEventListener("resize",()=>renderCashflowChart(null));
    // Tidak mengambil atau mengarang data sampai endpoint dashboard disepakati.
    $("#connectionText").textContent="Menunggu endpoint D1";
  }
  document.addEventListener("DOMContentLoaded",init);
  window.YayasanKetuaDashboard={API_CONFIG,apiRequest,applyDashboardData,navigate};
})();

"use strict";var LocusContentScript=(()=>{(function(){let s="";function u(){let e="",i=window.location.pathname.match(/\/browse\/([A-Z0-9]+-\d+)/i)||window.location.search.match(/selectedIssue=([A-Z0-9]+-\d+)/i);if(i&&i[1])e=i[1];else{let o=document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')||document.querySelector('a[data-testid="issue-key"]')||document.querySelector("#key-val");o&&o.textContent&&(e=o.textContent.trim())}if(!e)return null;let n="",t=document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]')||document.querySelector('h1[data-test-id="issue.views.issue-base.foundation.summary.heading"]')||document.querySelector("#summary-val")||document.querySelector("h1");return t&&t.textContent?n=t.textContent.trim():n=document.title.replace(` - ${e}`,"").replace(" - Jira","").trim(),{id:e,title:n||e}}function m(){let e=window.location.pathname.match(/\/pull\/(\d+)/i);if(e&&e[1]){let n=`#${e[1]}`,o=(document.querySelector(".gh-header-title .js-issue-title")||document.querySelector("bdi.js-issue-title")||document.querySelector("h1.gh-header-title"))?.textContent?.trim()||document.title.replace(/by \w+ · Pull Request #\d+.*$/i,"").trim();return{id:n,title:o||`PR ${n}`}}let i=window.location.pathname.match(/\/issues\/(\d+)/i);if(i&&i[1]){let n=`#${i[1]}`,o=(document.querySelector(".gh-header-title .js-issue-title")||document.querySelector("bdi.js-issue-title")||document.querySelector("h1.gh-header-title"))?.textContent?.trim()||document.title.replace(/· Issue #\d+.*$/i,"").trim();return{id:n,title:o||`Issue ${n}`}}return null}function p(){let e=document.querySelector('div[role="dialog"]');if(e){let i=e.querySelector('span[role="heading"]')||e.querySelector("h2");if(i&&i.textContent)return{id:"GCAL",title:i.textContent.trim()}}return null}function b(){let i=(document.querySelector('.notion-page-block [contenteditable="true"]')||document.querySelector(".notion-page-content h1")||document.querySelector("h1.notion-header"))?.textContent?.trim()||document.title.replace(/ · Notion$/i,"").trim();return i&&i!=="Untitled"?{id:"NOTION",title:i}:null}function g(){let e=window.location.pathname.match(/\/issue\/([A-Z0-9]+-\d+)/i),i=e?e[1]:"",t=(document.querySelector("h1")||document.querySelector('[data-testid="issue-title"]'))?.textContent?.trim()||document.title.replace(/ · Linear$/i,"").trim();return i||t&&t!=="Linear"?{id:i||"LINEAR",title:t||i||"Linear Issue"}:null}function a(){let e=window.location.href;if(e===s)return;let i=window.location.hostname,n=null;if(i.includes("atlassian.net")||i.includes("jira")){let t=u();t&&(n={source:"jira",id:t.id,title:t.title,url:e})}else if(i.includes("github.com")){let t=m();t&&(n={source:"github",id:t.id,title:t.title,url:e})}else if(i.includes("calendar.google.com")){let t=p();t&&(n={source:"jira",id:t.id,title:t.title,url:e})}else if(i.includes("notion.so")){let t=b();t&&(n={source:"jira",id:t.id,title:t.title,url:e})}else if(i.includes("linear.app")){let t=g();t&&(n={source:"jira",id:t.id,title:t.title,url:e})}if(n){s=e,console.log("[Locus Content] Detected context:",n);try{chrome.runtime.sendMessage({type:"CONTEXT_DETECTED",payload:{...n,timestamp:Date.now()}})}catch(t){console.warn("[Locus Content] Message send failed (worker may be sleeping):",t)}f(n)}}function f(e){let i=document.getElementById("locus-copilot-host");i||(i=document.createElement("div"),i.id="locus-copilot-host",document.body.appendChild(i));let n=i.shadowRoot;n||(n=i.attachShadow({mode:"open"}));let t=!1;n.innerHTML=`
      <style>
        :host {
          all: initial;
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .pill-container {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(15, 16, 17, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(6, 182, 212, 0.4);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px rgba(6, 182, 212, 0.25);
          border-radius: 9999px;
          padding: 6px 14px 6px 10px;
          color: #f3f4f6;
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .pill-container.minimized {
          padding: 8px;
          border-radius: 50%;
          cursor: pointer;
        }
        .pill-container.minimized .content-wrapper {
          display: none;
        }
        @keyframes slide-in {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .brand-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #06b6d4;
          box-shadow: 0 0 8px #06b6d4;
          flex-shrink: 0;
        }
        .content-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brand-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #06b6d4;
        }
        .context-tag {
          font-size: 10px;
          font-weight: 600;
          font-family: Menlo, monospace;
          padding: 2px 6px;
          border-radius: 4px;
          background: ${e.source==="jira"?"rgba(99, 102, 241, 0.2)":"rgba(6, 182, 212, 0.2)"};
          color: ${e.source==="jira"?"#818cf8":"#22d3ee"};
          border: 1px solid ${e.source==="jira"?"rgba(99, 102, 241, 0.4)":"rgba(6, 182, 212, 0.4)"};
        }
        .title-text {
          font-size: 11px;
          font-weight: 500;
          max-width: 170px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #e5e7eb;
        }
        .btn-add {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #06b6d4;
          color: #08090a;
          font-size: 11px;
          font-weight: 700;
          border: none;
          border-radius: 9999px;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-add:hover {
          background: #22d3ee;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }
        .btn-minimize {
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 4px;
          line-height: 1;
        }
        .btn-minimize:hover {
          color: #f3f4f6;
        }
      </style>
      <div class="pill-container" id="locus-pill" title="Locus Day Planner Co-Pilot">
        <div class="brand-dot"></div>
        <div class="content-wrapper">
          <span class="brand-title">LOCUS</span>
          <span class="context-tag">${e.id}</span>
          <span class="title-text" title="${e.title}">${e.title}</span>
          <button class="btn-add" id="btn-insert-plan">\u26A1 Add Task</button>
          <button class="btn-add" id="btn-open-panel" style="background: rgba(255, 255, 255, 0.14); color: #f3f4f6; border: 1px solid rgba(255, 255, 255, 0.2);">Side Panel</button>
          <button class="btn-minimize" id="btn-minimize" title="Minimize">\u2500</button>
          <button class="btn-minimize" id="btn-dismiss" title="Dismiss">\u2715</button>
        </div>
      </div>
    `;let o=n.getElementById("btn-insert-plan"),x=n.getElementById("btn-open-panel"),h=n.getElementById("btn-minimize"),y=n.getElementById("btn-dismiss"),r=n.getElementById("locus-pill");x?.addEventListener("click",l=>{l.stopPropagation(),chrome.runtime.sendMessage({type:"OPEN_SIDEPANEL"})}),o?.addEventListener("click",()=>{o&&(o.textContent="\u2713 Scheduled!",o.setAttribute("style","background: #10b981; color: #08090a;")),chrome.runtime.sendMessage({type:"SYNC_REQUEST",payload:{userRequest:`Prioritize ${e.id}: ${e.title}`}}),setTimeout(()=>{r&&(r.style.opacity="0"),setTimeout(()=>i?.remove(),300)},1600)}),h?.addEventListener("click",l=>{l.stopPropagation(),t=!t,r&&(t?r.classList.add("minimized"):r.classList.remove("minimized"))}),r?.addEventListener("click",()=>{t&&(t=!1,r.classList.remove("minimized"))}),y?.addEventListener("click",l=>{l.stopPropagation(),r&&(r.style.opacity="0"),setTimeout(()=>i?.remove(),250)})}a();let d=null,c=new MutationObserver(()=>{clearTimeout(d),d=setTimeout(()=>{a()},500)});document.body?c.observe(document.body,{childList:!0,subtree:!0}):document.addEventListener("DOMContentLoaded",()=>{document.body&&c.observe(document.body,{childList:!0,subtree:!0})})})();})();

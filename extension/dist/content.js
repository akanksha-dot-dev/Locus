"use strict";var LocusContentScript=(()=>{(function(){let r="";function c(){let t="",o=window.location.pathname.match(/\/browse\/([A-Z0-9]+-\d+)/i)||window.location.search.match(/selectedIssue=([A-Z0-9]+-\d+)/i);if(o&&o[1])t=o[1];else{let n=document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')||document.querySelector('a[data-testid="issue-key"]')||document.querySelector("#key-val");n&&n.textContent&&(t=n.textContent.trim())}if(!t)return null;let i="",e=document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]')||document.querySelector('h1[data-test-id="issue.views.issue-base.foundation.summary.heading"]')||document.querySelector("#summary-val")||document.querySelector("h1");return e&&e.textContent?i=e.textContent.trim():i=document.title.replace(` - ${t}`,"").replace(" - Jira","").trim(),{id:t,title:i||t}}function u(){let t=window.location.pathname.match(/\/pull\/(\d+)/i);if(!t||!t[1])return null;let o=`#${t[1]}`,i="",e=document.querySelector(".gh-header-title .js-issue-title")||document.querySelector("bdi.js-issue-title")||document.querySelector("h1.gh-header-title");return e&&e.textContent?i=e.textContent.trim():i=document.title.replace(/by \w+ · Pull Request #\d+.*$/i,"").trim(),{id:o,title:i||`PR ${o}`}}function l(){let t=window.location.href;if(t===r)return;let o=window.location.hostname,i=null;if(o.includes("atlassian.net")||o.includes("jira")){let e=c();e&&(i={source:"jira",id:e.id,title:e.title,url:t})}else if(o.includes("github.com")){let e=u();e&&(i={source:"github",id:e.id,title:e.title,url:t})}if(i){r=t,console.log("[Locus Content] Detected context:",i);try{chrome.runtime.sendMessage({type:"CONTEXT_DETECTED",payload:{...i,timestamp:Date.now()}})}catch(e){console.warn("[Locus Content] Message send failed (worker may be sleeping):",e)}p(i)}}function p(t){let o=document.getElementById("locus-copilot-host");o||(o=document.createElement("div"),o.id="locus-copilot-host",document.body.appendChild(o));let i=o.shadowRoot;i||(i=o.attachShadow({mode:"open"})),i.innerHTML=`
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
          background: ${t.source==="jira"?"rgba(99, 102, 241, 0.2)":"rgba(6, 182, 212, 0.2)"};
          color: ${t.source==="jira"?"#818cf8":"#22d3ee"};
          border: 1px solid ${t.source==="jira"?"rgba(99, 102, 241, 0.4)":"rgba(6, 182, 212, 0.4)"};
        }
        .title-text {
          font-size: 11px;
          font-weight: 500;
          max-width: 180px;
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
        .btn-close {
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 4px;
          line-height: 1;
        }
        .btn-close:hover {
          color: #f3f4f6;
        }
      </style>
      <div class="pill-container" id="locus-pill">
        <div class="brand-dot"></div>
        <span class="brand-title">LOCUS</span>
        <span class="context-tag">${t.id}</span>
        <span class="title-text" title="${t.title}">${t.title}</span>
        <button class="btn-add" id="btn-insert-plan">\u26A1 Add to Day Plan</button>
        <button class="btn-close" id="btn-dismiss" title="Dismiss">\u2715</button>
      </div>
    `;let e=i.getElementById("btn-insert-plan"),n=i.getElementById("btn-dismiss"),s=i.getElementById("locus-pill");e?.addEventListener("click",()=>{e&&(e.textContent="\u2713 Scheduled!",e.setAttribute("style","background: #10b981; color: #08090a;")),chrome.runtime.sendMessage({type:"SYNC_REQUEST",payload:{userRequest:`Prioritize ${t.id}: ${t.title}`}}),setTimeout(()=>{s&&(s.style.opacity="0"),setTimeout(()=>o?.remove(),300)},1600)}),n?.addEventListener("click",()=>{s&&(s.style.opacity="0"),setTimeout(()=>o?.remove(),250)})}l();let a=null,d=new MutationObserver(()=>{clearTimeout(a),a=setTimeout(()=>{l()},500)});document.body?d.observe(document.body,{childList:!0,subtree:!0}):document.addEventListener("DOMContentLoaded",()=>{document.body&&d.observe(document.body,{childList:!0,subtree:!0})})})();})();

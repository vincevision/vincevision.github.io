/* VinceVision Signal Bot (GitHub Actions)
   - Pulls Deriv candles via WebSocket
   - Generates confirmed HTF signals (same logic as your page)
   - De-dupes via GitHub Gist
   - Posts to Discord webhook with TP/SL and machine-readable JSON
*/
'use strict';

const WebSocket = require('ws');

// ====== Config (from env) ======
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const APP_ID = process.env.DERIV_APP_ID || '1089';
const SYMBOLS = (process.env.SYMBOLS || 'frxEURUSD').split(',').map(s => s.trim()).filter(Boolean);
const TFS = (process.env.TFS || '1h').split(',').map(s => s.trim()).filter(Boolean);
const LIMIT = parseInt(process.env.LIMIT || '700', 10);

// Strategy params (defaults = your page)
const P = {
  bbLen: +process.env.BB_LEN || 20,
  bbMult: +process.env.BB_MULT || 2,
  ma3: +process.env.MA3_LEN || 3,
  rsiLen: +process.env.RSI_LEN || 14,
  stochLen: +process.env.STOCH_LEN || 16,
  kLen: +process.env.K_LEN || 3,
  dLen: +process.env.D_LEN || 3,
  ob: +process.env.OB || 80,
  os: +process.env.OS || 20,
  tapLookback: +process.env.TAP_LOOKBACK || 2,
  requireCross: (process.env.REQUIRE_CROSS || 'true') === 'true',
  // LTF confluence (optional)
  ltfTf: (process.env.LTF_TF || 'none'),
  ltfMidBreak: (process.env.LTF_MID_BREAK || 'true') === 'true',
  ltfRangeOn: (process.env.LTF_RANGE_ON || 'true') === 'true',
  ltfLookback: +process.env.LTF_LOOKBACK || 3,
  // ATR / MACD
  useATR: (process.env.USE_ATR || 'false') === 'true',
  atrLen: +process.env.ATR_LEN || 14,
  atrMult: +process.env.ATR_MULT || 2,
  useMACD: (process.env.USE_MACD || 'false') === 'true'
};

// Gist for de-dup
const GH_GIST_TOKEN = process.env.GH_GIST_TOKEN;
const GIST_ID = process.env.GIST_ID;
const GIST_FILENAME = process.env.GIST_FILENAME || 'vincevision-state.json';

// ====== Helpers ======
const TF2GRAN = { '1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'8h':28800,'1d':86400 };
const toGran = tf => TF2GRAN[tf] ?? 3600;
const fmt = n => (n == null || isNaN(n)) ? '—' : (Math.abs(n) >= 1 ? n.toFixed(4) : n.toFixed(6));
const keyFor = (s, tf, sig) => `${s}|${tf}|${sig.time}|${sig.side}|${sig.price}`;

// ====== Indicators (same as page) ======
const sma = (arr, len) => {
  const out = Array(arr.length).fill(null); let s = 0;
  for (let i=0;i<arr.length;i++){ s+=arr[i]; if(i>=len) s-=arr[i-len]; if(i>=len-1) out[i]=s/len; }
  return out;
};
const rollingStd = (arr,len)=>{ const out=Array(arr.length).fill(null); let s=0,ss=0;
  for(let i=0;i<arr.length;i++){ s+=arr[i]; ss+=arr[i]*arr[i]; if(i>=len){ s-=arr[i-len]; ss-=arr[i-len]*arr[i-len]; }
    if(i>=len-1){ const m=s/len; out[i]=Math.sqrt(Math.max(ss/len - m*m,0)); } } return out; };
const rsi = (c,len)=>{ const out=Array(c.length).fill(null); let g=0,l=0;
  for(let i=1;i<=len;i++){ const ch=c[i]-c[i-1]; if(ch>=0) g+=ch; else l-=ch; }
  let ag=g/len, al=l/len; out[len]=al===0?100:100-(100/(1+(ag/al)));
  for(let i=len+1;i<c.length;i++){ const ch=c[i]-c[i-1]; const gg=Math.max(ch,0), ll=Math.max(-ch,0);
    ag=(ag*(len-1)+gg)/len; al=(al*(len-1)+ll)/len; out[i]=al===0?100:100-(100/(1+(ag/al))); } return out; };
const stochRSI = (c,rsiLen=14,stochLen=16,kLen=3,dLen=3)=>{
  const rr=rsi(c,rsiLen); const st=Array(c.length).fill(null); let minQ=[],maxQ=[];
  const pushMin=i=>{while(minQ.length&&rr[minQ.at(-1)]>=rr[i])minQ.pop();minQ.push(i)};
  const pushMax=i=>{while(maxQ.length&&rr[maxQ.at(-1)]<=rr[i])maxQ.pop();maxQ.push(i)};
  for(let i=0;i<c.length;i++){ if(rr[i]==null) continue; pushMin(i); pushMax(i);
    const start=i-stochLen+1; while(minQ.length&&minQ[0]<start) minQ.shift(); while(maxQ.length&&maxQ[0]<start) maxQ.shift();
    if(i>=stochLen-1){ const mn=rr[minQ[0]], mx=rr[maxQ[0]]; st[i]=mx===mn?0:((rr[i]-mn)/(mx-mn))*100; } }
  const k=sma(st,kLen), d=sma(k,dLen); return {k,d};
};
const bollinger = (c,len=20,mult=2)=>{ const mid=sma(c,len), sd=rollingStd(c,len);
  const upper=mid.map((m,i)=>m==null||sd[i]==null?null:m+mult*sd[i]);
  const lower=mid.map((m,i)=>m==null||sd[i]==null?null:m-mult*sd[i]);
  return {upper,mid,lower};
};
function atr(bars, len=14) {
  const tr = bars.map((b, i) => i === 0 ? 0 : Math.max(
    b.high - b.low,
    Math.abs(b.high - (bars[i-1]?.close ?? b.high)),
    Math.abs(b.low - (bars[i-1]?.close ?? b.low))
  ));
  return sma(tr, len);
}
function macd(bars, fast=12, slow=26, signal=9) {
  const ema = (arr, len) => {
    const out = Array(arr.length).fill(null);
    let k = 2 / (len + 1);
    out[len-1] = sma(arr.slice(0, len), len)[len-1];
    for (let i = len; i < arr.length; i++) {
      out[i] = arr[i] * k + out[i-1] * (1 - k);
    }
    return out;
  };
  const close = bars.map(b=>b.close);
  const fastEMA = ema(close, fast);
  const slowEMA = ema(close, slow);
  const macdLine = fastEMA.map((f, i) => (f!=null && slowEMA[i]!=null) ? f - slowEMA[i] : null);
  const signalLine = sma(macdLine, signal);
  return { macd: macdLine, signal: signalLine };
}
const withinRange = (v,a,b)=>{ const lo=Math.min(a,b), hi=Math.max(a,b); return v>=lo && v<=hi; };

function checkLtfConfluence(ltfBars, ltfInd, p, side, htfTime){
  if(!ltfBars || !ltfBars.length) return true;
  let j=ltfBars.length-1; while(j>=0 && ltfBars[j].time>htfTime) j--;
  if(j<0) return false;
  const look=Math.max(1,p.ltfLookback); let midOK=false, rangeOK=false;
  for(let x=j; x>=0 && x>j-look; x--){
    const close=ltfBars[x].close, mid=ltfInd.bb.mid[x], K=ltfInd.k[x], D=ltfInd.d[x];
    if(p.ltfMidBreak){ midOK = midOK || (side==='SELL' ? close<mid : close>mid); } else midOK=true;
    if(p.ltfRangeOn){
      if(side==='SELL'){ rangeOK = rangeOK || ((K!=null&&withinRange(K,65,70))||(D!=null&&withinRange(D,65,70))); }
      else { rangeOK = rangeOK || ((K!=null&&withinRange(K,30,50))||(D!=null&&withinRange(D,30,50))); }
    } else rangeOK=true;
  }
  return midOK && rangeOK;
}

function indicatorsFor(bars, p){
  const close = bars.map(b=>b.close);
  return {
    bb: bollinger(close, p.bbLen, p.bbMult),
    ma3: sma(close, p.ma3),
    ...stochRSI(close, p.rsiLen, p.stochLen, p.kLen, p.dLen)
  };
}

// The main strategy: generate confirmed HTF signals (no intrabar)
function generateHTFSignals(htfBars, htfInd, ltfBars, ltfInd, p){
  const atrValues = atr(htfBars, p.atrLen || 14);
  const macdInd = macd(htfBars);
  const signals=[];
  const highs=htfBars.map(b=>b.high), lows=htfBars.map(b=>b.low);
  for(let i=2;i<htfBars.length-1;i++){
    if(htfInd.bb.mid[i]==null||htfInd.ma3[i]==null||htfInd.k[i]==null||htfInd.d[i]==null) continue;
    let tappedUpper=false, tappedLower=false;
    for(let t=0; t<=p.tapLookback; t++){ const idx=i-t; if(idx<0) break;
      tappedUpper = tappedUpper || (htfInd.bb.upper[idx]!=null && highs[idx]>=htfInd.bb.upper[idx]);
      tappedLower = tappedLower || (htfInd.bb.lower[idx]!=null && lows[idx] <=htfInd.bb.lower[idx]);
    }
    const closeBelow3=htfBars[i].close<htfInd.ma3[i], closeAbove3=htfBars[i].close>htfInd.ma3[i];
    const crossDown=htfInd.k[i-1]>htfInd.d[i-1] && htfInd.k[i]<htfInd.d[i], crossUp=htfInd.k[i-1]<htfInd.d[i-1] && htfInd.k[i]>htfInd.d[i];
    const fromOB=(htfInd.k[i-1]>=P.ob || htfInd.d[i-1]>=P.ob), fromOS=(htfInd.k[i-1]<=P.os || htfInd.d[i-1]<=P.os);
    const crossOKSell=p.requireCross?(crossDown&&fromOB):fromOB;
    const crossOKBuy =p.requireCross?(crossUp  &&fromOS):fromOS;
    const ltfOkSell=checkLtfConfluence(ltfBars, ltfInd, p, 'SELL', htfBars[i].time);
    const ltfOkBuy =checkLtfConfluence(ltfBars, ltfInd, p, 'BUY',  htfBars[i].time);
    const sellCond=tappedUpper && closeBelow3 && crossOKSell && ltfOkSell;
    const buyCond =tappedLower && closeAbove3 && crossOKBuy  && ltfOkBuy;
    const side = sellCond ? 'SELL' : 'BUY';
    const macdConfirm = p.useMACD ? (side === 'BUY' ? macdInd.macd[i] > macdInd.signal[i] : macdInd.macd[i] < macdInd.signal[i]) : true;
    if((sellCond||buyCond) && macdConfirm){
      const entry=htfBars[i].close;
      const atrMult = p.atrMult || 2;
      const tp = p.useATR ? (side === 'BUY' ? entry + atrValues[i] * atrMult : entry - atrValues[i] * atrMult) : htfInd.bb.mid[i];
      const sl = p.useATR ? (side === 'BUY' ? entry - atrValues[i] * atrMult * 1.5 : entry + atrValues[i] * atrMult * 1.5) : (sellCond ? Math.max(htfInd.bb.upper[i], highs[i]) : Math.min(htfInd.bb.lower[i], lows[i]));
      signals.push({ time: htfBars[i].time, side, price: entry, tp: tp??null, sl: sl??null, index:i });
    }
  }
  return signals;
}

// ====== Deriv WebSocket fetch ======
function fetchDerivCandles(symbol, tf, count, appId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
    const gran = toGran(tf);
    ws.on('open', () => {
      ws.send(JSON.stringify({ ticks_history: symbol, end: 'latest', count, style: 'candles', granularity: gran }));
    });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.error) {
          ws.close(); return reject(new Error(msg.error.message));
        }
        if (msg.msg_type === 'candles') {
          const bars = msg.candles.map(c => ({
            time: +c.epoch, open:+c.open, high:+c.high, low:+c.low, close:+c.close, volume: 0
          }));
          ws.close();
          resolve(bars);
        }
      } catch (e) {
        ws.close(); reject(e);
      }
    });
    ws.on('error', (err) => { try { ws.close(); } catch {} reject(err); });
    ws.on('close', () => {});
    setTimeout(() => { try { ws.close(); } catch {}; reject(new Error('Deriv timeout')); }, 15000);
  });
}

// ====== Discord ======
async function sendDiscord(webhook, symbol, tf, sig) {
  const color = sig.side === 'BUY' ? 3066993 : 15158332;
  const embed = {
    title: 'VinceVision Signal — CONFIRMED',
    color,
    fields: [
      { name: 'Market', value: symbol, inline: true },
      { name: 'TF', value: tf, inline: true },
      { name: 'Side', value: sig.side, inline: true },
      { name: 'Entry', value: fmt(sig.price), inline: true },
      { name: 'TP', value: fmt(sig.tp), inline: true },
      { name: 'SL', value: fmt(sig.sl), inline: true }
    ],
    timestamp: new Date(sig.time * 1000).toISOString(),
    footer: { text: `Time: ${new Date(sig.time * 1000).toISOString().replace('T',' ').slice(0,19)} UTC` }
  };
  const contentPayload = {
    type: 'signal',
    status: 'confirmed',
    order_type: 'market',
    symbol, tf,
    side: sig.side,
    entry: Number(sig.price),
    tp: (sig.tp == null ? null : Number(sig.tp)),
    sl: (sig.sl == null ? null : Number(sig.sl)),
    timestamp: Number(sig.time)
  };
  const payload = {
    content: '```json\n' + JSON.stringify(contentPayload) + '\n```',
    username: 'VinceVision',
    embeds: [embed]
  };
  const res = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`Discord ${res.status}: ${t}`);
  }
}

// ====== Gist state ======
async function loadState() {
  if (!GH_GIST_TOKEN || !GIST_ID) {
    throw new Error('Missing GH_GIST_TOKEN or GIST_ID. Create a secret gist and set both secrets.');
  }
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      'Authorization': `token ${GH_GIST_TOKEN}`,
      'Accept': 'application/vnd.github+json'
    }
  });
  if (!r.ok) throw new Error(`Gist load failed ${r.status}`);
  const j = await r.json();
  const file = j.files && j.files[GIST_FILENAME];
  if (!file) return { last: {} };
  try { return JSON.parse(file.content) || { last: {} }; } catch { return { last: {} }; }
}
async function saveState(state) {
  const body = { files: { [GIST_FILENAME]: { content: JSON.stringify(state, null, 2) } } };
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${GH_GIST_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Gist save failed ${r.status}`);
}

// ====== Main ======
async function runPair(symbol, tf, state) {
  const htfBars = await fetchDerivCandles(symbol, tf, LIMIT, APP_ID);
  let ltfBars = [];
  if (P.ltfTf && P.ltfTf !== 'none') {
    const ltfLimit = Math.min(1500, LIMIT * 60);
    ltfBars = await fetchDerivCandles(symbol, P.ltfTf, ltfLimit, APP_ID);
  }
  const htfInd = indicatorsFor(htfBars, P);
  const ltfInd = (ltfBars.length ? indicatorsFor(ltfBars, P) : null);
  const signals = generateHTFSignals(htfBars, htfInd, ltfBars, ltfInd, P);
  const last = signals.at(-1);
  if (!last) {
    console.log(`[${symbol} ${tf}] no signals`);
    return null;
  }
  const mapKey = `${symbol}|${tf}`;
  const prevKey = (state.last && state.last[mapKey]) || '';
  const curKey = keyFor(symbol, tf, last);
  if (prevKey === curKey) {
    console.log(`[${symbol} ${tf}] latest signal already sent`);
    return null;
  }
  // Optional: guard against very old historical signals
  const nowSec = Math.floor(Date.now()/1000);
  const windowSec = Math.max(60, Math.min(3*3600, Math.floor(toGran(tf) * 1.2)));
  if (last.time < (nowSec - windowSec)) {
    console.log(`[${symbol} ${tf}] ignoring historical signal at ${last.time}`);
    return null;
  }

  await sendDiscord(WEBHOOK, symbol, tf, last);
  state.last = state.last || {};
  state.last[mapKey] = curKey;
  console.log(`[${symbol} ${tf}] sent ${last.side} @ ${fmt(last.price)} TP ${fmt(last.tp)} SL ${fmt(last.sl)} (${last.time})`);
  return last;
}

(async () => {
  try {
    if (!WEBHOOK) throw new Error('Missing DISCORD_WEBHOOK_URL secret');
    const state = await loadState();
    const pairs = [];
    for (const s of SYMBOLS) for (const tf of TFS) pairs.push([s, tf]);

    for (const [s, tf] of pairs) {
      try { await runPair(s, tf, state); } catch (e) { console.error(`Pair ${s} ${tf} error:`, e.message); }
    }
    await saveState(state);
    console.log('Done.');
  } catch (err) {
    console.error('Fatal:', err.message);
    process.exit(1);
  }
})();

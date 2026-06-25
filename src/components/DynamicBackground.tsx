import React, { useEffect, useRef } from "react";

const JA_WORDS = [
  "Anansi","Duppy","Nyam","Brawta","Su-su","unu","Hush","Stush","Dukunu","dwl",
  "yaad","brejin","parry","par","sumn","gwan","bawl","affi","ting","cyah","cah",
  "nuff","seh","yuh","wi","mek","suh","sah","deh","nuh","di","fi","pon","wid",
  "dem","leff","muss","inna","weh","yah","nave","wata","tru","betta","tek",
  "pickney","aryte","yute","gyal","har","enuh","haad","fuckry","tiad","ketch",
  "bredda","Babylon","ago","cyaan","deevn","haffi","lakka","nah","ovastand","pree",
  "nuttn","zimmie","mussi","wicked","beat","rass","dawg","unuh","bwoy","everyting",
  "mawga","hitchings","nuh sah","farrin","belly","jerk","ackee","saltfish",
  "breadfruit","bammy","festival","escovitch","mannish water","stew peas",
  "callaloo","patty","cocobread","guinep","naseberry","soursop","bun and cheese",
  "roast fish","curry goat","oxtail","rice and peas","dumpling","hardo",
  "stamp and go","carrot juice","sky juice","water coconut","Magnum","ginger beer",
  "Kingston","Portmore","Spanish Town","Montego Bay","Negril","Ocho Rios",
  "Mandeville","Trench Town","Half Way Tree","New Kingston","Papine","Liguanea",
  "St. Andrew","St. Catherine","Westmoreland","Portland","St. Mary","St. Thomas",
  "St. Ann","St. James","Clarendon","Manchester","St. Elizabeth","Hanover",
  "August Town","Riverton","Arnett Gardens","Tivoli","Standpipe","Bull Bay",
  "riddim","dancehall","reggae","ska","rocksteady","bashment","sound system",
  "selector","deejay","singjay","juggling","dub","version","clash","pull up",
  "nine night","nyahbinghi","groundation","reasoning","livity","I-tal",
  "InI","Zion","lion","empress","bredren","sistren","idren","natty",
  "lock dread","bald head","sufferation","pressure","one love","irie","seen",
  "respect","forward","blessed","natural mystic","positive vibration",
  "JUTC","route taxi","robot","coaster","one drop","cambio","partner plan",
  "box hand","throw partner","dead yard","jubilee","J dollar","WiPay",
  "wah gwaan","nuh badda","big up","likkle more","walk good","easy nuh",
  "everything irie","a so it go","weh yuh deh","come een","respect due",
  "real talk","link mi","jah know","night jue","nuh true","wah dat",
  "wheel and come again","nuh sah","nah go lie","mi deh yah",
  // 2026-06-24
  "throw mi pawda and come bk","kool nuh mi dawg","weh di rass","bumbuhclaat",
  "gweh","psst","guango","spur tree","guzu",
];
const WORDS = [...new Set(JA_WORDS)].sort(() => Math.random() - 0.5);

interface HStream { x: number; y: number; speed: number; word: string; alpha: number; wi: number }
interface VStream { x: number; y: number; speed: number; trail: string[]; trailAlpha: number[] }

export default function DynamicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rainAlphaRef = useRef(0); // 0=hidden, 1=full vertical rain

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const FS = 13;
    let hStreams: HStream[] = [];
    let vStreams: VStream[] = [];
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let isScrolling = false;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initH();
      initV();
    };

    const initH = () => {
      const rows = Math.ceil(canvas.height / 38);
      hStreams = Array.from({ length: rows * 4 }, (_, i) => ({
        x: Math.random() * canvas.width,
        y: (Math.floor(i / 4) * (canvas.height / rows)) + Math.random() * 20,
        speed: 0.3 + Math.random() * 0.5,
        word: WORDS[i % WORDS.length],
        alpha: 0.08 + Math.random() * 0.18,
        wi: Math.floor(Math.random() * WORDS.length),
      }));
    };

    const initV = () => {
      const cols = Math.ceil(canvas.width / 38);
      vStreams = Array.from({ length: cols }, (_, i) => ({
        x: i * (canvas.width / cols) + Math.random() * 20,
        y: Math.random() * canvas.height * -1,
        speed: 0.8 + Math.random() * 1.4,
        trail: Array.from({ length: 8 }, (__, j) => WORDS[(i * 3 + j) % WORDS.length]),
        trailAlpha: Array.from({ length: 8 }, (__, j) => (j + 1) / 8),
      }));
    };

    const onScroll = () => {
      if (!isScrolling) isScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { isScrolling = false; }, 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const draw = () => {
      // Fade rain alpha based on scroll state
      const targetAlpha = isScrolling ? 1 : 0;
      rainAlphaRef.current += (targetAlpha - rainAlphaRef.current) * 0.06;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FS}px monospace`;

      // ── Horizontal always-on layer ──────────────────────────────────────
      hStreams.forEach(s => {
        s.x += s.speed;
        if (s.x > canvas.width + 80) {
          s.x = -80;
          s.wi = (s.wi + 1) % WORDS.length;
          s.word = WORDS[s.wi];
          s.alpha = 0.08 + Math.random() * 0.18;
        }
        ctx.fillStyle = `rgba(220,255,235,${s.alpha})`;
        ctx.fillText(s.word, s.x, s.y);
      });

      // ── Vertical rain layer — fades in/out with scroll ──────────────────
      const ra = rainAlphaRef.current;
      if (ra > 0.01) {
        vStreams.forEach(s => {
          s.y += s.speed;
          if (s.y - s.trail.length * FS * 1.8 > canvas.height) {
            s.y = -FS * 2;
            s.x = Math.random() * canvas.width;
          }

          s.trail.forEach((word, i) => {
            const isLead = i === s.trail.length - 1;
            const trailFade = (i + 1) / s.trail.length;
            const yPos = s.y - (s.trail.length - 1 - i) * FS * 1.8;
            if (yPos < 0 || yPos > canvas.height) return;

            if (isLead) {
              ctx.fillStyle = `rgba(16,185,129,${ra * 1})`;   // green lead
            } else {
              ctx.fillStyle = `rgba(220,255,235,${ra * trailFade * 0.55})`;  // white trail fading
            }
            ctx.fillText(word, s.x, yPos);
          });

          // Cycle trail words slowly
          if (Math.random() < 0.015) {
            s.trail.shift();
            s.trail.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
          }
        });
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        borderRadius: "inherit",
      }}
    />
  );
}

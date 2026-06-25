import React, { useEffect, useRef } from "react";

// ~200 Jamaican words, phrases, places, food, culture
const JA_WORDS = [
  // Patois dictionary
  "Anansi","Duppy","Nyam","Brawta","Su-su","unu","Hush","Stush","Dukunu","dwl",
  "yaad","brejin","parry","par","sumn","gwan","bawl","affi","ting","cyah","cah",
  "nuff","seh","yuh","wi","mek","suh","sah","deh","nuh","di","fi","pon","wid",
  "dem","leff","muss","inna","weh","yah","nave","wata","tru","betta","tek",
  "pickney","aryte","yute","gyal","har","enuh","haad","fuckry","tiad","ketch",
  "bredda","Babylon","ago","cyaan","deevn","haffi","lakka","nah","ovastand","pree",
  "nuttn","zimmie","mussi","wicked","beat","rass","dawg","unuh","bwoy","everyting",
  "mawga","hitchings","nuh sah","farrin","belly",
  // Food
  "jerk","ackee","saltfish","breadfruit","bammy","festival","escovitch",
  "mannish water","stew peas","run dung","callaloo","patty","cocobread",
  "guinep","naseberry","soursop","jackfruit","bun and cheese","roast fish",
  "curry goat","oxtail","brown stew","rice and peas","ital stew","dumpling",
  "hard dough","hardo","blue draws","stamp and go","pepper pot",
  // Drinks
  "carrot juice","June plum juice","soursop juice","sky juice","water coconut",
  "Magnum","rum punch","Red Label","Wray and Nephew","ginger beer","mauby",
  // Places
  "Kingston","Portmore","Spanish Town","Montego Bay","Negril","Ocho Rios",
  "Mandeville","Trench Town","Maxfield","Half Way Tree","New Kingston","Papine",
  "Liguanea","Grants Pen","St. Andrew","St. Catherine","Westmoreland","Trelawny",
  "Portland","St. Mary","St. Thomas","St. Ann","St. James","Clarendon",
  "Manchester","St. Elizabeth","Hanover","Bull Bay","August Town","Duhaney Park",
  "Riverton","Arnett Gardens","Rema","Tivoli","Jungle","Standpipe",
  // Music / Culture
  "riddim","dancehall","reggae","ska","rocksteady","bashment","sound system",
  "selector","deejay","singjay","juggling","dub","version","clash","pull up",
  "nine night","nyahbinghi","groundation","reasoning","livity","I-tal",
  "InI","Zion","lion","empress","bredren","sistren","idren","natty",
  "lock dread","bald head","sufferation","pressure","one love","irie","seen",
  "respect","forward","blessed","natural mystic","positive vibration",
  // Transport / Daily life
  "JUTC","route taxi","robot","coaster","one drop","taxi stand","fare",
  "market","higglers","street food","vendor","cambio","partner plan",
  "box hand","throw partner","dead yard","wake","jubilee","coronation market",
  // Currency / Economy
  "J dollar","WiPay","lynk","NCB","Scotia","pan chicken","pushcart",
  "informal","hustling","vibes","works","contracts","agency",
  // Common phrases
  "wah gwaan","nuh badda","big up","likkle more","walk good","easy nuh",
  "everything irie","a so it go","a who dat","weh yuh deh","come een",
  "respect due","inna di morrows","real talk","link mi","check mi later",
  "jah know","night jue","one drop","nuh true","wah dat","wheel and come again",
];

// Deduplicate and shuffle
const WORDS = [...new Set(JA_WORDS)].sort(() => Math.random() - 0.5);

type Direction = "vertical" | "horizontal";

interface Stream {
  pos: number;       // current leading position (x for vertical, y for horizontal)
  cross: number;     // fixed cross-axis position (column x or row y)
  speed: number;
  words: string[];
  wordIdx: number;
  charPos: number;
  trail: { word: string; alpha: number }[];
}

export default function DynamicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirRef = useRef<Direction>("vertical");
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let streams: Stream[] = [];
    const FONT_SIZE = 13;
    const TRAIL_LEN = 10;

    const buildStreams = (dir: Direction) => {
      const count = dir === "vertical"
        ? Math.ceil(canvas.width / 32)
        : Math.ceil(canvas.height / 28);

      return Array.from({ length: count }, (_, i) => ({
        pos: Math.random() * (dir === "vertical" ? canvas.height : canvas.width) * -1,
        cross: i * (dir === "vertical" ? canvas.width / count : canvas.height / count)
          + Math.random() * 12,
        speed: 1.2 + Math.random() * 2.2,
        words: [...WORDS].sort(() => Math.random() - 0.5),
        wordIdx: 0,
        charPos: 0,
        trail: [],
      }));
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      streams = buildStreams(dirRef.current);
    };
    resize();
    window.addEventListener("resize", resize);

    // Scroll: while scrolling → vertical; stops → horizontal
    const onScroll = () => {
      if (dirRef.current !== "vertical") {
        dirRef.current = "vertical";
        streams = buildStreams("vertical");
      }
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        dirRef.current = "horizontal";
        streams = buildStreams("horizontal");
      }, 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const draw = () => {
      ctx.fillStyle = "rgba(6,10,19,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const dir = dirRef.current;
      const limit = dir === "vertical" ? canvas.height : canvas.width;
      const crossLimit = dir === "vertical" ? canvas.width : canvas.height;

      streams.forEach(s => {
        s.pos += s.speed;
        if (s.pos - TRAIL_LEN * FONT_SIZE * 1.8 > limit) {
          s.pos = -FONT_SIZE * 2;
          s.cross = Math.random() * crossLimit;
          s.trail = [];
        }

        const word = s.words[s.wordIdx % s.words.length];

        // Draw trail
        s.trail.forEach((t, i) => {
          const alpha = (i / TRAIL_LEN) * 0.55;
          ctx.fillStyle = i === s.trail.length - 1
            ? `rgba(200,255,230,${alpha + 0.25})`
            : `rgba(16,185,129,${alpha})`;
          ctx.font = `${FONT_SIZE}px monospace`;
          if (dir === "vertical") {
            ctx.fillText(t.word, s.cross, s.pos - (s.trail.length - i - 1) * FONT_SIZE * 1.8);
          } else {
            ctx.save();
            ctx.translate(s.pos - (s.trail.length - i - 1) * FONT_SIZE * 5, s.cross);
            ctx.fillText(t.word, 0, 0);
            ctx.restore();
          }
        });

        // Push current word to trail
        s.trail.push({ word, alpha: 1 });
        if (s.trail.length > TRAIL_LEN) s.trail.shift();
        s.wordIdx++;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.85,
      }}
    />
  );
}

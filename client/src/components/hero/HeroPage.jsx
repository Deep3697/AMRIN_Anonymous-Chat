import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import BrandLogo from "../logo/brand-logo";
import { MagnetizeButton } from "./MagnetizeButton";
import "./hero.css";

const CANNED_MESSAGES = [
  ["anyone from CSE?", "yep 👋"],
  ["who has the assignment pdf?", "sending it..."],
  ["fest registrations open?", "just checked, yes 🎉"],
  ["is the canteen open?", "surprisingly 😭"],
];

function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let raf = 0;
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 15 : 35;

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.4 + 0.1,
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(91,140,255,${p.a})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="field" className="field" aria-hidden="true" />;
}

function CustomCursor({ rootRef, chatRef }) {
  const cursorRef = useRef(null);
  const coreRef = useRef(null);
  const ringRef = useRef(null);
  const bracketsRef = useRef(null);
  const glowRef = useRef(null);
  const trailRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const cursor = cursorRef.current;
    const core = coreRef.current;
    const ring = ringRef.current;
    const brackets = bracketsRef.current;
    const glow = glowRef.current;
    const trail = trailRef.current;
    const nameTag = nameRef.current;

    if (!root || !cursor || !core || !ring || !brackets || !glow || !trail || !nameTag) {
      return undefined;
    }

    if (window.matchMedia("(pointer: coarse)").matches) {
      cursor.style.display = "none";
      return undefined;
    }

    const previousBodyCursor = document.body.style.cursor;
    document.body.style.cursor = "none";

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let tx = mx;
    let ty = my;

    let raf = 0;

    let chatX = 0;
    let chatY = 0;
    let chatRX = -5;
    let chatRY = 2;
    let chatTargetX = 0;
    let chatTargetY = 0;
    let chatTargetRX = -5;
    let chatTargetRY = 2;

    const onPointerMove = (event) => {
      mx = event.clientX;
      my = event.clientY;

      root.style.setProperty("--mx", `${mx}px`);
      root.style.setProperty("--my", `${my}px`);

      const target = event.target instanceof Element
        ? event.target.closest("a,button")
        : null;

      cursor.classList.toggle("active", Boolean(target));

      if (target?.classList.contains("primary")) {
        nameTag.textContent = "ENTER";
      } else if (target?.classList.contains("floating-chip")) {
        nameTag.textContent = "CHAT";
      } else {
        nameTag.textContent = "OPEN";
      }

      root.querySelectorAll(".magnetic").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const distance = Math.hypot(dx, dy);

        if (distance < 150) {
          const power = (1 - distance / 150) * 0.10;
          el.style.transform = `translate(${dx * power}px,${dy * power}px)`;
        } else {
          el.style.transform = "";
        }
      });

      const chat = chatRef.current;
      if (chat) {
        const rect = chat.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const followStrength = 0.085;

        chatTargetX = Math.max(-38, Math.min(38, dx * followStrength));
        chatTargetY = Math.max(-30, Math.min(30, dy * followStrength));
        chatTargetRX = -5 + Math.max(-4, Math.min(4, dy / 95));
        chatTargetRY = 2 + Math.max(-5, Math.min(5, dx / 95));
      }
    };

    const onPointerDown = () => {
      cursor.classList.add("clicking");
      const chat = chatRef.current;

      if (chat) {
        chat.animate(
          [
            { filter: "brightness(1)" },
            { filter: "brightness(1.11)" },
            { filter: "brightness(1)" },
          ],
          { duration: 300, easing: "ease-out" },
        );
      }
    };

    const onPointerUp = () => cursor.classList.remove("clicking");
    const onPointerCancel = () => cursor.classList.remove("clicking");
    const onWindowBlur = () => cursor.classList.remove("clicking");

    const loop = () => {
      rx += (mx - rx) * 0.20;
      ry += (my - ry) * 0.20;
      tx += (mx - tx) * 0.10;
      ty += (my - ty) * 0.10;

      core.style.left = `${mx}px`;
      core.style.top = `${my}px`;
      ring.style.left = `${rx}px`;
      ring.style.top = `${ry}px`;
      brackets.style.left = `${rx}px`;
      brackets.style.top = `${ry}px`;
      glow.style.left = `${rx}px`;
      glow.style.top = `${ry}px`;
      trail.style.left = `${tx}px`;
      trail.style.top = `${ty}px`;
      nameTag.style.left = `${rx}px`;
      nameTag.style.top = `${ry}px`;

      chatX += (chatTargetX - chatX) * 0.075;
      chatY += (chatTargetY - chatY) * 0.075;
      chatRX += (chatTargetRX - chatRX) * 0.075;
      chatRY += (chatTargetRY - chatRY) * 0.075;

      const chat = chatRef.current;
      if (chat) {
        chat.style.transform =
          `perspective(900px) translate3d(${chatX.toFixed(2)}px,${chatY.toFixed(2)}px,0) rotateY(${chatRX.toFixed(2)}deg) rotateX(${chatRY.toFixed(2)}deg)`;
      }

      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("blur", onWindowBlur);
    root.querySelectorAll(".floating-chip,.primary").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("active"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("active"));
    });

    loop();

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.cursor = previousBodyCursor;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [chatRef, rootRef]);

  return (
    <div ref={cursorRef} className="magic-cursor" aria-hidden="true">
      <div ref={glowRef} className="magic-cursor-glow" />
      <div ref={coreRef} className="magic-cursor-core"><span /></div>
      <div ref={ringRef} className="magic-cursor-ring" />
      <div ref={bracketsRef} className="magic-cursor-brackets">
        <i /><i /><i /><i />
      </div>
      <div ref={trailRef} className="magic-cursor-trail" />
      <div ref={nameRef} className="magic-cursor-name">OPEN</div>
    </div>
  );
}

export default function HeroPage() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const chatRef = useRef(null);
  const chatBodyRef = useRef(null);
  const typingRef = useRef(null);
  const messageIndexRef = useRef(0);
  const [isExiting, setIsExiting] = useState(false);

  const handlePrimaryEnter = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      navigate("/register");
    }, 600);
  }, [navigate]);

  const handleNavEnter = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      navigate("/login");
    }, 600);
  }, [navigate]);

  useEffect(() => {
    const root = rootRef.current;
    const chatBody = chatBodyRef.current;
    const typing = typingRef.current;

    if (!root || !chatBody || !typing) return undefined;

    const nextMessage = () => {
      typing.style.display = "flex";

      window.setTimeout(() => {
        const pair = CANNED_MESSAGES[messageIndexRef.current % CANNED_MESSAGES.length];
        messageIndexRef.current += 1;

        const first = document.createElement("div");
        first.className = "msg left reveal";
        first.textContent = pair[0];
        first.style.animationDelay = "0s";

        const second = document.createElement("div");
        second.className = "msg right reveal";
        second.textContent = pair[1];
        second.style.animationDelay = "0.35s";

        chatBody.insertBefore(first, typing);
        chatBody.insertBefore(second, typing);
        typing.style.display = "none";
        chatBody.scrollTop = chatBody.scrollHeight;
      }, 850);
    };

    const interval = window.setInterval(nextMessage, 4200);

    const chips = Array.from(root.querySelectorAll(".floating-chip"));
    const chipHandlers = new Map();

    chips.forEach((chip) => {
      const onClick = () => {
        nextMessage();
        chip.animate(
          [{ scale: 0.94 }, { scale: 1 }],
          { duration: 260 },
        );
      };

      chip.addEventListener("click", onClick);
      chipHandlers.set(chip, onClick);
    });

    const send = root.querySelector("#send");
    let sendHandler;

    if (send) {
      sendHandler = () => {
        const message = document.createElement("div");
        message.className = "msg right reveal";
        message.style.animationDelay = "0s";
        message.textContent = "✨ sent anonymously";
        chatBody.insertBefore(message, typing);
        typing.style.display = "flex";
        window.setTimeout(() => {
          typing.style.display = "none";
        }, 900);
      };

      send.addEventListener("click", sendHandler);
    }

    return () => {
      window.clearInterval(interval);
      chips.forEach((chip) => {
        const handler = chipHandlers.get(chip);
        if (handler) chip.removeEventListener("click", handler);
      });
      if (send && sendHandler) send.removeEventListener("click", sendHandler);
    };
  }, []);

  return (
    <div ref={rootRef} className={`hero-root ${isExiting ? "page-exit" : ""}`}>
      <div className="noise" aria-hidden="true" />

      <div className="backdrop" aria-hidden="true">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="grid" />
        <ParticleCanvas />
      </div>

      <CustomCursor rootRef={rootRef} chatRef={chatRef} />

      <nav className="hero-nav">
        <a className="brand hero-nav-logo-link" href="#enter" aria-label="AMRIN home">
          <BrandLogo text="AMRIN.CHAT" className="hero-brand-logo" delay={120} startDelay={100} />
        </a>

        <div className="navlinks">
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
          <a className="nav-cta magnetic" href="/login" onClick={(event) => { event.preventDefault(); handleNavEnter(); }}>
            Enter ↗
          </a>
        </div>
      </nav>

      <main className="hero-main">
        <section className="copy" id="enter">
          <h1>
            Talk freely.<br />
            <span>Stay unknown.</span>
          </h1>

          <p className="lead">
            A living chat space for your campus. Ask questions, share thoughts and find your people without turning every message into a profile.
          </p>

          <div className="actions">
            <MagnetizeButton onClick={handlePrimaryEnter}>
              Enter AMRIN <b>↗</b>
            </MagnetizeButton>
          </div>
        </section>

        <section className="stage" aria-label="Interactive AMRIN chat preview">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <button className="floating-chip chip-one magnetic" type="button" data-msg="anyone got notes?">
            anyone got notes? <span>↗</span>
          </button>
          <button className="floating-chip chip-two magnetic" type="button" data-msg="exam tomorrow 💀">
            exam tomorrow 💀
          </button>
          <button className="floating-chip chip-three magnetic" type="button" data-msg="who is coming?">
            who is coming?
          </button>

          <div ref={chatRef} className="chat-shell" id="chat">
            <div className="chat-top">
              <div className="identity">
                <div className="signal"><span /><span /><span /></div>
                <div>
                  <b>AMRIN</b>
                  <small>Campus Lounge · live</small>
                </div>
              </div>
              <div className="menu-dots">•••</div>
            </div>

            <div ref={chatBodyRef} className="chat-body" id="chatBody">
              <div className="time">TODAY · 11:48 PM</div>
              <div className="msg left reveal">anyone still awake? 👀</div>
              <div className="msg right reveal">apparently 😂</div>
              <div className="msg left reveal">which division is lab tomorrow?</div>
              <div ref={typingRef} className="typing" id="typing">
                <i /><i /><i />
              </div>
            </div>

            <div className="chat-input">
              <span>Send anonymously...</span>
              <button id="send" type="button" aria-label="Send anonymously">↑</button>
            </div>
            <div className="sweep" />
          </div>
        </section>
      </main>

      <section id="how" className="how">
        <div><span>01</span><b>Write</b><small>Drop a thought without the profile baggage.</small></div>
        <div><span>02</span><b>Connect</b><small>Find conversations around your campus.</small></div>
        <div><span>03</span><b>Disappear</b><small>Your identity never has to enter the room.</small></div>
      </section>
    </div>
  );
}

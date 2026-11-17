/* =========================================================
   ЗЕНИТ — интерактив и анимации
   ========================================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = document.getElementById("header");
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  /* ---------- шапка и мобильное меню ---------- */

  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const closeMenu = () => {
    nav.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Открыть меню");
    document.body.classList.remove("menu-open");
  };

  const openMenu = () => {
    nav.classList.add("open");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Закрыть меню");
    document.body.classList.add("menu-open");
  };

  burger.addEventListener("click", () => {
    if (nav.classList.contains("open")) closeMenu();
    else openMenu();
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
      closeMenu();
      burger.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeMenu();
  });

  /* ---------- появление блоков при прокрутке ---------- */

  const revealItems = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("in"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealItems.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- подсветка активного пункта меню ---------- */

  const navLinks = [...nav.querySelectorAll("a[href^='#']")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            link.classList.toggle(
              "is-current",
              link.getAttribute("href") === `#${entry.target.id}`
            );
          });
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );
    sections.forEach((section) => spy.observe(section));
  }

  const clearNavAtTop = () => {
    if (window.scrollY < 140) {
      navLinks.forEach((link) => link.classList.remove("is-current"));
    }
  };
  clearNavAtTop();
  window.addEventListener("scroll", clearNavAtTop, { passive: true });

  /* ---------- анимированные счётчики ---------- */

  const counters = document.querySelectorAll("[data-count]");

  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;

    // Год не считаем с нуля — просто показываем как есть.
    const isYear = target > 1900 && target < 2100;
    if (reduceMotion || isYear) {
      el.textContent = String(target);
      return;
    }

    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (counters.length) {
    if ("IntersectionObserver" in window) {
      const counterObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => counterObserver.observe(el));
    } else {
      counters.forEach(animateCount);
    }
  }

  /* ---------- табы «На трибуне / На паркете» ---------- */

  const tabs = [...document.querySelectorAll(".story-tab")];
  const panels = [...document.querySelectorAll(".story-panel")];

  const activateTab = (tab) => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.id === tab.getAttribute("aria-controls");
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();

      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;

      tabs[next].focus();
      activateTab(tabs[next]);
    });
  });

  /* ---------- интерактив: пенальти ---------- */

  const goal = document.getElementById("goal");
  const ball = document.getElementById("ball");
  const ballShadow = document.getElementById("ballShadow");
  const shotTrail = document.getElementById("shotTrail");
  const keeper = document.getElementById("keeper");
  const flash = document.getElementById("flash");
  const stage = document.querySelector(".goal-stage");
  const zones = [...document.querySelectorAll(".zone")];
  const scoreGoals = document.getElementById("scoreGoals");
  const scoreSaves = document.getElementById("scoreSaves");
  const gameStatus = document.getElementById("gameStatus");
  const randomShot = document.getElementById("randomShot");
  const resetGame = document.getElementById("resetGame");

  if (goal && ball && keeper && zones.length) {
    let goals = 0;
    let saves = 0;
    let locked = false;

    const defaultStatus = "Выбери угол ворот, чтобы пробить.";

    const diveKeeper = (zoneIndex) => {
      const column = zoneIndex % 3;
      const row = zoneIndex < 3 ? 0 : 1;
      const width = goal.clientWidth || 600;
      const dx = column === 0 ? -width * 0.23 : column === 2 ? width * 0.23 : 0;
      const dy = row === 0 ? -width * 0.035 : width * 0.045;
      const rotation = column === 0 ? -28 : column === 2 ? 28 : row === 0 ? -6 : 6;
      const scale = column === 1 ? 0.92 : 1;
      keeper.style.transform =
        `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${rotation}deg) scale(${scale})`;
    };

    const clearTrail = () => {
      shotTrail.classList.remove("preview", "shot");
    };

    // Геометрия удара считается от точки пенальти до выбранной зоны.
    const getGeometry = (zone) => {
      const goalRect = goal.getBoundingClientRect();
      const zoneRect = zone.getBoundingClientRect();
      const startX = ball.offsetLeft + ball.offsetWidth / 2;
      const startY = ball.offsetTop + ball.offsetHeight / 2;
      const endX = zoneRect.left - goalRect.left + zoneRect.width / 2;
      const endY = zoneRect.top - goalRect.top + zoneRect.height / 2;
      const dx = endX - startX;
      const dy = endY - startY;

      return {
        dx,
        dy,
        startX,
        startY,
        length: Math.hypot(dx, dy),
        angle: Math.atan2(dy, dx) * 180 / Math.PI
      };
    };

    const showTrail = (geometry, mode) => {
      shotTrail.style.left = `${geometry.startX}px`;
      shotTrail.style.top = `${geometry.startY}px`;
      shotTrail.style.width = `${geometry.length}px`;
      shotTrail.style.transform = `rotate(${geometry.angle}deg)`;
      shotTrail.classList.remove("preview", "shot");
      void shotTrail.offsetWidth;
      shotTrail.classList.add(mode);
    };

    const resetBall = () => {
      ball.classList.add("no-anim");
      ball.classList.remove("is-flying", "is-winding");
      ball.style.transform = "translate(-50%, 0)";
      // Заставляем браузер применить позицию без анимации.
      void ball.offsetWidth;
      ball.classList.remove("no-anim");
      ballShadow.classList.remove("lifted");
      clearTrail();
      keeper.style.transform = "";
    };

    const confetti = () => {
      const colors = ["#8ddcff", "#ffffff", "#ffd45e", "#0091df"];
      for (let i = 0; i < 20; i += 1) {
        const piece = document.createElement("span");
        piece.className = "confetti";
        piece.style.left = `${8 + Math.random() * 84}%`;
        piece.style.background = colors[i % colors.length];
        piece.style.animationDelay = `${Math.random() * 0.2}s`;
        stage.appendChild(piece);
        window.setTimeout(() => piece.remove(), 1700);
      }
    };

    const shoot = (zoneIndex) => {
      if (locked) return;
      locked = true;
      zones.forEach((zone) => { zone.disabled = true; });

      const zone = zones[zoneIndex];
      if (!zone) {
        locked = false;
        zones.forEach((z) => { z.disabled = false; });
        return;
      }

      const geometry = getGeometry(zone);

      // Вратарь угадывает направление примерно в трети ударов.
      const keeperGuess = Math.random() < 0.36
        ? zoneIndex
        : Math.floor(Math.random() * zones.length);
      const scored = keeperGuess !== zoneIndex;

      clearTrail();

      // Небольшой замах, чтобы удар было заметно.
      ball.classList.remove("is-flying");
      ball.classList.add("is-winding");
      ball.style.transform = "translate(-50%, 10px) scale(.88)";

      const launch = () => {
        ball.classList.remove("is-winding");
        ball.classList.add("is-flying");
        void ball.offsetWidth;
        ballShadow.classList.add("lifted");
        showTrail(geometry, "shot");
        ball.style.transform =
          `translate(-50%, 0) translate(${geometry.dx}px, ${geometry.dy}px) scale(.78)`;
        diveKeeper(keeperGuess);
      };

      window.setTimeout(launch, reduceMotion ? 0 : 150);

      window.setTimeout(() => {
        if (scored) {
          goals += 1;
          goal.classList.add("is-scored");
          flash.textContent = "ГОООЛ!";
          flash.className = "flash show goal-text";
          gameStatus.textContent = "Гол! Мяч в сетке — как на тренировке.";
          gameStatus.className = "game-status is-goal";
          confetti();
        } else {
          saves += 1;
          flash.textContent = "СЕЙВ!";
          flash.className = "flash show save-text";
          gameStatus.textContent = "Вратарь угадал! В следующий раз бей в другой угол.";
          gameStatus.className = "game-status is-save";
        }

        scoreGoals.textContent = String(goals);
        scoreSaves.textContent = String(saves);

        window.setTimeout(() => {
          goal.classList.remove("is-scored");
          flash.className = "flash";
          resetBall();
          zones.forEach((z) => { z.disabled = false; });
          gameStatus.textContent = defaultStatus;
          gameStatus.className = "game-status";
          locked = false;
        }, 1500);
      }, reduceMotion ? 30 : 1140);
    };

    zones.forEach((zone) => {
      zone.addEventListener("click", () => shoot(Number(zone.dataset.zone)));

      // При наведении/фокусе показываем, куда полетит мяч.
      const preview = () => {
        if (!locked) showTrail(getGeometry(zone), "preview");
      };
      zone.addEventListener("mouseenter", preview);
      zone.addEventListener("focus", preview);
      zone.addEventListener("mouseleave", clearTrail);
      zone.addEventListener("blur", clearTrail);
    });

    if (randomShot) {
      randomShot.addEventListener("click", () => {
        shoot(Math.floor(Math.random() * zones.length));
      });
    }

    if (resetGame) {
      resetGame.addEventListener("click", () => {
        if (locked) return;
        goals = 0;
        saves = 0;
        scoreGoals.textContent = "0";
        scoreSaves.textContent = "0";
        gameStatus.textContent = "Счёт сброшен. Выбери угол ворот.";
        gameStatus.className = "game-status";
        resetBall();
      });
    }

    resetBall();
  }

  /* ---------- год в подвале ---------- */

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();

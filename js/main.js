/* yemo 官网交互脚本 —— 全部原生 JS，无依赖 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  /* ========== 星空 + 流星 ========== */

  var canvas = $("#stars");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var stars = [];
    var meteors = [];
    var mouse = { x: 0.5, y: 0.5 };
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;

    function makeStars() {
      var count = w < 700 ? 90 : 180;
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.3 + 0.3,
          base: Math.random() * 0.5 + 0.25,
          amp: Math.random() * 0.35,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.9 + 0.3,
          depth: Math.random() * 0.8 + 0.2
        });
      }
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeStars();
      if (reduceMotion) drawFrame(0, true);
    }

    function spawnMeteor() {
      var fromX = Math.random() * w * 0.7 + w * 0.2;
      meteors.push({
        x: fromX,
        y: Math.random() * h * 0.3,
        vx: -(Math.random() * 5 + 6),
        vy: Math.random() * 3 + 2.5,
        life: 1
      });
    }

    function drawFrame(t, still) {
      ctx.clearRect(0, 0, w, h);

      var px = (mouse.x - 0.5) * 14;
      var py = (mouse.y - 0.5) * 10;

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = still ? s.base : s.base + Math.sin(t * 0.001 * s.speed + s.phase) * s.amp;
        var a = Math.max(0.05, Math.min(1, tw));
        ctx.beginPath();
        ctx.arc(s.x + px * s.depth, s.y + py * s.depth, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(226, 234, 255, " + a.toFixed(3) + ")";
        ctx.fill();
      }

      for (var m = meteors.length - 1; m >= 0; m--) {
        var mt = meteors[m];
        if (!still) {
          mt.x += mt.vx;
          mt.y += mt.vy;
          mt.life -= 0.012;
        }
        if (mt.life <= 0) { meteors.splice(m, 1); continue; }
        var grad = ctx.createLinearGradient(mt.x, mt.y, mt.x - mt.vx * 9, mt.y - mt.vy * 9);
        grad.addColorStop(0, "rgba(247, 243, 230, " + (0.9 * mt.life).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(247, 243, 230, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(mt.x, mt.y);
        ctx.lineTo(mt.x - mt.vx * 9, mt.y - mt.vy * 9);
        ctx.stroke();
      }
    }

    function loop(t) {
      drawFrame(t, false);
      requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (e) {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
    }, { passive: true });

    resize();

    if (reduceMotion) {
      drawFrame(0, true);
    } else {
      requestAnimationFrame(loop);
      (function scheduleMeteor() {
        setTimeout(function () {
          spawnMeteor();
          scheduleMeteor();
        }, Math.random() * 6000 + 3500);
      })();
    }
  }

  /* ========== 月亮视差 ========== */

  var moon = $(".hero__moon");
  if (moon && !reduceMotion) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY * 0.14, 90);
        moon.style.transform = "translateY(" + y + "px)";
        ticking = false;
      });
    }, { passive: true });
  }

  /* ========== 打字机宣传语 ========== */

  var taglineText = $("#taglineText");
  if (taglineText) {
    var phrases = ["夜的尽头，是家", "安安静静生存，热热闹闹生活", "你的一砖一瓦，都算数", "点一首歌，全服一起摇摆"];
    if (reduceMotion) {
      taglineText.textContent = phrases[0];
    } else {
      var pi = 0, ci = 0, deleting = false;
      (function type() {
        var word = phrases[pi];
        taglineText.textContent = word.slice(0, ci);
        var delay;
        if (!deleting) {
          ci++;
          delay = 110;
          if (ci > word.length) {
            if (pi === 0 && ci === word.length + 1) { /* 第一句多停一会 */ }
            deleting = true;
            delay = 2200;
          }
        } else {
          ci--;
          delay = 45;
          if (ci < 0) {
            deleting = false;
            ci = 0;
            pi = (pi + 1) % phrases.length;
            delay = 420;
          }
        }
        setTimeout(type, delay);
      })();
    }
  }

  /* ========== 滚动渐入 ========== */

  var revealEls = $$(".reveal");
  if (reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add("on"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("on");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ========== 导航 ========== */

  var nav = $("#nav");
  var burger = $("#navBurger");
  var links = $("#navLinks");

  function onScrollNav() {
    nav.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    });
    $$("#navLinks a:not(.btn)").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ========== 一键复制 + 提示气泡 ========== */

  var toast = $("#toast");
  var toastText = $("#toastText");
  var toastTimer = null;

  function showToast(msg) {
    if (!toast) return;
    toastText.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2300);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext !== false) {
      return navigator.clipboard.writeText(text).catch(fallbackCopy);
    }
    return Promise.resolve(fallbackCopy());
    function fallbackCopy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* 尽力而为 */ }
      document.body.removeChild(ta);
    }
  }

  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      copyText(text).then(function () {
        showToast(btn.getAttribute("data-toast") || "已复制");
      });
    });
  });

  /* ========== 卡片 3D 悬浮 + 光斑跟随 ========== */

  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    $$(".tilt").forEach(function (card) {
      var raf = null;
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var rx = (0.5 - y) * 5;
          var ry = (x - 0.5) * 6;
          card.style.transform = "perspective(800px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
          raf = null;
        });
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ========== 实时在线状态（mcsrvstat.us 免费公共接口） ========== */

  var statusDot = $("#statusPill .pill__dot");
  var statusText = $("#statusText");
  var statOnline = $("#statOnline");

  function setStatus(mode, text) {
    if (statusDot) {
      statusDot.classList.remove("pill__dot--wait", "pill__dot--on", "pill__dot--off");
      statusDot.classList.add("pill__dot--" + mode);
    }
    if (statusText) statusText.textContent = text;
  }

  fetch("https://api.mcsrvstat.us/3/yemo.mcservers.win", { cache: "no-store" })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.online) {
        var n = data.players && data.players.online !== undefined ? data.players.online : "?";
        var max = data.players && data.players.max !== undefined ? data.players.max : "";
        setStatus("on", "服务器亮着灯 · 现在 " + n + " 人在夜幕里" + (max ? " / " + max : ""));
        if (statOnline) statOnline.textContent = n;
      } else {
        setStatus("off", "服务器此刻没亮灯，来 QQ 群蹲一波");
        if (statOnline) statOnline.textContent = "0";
      }
    })
    .catch(function () {
      setStatus("wait", "状态查询开小差了，进服试试就知道");
    });

  /* ========== 页脚年份 ========== */

  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();

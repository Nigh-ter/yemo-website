/* 效果预览 v3 —— 全屏滑降玩法区 / 换肤 / 手风琴 / 收尾 */
(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var hasGsap = typeof window.gsap !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";
  var fine = window.matchMedia("(pointer: fine)").matches;

  if (hasGsap && typeof window.ScrollTrigger !== "undefined") {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.gsap.ticker.fps(120);
  }

  /* ---- Lenis ---- */

  var lenis = null;
  if (hasLenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
    });
    if (hasGsap) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    }
  }

  /* ---- 白天/黑夜主题切换(正式站按北京时间自动) ---- */

  var toggle = $("#themeToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var day = document.body.classList.toggle("theme-day");
      toggle.textContent = day ? "🌙 切到黑夜主题" : "☀ 切到白天主题";
    });
  }

  /* ---- 玩法:全屏卡片从下往上升起,层层覆盖(快速落位+长停留+吸附) ---- */

  if (hasGsap && typeof window.ScrollTrigger !== "undefined" && window.matchMedia("(min-width: 701px)").matches) {
    var panels = $$(".fs-panel");
    panels.forEach(function (p, i) { gsap.set(p, { zIndex: 10 + i }); });

    var fsTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".fs-pin", start: "top top", end: "+=320%", pin: true, scrub: 0.8,
        snap: { snapTo: [0.2, 0.5, 0.8, 0.95], duration: 0.5, delay: 0.06, ease: "power1.inOut" }
      }
    });

    panels.forEach(function (p, i) {
      var side = i % 2 ? "9vw" : "-9vw";
      fsTl.fromTo(p,
        { yPercent: 130, rotateX: 14 },
        { yPercent: 0, rotateX: 0, x: side, duration: 0.3, ease: "power2.out" }, i);
      fsTl.fromTo(p.querySelectorAll(".fs-fade"),
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.15, stagger: 0.04, ease: "power2.out" }, i + 0.18);
    });
  } else {
    $$(".fs-panel").forEach(function (p) {
      var card = p.querySelector(".fs-card");
      if (!card || !hasGsap) return;
      gsap.from(card, {
        autoAlpha: 0, y: 40, duration: 0.8, ease: "power3.out",
        scrollTrigger: { trigger: p, start: "top 80%", toggleActions: "play none none reverse" }
      });
    });
  }

  /* ---- 鼠标 3D 倾斜(卡片层) ---- */

  if (fine) {
    var tiltRaf = null, mx = 0, my = 0, tiltCard = null;
    $$(".fs-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        mx = (e.clientX - rect.left) / rect.width - 0.5;
        my = (e.clientY - rect.top) / rect.height - 0.5;
        tiltCard = card;
        if (tiltRaf) return;
        tiltRaf = requestAnimationFrame(function () {
          if (tiltCard) tiltCard.style.transform = "perspective(900px) rotateX(" + (-my * 7).toFixed(2) + "deg) rotateY(" + (mx * 8).toFixed(2) + "deg)";
          tiltRaf = null;
        });
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
        tiltCard = null;
      });
    });
  }

  /* ---- 手风琴 ---- */

  $$(".acc__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".acc");
      var open = item.classList.contains("open");
      $$(".acc.open").forEach(function (o) { if (o !== item) o.classList.remove("open"); });
      item.classList.toggle("open", !open);
    });
  });

  /* ---- 复制 + 气泡 ---- */

  var toast = $("#toast");
  var toastText = $("#toastText");
  var toastTimer = null;

  function showToast(msg) {
    toastText.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2300);
  }

  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () { showToast(btn.getAttribute("data-toast") || "已复制"); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
      else done();
    });
  });

  /* ---- 收尾水印浮起 ---- */

  if (hasGsap && typeof window.ScrollTrigger !== "undefined") {
    gsap.fromTo(".watermark span", { yPercent: 30 }, {
      yPercent: -12, ease: "none",
      scrollTrigger: { trigger: ".end-demo", start: "top bottom", end: "bottom bottom", scrub: 0.6 }
    });
  }
})();

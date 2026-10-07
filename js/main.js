/* yemo 官网交互 —— 昼夜按北京时间自动,GSAP+Lenis,全部本地文件 */
(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var hasGsap = typeof window.gsap !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";
  var fine = window.matchMedia("(pointer: fine)").matches;

  /* ---- 昼夜主题:按北京时间自动(6:00–18:00 白天) ---- */

  var hour = new Date().getHours();
  if (hour >= 6 && hour < 18) document.body.classList.add("theme-day");

  /* ---- 全站星空:固定画布,滚动分层漂移(白天主题自动停画) ---- */

  var canvas = $("#stars");
  var ctx = canvas.getContext("2d");
  var stars = [];
  var meteors = [];
  var mouse = { x: 0.5, y: 0.5 };
  var dpr = 1;
  var w = 0, h = 0;
  var starSprites = [];
  var frameBudget = window.matchMedia("(max-width: 700px)").matches ? 33.3 : 1000 / 120;
  var lastDraw = 0;
  var quality = { step: 0, deltas: [], badWins: 0, hz: 0 };
  var STAR_BASE = window.matchMedia("(max-width: 700px)").matches ? 70 : 180;

  function starsHidden() { return document.body.classList.contains("theme-day"); }

  function makeStarSprite(r) {
    var pad = 3;
    var size = (r + pad) * 2;
    var s = document.createElement("canvas");
    s.width = s.height = Math.ceil(size * dpr);
    var c = s.getContext("2d");
    c.scale(dpr, dpr);
    c.fillStyle = "#e2eaff";
    c.beginPath();
    c.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    c.fill();
    s.cssSize = size;
    return s;
  }

  function buildSprites() {
    starSprites = [0.5, 0.9, 1.3, 1.8].map(makeStarSprite);
  }

  function makeStars() {
    var arr = [];
    for (var i = 0; i < STAR_BASE; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        tier: Math.min(3, Math.floor((Math.random() * Math.random()) * 4)),
        base: Math.random() * 0.5 + 0.25,
        amp: Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.9 + 0.3,
        depth: Math.random() * 0.8 + 0.2
      });
    }
    return arr;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1 : 1.5);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = makeStars();
    buildSprites();
  }

  function isMobile() { return window.matchMedia("(max-width: 700px)").matches; }

  function spawnMeteor(big) {
    meteors.push({
      x: big ? Math.random() * w * 0.7 + w * 0.2 : Math.random() * w * 0.6 + w * 0.25,
      y: big ? Math.random() * h * 0.4 : -30,
      vx: big ? -(Math.random() * 5 + 6) : -(Math.random() * 1.4 + 1),
      vy: big ? Math.random() * 3 + 2.5 : Math.random() * 2 + 4.5,
      life: 1,
      big: !!big,
      fade: big ? 0.012 : 0.009
    });
  }

  function drawFrame(t) {
    ctx.clearRect(0, 0, w, h);

    var px = (mouse.x - 0.5) * 14;
    var py = (mouse.y - 0.5) * 10;
    var scroll = window.scrollY || 0;

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var spr = starSprites[s.tier];
      var a = Math.max(0.05, Math.min(1, s.base + Math.sin(t * 0.001 * s.speed + s.phase) * s.amp));
      var y = ((s.y - scroll * 0.16 * s.depth) % h + h) % h;
      ctx.globalAlpha = a;
      ctx.drawImage(spr, s.x + px * s.depth - spr.cssSize / 2, y + py * s.depth - spr.cssSize / 2, spr.cssSize, spr.cssSize);
    }
    ctx.globalAlpha = 1;

    for (var m = meteors.length - 1; m >= 0; m--) {
      var mt = meteors[m];
      mt.x += mt.vx;
      mt.y += mt.vy;
      mt.life -= mt.fade;
      if (mt.life <= 0) { meteors.splice(m, 1); continue; }
      var tl = mt.big ? 9 : 3.2;
      var grad = ctx.createLinearGradient(mt.x, mt.y, mt.x - mt.vx * tl, mt.y - mt.vy * tl);
      grad.addColorStop(0, "rgba(247, 243, 230, " + (0.9 * mt.life).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(247, 243, 230, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = mt.big ? 1.6 : 1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(mt.x, mt.y);
      ctx.lineTo(mt.x - mt.vx * tl, mt.y - mt.vy * tl);
      ctx.stroke();
    }
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  }, { passive: true });

  resize();

  /* 帧率监控:连续不达标就逐级降画质 */
  function trackQuality(delta) {
    quality.deltas.push(delta);
    if (quality.deltas.length < 90) return;
    var sorted = quality.deltas.slice().sort(function (a, b) { return a - b; });
    var median = sorted[Math.floor(sorted.length / 2)];
    if (!quality.hz) quality.hz = Math.round(1000 / median);
    var bad = median > (1000 / quality.hz) * 1.7;
    quality.badWins = bad ? quality.badWins + 1 : 0;
    quality.deltas = [];
    if (quality.badWins >= 2 && quality.step < 3) {
      quality.badWins = 0;
      quality.step++;
      if (quality.step === 1) STAR_BASE = Math.max(110, STAR_BASE - 60);
      if (quality.step === 2) dpr = 1.2;
      if (quality.step === 3) { dpr = 1; STAR_BASE = 70; }
      resize();
    }
  }

  function masterLoop(t) {
    requestAnimationFrame(masterLoop);
    if (t - lastDraw < frameBudget - 0.6) return;
    var delta = t - lastDraw;
    lastDraw = t;
    if (!starsHidden()) drawFrame(t);
    trackQuality(delta);
    lanternTick();
  }
  requestAnimationFrame(masterLoop);

  /* 大火流星:低频、单发;细流星雨:多颗错落下落(仅夜晚) */
  (function scheduleMeteor() {
    setTimeout(function () {
      if (!document.hidden && !starsHidden() && meteors.length < 3) spawnMeteor(true);
      scheduleMeteor();
    }, Math.random() * 9000 + 5000);
  })();

  (function scheduleShower() {
    setTimeout(function () {
      if (!document.hidden && !starsHidden()) {
        for (var i = 0; i < 3; i++) {
          (function (d) {
            setTimeout(function () {
              if (!document.hidden && !starsHidden() && meteors.length < 9) spawnMeteor(false);
            }, d);
          })(i * 380 + Math.random() * 250);
        }
      }
      scheduleShower();
    }, Math.random() * 5000 + 4500);
  })();

  /* ---- Lenis ---- */

  var lenis = null;
  if (hasLenis) {
    lenis = new window.Lenis({
      duration: 0.9,
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

  /* ---- 提灯:惯性跟随,静止即歇 ---- */

  var lantern = $("#lantern");
  var lx = 0, ly = 0, tx = 0, ty = 0, lanternOn = false, lanternSettled = true;

  if (lantern && fine) {
    window.addEventListener("pointermove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!lanternOn) {
        lanternOn = true;
        lx = tx;
        ly = ty;
        lantern.classList.add("on");
      }
    }, { passive: true });
  }

  function lanternTick() {
    if (!lanternOn) return;
    var dx = tx - lx, dy = ty - ly;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
      if (!lanternSettled) {
        lantern.style.transform = "translate(" + tx + "px," + ty + "px)";
        lanternSettled = true;
      }
      return;
    }
    lanternSettled = false;
    lx += dx * 0.13;
    ly += dy * 0.13;
    lantern.style.transform = "translate(" + lx.toFixed(1) + "px," + ly.toFixed(1) + "px)";
  }

  /* ---- 导航:滚动方向感知 + 进度条 ---- */

  var nav = $("#nav");
  var burger = $("#navBurger");
  var links = $("#navLinks");
  var progress = $("#progress");
  var lastY = 0;

  function onScroll() {
    var y = window.scrollY || 0;
    nav.classList.toggle("scrolled", y > 24);
    if (y > lastY + 6 && y > 300) nav.classList.add("hide");
    else if (y < lastY - 6 || y <= 300) nav.classList.remove("hide");
    lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress && max > 0) {
      progress.style.width = ((y / max) * 100).toFixed(2) + "%";
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  if (lenis) lenis.on("scroll", onScroll);
  onScroll();

  function closeMenu() {
    links.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "打开菜单");
    if (lenis) lenis.start();
  }

  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
      if (lenis) { open ? lenis.stop() : lenis.start(); }
    });
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -70 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
      if (links.classList.contains("open")) closeMenu();
    });
  });

  /* ---- 打字机宣传语 ---- */

  var taglineText = $("#taglineText");
  var phrases = ["夜的尽头，是家", "安安静静生存，热热闹闹生活", "你的一砖一瓦，都算数", "点一首歌，全服一起摇摆"];

  (function typewriter() {
    var pi = 0, ci = 0, deleting = false;
    (function tick() {
      var word = phrases[pi];
      taglineText.textContent = word.slice(0, ci);
      var delay;
      if (!deleting) {
        ci++;
        delay = 110;
        if (ci > word.length) {
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
      setTimeout(tick, delay);
    })();
  })();

  /* ---- 滚动渐入:可逆,滚回去会倒放 ---- */

  var revealsReady = false;
  function initReveals() {
    if (revealsReady || !hasGsap) return;
    revealsReady = true;
    $$(".reveal").forEach(function (el) {
      gsap.set(el, { autoAlpha: 0, y: 24 });
      ScrollTrigger.create({
        trigger: el, start: "top 94%",
        onEnter: function () {
          /* 快滚补偿:元素已被用户滚过半屏就直接显形,不再慢慢播 */
          var deep = el.getBoundingClientRect().top < window.innerHeight * 0.45;
          gsap.to(el, {
            autoAlpha: 1, y: 0,
            duration: deep ? 0.18 : 0.9,
            delay: deep ? 0 : (parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0),
            ease: "power3.out", overwrite: "auto"
          });
        },
        onLeaveBack: function () {
          gsap.to(el, { autoAlpha: 0, y: 24, duration: 0.3, overwrite: "auto" });
        }
      });
    });
  }
  if (!hasGsap) $$(".reveal").forEach(function (el) { el.classList.add("on"); });

  /* ---- 一键复制 + 提示气泡 ---- */

  var toast = $("#toast");
  var toastText = $("#toastText");
  var toastTimer = null;

  function showToast(msg) {
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
      try { document.execCommand("copy"); } catch (e) { /* 旧浏览器尽力而为 */ }
      document.body.removeChild(ta);
    }
  }

  function clickWave(e, host) {
    var rect = host.getBoundingClientRect();
    var wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.left = (e.clientX - rect.left) + "px";
    wave.style.top = (e.clientY - rect.top) + "px";
    host.appendChild(wave);
    wave.addEventListener("animationend", function () { wave.remove(); });
  }

  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-copy")).then(function () {
        showToast(btn.getAttribute("data-toast") || "已复制");
      });
    });
  });

  $$(".btn").forEach(function (btn) {
    btn.addEventListener("pointerdown", function (e) { clickWave(e, btn); });
  });

  /* ---- 磁性按钮 ---- */

  if (fine) {
    $$(".btn").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var rect = btn.getBoundingClientRect();
        var dx = (e.clientX - rect.left - rect.width / 2) * 0.22;
        var dy = (e.clientY - rect.top - rect.height / 2) * 0.3;
        btn.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
      });
      btn.addEventListener("pointerleave", function () {
        btn.style.transform = "";
      });
      btn.addEventListener("pointerdown", function () { btn.classList.add("pressing"); });
      btn.addEventListener("pointerup", function () { btn.classList.remove("pressing"); });
      btn.addEventListener("pointerleave", function () { btn.classList.remove("pressing"); });
    });
  }

  /* ---- 卡片 3D 倾斜(特色区 bento) ---- */

  if (fine) {
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

  /* ---- 夜聊频道:群友真实语录 ---- */

  var chatlog = $("#chatlog");
  var chatScript = [
    { s: "[扫地妈妈] 将在 60 秒后清理所有掉落物！" },
    { n: "nsbbdhrz", t: "想她了" },
    { n: "kcendt435", t: "不是啥意思？还给我田踩了" },
    { n: "luobao", t: "习惯了" },
    { n: "nsbbdhrz", t: "明知对她那么好，却还是离开了我" },
    { n: "a0u8la7yf_8", t: "？" },
    { n: "nsbbdhrz", t: "我是说我的心好痛" },
    { n: "luobao", t: "信不信我用胡萝卜钓竿抽你" },
    { n: "kcendt435", t: "信不信拿大鸡腿抽你" },
    { n: "luobao", t: "自动跳跃" },
    { n: "kcendt435", t: "你不炸我不炸，鱼儿何时能长大？" },
    { n: "luobao", t: "自己踩了自己的地" },
    { n: "kcendt435", t: "不要在意这些细节" },
    { n: "luobao", t: "群主该不会看过吧" },
    { n: "lei_xi", t: "如果你下午经常在线，可以看到他" },
    { s: "Nigh_ter 进入了服务器" },
    { n: "Liao_Lzp", t: "神秘人上线了" },
    { n: "vfggvc", t: "这位就是服主？" },
    { n: "nsbbdhrz", t: "对" },
    { n: "vfggvc", t: "确定他会整活？" },
    { n: "nsbbdhrz", t: "骗你的，被他看上的人都会被整过" },
    { n: "lei_xi", t: "两瓶果酒被喝完了" },
    { n: "XiLanMWw", t: "被我喝了" },
    { n: "jsjxbjd", t: "？" },
    { n: "XiLanMWw", t: "好喝" },
    { n: "lei_xi", t: "9494" },
    { n: "穹", t: "尿尿何尝不是一种失去" },
    { n: "企鹅", t: "便秘是大肠的挽留，窜稀是屎的自由" },
    { n: "nsbbdhrz", t: "神秘" },
    { n: "秦庭柠", t: "（发起了情侣关系）" },
    { n: "凑企鹅", t: "（同意了情侣关系）" },
    { n: "秦庭柠", t: "我？？！" },
    { n: "凑企鹅", t: "来来来" },
    { n: "秦庭柠", t: "我开玩笑的" },
    { n: "凑企鹅", t: "晚了" },
    { n: "秦庭柠", t: "完了，误入虎穴" },
    { n: "凑企鹅", t: "宝贝" },
    { n: "Squea_", t: "我要去凋戏我的小脑公了" },
    { s: "Squea_ 离开了服务器" },
    { n: "luobao", t: "还有一件装备" },
    { n: "XiLanMWw", t: "我背包满啦" },
    { n: "luobao", t: "老北京帽子" },
    { s: "[扫地妈妈] 回收 70 个物品" },
    { n: "luobao", t: "蕾丝内裤" },
    { n: "jsjxbjd", t: "唉铁傀儡差点把我的早饭打出来了" },
    { n: "luobao", t: "笑不活了" },
    { n: "Liao_Lzp", t: "羡慕" },
    { n: "kcendt435", t: "来决战吧" }
  ];
  var chatIdx = 0;
  var chatTimer = null;
  var typingRow = null;

  function showTyping() {
    typingRow = document.createElement("p");
    typingRow.className = "sys";
    var dots = document.createElement("span");
    dots.className = "tdots";
    dots.innerHTML = "<i></i><i></i><i></i>";
    typingRow.appendChild(dots);
    chatlog.appendChild(typingRow);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { typingRow.classList.add("on"); });
    });
  }

  function hideTyping() {
    if (typingRow) { typingRow.remove(); typingRow = null; }
  }

  function pushChatLine() {
    var item = chatScript[chatIdx % chatScript.length];
    chatIdx++;
    var p = document.createElement("p");
    if (item.s) {
      p.className = "sys";
      var line = document.createElement("span");
      line.textContent = item.s;
      p.appendChild(line);
    } else {
      var name = document.createElement("b");
      name.textContent = item.n;
      var text = document.createElement("span");
      text.textContent = item.t;
      p.appendChild(name);
      p.appendChild(text);
    }
    chatlog.appendChild(p);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { p.classList.add("on"); });
    });
    var lines = chatlog.querySelectorAll("p");
    if (lines.length > 6) {
      var first = lines[0];
      first.classList.add("bye");
      setTimeout(function () { first.remove(); }, 680);
    }
  }

  function startChatLoop() {
    if (chatTimer || !chatlog) return;
    chatTimer = setInterval(function () {
      showTyping();
      setTimeout(function () {
        hideTyping();
        pushChatLine();
      }, 950);
    }, 3000);
  }

  if (chatlog) {
    pushChatLine();
    setTimeout(pushChatLine, 700);
    setTimeout(pushChatLine, 1400);
    startChatLoop();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        clearInterval(chatTimer);
        chatTimer = null;
        hideTyping();
      } else {
        startChatLoop();
      }
    });
  }

  /* ---- 月光井:MC 冷知识,洗牌抽取不重复 ---- */

  var wellFacts = [
    "苦力怕其实是只「失败的猪」——当年 Notch 做猪模型时把长和高的参数写反了",
    "苦力怕凑那么近，是想给你一个拥抱——太害羞了，一紧张就炸了",
    "苦力怕怕猫，在家门口养一群猫，苦力怕绕着你家走",
    "铁傀儡会摘花，送给村里的小孩",
    "恶魂的眼泪是真的哭出来的，能酿成再生药水",
    "猫早上会给主人叼礼物：兔子脚、羽毛，偶尔还有幻翼膜",
    "狐狸叼着不死图腾死掉，会自己原地复活——全游戏唯一会自己用图腾的生物",
    "美西螈血量见底会「装死」，躺着悄悄回血，回满了再战",
    "青蛙吃小史莱姆，吃完了吐粘液球——史莱姆球其实是青蛙产的",
    "猪灵打赢疣猪兽会跳舞庆祝，小猪灵还会骑到它背上转圈",
    "给羊取名 jeb_，它会变成彩虹变色羊",
    "命名牌写 Dinnerbone 或 Grumm，生物会倒立",
    "兔子取名 Toast 会变黑白花色——纪念一位开发者的兔子",
    "卫道士取名 Johnny，会敌视几乎一切生物——致敬电影《闪灵》",
    "戴上南瓜头，就可以随便盯着末影人看——它拿你一点办法都没有",
    "末影人会搬走你随手放的方块——你家门口消失的泥土，可能是它搬的",
    "苦力怕自己不掉唱片；只有骷髅一箭把它射死，才会掉一张",
    "苦力怕被闪电劈中，会变成「高压苦力怕」，炸得更狠",
    "大僵尸白天要躲太阳，小僵尸不用——光天化日之下照样追你",
    "猫和豹猫免疫摔落伤害，从悬崖上跳下来毫发无伤",
    "猪灵看你不穿金装就动手；露一件金装备就当你是自己人——再丢根金锭，它能捧着欣赏半天",
    "蜘蛛白天是中立的，你不惹它，它就当没看见你",
    "幻翼出现的条件：连续 3 个游戏日不睡觉——熬夜太久，天上有东西在等你",
    "蝙蝠不掉东西、不吃东西、没任务，是纯纯的夜店氛围组",
    "下界走 1 格 = 主世界 8 格，所以地狱是全服高速公路",
    "潜影盒套潜影盒，一个格子里最多塞 46656 件物品（27×27×64，真有人算过）",
    "游戏里一整个昼夜，等于现实的 20 分钟",
    "整个 MC 世界约 6 万公里宽，表面积差不多是地球的 7 倍",
    "苦力怕爆炸前那声「嘶嘶」，用的是现实中点燃引信的音效",
    "雨天钓鱼咬钩更快——下雨天适合垂钓",
    "悦灵听到唱片机会跳舞；跳舞时给它紫水晶碎片，它还能分裂出同伴",
    "「移除了 Herobrine」是更新日志里挂了十几年的官方玩笑"
  ];

  var wellFact = $("#wellFact");
  var wellBtn = $("#wellBtn");
  var factBag = [];

  function drawFact() {
    if (!factBag.length) {
      factBag = wellFacts.slice();
      for (var i = factBag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = factBag[i];
        factBag[i] = factBag[j];
        factBag[j] = tmp;
      }
    }
    var text = factBag.pop();
    wellFact.classList.add("swap");
    setTimeout(function () {
      wellFact.textContent = text;
      wellFact.classList.remove("swap", "placeholder");
    }, 260);
  }

  if (wellBtn && wellFact) {
    wellBtn.addEventListener("click", function () {
      if (wellFact.classList.contains("swap")) return;
      drawFact();
    });
  }

  /* ---- GSAP 编排 ---- */

  function countTo(el, target) {
    if (!hasGsap) { el.textContent = target; return; }
    var proxy = { val: 0 };
    window.gsap.to(proxy, {
      val: target,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: function () { el.textContent = Math.round(proxy.val); }
    });
  }

  if (hasGsap && typeof window.ScrollTrigger !== "undefined") {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(window.SplitText);
    gsap.ticker.fps(120);

    /* 在线人数等整数滚动 */
    $$(".cnt").forEach(function (el) {
      var target = parseInt(el.textContent, 10);
      if (isNaN(target)) return;
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () { countTo(el, target); }
      });
    });

    /* 赞助:金额滚动 + 虚线逐条画出来 */
    $$(".sponsor .amount").forEach(function (el) {
      var target = parseFloat(el.textContent);
      if (isNaN(target)) return;
      ScrollTrigger.create({
        trigger: el, start: "top 94%", once: true,
        onEnter: function () {
          var proxy = { v: 0 };
          gsap.to(proxy, {
            v: target, duration: 1.4, ease: "power2.out",
            onUpdate: function () { el.textContent = proxy.v.toFixed(2); }
          });
        }
      });
    });
    $$(".sponsor .dots").forEach(function (el, i) {
      gsap.from(el, {
        scaleX: 0, transformOrigin: "left center", duration: 0.9, ease: "power3.out", delay: i * 0.06,
        scrollTrigger: { trigger: el, start: "top 94%", once: true }
      });
    });

    /* 步骤数字随滚动点亮 */
    $$(".step").forEach(function (s) {
      ScrollTrigger.create({
        trigger: s, start: "top 78%", once: true,
        onEnter: function () { s.querySelector(".step__num").classList.add("lit"); }
      });
    });

    /* 收尾:巨幅水印随滚动浮起 */
    gsap.fromTo(".watermark span", { yPercent: 30 }, {
      yPercent: -12, ease: "none",
      scrollTrigger: { trigger: ".end-sec", start: "top bottom", end: "bottom bottom", scrub: 0.6 }
    });

    /* 玩法:fullPage 式接管翻页——拨一下翻一页,3D 卡编排保留 */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 701px)", function () {
      var panels = $$(".pcard");
      var deck = $(".play-pin");
      var dotsBox = $("#deckDots");
      var current = -1, busy = false, engaged = false, aligning = false, armed = true, exiting = false;
      var pendingDir = 0, lastGo = 0, acc = 0;

      panels.forEach(function (p, i) {
        gsap.set(p, { zIndex: 10 + i, autoAlpha: 0, yPercent: 60 });
        gsap.set(p.querySelectorAll("h3, p, .card__tags"), { opacity: 0 });
      });

      var dots = [];
      panels.forEach(function (_, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "第 " + (i + 1) + " 页");
        b.addEventListener("click", function () {
          if (!busy && !exiting && engaged && i !== current) go(i);
        });
        dotsBox.appendChild(b);
        dots.push(b);
      });

      function bits(p) { return p.querySelectorAll("h3, p, .card__tags"); }

      function go(target) {
        if (busy || exiting || target === current || target < 0 || target >= panels.length) return;
        busy = true;
        lastGo = Date.now();
        var dir = target > current ? 1 : -1;
        var oldP = panels[current];
        var newP = panels[target];
        current = target;
        dots.forEach(function (d, i) { d.classList.toggle("on", i === current); });
        if (oldP) {
          gsap.to(oldP, {
            autoAlpha: 0, yPercent: -26 * dir, scale: 0.96, duration: 0.5, ease: "power2.in", overwrite: "auto"
          });
        }
        gsap.fromTo(newP,
          { yPercent: 130 * dir, rotateX: 14 * dir, autoAlpha: 0 },
          { yPercent: 0, rotateX: 0, autoAlpha: 1, x: (target % 2 ? "9vw" : "-9vw"), duration: 0.8, ease: "power3.out", delay: 0.14, overwrite: "auto" });
        gsap.fromTo(bits(newP), { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.09, ease: "power2.out", delay: 0.36, overwrite: "auto",
            onComplete: function () {
              busy = false;
              if (pendingDir && !exiting) {
                var d = pendingDir;
                pendingDir = 0;
                go(current + d);
              }
            } });
      }

      function tryGo(dir) {
        var t = current + dir;
        if (t < 0 || t >= panels.length) return false;
        go(t);
        return true;
      }

      var deckAbsTop = 0;
      function measureDeck() { deckAbsTop = deck.getBoundingClientRect().top + window.scrollY; }
      measureDeck();
      window.addEventListener("resize", measureDeck);
      if (window.ScrollTrigger) ScrollTrigger.addEventListener("refresh", measureDeck);
      function deckTopNow() { return deckAbsTop - window.scrollY; }

      function alignNow() {
        aligning = true;
        engaged = true;
        if (lenis) lenis.stop();
        gsap.to({ y: window.scrollY }, {
          y: window.scrollY + deckTopNow(), duration: 0.5, ease: "power3.out",
          onUpdate: function () { window.scrollTo(0, this.targets()[0].y); },
          overwrite: "auto",
          onComplete: function () {
            aligning = false;
            if (current < 0) go(0);
          }
        });
      }

      function exitDeck(dir) {
        exiting = true;
        engaged = false;
        armed = false;
        var box = panels[current].querySelector(".card");
        gsap.to(box, { opacity: 0, y: -30 * dir, duration: 0.35, ease: "power2.in" });
        var startY = window.scrollY;
        var targetY = startY + dir * window.innerHeight * 0.95;
        gsap.to({ y: startY }, {
          y: targetY, duration: 0.7, ease: "power2.inOut", overwrite: "auto",
          onUpdate: function () { window.scrollTo(0, this.targets()[0].y); },
          onComplete: function () {
            gsap.to(box, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
            if (lenis) lenis.start();
            setTimeout(function () { exiting = false; }, 150);
          }
        });
      }

      function realign() {
        var t = deckTopNow();
        if (Math.abs(t) < 2) return false;
        gsap.to({ y: window.scrollY }, {
          y: window.scrollY + t, duration: 0.45, ease: "power3.out",
          onUpdate: function () { window.scrollTo(0, this.targets()[0].y); },
          overwrite: "auto"
        });
        return true;
      }

      gsap.ticker.add(function () {
        var t = deckAbsTop - window.scrollY;
        var vh = window.innerHeight;
        if (engaged) {
          if (t < -vh * 0.7 || t > vh * 0.7) {
            engaged = false;
            aligning = false;
            if (lenis) lenis.start();
          }
          return;
        }
        if (aligning || exiting) return;
        if (!armed) {
          if (t > vh || t < -vh) armed = true;
          return;
        }
        if (t <= vh * 0.55 && t >= -vh * 0.55) alignNow();
      });

      window.addEventListener("wheel", function (e) {
        if (exiting) { e.preventDefault(); return; }
        if (!engaged) return;
        e.preventDefault();
        if (busy) { pendingDir = e.deltaY > 0 ? 1 : -1; return; }
        if (realign()) return;
        var goingOut = (e.deltaY > 0 && current === panels.length - 1) || (e.deltaY < 0 && current === 0);
        if (goingOut) { exitDeck(e.deltaY > 0 ? 1 : -1); return; }
        acc += e.deltaY;
        if (Math.abs(acc) > 26 && Date.now() - lastGo > 320) {
          if (tryGo(acc > 0 ? 1 : -1)) lastGo = Date.now();
          acc = 0;
        }
      }, { passive: false });

      var touchY = null;
      window.addEventListener("touchstart", function (e) {
        if (!engaged) return;
        touchY = e.touches[0].clientY;
      }, { passive: true });
      window.addEventListener("touchmove", function (e) {
        if (exiting) { if (e.cancelable) e.preventDefault(); return; }
        if (!engaged) return;
        var dy = touchY - e.touches[0].clientY;
        if (Math.abs(dy) < 46) { if (e.cancelable) e.preventDefault(); return; }
        if (e.cancelable) e.preventDefault();
        if (busy) { pendingDir = dy > 0 ? 1 : -1; touchY = e.touches[0].clientY; return; }
        if (realign()) return;
        var goingOut = (dy > 0 && current === panels.length - 1) || (dy < 0 && current === 0);
        if (goingOut) { exitDeck(dy > 0 ? 1 : -1); touchY = null; return; }
        tryGo(dy > 0 ? 1 : -1);
        touchY = e.touches[0].clientY;
      }, { passive: false });

      window.addEventListener("keydown", function (e) {
        if (exiting) { e.preventDefault(); return; }
        if (!engaged) return;
        var map = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 };
        var dir = map[e.key];
        if (!dir) return;
        e.preventDefault();
        if (busy) { pendingDir = dir; return; }
        var goingOut = (dir > 0 && current === panels.length - 1) || (dir < 0 && current === 0);
        if (goingOut) { exitDeck(dir); return; }
        tryGo(dir);
      });

      return function () {
        panels.forEach(function (p) {
          gsap.set([p, p.querySelectorAll("h3, p, .card__tags")], { clearProps: "all" });
        });
        dotsBox.innerHTML = "";
        if (lenis) lenis.start();
      };
    });

    mm.add("(max-width: 700px)", function () {
      $$(".pcard").forEach(function (c) {
        gsap.from(c, {
          autoAlpha: 0, y: 40, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: c, start: "top 85%", toggleActions: "play none none reverse" }
        });
      });
    });

    /* 桌面指针:卡片聚光灯(--mx/--my 喂给 CSS 的 ::before)+ 3D 倾斜 */
    if (window.matchMedia("(pointer: fine)").matches) {
      $$(".tile, .pcard .card").forEach(function (card) {
        var amp = card.classList.contains("tile") ? 4.5 : 7;
        var rx = gsap.quickTo(card, "rotationX", { duration: 0.55, ease: "power2.out" });
        var ry = gsap.quickTo(card, "rotationY", { duration: 0.55, ease: "power2.out" });
        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          card.style.setProperty("--mx", (px * 100).toFixed(2) + "%");
          card.style.setProperty("--my", (py * 100).toFixed(2) + "%");
          ry((px - 0.5) * amp);
          rx(-(py - 0.5) * amp);
        });
        card.addEventListener("pointerleave", function () { rx(0); ry(0); });
      });
    }

    /* 服务器地址:机场翻牌进场 */
    var addr = $("#addrFlap");
    if (addr) {
      var addrText = addr.textContent;
      addr.setAttribute("aria-label", addrText);
      addr.textContent = "";
      var flapChars = [];
      for (var fi = 0; fi < addrText.length; fi++) {
        var fs = document.createElement("i");
        fs.className = "flapchar";
        fs.textContent = addrText[fi];
        addr.appendChild(fs);
        flapChars.push(fs);
      }
      ScrollTrigger.create({
        trigger: addr, start: "top 88%", once: true,
        onEnter: function () {
          var pool = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789.-";
          flapChars.forEach(function (fc, k) {
            var settled = false;
            gsap.fromTo(fc, { rotationX: -92, autoAlpha: 0 }, {
              rotationX: 0, autoAlpha: 1, duration: 0.55, delay: k * 0.05, ease: "back.out(1.4)",
              onUpdate: function () {
                if (!settled && this.progress() > 0.55) { settled = true; fc.textContent = addrText[k]; }
                else if (!settled) fc.textContent = pool[Math.floor(Math.random() * pool.length)];
              }
            });
          });
        }
      });
    }

    /* 标题:每区一套专属入场(玩法区并入钉住时间线) */
    var headFx = {
      feat: "scramble", chat: "typing", well: "drop",
      join: "mask", sponsors: "shine", faq: "fade"
    };

    function scrambleChar(el, finalText, delay) {
      var pool = "✦✧★·夜月星01";
      var proxy = { p: 0 };
      gsap.to(proxy, {
        p: 1, duration: 0.55, delay: delay, ease: "none",
        onUpdate: function () {
          el.textContent = proxy.p < 1 ? pool[Math.floor(Math.random() * pool.length)] : finalText;
        }
      });
    }

    var headsDone = false;
    function initHeadFx() {
      if (headsDone || !window.SplitText) return;
      headsDone = true;
      $$(".section__head h2").forEach(function (h) {
        var sec = h.closest("section");
        var fx = (sec && headFx[sec.id]) || "fade";
        var split = window.SplitText.create(h, { type: "chars", charsClass: "h2char" });
        var chars = split.chars;
        var st = { trigger: h, start: "top 86%", toggleActions: "play none none reverse" };

        if (fx === "mask") {
          split.revert();
          split = window.SplitText.create(h, { type: "lines", mask: "lines" });
          gsap.from(split.lines, {
            yPercent: 120, duration: 1.05, ease: "power4.out", stagger: 0.09,
            scrollTrigger: st, onComplete: function () { split.revert(); }
          });
        } else if (fx === "scramble") {
          gsap.set(chars, { autoAlpha: 0 });
          ScrollTrigger.create({
            trigger: h, start: "top 86%", once: true,
            onEnter: function () {
              chars.forEach(function (c, i) { scrambleChar(c, c.textContent, i * 0.06); });
              gsap.to(chars, { autoAlpha: 1, duration: 0.2, stagger: 0.05 });
            }
          });
        } else if (fx === "typing") {
          gsap.from(chars, {
            autoAlpha: 0, duration: 0.05, ease: "none", stagger: 0.16,
            scrollTrigger: st, onComplete: function () { split.revert(); }
          });
        } else if (fx === "drop") {
          gsap.from(chars, {
            y: -90, autoAlpha: 0, ease: "bounce.out", duration: 1.1, stagger: 0.08,
            scrollTrigger: st, onComplete: function () { split.revert(); }
          });
        } else if (fx === "shine") {
          gsap.from(chars, {
            autoAlpha: 0, x: -16, color: "#f2d98c", duration: 0.6, ease: "power3.out", stagger: 0.05,
            scrollTrigger: st, onComplete: function () { split.revert(); }
          });
        } else if (fx === "wave") {
          gsap.from(chars, {
            yPercent: 90, autoAlpha: 0, ease: "back.out(1.9)", duration: 0.85, stagger: 0.045,
            scrollTrigger: st, onComplete: function () { split.revert(); }
          });
        } else {
          split.revert();
          gsap.from(h, { autoAlpha: 0, y: 14, duration: 0.7, ease: "power2.out", scrollTrigger: st });
        }
      });
    }

    /* 页脚视差掀开 */
    gsap.fromTo(".footer__inner", { yPercent: 45 }, {
      yPercent: 0,
      ease: "none",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "top 55%", scrub: 0.5 }
    });

    /* 收尾:巨幅水印随滚动浮起 */
    gsap.fromTo(".watermark span", { yPercent: 30 }, {
      yPercent: -12, ease: "none",
      scrollTrigger: { trigger: ".end-sec", start: "top bottom", end: "bottom bottom", scrub: 0.6 }
    });

    var heroStarted = false;
    function startHero() {
      if (heroStarted) return;
      heroStarted = true;
      var wordmark = $(".hero__wordmark");
      if (!wordmark || !window.SplitText) return;
      var isDay = document.body.classList.contains("theme-day");
      var split = new window.SplitText(wordmark, { type: "chars", charsClass: "char" });
      var tl = gsap.timeline();
      if (!isDay) {
        tl.fromTo("#stars", { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power1.out", clearProps: "opacity" }, 0.35);
        tl.fromTo(".hero__moon", { opacity: 0, yPercent: 60 }, { opacity: 1, yPercent: 0, duration: 1.4, ease: "power2.out", clearProps: "opacity,transform" }, 0.5);
        tl.fromTo(".hero__fireflies", { opacity: 0 }, { opacity: 1, duration: 0.9, clearProps: "opacity" }, 1.3);
      } else {
        tl.fromTo(".hero__sun", { opacity: 0, yPercent: 40 }, { opacity: 1, yPercent: 0, duration: 1.3, ease: "power2.out", clearProps: "opacity,transform" }, 0.5);
        tl.fromTo(".hero__clouds", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 1.4, ease: "power1.out", clearProps: "opacity,transform" }, 0.6);
      }
      tl.fromTo(".hero__eyebrow", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" }, 1.0);
      tl.fromTo(split.chars,
        { yPercent: 62, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 1.1);
      tl.fromTo(wordmark, { "--gx": "100%" }, { "--gx": "0%", duration: 2.0, ease: "power2.inOut" }, 2.0);
      tl.fromTo(".hero__tagline", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" }, 1.85);
      tl.fromTo(".hero__sub", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out" }, 2.0);
      tl.fromTo(".hero__actions .btn", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: "power2.out" }, 2.15);
      tl.fromTo(".hero__meta .pill", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: "power2.out" }, 2.3);
    }
    function bootText() {
      startHero();
      initHeadFx();
      initReveals();
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(bootText);
    window.addEventListener("load", bootText);

    /* 保险丝:标题若被异常打断还藏着,3 秒后强制亮出来 */
    gsap.delayedCall(3, function () {
      var chars = document.querySelectorAll(".hero__wordmark .char");
      if (!chars.length) return;
      var cs = getComputedStyle(chars[0]);
      if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.05) {
        gsap.set(chars, { clearProps: "all" });
      }
    });
  } else {
    $$(".cnt").forEach(function (el) {
      var target = parseInt(el.textContent, 10);
      if (!isNaN(target)) el.textContent = target;
    });
  }

  /* ---- 实时在线状态(mcsrvstat.us 免费接口,60 秒自动刷新) ---- */

  var statusDot = $("#statusPill .pill__dot");
  var statusText = $("#statusText");
  var statOnline = $("#statOnline");
  var statusFirst = true;

  function setStatus(mode, text) {
    statusDot.classList.remove("pill__dot--wait", "pill__dot--on", "pill__dot--off");
    statusDot.classList.add("pill__dot--" + mode);
    statusText.textContent = text;
  }

  function refreshStatus() {
    fetch("https://api.mcsrvstat.us/3/yemo.mcservers.win", { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.online) {
          var n = data.players && data.players.online !== undefined ? data.players.online : 0;
          var max = data.players && data.players.max !== undefined ? data.players.max : "";
          setStatus("on", "服务器亮着灯 · 现在 " + n + " 人在夜幕里" + (max ? " / " + max : ""));
          if (statOnline) {
            if (statusFirst) { statusFirst = false; countTo(statOnline, n); }
            else if (statOnline.textContent !== String(n)) { statOnline.textContent = n; }
          }
        } else {
          setStatus("off", "服务器此刻没亮灯，来 QQ 群蹲一波");
          if (statOnline) statOnline.textContent = "0";
        }
      })
      .catch(function () {
        setStatus("wait", "状态查询开小差了，进服试试就知道");
      });
  }

  refreshStatus();
  setInterval(refreshStatus, 60000);

  /* ---- 页脚时钟 ---- */

  var clock = $("#clock");
  var lastClockMin = -1;
  function tickClock() {
    var now = new Date();
    if (now.getMinutes() === lastClockMin) return;
    lastClockMin = now.getMinutes();
    var h = now.getHours();
    var t = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    clock.textContent = (h >= 23 || h < 5 ? "夜深了 · " : "本地时间 ") + t;
  }
  if (clock) {
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---- 页脚年份 ---- */

  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();

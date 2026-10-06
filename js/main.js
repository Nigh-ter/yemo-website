/* yemo 官网交互 —— GSAP + Lenis,全站锁 120 帧,全部本地文件 */
(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var hasGsap = typeof window.gsap !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";
  var fine = window.matchMedia("(pointer: fine)").matches;
  var isMobile = window.matchMedia("(max-width: 700px)").matches;

  /* ---- 全站星空:固定画布,滚动分层漂移 ---- */

  var canvas = $("#stars");
  var ctx = canvas.getContext("2d");
  var stars = [];
  var meteors = [];
  var mouse = { x: 0.5, y: 0.5 };
  var dpr = 1;
  var w = 0, h = 0;
  var starSprites = [];
  var frameBudget = isMobile ? 33.3 : 1000 / 120;
  var lastDraw = 0;
  var quality = { step: 0, deltas: [], badWins: 0, hz: 0 };
  var STAR_BASE = isMobile ? 70 : 180;

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
    for (var i = 0, stars = []; i < STAR_BASE; i++) {
      stars.push({
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
    return stars;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = makeStars();
    buildSprites();
  }

  function spawnMeteor() {
    meteors.push({
      x: Math.random() * w * 0.7 + w * 0.2,
      y: Math.random() * h * 0.4,
      vx: -(Math.random() * 5 + 6),
      vy: Math.random() * 3 + 2.5,
      life: 1
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
      mt.life -= 0.012;
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

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  }, { passive: true });

  resize();

  /* 帧率监控:连续不达标就逐级降画质,弱设备也稳 */
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
    drawFrame(t);
    trackQuality(delta);
    lanternTick();
  }
  requestAnimationFrame(masterLoop);

  (function scheduleMeteor() {
    setTimeout(function () {
      spawnMeteor();
      scheduleMeteor();
    }, Math.random() * 6000 + 3500);
  })();

  /* ---- Lenis 丝滑滚动(GSAP ticker 统一锁 120) ---- */

  var lenis = null;

  if (hasGsap && typeof window.ScrollTrigger !== "undefined") {
    window.gsap.registerPlugin(window.ScrollTrigger);
    if (window.SplitText) window.gsap.registerPlugin(window.SplitText);
    window.gsap.ticker.fps(120);
  }

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
      (function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      })(0);
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

  /* ---- 导航 + 进度条 ---- */

  var nav = $("#nav");
  var burger = $("#navBurger");
  var links = $("#navLinks");
  var progress = $("#progress");

  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 24);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress && max > 0) {
      progress.style.width = ((window.scrollY / max) * 100).toFixed(2) + "%";
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

  /* ---- 滚动渐入 ---- */

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("on");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach(function (el) { io.observe(el); });

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

  /* ---- 卡片 3D 悬浮 + 光斑跟随 ---- */

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
    { n: "nsbbdhrz", t: "神秘。" },
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
    /* 旧行淡出与新行淡入同步进行,高度一增一减互相抵消,面板外纹丝不动 */
    var lines = chatlog.querySelectorAll("p");
    if (lines.length > 6) {
      var first = lines[0];
      first.classList.add("bye");
      setTimeout(function () { first.remove(); }, 680);
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { p.classList.add("on"); });
    });
  }

  function startChatLoop() {
    if (chatTimer || !chatlog) return;
    chatTimer = setInterval(pushChatLine, 3000);
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
      } else {
        startChatLoop();
      }
    });
  }

  /* ---- 月光井:MC 冷知识,洗牌抽取不重复 ---- */

  var wellFacts = [
    "苦力怕其实是只「失败的猪」——当年 Notch 做猪模型时把长和高的参数写反了",
    "苦力怕凑那么近，是想给你一个拥抱——太害羞了，一紧张就炸了",
    "苦力怕怕猫——在家门口养一群猫，苦力怕绕着你家走",
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
    wellBtn.addEventListener("click", function (e) {
      if (wellFact.classList.contains("swap")) return;
      clickWave(e, wellBtn);
      drawFact();
    });
  }

  /* ---- GSAP 编排:逐字入场 / 视差 / 数字滚动 ---- */

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

  if (hasGsap) {
    var gsap = window.gsap;

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

    gsap.to(".hero__moon", {
      y: 110,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
    });
    gsap.to(".hero__terrain", {
      y: -26,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.8 }
    });

    var heroStarted = false;
    function startHero() {
      if (heroStarted) return;
      heroStarted = true;
      var wordmark = $(".hero__wordmark");
      if (!wordmark || !window.SplitText) return;
      var split = new window.SplitText(wordmark, { type: "chars", charsClass: "char" });
      gsap.fromTo(split.chars,
        { yPercent: 62, autoAlpha: 0, rotate: 5 },
        { yPercent: 0, autoAlpha: 1, rotate: 0, duration: 0.95, ease: "power3.out", stagger: 0.06, delay: 0.15 });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(startHero);
    window.addEventListener("load", startHero);

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

  /* ---- 页脚年份 ---- */

  $("#year").textContent = new Date().getFullYear();
})();

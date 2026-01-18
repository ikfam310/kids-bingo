const borderColors = ['#ff8a65', '#4db6ac', '#64b5f6', '#ffd54f', '#ba68c8'];
let startX = 0;
let currentIdx = 0;

// --- 音の演出 ---
function initAudio() {
    window.audioCtx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playZudon() {
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(); osc.stop(now + 0.4);
    } catch(e) {}
}

function playFanfare() {
    initAudio();
    const now = audioCtx.currentTime;
    [261, 329, 392, 523, 659].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now + i * 0.15);
        g.gain.setValueAtTime(0.05, now + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.5);
    });
}

// --- アニメーション（Asana風：左下から右上へ ＆ 完全ランダム選出） ---
function spawnCustomEmoji(user, count) {
    const config = BINGO_CONFIG[user];
    const emojis = (config && config.emojis) ? config.emojis : ['✨'];
    
    for (let i = 0; i < count; i++) {
        // Asanaのように連続して飛び出すよう、間隔を短め(200ms)に設定
        setTimeout(() => {
            const d = document.createElement('div');
            d.className = 'animal';
            
            // 【重要】毎回リストの全範囲からランダムに選ぶ
            // これで後ろの方に設定した絵文字も均等に出るようになります
            const randomIndex = Math.floor(Math.random() * emojis.length);
            d.innerText = emojis[randomIndex];
            
            // 出現位置を左下のあたりで少しずつバラけさせる
            d.style.left = (Math.random() * 20 - 10) + 'vw'; 
            d.style.bottom = (Math.random() * 20 - 10) + 'vh';
            
            document.body.appendChild(d);
            
            // アニメーション終了後に削除
            setTimeout(() => d.remove(), 3000);
            
        }, i * 200); 
    }
}
// --- スワイプ・ドラッグ管理 ---
function initSwipe() {
    const track = document.getElementById('sliderTrack');
    const dots = document.querySelectorAll('.dot');
    let isDragging = false;

    window.addEventListener('touchstart', e => {
        startX = e.touches[0].pageX;
    }, {passive: true});

    window.addEventListener('touchend', e => {
        let diff = startX - e.changedTouches[0].pageX;
        handleSwipe(diff);
    }, {passive: true});

    window.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.pageX;
    });

    window.addEventListener('mouseup', e => {
        if (!isDragging) return;
        let diff = startX - e.pageX;
        handleSwipe(diff);
        isDragging = false;
    });

    function handleSwipe(diff) {
        if (Math.abs(diff) > 80) {
            currentIdx = (diff > 0) ? 1 : 0;
            track.style.transform = `translateX(-${currentIdx * 100}vw)`;
            dots.forEach((d, i) => d.classList.toggle('active', i === currentIdx));
        }
    }
}

// --- ビンゴ判定 ---
function checkBingo(user, silent = false) {
    const board = document.getElementById(`board-${user}`);
    const cells = board.querySelectorAll('.cell');
    const active = Array.from(cells).map(c => c.classList.contains('active'));
    
    const lines = [
        [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
        [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
        [0,6,12,18,24],[4,8,12,16,20]
    ];
    
    const activeCount = active.filter(a => a).length;
    
    // 全部のマスが埋まった時の超豪華演出
    if (activeCount === 25) {
        if (!silent && board.dataset.isFull !== "true") {
            playFanfare();
            spawnCustomEmoji(user, 15);
            celebrate(user, true); // 豪華版エフェクト
            board.dataset.isFull = "true";
        }
        return;
    } else {
        board.dataset.isFull = "false";
    }

    let currentBingos = 0;
    lines.forEach(line => {
        if (line.every(idx => active[idx])) currentBingos++;
    });

    const prevBingos = parseInt(board.dataset.prevBingos || 0);
    if (!silent && currentBingos > prevBingos) {
        spawnCustomEmoji(user, 4);
        celebrate(user, false); // 通常ビンゴエフェクト
    }
    board.dataset.prevBingos = currentBingos;
}

// --- ビンゴ演出切り替え用関数 ---
function celebrate(user, isFull) {
    const scalar = isFull ? 3 : 2;
    
    if (user === 'oni') {
        // 瑛太くん：モンスター撃退（炎と爆発と宝石）
        confetti({
            particleCount: isFull ? 200 : 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff4500', '#ff8c00', '#7fff00']
        });
        
        // 撃退後にモンスターとお宝が降る
        setTimeout(() => {
            const monster = confetti.shapeFromText({ text: '👾', scalar });
            const treasure = confetti.shapeFromText({ text: '💎', scalar });
            confetti({
                shapes: [monster, treasure],
                particleCount: isFull ? 40 : 15,
                scalar: scalar
            });
        }, 300);

    } else {
        // 茉衣ちゃん：虹色のふわふわ紙吹雪とネコ
        const colors = ['#ffc0cb', '#add8e6', '#e6e6fa', '#fffacd'];
        
        // 左右からパステル吹雪
        confetti({
            particleCount: isFull ? 150 : 60,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: colors
        });
        confetti({
            particleCount: isFull ? 150 : 60,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: colors
        });

        // 最後にネコとキラキラ
        setTimeout(() => {
            const cat = confetti.shapeFromText({ text: '🐱', scalar });
            const star = confetti.shapeFromText({ text: '✨', scalar });
            confetti({
                shapes: [cat, star],
                particleCount: isFull ? 30 : 10,
                scalar: scalar,
                gravity: 0.5
            });
        }, 500);
    }
}

// --- データ保存 ---
function saveState(user) {
    const cells = document.querySelectorAll(`#board-${user} .cell`);
    const data = Array.from(cells).map(c => ({
        text: c.innerText,
        active: c.classList.contains('active')
    }));
    localStorage.setItem(`bingo_v12_${user}`, JSON.stringify(data));
}

// --- リセット ---
function confirmReset(user) {
    const name = (user === 'oni') ? "お兄ちゃん" : "妹ちゃん";
    if (confirm(name + "のビンゴを新しく作り直しますか？")) {
        localStorage.removeItem(`bingo_v12_${user}`);
        location.reload();
    }
}

// --- ビンゴ初期化 ---
function initBingo(user) {
    const board = document.getElementById(`board-${user}`);
    
    const config = BINGO_CONFIG[user];
    if (config) {
        const pageSection = board.closest('.page');
        pageSection.querySelector('h1').innerText = config.title; // タイトル反映
        pageSection.style.backgroundColor = config.bgColor;      // 背景色反映
        board.style.borderColor = config.themeColor;             // ボードの枠色反映
    }
    
    const saved = localStorage.getItem(`bingo_v12_${user}`);
    let items = [];

    if (saved) {
        items = JSON.parse(saved);
    } else {
        let baseList = [...BINGO_LISTS[user]];
        baseList.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < 25; i++) {
            if (i === 12) {
                items.push({ text: "FREE", active: true });
            } else {
                items.push({ text: baseList.pop() || "おてつだい", active: false });
            }
        }
    }

    items.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'cell' + (item.active ? ' active' : '') + (i === 12 ? ' free' : '');
        div.innerText = item.text;
        div.style.borderColor = borderColors[i % borderColors.length];
        
        div.onclick = function() {
            if (i === 12) return;
            initAudio();
            this.classList.toggle('active');
            if (this.classList.contains('active')) {
                playZudon();
                confetti({ particleCount: 30, origin: { y: 0.8 } });
                checkBingo(user);
            } else {
                checkBingo(user, true);
            }
            saveState(user);
        };
        board.appendChild(div);
    });
    checkBingo(user, true);
}

window.onload = () => {
    initBingo('oni');
    initBingo('imouto');
    initSwipe();
};

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const audioElement = document.getElementById('audioElement');

// ورودی‌ها
const audioFile = document.getElementById('audioFile');
const imageFile = document.getElementById('imageFile');
const templateSelect = document.getElementById('templateSelect');
const themeColorInput = document.getElementById('themeColor');
const songTitleInput = document.getElementById('songTitle');
const artistNameInput = document.getElementById('artistName');
const playBtn = document.getElementById('playBtn');
const recordBtn = document.getElementById('recordBtn');
const statusText = document.getElementById('statusText');

// متغیرهای صدا و انیمیشن
let audioCtx, analyser, source, dataArray;
let isAudioInit = false;
let rotationAngle = 0;
let coverImg = new Image();
let hasCover = false;

// متغیرهای ضبط ویدیو
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// بارگذاری کاور پیش‌فرض
coverImg.crossOrigin = "anonymous";
coverImg.src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80";
coverImg.onload = () => { hasCover = true; };

// آپلود تصویر جدید
imageFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        coverImg.src = URL.createObjectURL(file);
    }
});

// آپلود آهنگ جدید
audioFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        audioElement.src = URL.createObjectURL(file);
        if (!songTitleInput.value || songTitleInput.value === "نام قطعه موسیقی") {
            songTitleInput.value = file.name.replace(/\.[^/.]+$/, "");
        }
    }
});

// راه‌اندازی Web Audio API
function initAudio() {
    if (isAudioInit) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaElementSource(audioElement);
    
    // اتصال صدا به خروجی و آنالیزور
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    isAudioInit = true;
}

// کنترل دکمه پخش
playBtn.addEventListener('click', () => {
    if (!audioElement.src) return alert('ابتدا یک فایل صوتی انتخاب کنید.');
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (audioElement.paused) {
        audioElement.play();
    } else {
        audioElement.pause();
    }
});

// کنترل ضبط ویدیو (Canvas + Audio)
recordBtn.addEventListener('click', () => {
    if (!audioElement.src) return alert('ابتدا یک فایل صوتی انتخاب کنید.');
    initAudio();

    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

function startRecording() {
    const canvasStream = canvas.captureStream(30); // 30 فریم بر ثانیه
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);

    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
    ]);

    mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${songTitleInput.value || 'music-cover'}.webm`;
        a.click();
    };

    audioElement.currentTime = 0;
    audioElement.play();
    mediaRecorder.start();
    isRecording = true;
    recordBtn.textContent = 'توقف و دانلود ویدیو ⏹';
    statusText.classList.remove('hidden');
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        audioElement.pause();
        isRecording = false;
        recordBtn.textContent = 'ضبط ویدیو 🎥';
        statusText.classList.add('hidden');
    }
}

audioElement.addEventListener('ended', () => {
    if (isRecording) stopRecording();
});

// فرمت‌دهی زمان (00:00)
function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// رسم پس‌زمینه بلور شده از کاور
function drawBlurredBackground() {
    ctx.save();
    ctx.filter = 'blur(40px) brightness(0.45)';
    if (hasCover) {
        ctx.drawImage(coverImg, -50, -50, canvas.width + 100, canvas.height + 100);
    } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
}

// رسم متن‌ها و تایمر مشترک
function drawTrackInfo(yPos, color) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(songTitleInput.value, 540, yPos);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '400 28px Vazirmatn, sans-serif';
    ctx.fillText(artistNameInput.value, 540, yPos + 48);

    // تایمر
    const timeText = `${formatTime(audioElement.currentTime)}  /  ${formatTime(audioElement.duration)}`;
    ctx.fillStyle = color;
    ctx.font = '700 26px monospace';
    ctx.fillText(timeText, 540, yPos + 105);
}

// حلقه اصلی رندر
function render() {
    requestAnimationFrame(render);

    if (isAudioInit && !audioElement.paused) {
        analyser.getByteFrequencyData(dataArray);
        rotationAngle += 0.015;
    } else if (!dataArray) {
        dataArray = new Uint8Array(128).fill(10);
    }

    const color = themeColorInput.value;
    const template = templateSelect.value;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBlurredBackground();

    // ==========================================
    // قاب ۱: شیشه‌ای مدرن (Glassmorphism)
    // ==========================================
    if (template === 'glass') {
        // کارت شیشه‌ای
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(140, 100, 800, 880, 50);
        ctx.fill();
        ctx.stroke();

        // تصویر کاور مربعی با گوشه گرد
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(315, 160, 450, 450, 35);
        ctx.clip();
        if (hasCover) ctx.drawImage(coverImg, 315, 160, 450, 450);
        ctx.restore();

        drawTrackInfo(680, color);

        // امواج میله‌ای متقارن
        const bars = 40;
        const barWidth = 10;
        const gap = 6;
        const startX = 540 - ((bars * (barWidth + gap)) / 2);

        for (let i = 0; i < bars; i++) {
            const val = dataArray[i] || 10;
            const h = (val / 255) * 110 + 8;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(startX + i * (barWidth + gap), 930 - h, barWidth, h, 5);
            ctx.fill();
        }
    }

    // ==========================================
    // قاب ۲: صفحه گرامافون چرخان (Vinyl)
    // ==========================================
    else if (template === 'vinyl') {
        ctx.save();
        ctx.translate(540, 430);
        ctx.rotate(rotationAngle);

        // بدنه مشکی صفحه وینیل
        ctx.beginPath();
        ctx.arc(0, 0, 310, 0, Math.PI * 2);
        ctx.fillStyle = '#111111';
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#27272a';
        ctx.stroke();

        // شیارهای روی صفحه
        for (let r = 180; r < 290; r += 22) {
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.07)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // کاور در مرکز صفحه
        ctx.beginPath();
        ctx.arc(0, 0, 150, 0, Math.PI * 2);
        ctx.clip();
        if (hasCover) ctx.drawImage(coverImg, -150, -150, 300, 300);

        // سوراخ وسط صفحه
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fillStyle = '#09090b';
        ctx.fill();
        ctx.restore();

        drawTrackInfo(810, color);

        // موج خطی پایین
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        for (let i = 0; i < 64; i++) {
            const x = 140 + (i * (800 / 64));
            const y = 980 - ((dataArray[i] || 0) / 255) * 90;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // ==========================================
    // قاب ۳: حلقه نئونی و امواج دایره‌ای
    // ==========================================
    else if (template === 'neon') {
        const centerX = 540, centerY = 440, radius = 210;
        const bass = dataArray[2] || 0;
        const pulse = (bass / 255) * 25;

        // امواج دایره‌ای بیرون‌زده از کاور
        const bars = 64;
        for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * Math.PI * 2;
            const barHeight = ((dataArray[i] || 10) / 255) * 120;
            const x1 = centerX + Math.cos(angle) * (radius + pulse);
            const y1 = centerY + Math.sin(angle) * (radius + pulse);
            const x2 = centerX + Math.cos(angle) * (radius + pulse + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + pulse + barHeight);

            ctx.strokeStyle = color;
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // تصویر دایره‌ای وسط
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + pulse - 5, 0, Math.PI * 2);
        ctx.clip();
        if (hasCover) {
            const s = (radius + pulse) * 2;
            ctx.drawImage(coverImg, centerX - s/2, centerY - s/2, s, s);
        }
        ctx.restore();

        drawTrackInfo(830, color);
    }

    // ==========================================
    // قاب ۴: نوار کاست نوستالژی (Cassette)
    // ==========================================
    else if (template === 'cassette') {
        // بدنه کاست
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(140, 220, 800, 500, 40);
        ctx.fill();
        ctx.stroke();

        // برچسب کاست با عکس کاور
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(190, 270, 700, 320, 20);
        ctx.clip();
        if (hasCover) ctx.drawImage(coverImg, 190, 270, 700, 320);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(190, 270, 700, 320);
        ctx.restore();

        // دو قرقره چرخان وسط کاست
        [370, 710].forEach(rx => {
            ctx.save();
            ctx.translate(rx, 430);
            ctx.rotate(rotationAngle * 2);
            ctx.beginPath();
            ctx.arc(0, 0, 55, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.fillStyle = '#18181b';
            ctx.fill();
            // دندانه قرقره
            for (let t = 0; t < 6; t++) {
                ctx.rotate(Math.PI / 3);
                ctx.fillRect(-4, -50, 8, 20);
            }
            ctx.restore();
        });

        drawTrackInfo(800, color);

        // اکولایزر کوچک در پایین
        for (let i = 0; i < 30; i++) {
            const h = ((dataArray[i] || 5) / 255) * 70;
            ctx.fillStyle = color;
            ctx.fillRect(240 + i * 20, 1010 - h, 12, h);
        }
    }

    // ==========================================
    // قاب ۵: مینیمال سینمایی + نوار پیشرفت
    // ==========================================
    else if (template === 'minimal') {
        // کاور بزرگ در مرکز
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.roundRect(240, 120, 600, 600, 25);
        ctx.clip();
        if (hasCover) ctx.drawImage(coverImg, 240, 120, 600, 600);
        ctx.restore();

        // نوار پیشرفت آهنگ (Progress Bar)
        const progress = audioElement.duration ? (audioElement.currentTime / audioElement.duration) : 0;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.roundRect(240, 760, 600, 10, 5);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(240, 760, 600 * progress, 10, 5);
        ctx.fill();

        // عنوان و تایمر
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 38px Vazirmatn, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(songTitleInput.value, 840, 830);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '400 26px Vazirmatn, sans-serif';
        ctx.fillText(artistNameInput.value, 840, 875);

        ctx.fillStyle = color;
        ctx.font = '700 26px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${formatTime(audioElement.currentTime)} / ${formatTime(audioElement.duration)}`, 240, 830);

        // امواج ظریف در پایین‌ترین بخش
        for (let i = 0; i < 50; i++) {
            const h = ((dataArray[i] || 5) / 255) * 60 + 4;
            ctx.fillStyle = color;
            ctx.fillRect(240 + i * 12, 980 - h, 6, h);
        }
    }
}

// شروع رندر
render();

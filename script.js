// JavaScript Logic - Vintage Cinematic Love Letter

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const envelope = document.getElementById('envelope');
  const waxSeal = document.getElementById('wax-seal');
  const desk = document.getElementById('desk');
  const letterContainer = document.getElementById('letter-container');
  const letterContent = document.getElementById('letter-content');
  const musicToggle = document.getElementById('music-toggle');
  const iconPlay = musicToggle.querySelector('.icon-play');
  const iconMute = musicToggle.querySelector('.icon-mute');
  const finalScene = document.getElementById('final-scene');

  // --- Canvas Particle System Setup ---
  const canvas = document.getElementById('ambient-canvas');
  const ctx = canvas.getContext('2d');
  let animationFrameId;



  // --- Letter Content Paragraphs ---
  const letterParagraphs = [
    { text: "Dear Tanisha,", type: "salutation" },
    { text: "I don't really know where to begin.", type: "body" },
    { text: "For the last few months, there have been so many things I wanted to tell you, so many moments when I picked up my phone and wished I could simply ask how your day was going.", type: "body" },
    { text: "Time has passed, but some habits of missing someone don't disappear that easily.", type: "body" },
    { text: "And somehow, even after all this time, I still find myself thinking about you.", type: "body" },
    { text: "I know the circumstances are difficult, and I understand why things are the way they are. I don't blame you for the distance between us.", type: "body" },
    { text: "I just wanted to tell you something that has been in my heart for a long time.", type: "body" },
    { text: "You mattered to me. You still do.", type: "body", highlight: true },
    { text: "Not because of grand moments or perfect memories, but because of all the little things that made you uniquely you.", type: "body" },
    { text: "There are memories I still carry with me, and I think I always will. The conversations, the laughter, the moments that seemed ordinary at the time but became precious later — they remain a part of me.", type: "body" },
    { text: "I don't know what the future holds for either of us. But I do know that meeting you changed a part of my life, and for that, I will always be grateful.", type: "body" },
    { text: "More than anything else, I hope you are safe.", type: "body" },
    { text: "I hope you are smiling.", type: "body" },
    { text: "I hope your dreams are getting closer every day.", type: "body" },
    { text: "And on the days when things feel difficult, I hope you remember that there is someone out there who sincerely wishes the very best for you.", type: "body" },
    { text: "No expectations.", type: "body" },
    { text: "No pressure.", type: "body" },
    { text: "No conditions.", type: "body" },
    { text: "Just genuine care.", type: "body" },
    { text: "Take care of yourself, Tanisha.", type: "body" },
    { text: "And if someday life becomes a little easier, and our paths happen to cross again, I would be happy simply knowing that you're doing well.", type: "body" },
    { text: "Until then, please be kind to yourself, keep moving forward, and never stop believing in your own strength.", type: "body" },
    { text: "I hope you're doing well. ❤️", type: "body" },
    { text: "With warmth and sincerity,", type: "body" },
    { text: "— Jatin", type: "signature" }
  ];
  // --- Audio State & Synth Configuration ---
  const bgMusic = new Audio('leberch-romantic-piano-512030.mp3');
  bgMusic.loop = true;

  let audioCtx = null;
  let synthPlaying = false;
  let masterGainNode = null;
  let pianoSequenceInterval = null;
  let nextRaindropTime = 0.0;
  let lastThunderTime = 0.0;
  const lookahead = 25.0; // milliseconds
  const scheduleAheadTime = 0.1; // seconds

  let rainLowSource = null;
  let rainLowGain = null;
  let musicSource = null;
  let useDirectAudioControl = false;

  // Helper: Generates a buffer of brown noise (filtered white noise) for warm, low-frequency rumbles
  function createBrownNoiseBuffer(ctx, durationSeconds = 5.0) {
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // 1st order accumulator filter
      data[i] = (lastOut + (0.022 * white)) / 1.022;
      lastOut = data[i];
      data[i] *= 3.8; // boost gain to normalize
    }
    return buffer;
  }

  // --- Initialize Audio Context & Master Delay ---
  function initAudio() {
    if (audioCtx) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();

    // Master volume node for music/reverb path
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    
    // Ambient feedback delay (simulating room reverb/delay spacing)
    const delayNode = audioCtx.createDelay(1.0);
    const feedbackNode = audioCtx.createGain();
    const delayVolumeNode = audioCtx.createGain();

    delayNode.delayTime.value = 0.45; // 450ms echo delay
    feedbackNode.gain.value = 0.45;   // lush feedback tail
    delayVolumeNode.gain.value = 0.35; // reverb blend volume

    // Delay loop connection
    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);

    // Master connections
    masterGainNode.connect(audioCtx.destination);       // dry signal path
    masterGainNode.connect(delayNode);                  // feed dry into echo unit
    delayNode.connect(delayVolumeNode);                 // echo to volume
    delayVolumeNode.connect(audioCtx.destination);      // wet signal path to speakers

    // Connect the HTML5 Audio element to the Web Audio pipeline
    try {
      musicSource = audioCtx.createMediaElementSource(bgMusic);
      musicSource.connect(masterGainNode);
    } catch (err) {
      console.warn("Web Audio MediaElementSource blocked (likely local file:// CORS restrictions). Controlling Audio element directly.", err);
      useDirectAudioControl = true;
    }
  }

  // --- Synthesis of Gentle Rain Tapping (Raindrops) ---
  function playRaindrop(time) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'sine';
    // Random frequencies in 800Hz - 1800Hz range to simulate varying droplet sizes
    const freq = 800 + Math.random() * 1000;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, time);
    filter.Q.value = 3.5;

    // Fast pitter-patter plucking envelope (15ms - 40ms decay)
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.015 + Math.random() * 0.02, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02 + Math.random() * 0.025);

    osc.connect(filter);
    filter.connect(gain);
    // Connect to master delay node to give drops a wet room-echo feeling
    gain.connect(masterGainNode);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  // --- Synthesis of Distant Thunder Rumble ---
  function triggerThunder(time) {
    if (!audioCtx) return;

    const thunderSource = audioCtx.createBufferSource();
    thunderSource.buffer = createBrownNoiseBuffer(audioCtx, 8.0); // 8-second rumble

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(70, time);
    // Sweeps lower over time to mimic rolling thunder dispersing
    filter.frequency.exponentialRampToValueAtTime(30, time + 6.0);

    const gain = audioCtx.createGain();
    // Swelling thunder volume envelope: 2s fade in, rolling decay
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.07 + Math.random() * 0.05, time + 2.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 8.0);

    thunderSource.connect(filter);
    filter.connect(gain);
    // Bypass delay/reverb path to keep the sub-bass rumbling clean
    gain.connect(audioCtx.destination);

    thunderSource.start(time);
    thunderSource.stop(time + 8.1);
  }

  // --- Synthesis of soft paper rustling sound ---
  function playPaperRustle() {
    if (!audioCtx) return;
    
    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const bandpassFilter = audioCtx.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.setValueAtTime(700, audioCtx.currentTime);
    bandpassFilter.frequency.exponentialRampToValueAtTime(2500, audioCtx.currentTime + 0.35);
    bandpassFilter.Q.setValueAtTime(0.6, audioCtx.currentTime);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    
    noiseSource.connect(bandpassFilter);
    bandpassFilter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseSource.start();
  }

  // --- Sequencer Core Logic (Lookahead technique for rain & thunder) ---
  function audioScheduler() {
    // A. Schedule individual raindrop plucks
    while (nextRaindropTime < audioCtx.currentTime + scheduleAheadTime) {
      playRaindrop(nextRaindropTime);
      // Interval between drops is 65ms - 135ms (roughly 10-15 drops/second)
      nextRaindropTime += 0.065 + Math.random() * 0.07;
    }

    // B. Schedule distant thunder rolls randomly
    if (audioCtx.currentTime - lastThunderTime > 55.0) {
      if (Math.random() < 0.15) {
        triggerThunder(audioCtx.currentTime + 1.5);
        lastThunderTime = audioCtx.currentTime + 10.0; // lock thunder triggers for 10s
      }
    }
  }

  // --- Audio Control Functions ---
  function playMusic() {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    synthPlaying = true;
    const now = audioCtx.currentTime;
    nextRaindropTime = now + 0.05;
    
    // Start scheduler lookahead loop for environmental sounds
    pianoSequenceInterval = setInterval(audioScheduler, lookahead);
    
    // Play HTML5 background music
    if (useDirectAudioControl) {
      bgMusic.volume = 0;
      bgMusic.play();
      let volumeFadeInterval = setInterval(() => {
        if (!synthPlaying) {
          clearInterval(volumeFadeInterval);
          return;
        }
        if (bgMusic.volume < 0.55) {
          bgMusic.volume = Math.min(0.55, bgMusic.volume + 0.04);
        } else {
          clearInterval(volumeFadeInterval);
        }
      }, 80);
    } else {
      bgMusic.volume = 0.55;
      bgMusic.play();
    }

    // Start continuous low-end rain rumble loop
    if (!rainLowSource) {
      rainLowSource = audioCtx.createBufferSource();
      rainLowSource.buffer = createBrownNoiseBuffer(audioCtx, 4.0);
      rainLowSource.loop = true;

      const rainLowFilter = audioCtx.createBiquadFilter();
      rainLowFilter.type = 'lowpass';
      rainLowFilter.frequency.value = 160;

      rainLowGain = audioCtx.createGain();
      rainLowGain.gain.setValueAtTime(0.001, now);
      rainLowGain.gain.linearRampToValueAtTime(0.08, now + 3.0); // 3s rain swell in

      rainLowSource.connect(rainLowFilter);
      rainLowFilter.connect(rainLowGain);
      rainLowGain.connect(audioCtx.destination);

      rainLowSource.start();
    } else {
      rainLowGain.gain.setValueAtTime(rainLowGain.gain.value, now);
      rainLowGain.gain.linearRampToValueAtTime(0.08, now + 2.0);
    }

    // Smooth master fade in
    masterGainNode.gain.setValueAtTime(0, now);
    masterGainNode.gain.linearRampToValueAtTime(1.0, now + 2.0);

    iconPlay.classList.add('hidden');
    iconMute.classList.remove('hidden');
  }

  function muteMusic() {
    if (!audioCtx || !masterGainNode) return;
    
    synthPlaying = false;
    const now = audioCtx.currentTime;
    
    // Stop lookahead scheduling
    clearInterval(pianoSequenceInterval);
    
    // Smooth fade outs
    masterGainNode.gain.setValueAtTime(masterGainNode.gain.value, now);
    masterGainNode.gain.linearRampToValueAtTime(0, now + 1.0);

    if (rainLowGain) {
      rainLowGain.gain.setValueAtTime(rainLowGain.gain.value, now);
      rainLowGain.gain.linearRampToValueAtTime(0, now + 1.2);
    }
    
    if (useDirectAudioControl) {
      let volumeFadeInterval = setInterval(() => {
        if (bgMusic.volume > 0.05) {
          bgMusic.volume = Math.max(0, bgMusic.volume - 0.05);
        } else {
          bgMusic.volume = 0;
          bgMusic.pause();
          clearInterval(volumeFadeInterval);
        }
      }, 50);
    } else {
      setTimeout(() => {
        if (!synthPlaying) {
          bgMusic.pause();
        }
      }, 1000);
    }

    iconPlay.classList.remove('hidden');
    iconMute.classList.add('hidden');
  }

  musicToggle.addEventListener('click', () => {
    if (synthPlaying) {
      muteMusic();
    } else {
      playMusic();
    }
  });


  // --- Interactive Envelope Logic ---
  let isEnvelopeOpen = false;

  waxSeal.addEventListener('click', (e) => {
    e.stopPropagation();
    openLetterSequence();
  });

  envelope.addEventListener('click', () => {
    openLetterSequence();
  });

  function openLetterSequence() {
    if (isEnvelopeOpen) return;
    isEnvelopeOpen = true;

    // 1. Initialize audio context on first user click
    initAudio();
    
    // 2. Play envelope crack/rustle sound
    playPaperRustle();

    // 3. Trigger envelope unfold animation classes
    envelope.classList.add('open');

    // 4. Slowly zoom desk and swap viewports
    setTimeout(() => {
      // Start background music loop
      playMusic();
      
      // Add view transition class to body
      document.body.classList.add('body-reading-active');
      
      // Start typing letter content
      setTimeout(() => {
        startWritingLetter();
      }, 1200);
    }, 1800);
  }


  // --- Typewriter Handwriting Effect ---
  let currentParagraphIndex = 0;

  function createInkSplatter(targetElement) {
    if (Math.random() > 0.08) return; // Only 8% chance to spawn an ink bleed/splatter for authenticity

    const rect = targetElement.getBoundingClientRect();
    const paper = document.querySelector('.letter-paper');
    const paperRect = paper.getBoundingClientRect();

    // Calculate relative coordinates on the letter paper
    const x = rect.right - paperRect.left + (Math.random() * 20 - 10);
    const y = rect.bottom - paperRect.top + (Math.random() * 15 - 5);

    const splatter = document.createElement('div');
    splatter.className = 'ink-splatter';
    splatter.style.left = `${x}px`;
    splatter.style.top = `${y}px`;
    
    // Randomize shape and size
    const size = Math.random() * 10 + 4; // 4px to 14px
    splatter.style.width = `${size}px`;
    splatter.style.height = `${size}px`;
    splatter.style.transform = `scale(0) rotate(${Math.random() * 360}deg)`;

    paper.appendChild(splatter);

    // Animation frames to grow and settle
    requestAnimationFrame(() => {
      setTimeout(() => {
        splatter.classList.add('visible');
      }, 50);
    });
  }

  function startWritingLetter() {
    typeNextParagraph();
  }

  function typeNextParagraph() {
    if (currentParagraphIndex >= letterParagraphs.length) {
      // All content finished typing. Reveal final quote page.
      showFinalQuoteScene();
      return;
    }

    const paraInfo = letterParagraphs[currentParagraphIndex];
    const p = document.createElement('p');

    // Assign appropriate classes
    if (paraInfo.type === 'salutation') {
      p.className = 'letter-salutation';
    } else if (paraInfo.type === 'signature') {
      p.className = 'letter-signature';
    }
    if (paraInfo.highlight) {
      p.classList.add('highlight-text');
    }

    letterContent.appendChild(p);

    let charIndex = 0;
    const text = paraInfo.text;

    function typeChar() {
      if (charIndex >= text.length) {
        // Paragraph completed. Set dried ink styles.
        p.querySelectorAll('.ink-char').forEach(span => {
          span.classList.add('written');
        });
        
        // Check for splatter opportunity
        createInkSplatter(p);

        // Prep next paragraph with natural breathing space
        currentParagraphIndex++;
        
        // Custom delay depending on ending: signature and salutations are written quicker (1.8x faster)
        let paragraphDelay = 670;
        if (paraInfo.type === 'salutation') paragraphDelay = 330;
        
        setTimeout(typeNextParagraph, paragraphDelay);
        return;
      }

      const char = text[charIndex];
      const charSpan = document.createElement('span');
      
      if (char === ' ') {
        charSpan.className = 'ink-space';
        charSpan.textContent = ' ';
      } else {
        charSpan.className = 'ink-char';
        charSpan.textContent = char;
        
        // Trigger ink drying/fade-in animation immediately on insert
        requestAnimationFrame(() => {
          setTimeout(() => {
            charSpan.classList.add('written');
          }, 20);
        });
      }

      p.appendChild(charSpan);
      charIndex++;

      // Autoscroll page smoothly to follow writing
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });

      // Human-like typing delay variations (sped up by 1.8x)
      let charDelay = 22 + Math.random() * 30; // base handwriting speed
      
      // Pause longer at punctuations for reflective feel
      if (char === ',' || char === ';') {
        charDelay = 190;
      } else if (char === '.' || char === '!' || char === '?' || char === '—') {
        charDelay = 360;
      } else if (char === ' ') {
        charDelay = 45; // slight lift of the pen between words
      }

      setTimeout(typeChar, charDelay);
    }

    typeChar();
  }

  function showFinalQuoteScene() {
    finalScene.style.display = 'block';
    // Let the final scene elements fade in
    setTimeout(() => {
      finalScene.classList.add('show');
      
      // Trigger final page scroll down
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 500);
    }, 150);
  }


  // --- Canvas Particle Systems (Rose Petals & Fireflies) ---

  let petals = [];
  let fireflies = [];
  const maxPetals = 16;
  const maxFireflies = 25;

  // Color arrays for rose petals (warm crimsons, dusty roses, dried red)
  const petalColors = [
    'rgba(124, 26, 34, 0.55)', // Crimson
    'rgba(158, 42, 53, 0.45)', // Rose Red
    'rgba(97, 26, 31, 0.50)',  // Dried Dark Red
    'rgba(141, 73, 80, 0.40)'  // Dusty Pink-Brown
  ];

  class Petal {
    constructor() {
      this.reset(true);
    }

    reset(startOffscreen = false) {
      this.x = Math.random() * canvas.width;
      this.y = startOffscreen ? -40 : Math.random() * canvas.height;
      this.size = Math.random() * 15 + 10;
      this.speedY = Math.random() * 0.7 + 0.35; // Slow nostalgic fall
      this.speedX = Math.random() * 0.4 - 0.2;
      this.sway = Math.random() * 100;
      this.swaySpeed = Math.random() * 0.01 + 0.005;
      this.angle = Math.random() * 360;
      this.spin = Math.random() * 1.5 - 0.75;
      this.scaleX = Math.random() * 0.6 + 0.4;
      this.color = petalColors[Math.floor(Math.random() * petalColors.length)];
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.sway) * 0.4;
      this.sway += this.swaySpeed;
      this.angle += this.spin;
      
      // 3D rotation simulation
      this.scaleX = Math.sin(this.y * 0.015) * 0.7 + 0.3;

      if (this.y > canvas.height + 40 || this.x < -40 || this.x > canvas.width + 40) {
        this.reset(true);
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.angle * Math.PI) / 180);
      ctx.scale(this.scaleX, 1);
      
      ctx.beginPath();
      // Draw smooth romantic organic petal shape using cubic bezier
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-this.size / 2, -this.size / 2, -this.size, this.size / 3, 0, this.size);
      ctx.bezierCurveTo(this.size, this.size / 3, this.size / 2, -this.size / 2, 0, 0);
      
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  class Firefly {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      // Fireflies appear more around the lower part of the letter
      this.y = canvas.height * 0.4 + Math.random() * (canvas.height * 0.6);
      this.size = Math.random() * 2.5 + 1.2;
      this.vx = Math.random() * 0.8 - 0.4;
      this.vy = Math.random() * 0.6 - 0.3;
      this.alpha = 0;
      this.fadeSpeed = Math.random() * 0.01 + 0.003;
      this.maxAlpha = Math.random() * 0.6 + 0.25;
      this.fadingIn = true;
      this.sway = Math.random() * 100;
    }

    update() {
      // Brownian-like drifting movement
      this.x += this.vx + Math.sin(this.sway) * 0.15;
      this.y += this.vy;
      this.sway += 0.02;

      // Random speed fluctuations
      if (Math.random() < 0.05) {
        this.vx = Math.random() * 0.8 - 0.4;
        this.vy = Math.random() * 0.6 - 0.3;
      }

      // Handle pulsing fade in and fade out
      if (this.fadingIn) {
        this.alpha += this.fadeSpeed;
        if (this.alpha >= this.maxAlpha) {
          this.fadingIn = false;
        }
      } else {
        this.alpha -= this.fadeSpeed * 0.7; // decay slightly slower
        if (this.alpha <= 0) {
          this.reset();
        }
      }

      // Check boundaries
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      // Draw warm gold/greenish-yellow firefly glow
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
      gradient.addColorStop(0, `rgba(253, 190, 99, ${this.alpha})`);
      gradient.addColorStop(0.3, `rgba(253, 184, 99, ${this.alpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(253, 184, 99, 0)');

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Tiny core spark
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.95})`;
      ctx.fill();

      ctx.restore();
    }
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function setupParticles() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Seed initial particles
    for (let i = 0; i < maxPetals; i++) {
      petals.push(new Petal());
      // distribute them across screen height initially
      petals[i].y = Math.random() * canvas.height;
    }
    
    // Seed fireflies (only show fireflies later when letter opens)
    for (let i = 0; i < maxFireflies; i++) {
      fireflies.push(new Firefly());
    }
  }

  function loopParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rose petals always update and draw (very subtle falling)
    petals.forEach(petal => {
      petal.update();
      petal.draw();
    });

    // Fireflies only activate and draw when reading the letter to add romance to final paragraphs
    if (isEnvelopeOpen) {
      fireflies.forEach(firefly => {
        firefly.update();
        firefly.draw();
      });
    }

    animationFrameId = requestAnimationFrame(loopParticles);
  }

  // Initialize particles
  setupParticles();
  loopParticles();
});

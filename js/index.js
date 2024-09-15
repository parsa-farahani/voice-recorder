const canvas = document.getElementById("visualizer");
const soundClips = document.querySelector("section#sound-clips")
const recBtn = document.getElementById("startend-btn");
const recTime = document.getElementById("rec-time");
const clipNameModal = document.getElementById("soundclip-name-modal-cont");
const clipNameModalSubBtn = document.getElementById("soundclip-name-submit-btn");

const startIcon = document.getElementById("start-icon");
const endIcon = (document.getElementById("end-icon")).cloneNode(true);
endIcon.style.display = "block";

// initial setup
recBtn.disabled = false;


// Visualiser setup - create web audio api context and canvas
let audioCtx;   // AudioContext, for visualizing audio
const canvasCtx = canvas.getContext("2d");


let RECORDER;

let recAudios = [];
let recAudioElements = [];

let isRecording = false; 

class RecordedAudio {
    constructor(name="New Clip", url=null, duration=0, volume=1) {
        this._name = name;
        this._url = url;
        this._duration = new Time(duration);
        this._volume = volume;
    }

    set name(newName) {
        this._name = newName;
    }
    set url(newUrl) {
        this._url = newUrl;
    }
    set duration(newDuration) {
        this._duration = newDuration;
    }
    set volume(newVolume) {
        this._volume = newVolume;
    }

    get name() {
        return this._name;
    }
    get url() {
        return this._url;
    }
    get duration() {
        return this._duration;
    }
    get volume() {
        return this._volume;
    }
}


class Time {
    constructor(time) {  // miliseconds
        this.time = time;
        this.fullSecs = Math.floor( time / 1000 );

        this.hrs = Math.floor( time / (1000 * 3600) ) % 24;
        this.mins = Math.floor( time / (1000 * 60) ) % 60;
        this.secs = Math.floor( time / 1000 ) % 60;
        this.milliSecs = Math.floor( time ) % 1000;
    }

    static format(timePart) {   // timeParts: hrs, mins, secs, milliSecs
        return (timePart >= 10)? String(timePart) : 0 + String(timePart);
    }

    format(timePart) {   // timeParts: hrs, mins, secs, milliSecs
        return (timePart >= 10)? String(timePart) : 0 + String(timePart);
    }

    formatMs(milliSecs) {
        return (milliSecs >= 100)? String(milliSecs) : 0 + String(milliSecs);
    }
}


const getUserMediaReady = !!(window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia);

if(getUserMediaReady) {
    window.navigator.mediaDevices.getUserMedia( { audio:true } )
    .then(audioStream => {
        const recChunks = [];
        RECORDER = new MediaRecorder(audioStream);
        let startTime;
        let endTime;
        let duration;

        RECORDER.addEventListener("dataavailable", function(e) {
            if (e.data.size > 0) {
                recChunks.push(e.data);
            }
        })

        RECORDER.addEventListener("start", function(e) {
            console.log("Recording ...");
            startTime = (new Date()).getTime();
            visualize(audioStream);
            updateRecTime(startTime);
        })

        RECORDER.addEventListener("error", function(e) {
            throw e.error || new Error(e.name);
        })

        RECORDER.addEventListener("stop", function(e) {
            console.log("Recording stopped.");
            endTime = (new Date()).getTime();
            duration = endTime - startTime;
            createAudioClip(recChunks, duration);
        })

    })
    .catch(error => {
        recBtn.disabled = true;
        console.warn(`Error accessing user-media, audio-permission denied: ${error.message}`);
    });
} else {
    recBtn.disabled = true;
    console.warn("getUserMedia' is not supported in this browser.");
}



function createAudioClip(audioChunks, audioDuration) {

    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const audioURL = window.URL.createObjectURL(blob);
    audioChunks.length = 0;

    let audioName;

    askClipName()
    .then(clipName => {
        audioName = clipName;
        const recAudio = new RecordedAudio(audioName, audioURL, audioDuration);
        recAudios.push(recAudio);
        console.log(recAudios);
    
        createAudioClipElement(recAudio);
    })
}

function createAudioClipElement(recAudio) {
    const {time, mins, secs} = recAudio.duration;
    const newClip = document.querySelector("#audio-clip-temp").content.querySelector('.sound-clip').cloneNode(true);
    newClip.style.display = "flex";
    const clipTitle = newClip.querySelector("p.sound-clip-title");
    const clipSeekRange = newClip.querySelector('#sound-clip-play-progress');
    const clipVolume = newClip.querySelector("input.sound-clip-vol-range");
    const clipTime = newClip.querySelector(".sound-clip-time");
    const clipDownloadBtn = newClip.querySelector("a[data-clip-download]");
    const audioElement = new Audio();
    audioElement.setAttribute('preload', 'metadata');

    clipTitle.innerText = recAudio.name;
    clipSeekRange.step = 1;
    clipSeekRange.max = Math.ceil(time / 1000);
    clipVolume.value = recAudio.volume;
    clipTime.innerText = recAudio.duration.format(mins) + ":" + recAudio.duration.format(Math.ceil(time / 1000));
    clipDownloadBtn.setAttribute("href", recAudio.url);
    clipDownloadBtn.setAttribute("download", recAudio.name + ".webm");
    audioElement.src = recAudio.url;
    audioElement.setAttribute('data-duration', time);
    
    console.dir(audioElement);

    newClip.appendChild(audioElement);
    document.getElementById("sound-clips").appendChild(newClip);

    recAudioElements.push(audioElement);
    controlClipEvents(newClip);
}

function askClipName() {
    return new Promise((resolve, reject) => {
        let clipname;
        clipNameModal.style.display = "flex";
        clipNameModalSubBtn.addEventListener("click", function(e) {
            e.preventDefault();
            const clipNameForm = e.target.closest("#soundclip-name-modal-form");
            const clipNameInput = clipNameForm.querySelector("#soundclip-name-input");
            clipname = clipNameInput.value || "New clip";
            resolve(clipname);
            clipNameModal.style.display = "none";
            // clipNameInput.value = "";
        })
    })
}



function updateRecTime(startTime) {
    if (!isRecording) {
        recTime.innerText = "00:00:000";
        return;
    }

    let duration = new Time(Date.now() - startTime);

    let mins = duration.mins;
    let secs = duration.secs;
    let milliSecs = duration.milliSecs;

    recTime.innerText = duration.format(mins) + ":" + duration.format(secs) + ":" + duration.formatMs(milliSecs);

    function format(time) {
        return (time >= 10)? String(time) : 0 + String(time);
    }
    function formatMs(time) {
        return (time >= 100)? String(time) : 0 + String(time);
    }

    requestAnimationFrame(updateRecTime.bind({}, startTime));
}


/* Controlers Event-Listeners */


recBtn.addEventListener("click", function(e) {
    try {
        if (!isRecording) {
            RECORDER.start();
            isRecording = true;
            toggleRecIcon();
            recBtn.style.background = "linear-gradient(230deg, rgb(255, 101, 132), rgb(156, 36, 72))";
        } else {
            console.log('stopping recorder')
            RECORDER.stop();
            isRecording = false;
            toggleRecIcon();
            recBtn.style.background = "";
        }
    } catch (error) {
        recBtn.disabled = true;
        console.warn(`Error - Permission denied: please check audio-recording permission and reload the page - ${error}`);
    }
})

function toggleRecIcon() {
    if (!isRecording) {
        recBtn.replaceChild(startIcon, endIcon);
    } else {
        recBtn.replaceChild(endIcon, startIcon);
    }
}


function controlClipEvents(soundClip) {
    if (isRecording) return;

    const audio = soundClip.querySelector('audio');

    const duration = +audio.getAttribute('data-duration');
    const playpauseBtn = soundClip.querySelector("button[data-play-btn]");
    const muteBtn = soundClip.querySelector("button[data-mute-btn]");
    const playBarTime = soundClip.querySelector('.sound-clip-time');
    const deleteBtn = soundClip.querySelector("button[data-clip-delete]");
    // const audioProgressRange = playBar.querySelector("#sound-clip-progress-range");
    const audioPlayProgressRange = soundClip.querySelector("#sound-clip-play-progress");
    const audioVolumeRangeInput = soundClip.querySelector("input.sound-clip-vol-range");

    audio.addEventListener('play', function(e) {
        audio.closest('.sound-clip').classList.add('playing');
    })
    audio.addEventListener('pause', function(e) {
        audio.closest('.sound-clip').classList.remove('playing');
    })

    audio.addEventListener("timeupdate", function() {
        const curntTime = Math.ceil(audio.currentTime);
        const curntPercent = 100 * curntTime / Math.ceil(duration / 1000);
        audioPlayProgressRange.style.setProperty('--play-progress-val', CSS.percent(curntPercent));
        audioPlayProgressRange.value = curntTime;

        if (!audio.paused) {
            playBarTime.innerText = Time.format(Math.floor(audio.currentTime / 60)) + ":" + Time.format( curntTime );
        } else {
            playBarTime.innerText = Time.format(Math.floor(duration / (1000 * 60))) + ":" + Time.format( (duration / 1000).toFixed(0) );
        }
    }) 

    audioPlayProgressRange.addEventListener("input", function(e) {
        audio.currentTime = audioPlayProgressRange.value;
    })

    audio.addEventListener('volumechange', function(e) {
        const volPercent = 100 * audio.volume;
        audioVolumeRangeInput.style.setProperty('--vol-progress-val', CSS.percent(volPercent));
        audioVolumeRangeInput.value = audio.volume;

        if (audio.volume <= 0 &&  !audio.closest('.sound-clip').classList.contains('muted')) {
            audio.closest('.sound-clip').classList.add('muted');
        } else if (audio.closest('.sound-clip').classList.contains('muted')) {
            audio.closest('.sound-clip').classList.remove('muted');
        }
    })

    audioVolumeRangeInput.addEventListener("input", function(e) {
        audio.volume = audioVolumeRangeInput.value;
    })

    playpauseBtn.addEventListener('click', e => {
        const { target } = e;

        togglePlayPause( target.closest('.sound-clip').querySelector('audio') );
        e.stopImmediatePropagation();
    })

    muteBtn.addEventListener('click', e => {
        const { target } = e;

        audio.volume = (audio.volume > 0) ? 0 : 1;
        audio.muted = !audio.muted;
        audio.closest('.sound-clip').classList.toggle('muted');
        e.stopImmediatePropagation();
    })

    deleteBtn.addEventListener('click', e => {
        const { target } = e;
        
        target.closest("button[data-clip-delete]").closest('.sound-clip').remove();
        let recAudioIndex = recAudios.findIndex(recAudio => recAudio.url === audio.src);
        recAudios.splice(recAudioIndex,1)
        e.stopImmediatePropagation();
    })

}
/*-------------------------------------- */


function togglePlayPause(audio) {
    console.log(audio);

    if (audio.paused) {
        [...document.querySelectorAll("audio")].filter(otherAudio => otherAudio.src !== audio.src).forEach(otherAudio => {
            if (!otherAudio.paused) {
                otherAudio.pause();
                // otherAudio.currentTime = 0;
            }
        })
    }

    if (audio.paused) {
        audio.play();
        CURRENT_AUDIO = audio;
        CURRENT_AUDIO_PROGRESS = audio.closest(".sound-clip").querySelector("progress");
    } else {
        audio.pause();
        CURRENT_AUDIO = null;
        CURRENT_AUDIO_PROGRESS = null;
    }
}


function changeCurrentTime(audio, progress, offsetX) {
    const clickPos = offsetX / progress.offsetWidth;

    let duration;
    recAudios.forEach(recAudio => {
        if (recAudio.url === audio.src) {
            duration = recAudio.duration.fullSecs;
        }
    } );

    audio.currentTime = clickPos * duration ;
}




/*------- Visualizer --------*/

function visualize(stream) {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
  
    const source = audioCtx.createMediaStreamSource(stream);
  
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 32768;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
  
    source.connect(analyser);
  
    draw();
  
    function draw() {
        if (RECORDER.state === 'inactive') {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        };

        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;
    
        requestAnimationFrame(draw);
    
        analyser.getByteTimeDomainData(dataArray);
    
        canvasCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--main-bg');
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = "#D24D6B";
    
        canvasCtx.beginPath();
    
        let sliceWidth = (WIDTH * 1.0) / bufferLength;
        let x = 0;
    
        for (let i = 0; i < bufferLength; i++) {
            let v = dataArray[i] / 128.0;
            let y = (v * HEIGHT) / 2;
    
            if (i === 0) {
            canvasCtx.moveTo(x, y);
            } else {
            canvasCtx.lineTo(x, y);
            }
    
            x += sliceWidth;
        }
    
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    }
}

/* ------------------------- */